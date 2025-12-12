-- Function to clean all data associated with a specific IP - COMPREHENSIVE
CREATE OR REPLACE FUNCTION tbz.clean_data_by_ip(p_ip_address TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_fingerprint_hashes text[];
    v_lead_ids uuid[];
    v_emails text[];
BEGIN
    -- Get all fingerprint hashes associated with this IP from identificador
    SELECT array_agg(fingerprint_hash) INTO v_fingerprint_hashes
    FROM tbz.identificador
    WHERE original_ip = p_ip_address;

    IF v_fingerprint_hashes IS NOT NULL THEN
        -- Capture Lead IDs and Emails for cascading cleanup
        SELECT array_agg(id), array_agg(email) INTO v_lead_ids, v_emails
        FROM tbz.leads
        WHERE fingerprint_hash = ANY(v_fingerprint_hashes);

        -- 1. CLEANUP LINKED TO LEADS
        IF v_lead_ids IS NOT NULL THEN
            DELETE FROM tbz.lead_products WHERE lead_id = ANY(v_lead_ids);
            DELETE FROM tbz.lead_tag_assignments WHERE lead_id = ANY(v_lead_ids);
            -- Delete compras based on email (Test purchases usually share email)
            DELETE FROM tbz.compras WHERE customer_email = ANY(v_emails);
            -- Finally delete leads
            DELETE FROM tbz.leads WHERE fingerprint_hash = ANY(v_fingerprint_hashes);
        END IF;

        -- 2. CLEANUP LINKED TO SESSIONS/FINGERPRINTS
        DELETE FROM tbz.abandono WHERE fingerprint_hash = ANY(v_fingerprint_hashes);
        DELETE FROM tbz.abandono WHERE session_id IN (SELECT id FROM tbz.sessoes WHERE fingerprint_hash = ANY(v_fingerprint_hashes));
        
        DELETE FROM tbz.visitas WHERE session_id IN (SELECT id FROM tbz.sessoes WHERE fingerprint_hash = ANY(v_fingerprint_hashes));
        DELETE FROM tbz.eventos WHERE session_id IN (SELECT id FROM tbz.sessoes WHERE fingerprint_hash = ANY(v_fingerprint_hashes));
        DELETE FROM tbz.sessoes WHERE fingerprint_hash = ANY(v_fingerprint_hashes);
        
        -- 3. CLEANUP IDENTIFICADOR
        DELETE FROM tbz.identificador WHERE original_ip = p_ip_address;
    END IF;

    -- 4. CLEANUP ORPHANED SESSIONS (Bots or no fingerprint)
    DELETE FROM tbz.abandono WHERE session_id IN (SELECT id FROM tbz.sessoes WHERE ip_address = p_ip_address);
    DELETE FROM tbz.visitas WHERE session_id IN (SELECT id FROM tbz.sessoes WHERE ip_address = p_ip_address);
    DELETE FROM tbz.eventos WHERE session_id IN (SELECT id FROM tbz.sessoes WHERE ip_address = p_ip_address);
    DELETE FROM tbz.sessoes WHERE ip_address = p_ip_address;

END;
$function$;
