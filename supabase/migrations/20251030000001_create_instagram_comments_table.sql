-- Criar tabela de comentários do Instagram
BEGIN;

-- Criar tabela oreino360-instagram-comentos
CREATE TABLE IF NOT EXISTS public."oreino360-instagram-comentos" (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    instagram_user_id text NOT NULL,
    instagram_username text,
    comment_text text NOT NULL,
    post_id text,
    post_url text,
    comment_id text UNIQUE,
    produto text DEFAULT 'tbz',
    fonte_de_trafego text DEFAULT 'instagram',
    tipo_de_funil text DEFAULT 'comentario',
    traffic_id text,
    is_processed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_instagram_comentos_created_at ON public."oreino360-instagram-comentos" (created_at);
CREATE INDEX IF NOT EXISTS idx_instagram_comentos_produto ON public."oreino360-instagram-comentos" (produto);
CREATE INDEX IF NOT EXISTS idx_instagram_comentos_traffic_id ON public."oreino360-instagram-comentos" (traffic_id);
CREATE INDEX IF NOT EXISTS idx_instagram_comentos_is_processed ON public."oreino360-instagram-comentos" (is_processed);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public."oreino360-instagram-comentos" ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir leitura e escrita (ajustar conforme necessário)
CREATE POLICY "Allow all operations on instagram comments" ON public."oreino360-instagram-comentos"
    FOR ALL USING (true);

-- Comentário na tabela
COMMENT ON TABLE public."oreino360-instagram-comentos" IS 'Tabela para armazenar comentários do Instagram que podem gerar leads';

COMMIT;