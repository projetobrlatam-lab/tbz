-- Function to clean all data associated with a specific IP - FIXED ORDER
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

    IF v_fingerprint_hashes IS NOT NULL THEN
        -- 1. Delete Leads associated with these fingerprints
        DELETE FROM tbz.leads WHERE fingerprint_hash = ANY(v_fingerprint_hashes);

        -- 2. Delete Sessions (and related events/visits) associated with these fingerprints
        -- We must delete dependants first if no cascade exists
        DELETE FROM tbz.visitas WHERE session_id IN (SELECT id FROM tbz.sessoes WHERE fingerprint_hash = ANY(v_fingerprint_hashes));
        DELETE FROM tbz.eventos WHERE session_id IN (SELECT id FROM tbz.sessoes WHERE fingerprint_hash = ANY(v_fingerprint_hashes));
        DELETE FROM tbz.sessoes WHERE fingerprint_hash = ANY(v_fingerprint_hashes);
        
        -- 3. Now we can safely delete from identificador
        DELETE FROM tbz.identificador WHERE original_ip = p_ip_address;
    END IF;

    -- 4. Delete sessions associated with this IP (e.g. bots with NULL FP, or sessions not in identificador for some reason)
    -- Cascading handling
    DELETE FROM tbz.visitas WHERE session_id IN (SELECT id FROM tbz.sessoes WHERE ip_address = p_ip_address);
    DELETE FROM tbz.eventos WHERE session_id IN (SELECT id FROM tbz.sessoes WHERE ip_address = p_ip_address);
    DELETE FROM tbz.sessoes WHERE ip_address = p_ip_address;

END;
$function$;
