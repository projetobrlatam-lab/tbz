-- Atualiza estrutura da tabela de leads para suportar Instagram ID único e campos opcionais
BEGIN;

-- Adicionar coluna instagram_id (opcional) e garantir unicidade
ALTER TABLE public."oreino360-leads" ADD COLUMN IF NOT EXISTS instagram_id text;
ALTER TABLE public."oreino360-leads" ADD CONSTRAINT oreino360_leads_instagram_id_key UNIQUE (instagram_id);

-- Tornar name/email/phone opcionais (permitir leads vindos de chat apenas com instagram_id)
ALTER TABLE public."oreino360-leads" ALTER COLUMN name DROP NOT NULL;
ALTER TABLE public."oreino360-leads" ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public."oreino360-leads" ALTER COLUMN phone DROP NOT NULL;

COMMIT;