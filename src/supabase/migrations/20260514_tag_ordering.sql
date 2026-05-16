-- Añadir columna de orden a las etiquetas para permitir Drag & Drop
ALTER TABLE tags
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

COMMENT ON COLUMN tags.order_index IS 'Índice de orden para mostrar las colecciones en el frontend';

-- Inicializar el orden basado en el ID para que no todos sean 0
UPDATE tags SET order_index = i FROM (SELECT id, row_number() OVER () as i FROM tags) as sub WHERE tags.id = sub.id;
