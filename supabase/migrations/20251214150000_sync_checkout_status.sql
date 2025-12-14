-- Migration: Sync checkout_initiated column with 'Checkout Iniciado' tag assignments

-- 1. Create or Replace the Trigger Function
CREATE OR REPLACE FUNCTION tbz.update_checkout_status_on_tag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tag_name text;
BEGIN
    -- Obter o nome da tag associada
    SELECT name INTO v_tag_name
    FROM tbz.tags
    WHERE id = NEW.tag_id;

    -- Se a tag for "Checkout Iniciado", atualizar o lead correspondente
    IF v_tag_name = 'Checkout Iniciado' THEN
        UPDATE tbz.leads
        SET checkout_initiated = TRUE,
            updated_at = now()
        WHERE id = NEW.lead_id;
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Create the Trigger on lead_tag_assignments
DROP TRIGGER IF EXISTS trigger_update_checkout_status ON tbz.lead_tag_assignments;

CREATE TRIGGER trigger_update_checkout_status
AFTER INSERT ON tbz.lead_tag_assignments
FOR EACH ROW
EXECUTE FUNCTION tbz.update_checkout_status_on_tag();

-- 3. Backfill: Update existing leads that already have the tag
DO $$
BEGIN
    UPDATE tbz.leads
    SET checkout_initiated = TRUE
    WHERE id IN (
        SELECT lta.lead_id 
        FROM tbz.lead_tag_assignments lta
        JOIN tbz.tags t ON lta.tag_id = t.id
        WHERE t.name = 'Checkout Iniciado'
    );
END $$;
