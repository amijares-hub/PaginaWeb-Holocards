-- Script para vincular Colecciones con HoloCards y Presets
ALTER TABLE homepage_clon_design
ADD COLUMN IF NOT EXISTS collection_tag_id UUID REFERENCES tags(id) ON DELETE SET NULL;

ALTER TABLE homepage_presets
ADD COLUMN IF NOT EXISTS collection_tag_id UUID REFERENCES tags(id) ON DELETE SET NULL;

COMMENT ON COLUMN homepage_clon_design.collection_tag_id IS 'ID de la colección (tag) vinculada a este componente de la home';
