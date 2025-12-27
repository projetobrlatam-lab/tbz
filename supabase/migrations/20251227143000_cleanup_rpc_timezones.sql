-- Migration: Cleanup RPC Timezones
-- Removes explicit 'AT TIME ZONE' conversions, relying on the database session timezone (America/Sao_Paulo).
-- Ensures all functions use CURRENT_DATE and proper timestamp casting relative to the session.

-- 1. get_dashboard_metrics
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
    -- Determine Date Range (Uses Session Timezone - BRT)
    IF p_date_filter = 'today' THEN
        v_start_date := CURRENT_DATE; -- 00:00:00 today in session TZ
        v_end_date := now();
    ELSIF p_date_filter = 'yesterday' THEN
        v_start_date := CURRENT_DATE - interval '1 day';
        v_end_date := CURRENT_DATE - interval '1 second'; -- 23:59:59 yesterday
    ELSIF p_date_filter = 'custom' AND p_custom_date IS NOT NULL AND p_custom_date != '' THEN
        v_start_date := (p_custom_date || ' 00:00:00')::timestamp; -- Interprets as local session time
        v_end_date := (p_custom_date || ' 23:59:59')::timestamp;
    ELSE
        v_start_date := '2000-01-01 00:00:00'::timestamp;
        v_end_date := now();
    END IF;

    -- Resolve Product ID
    IF p_produto != 'all' THEN
        SELECT id INTO v_product_id FROM tbz.produtos WHERE slug = p_produto LIMIT 1;
    END IF;

    -- Total Visits
    SELECT COUNT(*) INTO v_total_visits
    FROM tbz.sessoes s
    LEFT JOIN tbz.identificador i ON s.fingerprint_hash = i.fingerprint_hash
    WHERE s.created_at >= v_start_date AND s.created_at <= v_end_date
      AND (p_produto = 'all' OR s.product_id = v_product_id)
      AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
      AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil);

    -- Total Quiz Starts
    SELECT COUNT(*) INTO v_total_quiz_starts
    FROM tbz.eventos e
    JOIN tbz.sessoes s ON e.session_id = s.id
    LEFT JOIN tbz.identificador i ON s.fingerprint_hash = i.fingerprint_hash
    WHERE e.event_type = 'quiz_start'
      AND e.created_at >= v_start_date AND e.created_at <= v_end_date
      AND (p_produto = 'all' OR s.product_id = v_product_id)
      AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
      AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil);

    -- Total Leads (Preserving fix for lead_products)
    SELECT COUNT(DISTINCT l.id) INTO v_total_leads
    FROM tbz.leads l
    LEFT JOIN tbz.sessoes s ON l.fingerprint_hash = s.fingerprint_hash
    LEFT JOIN tbz.lead_products lp ON l.id = lp.lead_id
    WHERE l.created_at >= v_start_date AND l.created_at <= v_end_date
      AND (
          p_produto = 'all' 
          OR (s.product_id = v_product_id)
          OR (lp.product_id = v_product_id)
      )
      AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
      AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil);

    -- Total Quiz Complete
    SELECT COUNT(*) INTO v_total_quiz_complete
    FROM tbz.eventos e
    JOIN tbz.sessoes s ON e.session_id = s.id
    LEFT JOIN tbz.identificador i ON s.fingerprint_hash = i.fingerprint_hash
    WHERE e.event_type = 'quiz_complete'
      AND e.created_at >= v_start_date AND e.created_at <= v_end_date
      AND (p_produto = 'all' OR s.product_id = v_product_id)
      AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
      AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil);

    -- Total Checkout Starts
    SELECT COUNT(*) INTO v_total_checkout_starts
    FROM tbz.eventos e
    JOIN tbz.sessoes s ON e.session_id = s.id
    LEFT JOIN tbz.identificador i ON s.fingerprint_hash = i.fingerprint_hash
    WHERE (e.event_type = 'checkout_click' OR e.event_type = 'offer_click')
      AND e.created_at >= v_start_date AND e.created_at <= v_end_date
      AND (p_produto = 'all' OR s.product_id = v_product_id)
      AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
      AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil);

    -- Total Sales
    SELECT COUNT(*), COALESCE(SUM(c.product_value), 0)
    INTO v_total_sales, v_total_sales_value
    FROM tbz.compras c
    WHERE c.purchase_date >= v_start_date AND c.purchase_date <= v_end_date
      AND (p_produto = 'all' OR c.product_id = v_product_id);
      
    -- Total Abandonments
    SELECT COUNT(*) INTO v_total_abandonments
    FROM tbz.abandono a
    JOIN tbz.sessoes s ON a.session_id = s.id
    LEFT JOIN tbz.identificador i ON s.fingerprint_hash = i.fingerprint_hash
    WHERE a.created_at >= v_start_date AND a.created_at <= v_end_date
      AND (p_produto = 'all' OR a.product_id = v_product_id)
      AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
      AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil);

    -- Total Comments
    SELECT COUNT(*) INTO v_total_comments
    FROM tbz.instagram_comments ic
    LEFT JOIN tbz.sessoes s ON ic.traffic_id = s.traffic_id
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
        LEFT JOIN tbz.identificador i ON s.fingerprint_hash = i.fingerprint_hash
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

-- 2. get_leads_data
CREATE OR REPLACE FUNCTION tbz.get_leads_data(p_date_filter text, p_custom_date text DEFAULT NULL::text, p_produto text DEFAULT 'all'::text, p_tag_source text DEFAULT 'all'::text, p_fonte_de_trafego text DEFAULT 'all'::text, p_tipo_de_funil text DEFAULT 'all'::text)
 RETURNS TABLE(id uuid, name text, email text, phone text, traffic_id text, produto text, fonte_de_trafego text, tipo_de_funil text, urgency_level text, iniciar_checkout boolean, created_at timestamp with time zone, updated_at timestamp with time zone, tags json, ai_analysis_data json, ai_tag_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_start_date timestamp with time zone;
    v_end_date timestamp with time zone;
    v_product_id uuid;
BEGIN
    IF p_date_filter = 'today' THEN
        v_start_date := CURRENT_DATE;
        v_end_date := now();
    ELSIF p_date_filter = 'yesterday' THEN
        v_start_date := CURRENT_DATE - interval '1 day';
        v_end_date := CURRENT_DATE - interval '1 second';
    ELSIF p_date_filter = 'custom' AND p_custom_date IS NOT NULL AND p_custom_date != '' THEN
        v_start_date := (p_custom_date || ' 00:00:00')::timestamp;
        v_end_date := (p_custom_date || ' 23:59:59')::timestamp;
    ELSE
        v_start_date := '2000-01-01 00:00:00'::timestamp;
        v_end_date := now();
    END IF;

    IF p_produto != 'all' THEN
        SELECT id INTO v_product_id FROM tbz.produtos WHERE slug = p_produto LIMIT 1;
    END IF;

    RETURN QUERY
    SELECT DISTINCT ON (l.id)
        l.id,
        l.name,
        l.email,
        l.phone,
        l.traffic_id,
        COALESCE(p.slug, sp.slug, 'unknown') as produto,
        COALESCE(s.fonte_de_trafego, 'unknown') as fonte_de_trafego,
        COALESCE(s.tipo_de_funil, 'unknown') as tipo_de_funil,
        l.urgency_level,
        l.checkout_initiated as iniciar_checkout,
        l.created_at,
        l.updated_at,
        COALESCE(
            (
                SELECT json_agg(json_build_object('id', t.id, 'tag_name', t.name))
                FROM tbz.lead_tag_assignments lta
                JOIN tbz.tags t ON lta.tag_id = t.id
                WHERE lta.lead_id = l.id
            ),
            '[]'::json
        ) as tags,
        l.ai_analysis_data,
        (
            SELECT t.name 
            FROM tbz.lead_tag_assignments lta 
            JOIN tbz.tags t ON lta.tag_id = t.id 
            WHERE lta.lead_id = l.id AND t.category = 'Nível de Urgência' 
            LIMIT 1
        ) as ai_tag_name
    FROM tbz.leads l
    LEFT JOIN tbz.sessoes s ON l.fingerprint_hash = s.fingerprint_hash
    LEFT JOIN tbz.produtos sp ON s.product_id = sp.id
    LEFT JOIN tbz.lead_products lp ON l.id = lp.lead_id
    LEFT JOIN tbz.produtos p ON lp.product_id = p.id
    LEFT JOIN tbz.lead_tag_assignments lta_filter ON l.id = lta_filter.lead_id
    LEFT JOIN tbz.tags t_filter ON lta_filter.tag_id = t_filter.id
    WHERE 
        l.created_at >= v_start_date AND l.created_at <= v_end_date
        AND (p_produto = 'all' OR sp.slug = p_produto OR p.slug = p_produto)
        AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
        AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil)
        AND (
            p_tag_source = 'all' 
            OR (p_tag_source = 'Quiz' AND t_filter.source = 'Quiz')
            OR (p_tag_source = 'Agente IA' AND t_filter.source = 'Agente IA')
        )
    ORDER BY l.id, l.created_at DESC;
END;
$function$;

-- 3. get_visits_data
CREATE OR REPLACE FUNCTION tbz.get_visits_data(p_date_filter text, p_custom_date text DEFAULT NULL::text, p_produto text DEFAULT 'all'::text, p_fonte_de_trafego text DEFAULT 'all'::text, p_tipo_de_funil text DEFAULT 'all'::text)
 RETURNS TABLE(id uuid, ip_address text, city text, region_name text, country_code text, country_name text, traffic_id text, produto text, fonte_de_trafego text, tipo_de_funil text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_start_date timestamp with time zone;
    v_end_date timestamp with time zone;
    v_product_id uuid;
BEGIN
    IF p_date_filter = 'today' THEN
        v_start_date := CURRENT_DATE;
        v_end_date := now();
    ELSIF p_date_filter = 'yesterday' THEN
        v_start_date := CURRENT_DATE - interval '1 day';
        v_end_date := CURRENT_DATE - interval '1 second';
    ELSIF p_date_filter = 'custom' AND p_custom_date IS NOT NULL AND p_custom_date != '' THEN
        v_start_date := (p_custom_date || ' 00:00:00')::timestamp;
        v_end_date := (p_custom_date || ' 23:59:59')::timestamp;
    ELSE
        v_start_date := '2000-01-01 00:00:00'::timestamp;
        v_end_date := now();
    END IF;

    IF p_produto != 'all' THEN
        SELECT id INTO v_product_id FROM tbz.produtos WHERE slug = p_produto LIMIT 1;
    END IF;

    RETURN QUERY
    SELECT 
        s.id,
        COALESCE(s.ip_address, i.ip_address) as ip_address,
        COALESCE(s.city, i.city) as city,
        COALESCE(s.region_name, i.region_name) as region_name,
        COALESCE(s.country_code, i.country_code) as country_code,
        COALESCE(s.country_name, i.country_name) as country_name,
        s.traffic_id,
        COALESCE(p.slug, 'unknown') as produto,
        COALESCE(s.fonte_de_trafego, 'unknown') as fonte_de_trafego,
        COALESCE(s.tipo_de_funil, 'unknown') as tipo_de_funil,
        s.created_at
    FROM tbz.sessoes s
    LEFT JOIN tbz.identificador i ON s.fingerprint_hash = i.fingerprint_hash
    LEFT JOIN tbz.produtos p ON s.product_id = p.id
    WHERE 
        s.created_at >= v_start_date AND s.created_at <= v_end_date
        AND (p_produto = 'all' OR s.product_id = v_product_id)
        AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
        AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil)
    ORDER BY s.created_at DESC;
END;
$function$;

-- 4. get_abandonment_data
CREATE OR REPLACE FUNCTION tbz.get_abandonment_data(p_date_filter text, p_custom_date text DEFAULT NULL::text, p_produto text DEFAULT 'all'::text, p_fonte_de_trafego text DEFAULT 'all'::text, p_tipo_de_funil text DEFAULT 'all'::text)
 RETURNS TABLE(id uuid, reason text, step_where_abandoned text, created_at timestamp with time zone, traffic_id text, produto text, fonte_de_trafego text, tipo_de_funil text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_start_date timestamp with time zone;
    v_end_date timestamp with time zone;
    v_product_id uuid;
BEGIN
    IF p_date_filter = 'today' THEN
        v_start_date := CURRENT_DATE;
        v_end_date := now();
    ELSIF p_date_filter = 'yesterday' THEN
        v_start_date := CURRENT_DATE - interval '1 day';
        v_end_date := CURRENT_DATE - interval '1 second';
    ELSIF p_date_filter = 'custom' AND p_custom_date IS NOT NULL AND p_custom_date != '' THEN
        v_start_date := (p_custom_date || ' 00:00:00')::timestamp;
        v_end_date := (p_custom_date || ' 23:59:59')::timestamp;
    ELSE
        v_start_date := '2000-01-01 00:00:00'::timestamp;
        v_end_date := now();
    END IF;

    IF p_produto != 'all' THEN
        SELECT id INTO v_product_id FROM tbz.produtos WHERE slug = p_produto LIMIT 1;
    END IF;

    RETURN QUERY
    SELECT 
        a.id,
        a.reason,
        a.step_where_abandoned,
        a.created_at,
        s.traffic_id,
        COALESCE(p.slug, 'unknown') as produto,
        COALESCE(s.fonte_de_trafego, 'unknown') as fonte_de_trafego,
        COALESCE(s.tipo_de_funil, 'unknown') as tipo_de_funil
    FROM tbz.abandono a
    JOIN tbz.sessoes s ON a.session_id = s.id
    LEFT JOIN tbz.produtos p ON s.product_id = p.id
    WHERE 
        a.created_at >= v_start_date AND a.created_at <= v_end_date
        AND (p_produto = 'all' OR s.product_id = v_product_id)
        AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
        AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil)
    ORDER BY a.created_at DESC;
END;
$function$;

-- 5. get_visit_locations
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
        v_start_date := CURRENT_DATE;
        v_end_date := now();
    ELSIF p_date_filter = 'yesterday' THEN
        v_start_date := CURRENT_DATE - interval '1 day';
        v_end_date := CURRENT_DATE - interval '1 second';
    ELSIF p_date_filter = 'custom' AND p_custom_date IS NOT NULL AND p_custom_date != '' THEN
        v_start_date := (p_custom_date || ' 00:00:00')::timestamp;
        v_end_date := (p_custom_date || ' 23:59:59')::timestamp;
    ELSE
        v_start_date := '2000-01-01 00:00:00'::timestamp;
        v_end_date := now();
    END IF;

    RETURN QUERY
    SELECT 
        COALESCE(s.region_name, i.region_name, 'Unknown') as region_name,
        COUNT(*) as count
    FROM tbz.sessoes s
    LEFT JOIN tbz.identificador i ON s.fingerprint_hash = i.fingerprint_hash
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

-- 6. get_sales
CREATE OR REPLACE FUNCTION tbz.get_sales(p_date_filter text, p_custom_date text DEFAULT NULL::text, p_produto text DEFAULT 'all'::text)
 RETURNS TABLE(id uuid, hotmart_transaction_id text, customer_name text, customer_email text, product_name text, product_value numeric, purchase_date timestamp with time zone, produto text, fonte_de_trafego text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_start_date timestamp with time zone;
    v_end_date timestamp with time zone;
BEGIN
    IF p_date_filter = 'today' THEN
        v_start_date := CURRENT_DATE;
        v_end_date := now();
    ELSIF p_date_filter = 'yesterday' THEN
        v_start_date := CURRENT_DATE - interval '1 day';
        v_end_date := CURRENT_DATE - interval '1 second';
    ELSIF p_date_filter = 'custom' AND p_custom_date IS NOT NULL AND p_custom_date != '' THEN
        v_start_date := (p_custom_date || ' 00:00:00')::timestamp;
        v_end_date := (p_custom_date || ' 23:59:59')::timestamp;
    ELSE
        v_start_date := '2000-01-01 00:00:00'::timestamp;
        v_end_date := now();
    END IF;

    RETURN QUERY
    SELECT 
        c.id,
        c.hotmart_transaction_id,
        c.customer_name,
        c.customer_email,
        COALESCE(p.name, c.product_name) as product_name,
        c.product_value,
        c.purchase_date,
        p.slug as produto,
        'unknown'::text as fonte_de_trafego
    FROM tbz.compras c
    LEFT JOIN tbz.produtos p ON c.product_id = p.id
    WHERE 
        c.purchase_date >= v_start_date AND c.purchase_date <= v_end_date
        AND (p_produto = 'all' OR p.slug = p_produto)
    ORDER BY c.purchase_date DESC;
END;
$function$;
