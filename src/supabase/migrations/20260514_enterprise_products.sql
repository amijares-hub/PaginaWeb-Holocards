-- Script para actualizar el esquema de la tabla 'products' al Modelo Enterprise
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS base_price DECIMAL(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS base_stock INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id),
ADD COLUMN IF NOT EXISTS brand_id UUID,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'archived'));

-- Aseguramos que las columnas existentes tengan valores por defecto si es necesario
-- (sku e image_url ya existen segn mi inspeccin previa)
