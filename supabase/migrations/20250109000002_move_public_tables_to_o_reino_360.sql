-- Corrigir nome do schema: o_reino_360 (underscores) e mover todas as tabelas do public
BEGIN;

-- 1) Garantir que o schema existe
CREATE SCHEMA IF NOT EXISTS o_reino_360;

-- 2) Mover tabelas (pais primeiro, depois filhos)
ALTER TABLE IF EXISTS public.quiz_sessions SET SCHEMA o_reino_360;
ALTER TABLE IF EXISTS public.quiz_events SET SCHEMA o_reino_360;
ALTER TABLE IF EXISTS public.quiz_abandonments SET SCHEMA o_reino_360;
ALTER TABLE IF EXISTS public.quiz_visits SET SCHEMA o_reino_360;
ALTER TABLE IF EXISTS public.visit_fingerprints SET SCHEMA o_reino_360;
ALTER TABLE IF EXISTS public.leads SET SCHEMA o_reino_360;
ALTER TABLE IF EXISTS public.sales SET SCHEMA o_reino_360;
ALTER TABLE IF EXISTS public.memoria_tbz SET SCHEMA o_reino_360;

-- 3) Mover sequence da memoria_tbz e ajustar default
ALTER SEQUENCE IF EXISTS public.memoria_tbz_id_seq SET SCHEMA o_reino_360;
ALTER TABLE o_reino_360.memoria_tbz ALTER COLUMN id SET DEFAULT nextval('o_reino_360.memoria_tbz_id_seq'::regclass);

COMMIT;