-- Migration: Adjust Timezone to America/Sao_Paulo (GMT-3)
-- Description: Updates reporting functions to respect proper timezone boundaries for 'today', 'yesterday' and custom dates.

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
    -- 1. Determine Date Range (Timezone Adjusted)
    IF p_date_filter = 'today' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := now();
    ELSIF p_date_filter = 'yesterday' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo' - interval '1 day')::date AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date AT TIME ZONE 'America/Sao_Paulo') - interval '1 second';
    ELSIF p_date_filter = 'custom' AND p_custom_date IS NOT NULL AND p_custom_date != '' THEN
        v_start_date := (p_custom_date || ' 00:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := (p_custom_date || ' 23:59:59')::timestamp AT TIME ZONE 'America/Sao_Paulo';
    ELSE
        v_start_date := '2000-01-01 00:00:00'::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := now();
    END IF;

    -- 2. Resolve Product ID (if specific product selected)
    IF p_produto != 'all' THEN
        SELECT id INTO v_product_id FROM tbz.produtos WHERE slug = p_produto LIMIT 1;
    END IF;

    -- 3. Calculate Metrics using CTEs for cleaner logic
    -- We filter sessions first, then join other tables or filter them similarly
    
    -- Total Visits (Sessions)
    SELECT COUNT(*) INTO v_total_visits
    FROM tbz.sessoes s
    WHERE s.created_at >= v_start_date AND s.created_at <= v_end_date
      AND (p_produto = 'all' OR s.product_id = v_product_id)
      AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
      AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil);

    -- Total Quiz Starts (Events)
    SELECT COUNT(*) INTO v_total_quiz_starts
    FROM tbz.eventos e
    JOIN tbz.sessoes s ON e.session_id = s.id
    WHERE e.event_type = 'quiz_start'
      AND e.created_at >= v_start_date AND e.created_at <= v_end_date
      AND (p_produto = 'all' OR s.product_id = v_product_id)
      AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
      AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil);

    -- Total Leads (Leads table joined with Sessions for filters)
    SELECT COUNT(DISTINCT l.id) INTO v_total_leads
    FROM tbz.leads l
    JOIN tbz.sessoes s ON l.fingerprint_hash = s.fingerprint_hash
    WHERE l.created_at >= v_start_date AND l.created_at <= v_end_date
      AND (p_produto = 'all' OR s.product_id = v_product_id)
      AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
      AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil);

    -- Total Quiz Complete
    SELECT COUNT(*) INTO v_total_quiz_complete
    FROM tbz.eventos e
    JOIN tbz.sessoes s ON e.session_id = s.id
    WHERE e.event_type = 'quiz_complete'
      AND e.created_at >= v_start_date AND e.created_at <= v_end_date
      AND (p_produto = 'all' OR s.product_id = v_product_id)
      AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
      AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil);

    -- Total Checkout Starts
    SELECT COUNT(*) INTO v_total_checkout_starts
    FROM tbz.eventos e
    JOIN tbz.sessoes s ON e.session_id = s.id
    WHERE (e.event_type = 'checkout_click' OR e.event_type = 'offer_click')
      AND e.created_at >= v_start_date AND e.created_at <= v_end_date
      AND (p_produto = 'all' OR s.product_id = v_product_id)
      AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
      AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil);

    -- Total Sales & Value
    SELECT COUNT(*), COALESCE(SUM(c.product_value), 0)
    INTO v_total_sales, v_total_sales_value
    FROM tbz.compras c
    WHERE c.purchase_date >= v_start_date AND c.purchase_date <= v_end_date
      AND (p_produto = 'all' OR c.product_id = v_product_id);
      
    -- Total Abandonments
    SELECT COUNT(*) INTO v_total_abandonments
    FROM tbz.abandono a
    JOIN tbz.sessoes s ON a.session_id = s.id
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

    -- Return JSON
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

-- 2. tbz.get_leads_data (Variant with p_tag_source)
CREATE OR REPLACE FUNCTION tbz.get_leads_data(p_date_filter text, p_custom_date text DEFAULT NULL::text, p_produto text DEFAULT 'all'::text, p_tag_source text DEFAULT 'all'::text, p_fonte_de_trafego text DEFAULT 'all'::text, p_tipo_de_funil text DEFAULT 'all'::text)
 RETURNS TABLE(id uuid, name text, email text, phone text, urgency_level text, created_at timestamp with time zone, product_name text, traffic_id text, fonte_de_trafego text, tipo_de_funil text, checkout_initiated boolean, tags jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_start_date timestamp with time zone;
    v_end_date timestamp with time zone;
BEGIN
    -- Determine Date Range (Timezone Adjusted)
    IF p_date_filter = 'today' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := now();
    ELSIF p_date_filter = 'yesterday' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo' - interval '1 day')::date AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date AT TIME ZONE 'America/Sao_Paulo') - interval '1 second';
    ELSIF p_date_filter = 'custom' AND p_custom_date IS NOT NULL AND p_custom_date != '' THEN
        v_start_date := (p_custom_date || ' 00:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := (p_custom_date || ' 23:59:59')::timestamp AT TIME ZONE 'America/Sao_Paulo';
    ELSE
        v_start_date := '2000-01-01 00:00:00'::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := now();
    END IF;

    RETURN QUERY
    WITH LatestSession AS (
        SELECT DISTINCT ON (fingerprint_hash) 
            fingerprint_hash, 
            traffic_id, 
            fonte_de_trafego, 
            tipo_de_funil
        FROM tbz.sessoes
        ORDER BY fingerprint_hash, created_at DESC
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

-- 3. tbz.get_abandonment_data
CREATE OR REPLACE FUNCTION tbz.get_abandonment_data(p_date_filter text, p_custom_date text DEFAULT NULL::text, p_produto text DEFAULT 'all'::text, p_fonte_de_trafego text DEFAULT 'all'::text, p_tipo_de_funil text DEFAULT 'all'::text)
 RETURNS TABLE(id uuid, data_hora timestamp with time zone, etapa_abandono text, motivo text, tempo_gasto integer, fonte_trafego text, tipo_funil text, traffic_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_start_date timestamp with time zone;
    v_end_date timestamp with time zone;
BEGIN
    -- Determine Date Range (Timezone Adjusted)
    IF p_date_filter = 'today' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := now();
    ELSIF p_date_filter = 'yesterday' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo' - interval '1 day')::date AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date AT TIME ZONE 'America/Sao_Paulo') - interval '1 second';
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
    LEFT JOIN tbz.sessoes s ON a.session_id = s.id
    LEFT JOIN tbz.produtos p ON a.product_id = p.id
    WHERE 
        (COALESCE(a.updated_at, a.created_at) >= v_start_date AND COALESCE(a.updated_at, a.created_at) <= v_end_date)
        AND (p_produto = 'all' OR p.slug = p_produto)
        AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
        AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil)
    ORDER BY data_hora DESC;
END;
$function$;

-- 4. tbz.get_visits_data
CREATE OR REPLACE FUNCTION tbz.get_visits_data(p_date_filter text, p_custom_date text DEFAULT NULL::text, p_produto text DEFAULT 'all'::text, p_fonte_de_trafego text DEFAULT 'all'::text, p_tipo_de_funil text DEFAULT 'all'::text)
 RETURNS TABLE(id uuid, ip_address text, country_code text, region_name text, city text, produto text, fonte_de_trafego text, tipo_de_funil text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_start_date timestamp with time zone;
    v_end_date timestamp with time zone;
BEGIN
    -- Determine Date Range (Timezone Adjusted)
    IF p_date_filter = 'today' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := now();
    ELSIF p_date_filter = 'yesterday' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo' - interval '1 day')::date AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date AT TIME ZONE 'America/Sao_Paulo') - interval '1 second';
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
        COALESCE(i.country_code, 'BR') as country_code,
        COALESCE(i.region_name, 'Unknown') as region_name,
        COALESCE(i.city, 'Unknown') as city,
        p.slug as produto,
        s.fonte_de_trafego,
        s.tipo_de_funil,
        s.created_at
    FROM tbz.sessoes s
    LEFT JOIN tbz.identificador i ON s.fingerprint_hash = i.fingerprint_hash
    LEFT JOIN tbz.produtos p ON s.product_id = p.id
    WHERE 
        s.created_at >= v_start_date AND s.created_at <= v_end_date
        AND (p_produto = 'all' OR p.slug = p_produto)
        AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
        AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil)
    ORDER BY s.created_at DESC;
END;
$function$;

-- 5. tbz.get_visit_locations
CREATE OR REPLACE FUNCTION tbz.get_visit_locations(p_date_filter text, p_custom_date text DEFAULT NULL::text, p_produto text DEFAULT 'all'::text, p_fonte_de_trafego text DEFAULT 'all'::text, p_tipo_de_funil text DEFAULT 'all'::text)
 RETURNS TABLE(region_name text, count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_start_date timestamp with time zone;
    v_end_date timestamp with time zone;
BEGIN
    -- Determine Date Range (Timezone Adjusted)
    IF p_date_filter = 'today' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := now();
    ELSIF p_date_filter = 'yesterday' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo' - interval '1 day')::date AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date AT TIME ZONE 'America/Sao_Paulo') - interval '1 second';
    ELSIF p_date_filter = 'custom' AND p_custom_date IS NOT NULL AND p_custom_date != '' THEN
        v_start_date := (p_custom_date || ' 00:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := (p_custom_date || ' 23:59:59')::timestamp AT TIME ZONE 'America/Sao_Paulo';
    ELSE
        v_start_date := '2000-01-01 00:00:00'::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := now();
    END IF;

    RETURN QUERY
    SELECT 
        COALESCE(i.region_name, 'Unknown') as region_name,
        COUNT(*) as count
    FROM tbz.sessoes s
    LEFT JOIN tbz.identificador i ON s.fingerprint_hash = i.fingerprint_hash
    LEFT JOIN tbz.produtos p ON s.product_id = p.id
    WHERE 
        s.created_at >= v_start_date AND s.created_at <= v_end_date
        AND (p_produto = 'all' OR p.slug = p_produto)
        AND (p_fonte_de_trafego = 'all' OR s.fonte_de_trafego = p_fonte_de_trafego)
        AND (p_tipo_de_funil = 'all' OR s.tipo_de_funil = p_tipo_de_funil)
    GROUP BY COALESCE(i.region_name, 'Unknown')
    ORDER BY count DESC
    LIMIT 10;
END;
$function$;

-- 6. tbz.get_sales
CREATE OR REPLACE FUNCTION tbz.get_sales(p_date_filter text, p_custom_date text DEFAULT NULL::text, p_produto text DEFAULT 'all'::text, p_fonte_de_trafego text DEFAULT 'all'::text)
 RETURNS TABLE(id uuid, hotmart_transaction_id text, customer_name text, customer_email text, product_name text, product_value numeric, purchase_date timestamp with time zone, produto text, fonte_de_trafego text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_start_date timestamp with time zone;
    v_end_date timestamp with time zone;
BEGIN
    -- Determine Date Range (Timezone Adjusted)
    IF p_date_filter = 'today' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := now();
    ELSIF p_date_filter = 'yesterday' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo' - interval '1 day')::date AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date AT TIME ZONE 'America/Sao_Paulo') - interval '1 second';
    ELSIF p_date_filter = 'custom' AND p_custom_date IS NOT NULL AND p_custom_date != '' THEN
        v_start_date := (p_custom_date || ' 00:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := (p_custom_date || ' 23:59:59')::timestamp AT TIME ZONE 'America/Sao_Paulo';
    ELSE
        v_start_date := '2000-01-01 00:00:00'::timestamp AT TIME ZONE 'America/Sao_Paulo';
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

-- 7. tbz.get_sales_by_product
CREATE OR REPLACE FUNCTION tbz.get_sales_by_product(p_date_filter text, p_custom_date text DEFAULT NULL::text)
 RETURNS TABLE(produto text, count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_start_date timestamp with time zone;
    v_end_date timestamp with time zone;
BEGIN
    -- Determine Date Range (Timezone Adjusted)
    IF p_date_filter = 'today' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := now();
    ELSIF p_date_filter = 'yesterday' THEN
        v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo' - interval '1 day')::date AT TIME ZONE 'America/Sao_Paulo');
        v_end_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date AT TIME ZONE 'America/Sao_Paulo') - interval '1 second';
    ELSIF p_date_filter = 'custom' AND p_custom_date IS NOT NULL AND p_custom_date != '' THEN
        v_start_date := (p_custom_date || ' 00:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := (p_custom_date || ' 23:59:59')::timestamp AT TIME ZONE 'America/Sao_Paulo';
    ELSE
        v_start_date := '2000-01-01 00:00:00'::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := now();
    END IF;

    RETURN QUERY
    SELECT 
        p.name as produto,
        COUNT(*) as count
    FROM tbz.compras c
    JOIN tbz.produtos p ON c.product_id = p.id
    WHERE 
        c.purchase_date >= v_start_date AND c.purchase_date <= v_end_date
    GROUP BY p.name
    ORDER BY count DESC;
END;
$function$;
