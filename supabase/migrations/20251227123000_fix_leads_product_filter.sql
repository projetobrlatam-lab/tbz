-- Migration: Fix Leads Product Filter
-- Updates get_dashboard_metrics to check lead_products table for product filtering, ensuring leads with missing sessions are still counted if they have the product assigned.

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

    -- Total Visits (Sessions LEFT JOIN identificador)
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

    -- Total Leads (LEFT JOIN sessoes AND LEFT JOIN lead_products)
    -- FIX: Check lead_products for product filter fallback
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

    -- Total Sales (Unchanged)
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
