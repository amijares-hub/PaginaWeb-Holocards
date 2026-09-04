-- Índices de cobertura para acelerar filtros de productos
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_franchise ON products(franchise);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- Índice GIN para búsquedas textuales ultra-rápidas en nombres
CREATE INDEX IF NOT EXISTS idx_products_name_search ON products USING gin(to_tsvector('spanish', name));

-- Índices para el historial de órdenes
CREATE INDEX IF NOT EXISTS idx_orders_user_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
