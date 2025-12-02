-- Mover tabelas para o schema public e renomear para o padrão oreino360-*
BEGIN;

-- 1) Trazer do schema o_reino_360 para public (se existirem lá)
ALTER TABLE IF EXISTS o_reino_360.quiz_sessions SET SCHEMA public;
ALTER TABLE IF EXISTS o_reino_360.quiz_events SET SCHEMA public;
ALTER TABLE IF EXISTS o_reino_360.quiz_abandonments SET SCHEMA public;
ALTER TABLE IF EXISTS o_reino_360.quiz_visits SET SCHEMA public;
ALTER TABLE IF EXISTS o_reino_360.visit_fingerprints SET SCHEMA public;
ALTER TABLE IF EXISTS o_reino_360.leads SET SCHEMA public;
ALTER TABLE IF EXISTS o_reino_360.sales SET SCHEMA public;
-- memoria_tbz: não mexer conforme instrução do usuário

-- 2) Renomear tabelas no public para o padrão solicitado
ALTER TABLE IF EXISTS public.quiz_sessions RENAME TO "oreino360-sessoes";
ALTER TABLE IF EXISTS public.quiz_events RENAME TO "oreino360-eventos";
ALTER TABLE IF EXISTS public.quiz_abandonments RENAME TO "oreino360-abandono";
ALTER TABLE IF EXISTS public.quiz_visits RENAME TO "oreino360-visitas";
ALTER TABLE IF EXISTS public.visit_fingerprints RENAME TO "oreino360-identificador";
ALTER TABLE IF EXISTS public.leads RENAME TO "oreino360-leads";
ALTER TABLE IF EXISTS public.sales RENAME TO "oreino360-compras";

-- 3) Garantir que constraints e FKs continuam válidas (renomeação preserva dependências)
-- Nenhuma ação adicional necessária aqui, pois ALTER TABLE RENAME mantém chaves e políticas associadas.

COMMIT;