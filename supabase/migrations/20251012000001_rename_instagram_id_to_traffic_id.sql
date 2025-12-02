-- Renomeia coluna instagram_id para traffic_id na tabela de leads
BEGIN;

-- Renomear a coluna instagram_id para traffic_id
ALTER TABLE public."oreino360-leads" RENAME COLUMN instagram_id TO traffic_id;

-- Renomear a constraint de unicidade
ALTER TABLE public."oreino360-leads" RENAME CONSTRAINT oreino360_leads_instagram_id_key TO oreino360_leads_traffic_id_key;

COMMIT;