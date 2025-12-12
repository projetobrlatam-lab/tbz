ALTER TABLE tbz.lead_products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

ALTER TABLE tbz.lead_products DROP CONSTRAINT IF EXISTS lead_products_lead_id_product_id_key;
ALTER TABLE tbz.lead_products ADD CONSTRAINT lead_products_lead_id_product_id_key UNIQUE (lead_id, product_id);
