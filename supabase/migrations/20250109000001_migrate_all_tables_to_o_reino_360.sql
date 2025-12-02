-- Migração completa das tabelas do schema public para o-reino-360
-- Criado em: 2025-01-09

-- 1. Primeiro criar as tabelas no schema public
CREATE TABLE public.quiz_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id text UNIQUE NOT NULL,
    ip_address text,
    country_code text,
    current_step text NOT NULL,
    last_activity timestamptz NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.quiz_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid REFERENCES public.quiz_sessions(id),
    event_type text NOT NULL,
    event_data jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.quiz_abandonments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid REFERENCES public.quiz_sessions(id),
    reason text NOT NULL,
    step_where_abandoned text NOT NULL,
    time_spent_minutes double precision,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.quiz_visits (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id text NOT NULL,
    ip_address text NOT NULL,
    country_code text,
    city text,
    country_name text,
    user_agent text,
    referrer text,
    landing_page text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.visit_fingerprints (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    fingerprint_hash text UNIQUE NOT NULL,
    original_ip text NOT NULL,
    normalized_ip text NOT NULL,
    user_agent text NOT NULL,
    accept_language text,
    accept_encoding text,
    created_at timestamptz DEFAULT now(),
    country_code text,
    country_name text,
    city text
);

CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    email text UNIQUE NOT NULL,
    phone text NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE public.sales (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_name text NOT NULL,
    customer_email text NOT NULL,
    product_name text NOT NULL,
    purchase_date timestamptz NOT NULL,
    hotmart_transaction_id text UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now(),
    product_value numeric,
    raw_payload jsonb
);

CREATE SEQUENCE public.memoria_tbz_id_seq;
CREATE TABLE public.memoria_tbz (
    id integer DEFAULT nextval('public.memoria_tbz_id_seq'::regclass) PRIMARY KEY,
    session_id character varying NOT NULL,
    message jsonb NOT NULL
);

-- Habilitar RLS nas tabelas que precisam
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_abandonments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- 2. Criar o schema o-reino-360
CREATE SCHEMA IF NOT EXISTS "o-reino-360";

-- 3. Migrar tabela quiz_sessions
CREATE TABLE "o-reino-360".quiz_sessions AS 
SELECT * FROM public.quiz_sessions;

-- Recriar constraints e índices para quiz_sessions
ALTER TABLE "o-reino-360".quiz_sessions 
ADD CONSTRAINT quiz_sessions_pkey PRIMARY KEY (id);

ALTER TABLE "o-reino-360".quiz_sessions 
ADD CONSTRAINT quiz_sessions_session_id_key UNIQUE (session_id);

-- Recriar RLS
ALTER TABLE "o-reino-360".quiz_sessions ENABLE ROW LEVEL SECURITY;

-- 3. Migrar tabela quiz_events
CREATE TABLE "o-reino-360".quiz_events AS 
SELECT * FROM public.quiz_events;

-- Recriar constraints e índices para quiz_events
ALTER TABLE "o-reino-360".quiz_events 
ADD CONSTRAINT quiz_events_pkey PRIMARY KEY (id);

-- Recriar RLS
ALTER TABLE "o-reino-360".quiz_events ENABLE ROW LEVEL SECURITY;

-- 4. Migrar tabela quiz_abandonments
CREATE TABLE "o-reino-360".quiz_abandonments AS 
SELECT * FROM public.quiz_abandonments;

-- Recriar constraints e índices para quiz_abandonments
ALTER TABLE "o-reino-360".quiz_abandonments 
ADD CONSTRAINT quiz_abandonments_pkey PRIMARY KEY (id);

-- Recriar RLS
ALTER TABLE "o-reino-360".quiz_abandonments ENABLE ROW LEVEL SECURITY;

-- 5. Migrar tabela quiz_visits
CREATE TABLE "o-reino-360".quiz_visits AS 
SELECT * FROM public.quiz_visits;

-- Recriar constraints e índices para quiz_visits
ALTER TABLE "o-reino-360".quiz_visits 
ADD CONSTRAINT quiz_visits_pkey PRIMARY KEY (id);

-- Recriar RLS
ALTER TABLE "o-reino-360".quiz_visits ENABLE ROW LEVEL SECURITY;

-- 6. Migrar tabela visit_fingerprints
CREATE TABLE "o-reino-360".visit_fingerprints AS 
SELECT * FROM public.visit_fingerprints;

-- Recriar constraints e índices para visit_fingerprints
ALTER TABLE "o-reino-360".visit_fingerprints 
ADD CONSTRAINT visit_fingerprints_pkey PRIMARY KEY (id);

ALTER TABLE "o-reino-360".visit_fingerprints 
ADD CONSTRAINT visit_fingerprints_fingerprint_hash_key UNIQUE (fingerprint_hash);

-- Recriar RLS
ALTER TABLE "o-reino-360".visit_fingerprints ENABLE ROW LEVEL SECURITY;

-- 7. Migrar tabela leads
CREATE TABLE "o-reino-360".leads AS 
SELECT * FROM public.leads;

-- Recriar constraints e índices para leads
ALTER TABLE "o-reino-360".leads 
ADD CONSTRAINT leads_pkey PRIMARY KEY (id);

ALTER TABLE "o-reino-360".leads 
ADD CONSTRAINT leads_email_key UNIQUE (email);

-- Recriar RLS
ALTER TABLE "o-reino-360".leads ENABLE ROW LEVEL SECURITY;

-- 8. Migrar tabela sales
CREATE TABLE "o-reino-360".sales AS 
SELECT * FROM public.sales;

-- Recriar constraints e índices para sales
ALTER TABLE "o-reino-360".sales 
ADD CONSTRAINT sales_pkey PRIMARY KEY (id);

ALTER TABLE "o-reino-360".sales 
ADD CONSTRAINT sales_hotmart_transaction_id_key UNIQUE (hotmart_transaction_id);

-- Recriar RLS
ALTER TABLE "o-reino-360".sales ENABLE ROW LEVEL SECURITY;

-- 9. Migrar tabela memoria_tbz (sem RLS)
CREATE TABLE "o-reino-360".memoria_tbz AS 
SELECT * FROM public.memoria_tbz;

-- Recriar constraints e índices para memoria_tbz
ALTER TABLE "o-reino-360".memoria_tbz 
ADD CONSTRAINT memoria_tbz_pkey PRIMARY KEY (id);

-- Recriar sequence para memoria_tbz
CREATE SEQUENCE "o-reino-360".memoria_tbz_id_seq;
ALTER TABLE "o-reino-360".memoria_tbz 
ALTER COLUMN id SET DEFAULT nextval('"o-reino-360".memoria_tbz_id_seq'::regclass);
SELECT setval('"o-reino-360".memoria_tbz_id_seq', COALESCE((SELECT MAX(id) FROM "o-reino-360".memoria_tbz), 1));

-- 10. Recriar foreign keys após todas as tabelas estarem criadas
ALTER TABLE "o-reino-360".quiz_events 
ADD CONSTRAINT quiz_events_session_id_fkey 
FOREIGN KEY (session_id) REFERENCES "o-reino-360".quiz_sessions(id);

ALTER TABLE "o-reino-360".quiz_abandonments 
ADD CONSTRAINT quiz_abandonments_session_id_fkey 
FOREIGN KEY (session_id) REFERENCES "o-reino-360".quiz_sessions(id);

-- Comentário final
COMMENT ON SCHEMA "o-reino-360" IS 'Schema migrado do public em 2025-01-09 - Contém todas as tabelas do sistema quiz';