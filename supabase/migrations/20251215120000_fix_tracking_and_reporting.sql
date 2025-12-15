-- Migration: Fix Tracking & Reporting
-- 1. Add location columns to sessoes
-- 2. Update track_event_v2 to store location and dedup bots
-- 3. Update reporting RPCs to strict filter (INNER JOIN identificador)

-- 1. Schema Changes
ALTER TABLE tbz.sessoes ADD COLUMN IF NOT EXISTS country_code text;
ALTER TABLE tbz.sessoes ADD COLUMN IF NOT EXISTS region_name text;
ALTER TABLE tbz.sessoes ADD COLUMN IF NOT EXISTS city text;

-- 2. Update track_event_v2
CREATE OR REPLACE FUNCTION tbz.track_event_v2(p_session_id text, p_event_type text, p_event_data jsonb, p_produto text, p_fonte_de_trafego text, p_tipo_de_funil text, p_traffic_id text, p_fingerprint_hash text, p_user_agent text, p_ip text, p_url text, p_referrer text, p_email text DEFAULT NULL::text, p_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_urgency_level text DEFAULT NULL::text, p_country_code text DEFAULT NULL::text, p_region_name text DEFAULT NULL::text, p_city text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_fingerprint_hash text := p_fingerprint_hash;
    v_session_uuid uuid;
    v_lead_id uuid;
    v_existing_event_id uuid;
    v_existing_visit_id uuid;
    v_existing_quiz_start_id uuid;
    v_current_step text;
    v_ip text;
    v_headers json;
    v_product_id uuid;
    v_is_bot boolean := false;
BEGIN
    -- 0. Resolve Product ID
    SELECT id INTO v_product_id FROM tbz.produtos WHERE slug = p_produto LIMIT 1;

    -- 1. Resolve IP Address
    IF p_ip IS NULL THEN
        BEGIN
            v_headers := current_setting('request.headers', true)::json;
            v_ip := v_headers->>'x-forwarded-for';
            IF v_ip IS NULL THEN
                v_ip := v_headers->>'cf-connecting-ip';
            END IF;
            IF v_ip IS NOT NULL AND position(',' in v_ip) > 0 THEN
                v_ip := split_part(v_ip, ',', 1);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_ip := 'unknown';
        END;
    ELSE
        v_ip := p_ip;
    END IF;
    
    IF v_ip IS NULL THEN
        v_ip := 'unknown';
    END IF;

    -- 1.1 Detect Bot from User-Agent
    IF p_user_agent ~* '(bot|crawl|spider|googlebot|bingbot|yandex|slurp|facebookexternalhit)' THEN
        v_is_bot := true;
    END IF;

    -- 2. Ensure Identificador exists (ONLY IF NOT BOT)
    IF v_fingerprint_hash IS NOT NULL AND NOT v_is_bot THEN
        INSERT INTO tbz.identificador (fingerprint_hash, original_ip, user_agent, created_at, country_code, city, region_name)
        VALUES (v_fingerprint_hash, v_ip, COALESCE(p_user_agent, 'unknown'), now(), p_country_code, p_city, p_region_name)
        ON CONFLICT (fingerprint_hash) DO UPDATE SET
            country_code = COALESCE(EXCLUDED.country_code, tbz.identificador.country_code),
            city = COALESCE(EXCLUDED.city, tbz.identificador.city),
            region_name = COALESCE(EXCLUDED.region_name, tbz.identificador.region_name);
    END IF;

    -- 3. Determine Current Step
    CASE p_event_type
        WHEN 'visit' THEN v_current_step := 'landing';
        WHEN 'page_view' THEN v_current_step := 'landing';
        WHEN 'quiz_start' THEN v_current_step := 'quiz_inicio';
        WHEN 'quiz_complete' THEN v_current_step := 'quiz_completo';
        WHEN 'lead_submit' THEN v_current_step := 'lead_capture';
        WHEN 'offer_click' THEN v_current_step := 'checkout';
        ELSE v_current_step := 'unknown';
    END CASE;

    -- 4. Create/Update Session (Now storing location)
    -- If it IS A BOT, we MUST insert NULL for fingerprint_hash to avoid FK violation (or just clean separation)
    INSERT INTO tbz.sessoes (
        session_id, fingerprint_hash, ip_address, traffic_id, fonte_de_trafego, tipo_de_funil, current_step, product_id, created_at, updated_at,
        country_code, region_name, city
    ) VALUES (
        p_session_id, 
        CASE WHEN v_is_bot THEN NULL ELSE v_fingerprint_hash END, -- NULL for bots
        v_ip, p_traffic_id, p_fonte_de_trafego, p_tipo_de_funil, v_current_step, v_product_id, now(), now(),
        p_country_code, p_region_name, p_city
    )
    ON CONFLICT (session_id) DO UPDATE SET
        updated_at = now(),
        current_step = v_current_step,
        fingerprint_hash = CASE WHEN v_is_bot THEN NULL ELSE COALESCE(EXCLUDED.fingerprint_hash, tbz.sessoes.fingerprint_hash) END,
        traffic_id = COALESCE(EXCLUDED.traffic_id, tbz.sessoes.traffic_id),
        product_id = COALESCE(v_product_id, tbz.sessoes.product_id),
        country_code = COALESCE(EXCLUDED.country_code, tbz.sessoes.country_code),
        region_name = COALESCE(EXCLUDED.region_name, tbz.sessoes.region_name),
        city = COALESCE(EXCLUDED.city, tbz.sessoes.city)
    RETURNING id INTO v_session_uuid;

    -- 5. Log Event (dedup quiz_start)
    IF p_event_type = 'quiz_start' THEN
         SELECT id INTO v_existing_quiz_start_id FROM tbz.eventos 
         WHERE session_id = v_session_uuid AND event_type = 'quiz_start' LIMIT 1;
         
         IF v_existing_quiz_start_id IS NULL THEN
            INSERT INTO tbz.eventos (
                session_id, event_type, event_data, product_id, created_at
            ) VALUES (
                v_session_uuid, p_event_type, p_event_data, v_product_id, now()
            );
         END IF;
    ELSE
         INSERT INTO tbz.eventos (
             session_id, event_type, event_data, product_id, created_at
         ) VALUES (
             v_session_uuid, p_event_type, p_event_data, v_product_id, now()
         );
    END IF;

    -- 5.1 SYNC CHECKOUT STATUS
    IF (p_event_type = 'checkout_click' OR p_event_type = 'offer_click') AND v_fingerprint_hash IS NOT NULL THEN
        UPDATE tbz.leads 
        SET checkout_initiated = TRUE, updated_at = now()
        WHERE fingerprint_hash = v_fingerprint_hash;
    END IF;

    -- 6. Special Handling for 'visit' -> tbz.visitas
    IF p_event_type = 'visit' THEN
        IF v_is_bot THEN
            -- Check duplication by IP for bots (Strict 24h IP dedup for bots)
             SELECT v.id INTO v_existing_visit_id
             FROM tbz.visitas v
             JOIN tbz.sessoes s ON v.session_id = s.id
             WHERE s.ip_address = v_ip
               AND v.created_at > (now() - interval '24 hours')
             LIMIT 1;
             
             IF v_existing_visit_id IS NULL THEN
                 INSERT INTO tbz.visitas (
                     session_id, landing_page, referrer, product_id, created_at
                 ) VALUES (
                     v_session_uuid, p_url, p_referrer, v_product_id, now()
                 );
             END IF;
        
        ELSIF v_fingerprint_hash IS NOT NULL THEN
             -- Normal dedup by fingerprint for real users
             SELECT v.id INTO v_existing_visit_id
             FROM tbz.visitas v
             JOIN tbz.sessoes s ON v.session_id = s.id
             WHERE s.fingerprint_hash = v_fingerprint_hash
               AND v.created_at > (now() - interval '24 hours')
             LIMIT 1;

             IF v_existing_visit_id IS NULL THEN
                 INSERT INTO tbz.visitas (
                     session_id, landing_page, referrer, product_id, created_at
                 ) VALUES (
                     v_session_uuid, p_url, p_referrer, v_product_id, now()
                 );
             END IF;
        END IF;
    END IF;

    -- 7. Special Handling for 'lead_submit'
    IF p_event_type = 'lead_submit' AND p_email IS NOT NULL THEN
        DECLARE
           v_checkout_initiated boolean := FALSE;
        BEGIN
           SELECT EXISTS (
               SELECT 1 FROM tbz.eventos e
               JOIN tbz.sessoes s ON e.session_id = s.id
               WHERE s.fingerprint_hash = v_fingerprint_hash
               AND (e.event_type = 'checkout_click' OR e.event_type = 'offer_click')
           ) INTO v_checkout_initiated;
        
           INSERT INTO tbz.leads (
               fingerprint_hash, name, email, phone, urgency_level, created_at, updated_at, checkout_initiated
           ) VALUES (
               CASE WHEN v_is_bot THEN NULL ELSE v_fingerprint_hash END, -- NULL for bots
               p_name, p_email, p_phone, p_urgency_level, now(), now(),
               v_checkout_initiated
           )
           ON CONFLICT (email) DO UPDATE SET
               name = COALESCE(EXCLUDED.name, tbz.leads.name),
               phone = COALESCE(EXCLUDED.phone, tbz.leads.phone),
               urgency_level = COALESCE(EXCLUDED.urgency_level, tbz.leads.urgency_level),
               updated_at = now(),
               checkout_initiated = (tbz.leads.checkout_initiated OR EXCLUDED.checkout_initiated)
           RETURNING id INTO v_lead_id;
        END;
        
        IF v_lead_id IS NOT NULL AND v_product_id IS NOT NULL THEN
            INSERT INTO tbz.lead_products (lead_id, product_id, created_at, updated_at)
            VALUES (v_lead_id, v_product_id, now(), now())
            ON CONFLICT (lead_id, product_id) DO UPDATE SET updated_at = now();
        END IF;
    END IF;

    RETURN json_build_object(
        'success', true, 
        'session_uuid', v_session_uuid,
        'lead_id', v_lead_id,
        'is_bot', v_is_bot
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;

--------------------------------------------------------------------------------
-- 3. Reporting RPCs (Strict Filters: INNER JOIN tbz.identificador)
--------------------------------------------------------------------------------

-- 1. tbz.get_dashboard_metrics
CREATE OR REPLACE FUNCTION tbz.get_dashboard_metrics(p_date_filter text, p_custom_date text DEFAULT NULL::text, p_produto text DEFAULT 'all'::text, p_fonte_de_trafego text DEFAULT 'all'::text, p_tipo_de_funil text DEFAULT 'all'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_start_date timestamp with time zone;
    v_end_date timestamp with time zone;
    
    v_total_visits bigint;
    v_total_quiz_starts bigint;
    v_total_leads bigint;
    v_total_quiz_complete bigint;
    v_total_checkout_starts bigint;
    v_total_sales bigint;
    v_total_sales_value numeric;
    v_total_abandonments bigint;
    v_total_comments bigint;
    
    v_abandonment_by_step json;
    v_funnel_data json;
    
    v_product_id uuid;
BEGIN
    -- Determine Date Range (GMT-3)
    IF p_date_filter = 'today' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date::timestamp AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := now();
    ELSIF p_date_filter = 'yesterday' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo' - interval '1 day')::date::timestamp AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date::timestamp AT TIME ZONE 'America/Sao_Paulo') - interval '1 second';
    ELSIF p_date_filter = 'custom' AND p_custom_date IS NOT NULL AND p_custom_date != '' THEN
        v_start_date := (p_custom_date || ' 00:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := (p_custom_date || ' 23:59:59')::timestamp AT TIME ZONE 'America/Sao_Paulo';
    ELSE
        v_start_date := '2000-01-01 00:00:00'::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := now();
    END IF;

    -- Resolve Product ID
    IF p_produto != 'all' THEN
        SELECT id INTO v_product_id FROM tbz.produtos WHERE slug = p_produto LIMIT 1;
    END IF;

    -- Total Visits (Sessions filtered by identificador existence)
    SELECT COUNT(*) INTO v_total_visits
    FROM tbz.sessoes s
    JOIN tbz.identificador i ON s.fingerprint_hash = i.fingerprint_hash -- STRICT FILTER
    WHERE s.created_at >= v_start_date AND s.created_at <= v_end_date
      AND (p_produto = 'all' OR s.product_id = v_product_id)
      AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
      AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil);

    -- Total Quiz Starts
    SELECT COUNT(*) INTO v_total_quiz_starts
    FROM tbz.eventos e
    JOIN tbz.sessoes s ON e.session_id = s.id
    JOIN tbz.identificador i ON s.fingerprint_hash = i.fingerprint_hash -- STRICT FILTER
    WHERE e.event_type = 'quiz_start'
      AND e.created_at >= v_start_date AND e.created_at <= v_end_date
      AND (p_produto = 'all' OR s.product_id = v_product_id)
      AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
      AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil);

    -- Total Leads (Leads usually imply valid identificador, but we keep consistent)
    SELECT COUNT(DISTINCT l.id) INTO v_total_leads
    FROM tbz.leads l
    JOIN tbz.sessoes s ON l.fingerprint_hash = s.fingerprint_hash
    -- JOIN tbz.identificador i ON s.fingerprint_hash = i.fingerprint_hash -- Redundant but consistent
    WHERE l.created_at >= v_start_date AND l.created_at <= v_end_date
      AND (p_produto = 'all' OR s.product_id = v_product_id)
      AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
      AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil);

    -- Total Quiz Complete
    SELECT COUNT(*) INTO v_total_quiz_complete
    FROM tbz.eventos e
    JOIN tbz.sessoes s ON e.session_id = s.id
    JOIN tbz.identificador i ON s.fingerprint_hash = i.fingerprint_hash -- STRICT FILTER
    WHERE e.event_type = 'quiz_complete'
      AND e.created_at >= v_start_date AND e.created_at <= v_end_date
      AND (p_produto = 'all' OR s.product_id = v_product_id)
      AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
      AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil);

    -- Total Checkout Starts
    SELECT COUNT(*) INTO v_total_checkout_starts
    FROM tbz.eventos e
    JOIN tbz.sessoes s ON e.session_id = s.id
    JOIN tbz.identificador i ON s.fingerprint_hash = i.fingerprint_hash -- STRICT FILTER
    WHERE (e.event_type = 'checkout_click' OR e.event_type = 'offer_click')
      AND e.created_at >= v_start_date AND e.created_at <= v_end_date
      AND (p_produto = 'all' OR s.product_id = v_product_id)
      AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
      AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil);

    -- Total Sales (Sales come from Hotmart/Stripe, not necessarily linked to session in this table join, but we assume independence or existing link logic)
    -- Sales table usually has name/email, not session_id directly. We keep it as is (no session join usually here unless strict attribution required)
    SELECT COUNT(*), COALESCE(SUM(c.product_value), 0)
    INTO v_total_sales, v_total_sales_value
    FROM tbz.compras c
    WHERE c.purchase_date >= v_start_date AND c.purchase_date <= v_end_date
      AND (p_produto = 'all' OR c.product_id = v_product_id);
      
    -- Total Abandonments
    SELECT COUNT(*) INTO v_total_abandonments
    FROM tbz.abandono a
    JOIN tbz.sessoes s ON a.session_id = s.id
    JOIN tbz.identificador i ON s.fingerprint_hash = i.fingerprint_hash -- STRICT FILTER
    WHERE a.created_at >= v_start_date AND a.created_at <= v_end_date
      AND (p_produto = 'all' OR a.product_id = v_product_id)
      AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
      AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil);

    -- Total Comments
    SELECT COUNT(*) INTO v_total_comments
    FROM tbz.instagram_comments ic
    LEFT JOIN tbz.sessoes s ON ic.traffic_id = s.traffic_id
    -- Comments might not have fingerprint, keep loosely coupled or Strict?
    -- User asked for "Visits" in dashboard. Comments are separate. Let's keep comments loose as they might come from API.
    WHERE ic.created_at >= v_start_date AND ic.created_at <= v_end_date
      AND (p_produto = 'all' OR s.product_id = v_product_id)
      AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
      AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil);

    -- Abandonment by Step
    SELECT json_object_agg(step, json_build_object('abandoned_count', count))
    INTO v_abandonment_by_step
    FROM (
        SELECT a.step_where_abandoned as step, COUNT(*) as count
        FROM tbz.abandono a
        JOIN tbz.sessoes s ON a.session_id = s.id
        JOIN tbz.identificador i ON s.fingerprint_hash = i.fingerprint_hash -- STRICT FILTER
        WHERE a.created_at >= v_start_date AND a.created_at <= v_end_date
          AND (p_produto = 'all' OR a.product_id = v_product_id)
          AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
          AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil)
        GROUP BY step
    ) t;

    -- Funnel Data
    v_funnel_data := json_build_array(
        json_build_object('step', 'Visitas', 'count', v_total_visits),
        json_build_object('step', 'Quiz Iniciado', 'count', v_total_quiz_starts),
        json_build_object('step', 'Leads Gerados', 'count', v_total_leads),
        json_build_object('step', 'Quiz Completo', 'count', v_total_quiz_complete),
        json_build_object('step', 'Checkout Iniciado', 'count', v_total_checkout_starts),
        json_build_object('step', 'Vendas', 'count', v_total_sales)
    );

    RETURN json_build_object(
        'total_visits', v_total_visits,
        'total_quiz_starts', v_total_quiz_starts,
        'total_leads', v_total_leads,
        'total_quiz_complete', v_total_quiz_complete,
        'total_checkout_starts', v_total_checkout_starts,
        'total_sales', v_total_sales,
        'total_sales_value', v_total_sales_value,
        'total_abandonments', v_total_abandonments,
        'total_comments', v_total_comments,
        'comments_to_visits_conversion', CASE WHEN v_total_visits > 0 THEN ROUND((v_total_comments::numeric / v_total_visits::numeric) * 100, 2) ELSE 0 END,
        'conversion_rates', json_build_object(
            'visit_to_quiz_start', CASE WHEN v_total_visits > 0 THEN ROUND((v_total_quiz_starts::numeric / v_total_visits::numeric) * 100, 2) ELSE 0 END,
            'quiz_start_to_lead', CASE WHEN v_total_quiz_starts > 0 THEN ROUND((v_total_leads::numeric / v_total_quiz_starts::numeric) * 100, 2) ELSE 0 END,
            'lead_to_quiz_complete', CASE WHEN v_total_leads > 0 THEN ROUND((v_total_quiz_complete::numeric / v_total_leads::numeric) * 100, 2) ELSE 0 END,
            'quiz_complete_to_checkout', CASE WHEN v_total_quiz_complete > 0 THEN ROUND((v_total_checkout_starts::numeric / v_total_quiz_complete::numeric) * 100, 2) ELSE 0 END,
            'sales_conversion_from_leads', CASE WHEN v_total_leads > 0 THEN ROUND((v_total_sales::numeric / v_total_leads::numeric) * 100, 2) ELSE 0 END
        ),
        'funnel_data', v_funnel_data,
        'abandonment_by_step', COALESCE(v_abandonment_by_step, '{}'::json),
        'abandonment_rate', CASE WHEN v_total_visits > 0 THEN ROUND((v_total_abandonments::numeric / v_total_visits::numeric) * 100, 2) ELSE 0 END
    );
END;
$function$;

-- 2. tbz.get_leads_data (No change needed? Leads already imply real users. But we can ensure strict JOIN)
CREATE OR REPLACE FUNCTION tbz.get_leads_data(p_date_filter text, p_custom_date text DEFAULT NULL::text, p_produto text DEFAULT 'all'::text, p_tag_source text DEFAULT 'all'::text, p_fonte_de_trafego text DEFAULT 'all'::text, p_tipo_de_funil text DEFAULT 'all'::text)
 RETURNS TABLE(id uuid, name text, email text, phone text, urgency_level text, created_at timestamp with time zone, product_name text, traffic_id text, fonte_de_trafego text, tipo_de_funil text, checkout_initiated boolean, tags jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_start_date timestamp with time zone;
    v_end_date timestamp with time zone;
BEGIN
    IF p_date_filter = 'today' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date::timestamp AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := now();
    ELSIF p_date_filter = 'yesterday' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo' - interval '1 day')::date::timestamp AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date::timestamp AT TIME ZONE 'America/Sao_Paulo') - interval '1 second';
    ELSIF p_date_filter = 'custom' AND p_custom_date IS NOT NULL AND p_custom_date != '' THEN
        v_start_date := (p_custom_date || ' 00:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := (p_custom_date || ' 23:59:59')::timestamp AT TIME ZONE 'America/Sao_Paulo';
    ELSE
        v_start_date := '2000-01-01 00:00:00'::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := now();
    END IF;

    RETURN QUERY
    WITH LatestSession AS (
        SELECT DISTINCT ON (s.fingerprint_hash) 
            s.fingerprint_hash, 
            s.traffic_id, 
            s.fonte_de_trafego, 
            s.tipo_de_funil
        FROM tbz.sessoes s
        ORDER BY s.fingerprint_hash, s.created_at DESC
    ),
    LeadProduct AS (
        SELECT DISTINCT ON (lp.lead_id)
            lp.lead_id,
            p.name as product_name,
            p.slug as product_slug
        FROM tbz.lead_products lp
        JOIN tbz.produtos p ON lp.product_id = p.id
        ORDER BY lp.lead_id, lp.created_at DESC
    ),
    LeadTags AS (
        SELECT 
            lta.lead_id,
            jsonb_agg(jsonb_build_object(
                'name', t.name,
                'source', 'unknown',
                'created_at', lta.assigned_at
            )) as tags
        FROM tbz.lead_tag_assignments lta
        JOIN tbz.tags t ON lta.tag_id = t.id
        GROUP BY lta.lead_id
    )
    SELECT 
        l.id,
        l.name,
        l.email,
        l.phone,
        l.urgency_level,
        l.created_at,
        COALESCE(lp.product_name, 'N/A') as product_name,
        COALESCE(ls.traffic_id, '-') as traffic_id,
        COALESCE(ls.fonte_de_trafego, '-') as fonte_de_trafego,
        COALESCE(ls.tipo_de_funil, '-') as tipo_de_funil,
        EXISTS(
            SELECT 1 FROM tbz.eventos e 
            JOIN tbz.sessoes s ON e.session_id = s.id 
            WHERE s.fingerprint_hash = l.fingerprint_hash 
            AND (e.event_type = 'checkout_click' OR e.event_type = 'offer_click')
        ) as checkout_initiated,
        COALESCE(lt.tags, '[]'::jsonb) as tags
    FROM tbz.leads l
    LEFT JOIN LatestSession ls ON l.fingerprint_hash = ls.fingerprint_hash
    LEFT JOIN LeadProduct lp ON l.id = lp.lead_id
    LEFT JOIN LeadTags lt ON l.id = lt.lead_id
    WHERE 
        l.created_at >= v_start_date AND l.created_at <= v_end_date
        AND (p_produto = 'all' OR lp.product_slug = p_produto)
        AND (p_fonte_de_trafego = 'all' OR ls.fonte_de_trafego = p_fonte_de_trafego)
        AND (p_tipo_de_funil = 'all' OR ls.tipo_de_funil = p_tipo_de_funil)
    ORDER BY l.created_at DESC;
END;
$function$;

-- 3. tbz.get_abandonment_data (STRICT FILTER)
CREATE OR REPLACE FUNCTION tbz.get_abandonment_data(p_date_filter text, p_custom_date text DEFAULT NULL::text, p_produto text DEFAULT 'all'::text, p_fonte_de_trafego text DEFAULT 'all'::text, p_tipo_de_funil text DEFAULT 'all'::text)
 RETURNS TABLE(id uuid, data_hora timestamp with time zone, etapa_abandono text, motivo text, tempo_gasto integer, fonte_trafego text, tipo_funil text, traffic_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_start_date timestamp with time zone;
    v_end_date timestamp with time zone;
BEGIN
    IF p_date_filter = 'today' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date::timestamp AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := now();
    ELSIF p_date_filter = 'yesterday' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo' - interval '1 day')::date::timestamp AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date::timestamp AT TIME ZONE 'America/Sao_Paulo') - interval '1 second';
    ELSIF p_date_filter = 'custom' AND p_custom_date IS NOT NULL AND p_custom_date != '' THEN
        v_start_date := (p_custom_date || ' 00:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := (p_custom_date || ' 23:59:59')::timestamp AT TIME ZONE 'America/Sao_Paulo';
    ELSE
        v_start_date := '2000-01-01 00:00:00'::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := now();
    END IF;

    RETURN QUERY
    SELECT 
        a.id,
        COALESCE(a.updated_at, a.created_at) as data_hora,
        a.step_where_abandoned as etapa_abandono,
        a.reason as motivo,
        0 as tempo_gasto,
        COALESCE(s.fonte_de_trafego, 'unknown') as fonte_trafego,
        COALESCE(s.tipo_de_funil, 'unknown') as tipo_funil,
        COALESCE(s.traffic_id, 'unknown') as traffic_id
    FROM tbz.abandono a
    JOIN tbz.sessoes s ON a.session_id = s.id
    JOIN tbz.identificador i ON s.fingerprint_hash = i.fingerprint_hash -- STRICT FILTER
    LEFT JOIN tbz.produtos p ON a.product_id = p.id
    WHERE 
        (COALESCE(a.updated_at, a.created_at) >= v_start_date AND COALESCE(a.updated_at, a.created_at) <= v_end_date)
        AND (p_produto = 'all' OR p.slug = p_produto)
        AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
        AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil)
    ORDER BY data_hora DESC;
END;
$function$;

-- 4. tbz.get_visits_data (STRICT FILTER & Location Fallback)
CREATE OR REPLACE FUNCTION tbz.get_visits_data(p_date_filter text, p_custom_date text DEFAULT NULL::text, p_produto text DEFAULT 'all'::text, p_fonte_de_trafego text DEFAULT 'all'::text, p_tipo_de_funil text DEFAULT 'all'::text)
 RETURNS TABLE(id uuid, ip_address text, country_code text, region_name text, city text, produto text, fonte_de_trafego text, tipo_de_funil text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_start_date timestamp with time zone;
    v_end_date timestamp with time zone;
BEGIN
    IF p_date_filter = 'today' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date::timestamp AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := now();
    ELSIF p_date_filter = 'yesterday' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo' - interval '1 day')::date::timestamp AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date::timestamp AT TIME ZONE 'America/Sao_Paulo') - interval '1 second';
    ELSIF p_date_filter = 'custom' AND p_custom_date IS NOT NULL AND p_custom_date != '' THEN
        v_start_date := (p_custom_date || ' 00:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := (p_custom_date || ' 23:59:59')::timestamp AT TIME ZONE 'America/Sao_Paulo';
    ELSE
        v_start_date := '2000-01-01 00:00:00'::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := now();
    END IF;

    RETURN QUERY
    SELECT 
        s.id,
        COALESCE(i.original_ip, s.ip_address) as ip_address,
        -- Prioritize Session Location, Fallback to Identificador, Fallback to BR/Unknown
        COALESCE(s.country_code, i.country_code, 'BR') as country_code,
        COALESCE(s.region_name, i.region_name, 'Unknown') as region_name,
        COALESCE(s.city, i.city, 'Unknown') as city,
        p.slug as produto,
        s.fonte_de_trafego,
        s.tipo_de_funil,
        s.created_at
    FROM tbz.sessoes s
    JOIN tbz.identificador i ON s.fingerprint_hash = i.fingerprint_hash -- STRICT FILTER, only real users
    LEFT JOIN tbz.produtos p ON s.product_id = p.id
    WHERE 
        s.created_at >= v_start_date AND s.created_at <= v_end_date
        AND (p_produto = 'all' OR p.slug = p_produto)
        AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
        AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil)
    ORDER BY s.created_at DESC;
END;
$function$;

-- 5. tbz.get_visit_locations (STRICT FILTER & Location Fallback)
CREATE OR REPLACE FUNCTION tbz.get_visit_locations(p_date_filter text, p_custom_date text DEFAULT NULL::text, p_produto text DEFAULT 'all'::text, p_fonte_de_trafego text DEFAULT 'all'::text, p_tipo_de_funil text DEFAULT 'all'::text)
 RETURNS TABLE(region_name text, count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_start_date timestamp with time zone;
    v_end_date timestamp with time zone;
BEGIN
    IF p_date_filter = 'today' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date::timestamp AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := now();
    ELSIF p_date_filter = 'yesterday' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo' - interval '1 day')::date::timestamp AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date::timestamp AT TIME ZONE 'America/Sao_Paulo') - interval '1 second';
    ELSIF p_date_filter = 'custom' AND p_custom_date IS NOT NULL AND p_custom_date != '' THEN
        v_start_date := (p_custom_date || ' 00:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := (p_custom_date || ' 23:59:59')::timestamp AT TIME ZONE 'America/Sao_Paulo';
    ELSE
        v_start_date := '2000-01-01 00:00:00'::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := now();
    END IF;

    RETURN QUERY
    SELECT 
        -- Prioritize Session Location
        COALESCE(s.region_name, i.region_name, 'Unknown') as region_name,
        COUNT(*) as count
    FROM tbz.sessoes s
    JOIN tbz.identificador i ON s.fingerprint_hash = i.fingerprint_hash -- STRICT FILTER
    LEFT JOIN tbz.produtos p ON s.product_id = p.id
    WHERE 
        s.created_at >= v_start_date AND s.created_at <= v_end_date
        AND (p_produto = 'all' OR p.slug = p_produto)
        AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
        AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil)
    GROUP BY COALESCE(s.region_name, i.region_name, 'Unknown')
    ORDER BY count DESC
    LIMIT 10;
END;
$function$;

