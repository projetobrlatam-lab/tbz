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

    -- 4. Create/Update Session
    -- If it IS A BOT, we MUST insert NULL for fingerprint_hash to avoid FK violation with identificador table
    INSERT INTO tbz.sessoes (
        session_id, fingerprint_hash, ip_address, traffic_id, fonte_de_trafego, tipo_de_funil, current_step, product_id, created_at, updated_at
    ) VALUES (
        p_session_id, 
        CASE WHEN v_is_bot THEN NULL ELSE v_fingerprint_hash END, -- NULL for bots
        v_ip, p_traffic_id, p_fonte_de_trafego, p_tipo_de_funil, v_current_step, v_product_id, now(), now()
    )
    ON CONFLICT (session_id) DO UPDATE SET
        updated_at = now(),
        current_step = v_current_step,
        fingerprint_hash = CASE WHEN v_is_bot THEN NULL ELSE COALESCE(EXCLUDED.fingerprint_hash, tbz.sessoes.fingerprint_hash) END,
        traffic_id = COALESCE(EXCLUDED.traffic_id, tbz.sessoes.traffic_id),
        product_id = COALESCE(v_product_id, tbz.sessoes.product_id)
    RETURNING id INTO v_session_uuid;

    -- 5. Log Event (avoid duplicate quiz_start within short time or same session)
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

    -- 5.1 SYNC CHECKOUT STATUS ON CHECKOUT_CLICK OR OFFER_CLICK
    -- Check for 'checkout_click' or 'offer_click' (ensure compatibility)
    IF (p_event_type = 'checkout_click' OR p_event_type = 'offer_click') AND v_fingerprint_hash IS NOT NULL THEN
        UPDATE tbz.leads 
        SET checkout_initiated = TRUE, updated_at = now()
        WHERE fingerprint_hash = v_fingerprint_hash;
    END IF;

    -- 6. Special Handling for 'visit' -> tbz.visitas (Dedup 24h by fingerprint)
    -- If it's a bot, we can't use fingerprint for dedup logic easily. We can skip dedup or use session based check.
    -- Assuming we just want to log it.
    
    IF p_event_type = 'visit' THEN
        IF v_is_bot THEN
            -- Check duplication by session_id only for bots
             SELECT v.id INTO v_existing_visit_id
             FROM tbz.visitas v
             WHERE v.session_id = v_session_uuid
             LIMIT 1;
             
             IF v_existing_visit_id IS NULL THEN
                 INSERT INTO tbz.visitas (
                     session_id, landing_page, referrer, product_id, created_at
                 ) VALUES (
                     v_session_uuid, p_url, p_referrer, v_product_id, now()
                 );
             END IF;
        
        ELSIF v_fingerprint_hash IS NOT NULL THEN
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

    -- 7. Special Handling for 'lead_submit' -> tbz.leads
    IF p_event_type = 'lead_submit' AND p_email IS NOT NULL THEN
        -- Check if checkout was already initiated before this submission (rare but possible order)
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
               v_checkout_initiated -- Use existing history
           )
           ON CONFLICT (email) DO UPDATE SET
               name = COALESCE(EXCLUDED.name, tbz.leads.name),
               phone = COALESCE(EXCLUDED.phone, tbz.leads.phone),
               urgency_level = COALESCE(EXCLUDED.urgency_level, tbz.leads.urgency_level),
               updated_at = now(),
               checkout_initiated = (tbz.leads.checkout_initiated OR EXCLUDED.checkout_initiated) -- Keep TRUE if already TRUE
           RETURNING id INTO v_lead_id;
        END;
        
        -- Link Lead to Product
        IF v_lead_id IS NOT NULL AND v_product_id IS NOT NULL THEN
            INSERT INTO tbz.lead_products (lead_id, product_id, created_at, updated_at)
            VALUES (v_lead_id, v_product_id, now(), now())
            ON CONFLICT (lead_id, product_id) DO UPDATE SET updated_at = now();
        END IF;
    END IF;

    -- RETURN with lead_id if available
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

-- Backfill existing leads based on historical events
DO $$
BEGIN
    UPDATE tbz.leads l
    SET checkout_initiated = TRUE
    WHERE EXISTS (
        SELECT 1 FROM tbz.eventos e
        JOIN tbz.sessoes s ON e.session_id = s.id
        WHERE s.fingerprint_hash = l.fingerprint_hash
        AND (e.event_type = 'checkout_click' OR e.event_type = 'offer_click')
    );
END $$;
