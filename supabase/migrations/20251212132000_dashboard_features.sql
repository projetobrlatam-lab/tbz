-- Function to clean all data associated with a specific IP
CREATE OR REPLACE FUNCTION tbz.clean_data_by_ip(p_ip_address TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_fingerprint_hashes text[];
BEGIN
    -- Get all fingerprint hashes associated with this IP from identificador
    SELECT array_agg(fingerprint_hash) INTO v_fingerprint_hashes
    FROM tbz.identificador
    WHERE original_ip = p_ip_address;

    -- Delete from leads associated with these fingerprints
    IF v_fingerprint_hashes IS NOT NULL THEN
        DELETE FROM tbz.leads WHERE fingerprint_hash = ANY(v_fingerprint_hashes);
        DELETE FROM tbz.identificador WHERE original_ip = p_ip_address;
    END IF;

    -- Delete sessions associated with this IP (Cascading should handle events/visitas linked to sessions)
    -- If no cascade, we manually delete events first
    DELETE FROM tbz.eventos WHERE session_id IN (SELECT id FROM tbz.sessoes WHERE ip_address = p_ip_address);
    DELETE FROM tbz.visitas WHERE session_id IN (SELECT id FROM tbz.sessoes WHERE ip_address = p_ip_address);
    DELETE FROM tbz.sessoes WHERE ip_address = p_ip_address;

END;
$function$;

-- Updated track_event_v2 with Bot Filtering
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

    -- 4. Create/Update Session (Allow bots here for Visit logging, or block if desired. User asked to "only register visits", implying session/visit tables are OK)
    -- We proceed with session creation so we can log the visit event.
    INSERT INTO tbz.sessoes (
        session_id, fingerprint_hash, ip_address, traffic_id, fonte_de_trafego, tipo_de_funil, current_step, product_id, created_at, updated_at
    ) VALUES (
        p_session_id, v_fingerprint_hash, v_ip, p_traffic_id, p_fonte_de_trafego, p_tipo_de_funil, v_current_step, v_product_id, now(), now()
    )
    ON CONFLICT (session_id) DO UPDATE SET
        updated_at = now(),
        current_step = v_current_step,
        fingerprint_hash = COALESCE(EXCLUDED.fingerprint_hash, tbz.sessoes.fingerprint_hash),
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

    -- 6. Special Handling for 'visit' -> tbz.visitas (Dedup 24h by fingerprint)
    -- NOTE: Bots are allowed here as per request "só deixa registrar na tabela de visitas"
    IF p_event_type = 'visit' AND v_fingerprint_hash IS NOT NULL THEN
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

    -- 7. Special Handling for 'lead_submit' -> tbz.leads
    IF p_event_type = 'lead_submit' AND p_email IS NOT NULL THEN
        INSERT INTO tbz.leads (
            fingerprint_hash, name, email, phone, urgency_level, created_at, updated_at
        ) VALUES (
            v_fingerprint_hash, p_name, p_email, p_phone, p_urgency_level, now(), now()
        )
        ON CONFLICT (email) DO UPDATE SET
            name = COALESCE(EXCLUDED.name, tbz.leads.name),
            phone = COALESCE(EXCLUDED.phone, tbz.leads.phone),
            urgency_level = COALESCE(EXCLUDED.urgency_level, tbz.leads.urgency_level),
            updated_at = now()
        RETURNING id INTO v_lead_id;
        
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
$function$
