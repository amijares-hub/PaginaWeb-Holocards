import { supabase } from '../lib/supabase';

// --- Tipos --------------------------------------------------------------------

export type HomeProduct = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: string | null;
  stock: number;
};

// --- Caché en memoria de cliente ----------------------------------------------

let cachedHomeProducts: HomeProduct[] | null = null;

// --- Productos para la Home (carga inicial optimizada) ------------------------

/**
 * Devuelve los primeros 12 productos con solo los campos necesarios para las
 * tarjetas de la portada. Usa un caché en memoria para que las cargas
 * posteriores dentro de la misma sesión sean instantáneas (0 ms).
 */
export async function getHomeProducts(): Promise<HomeProduct[]> {
  if (cachedHomeProducts) {
    return cachedHomeProducts;
  }

  const { data, error } = await supabase
    .from('products')
    .select('id, name, base_price, image_url, category, stock')
    .order('created_at', { ascending: false })
    .limit(12);

  if (error) {
    console.error('Error cargando productos:', error);
    return [];
  }

  cachedHomeProducts = (data ?? []).map((p: any) => ({
    id: String(p.id),
    name: p.name ?? 'Producto TCG',
    price: parseFloat(p.base_price) || 0,
    image_url: p.image_url ?? null,
    category: p.category ?? null,
    stock: p.stock ?? 0,
  }));

  return cachedHomeProducts;
}

// --- Invalidación del caché ---------------------------------------------------

/**
 * Llama a esta función desde el panel de admin al crear o editar productos
 * para que la próxima visita a la Home vuelva a consultar Supabase.
 */
export function clearProductsCache(): void {
  cachedHomeProducts = null;
}

// --- Catálogo completo (sin caché, con paginación) ----------------------------

export type CatalogProduct = HomeProduct & {
  rarity: string | null;
  set: string | null;
};

/**
 * Carga productos para la vista de catálogo con soporte de paginación.
 * No usa caché porque el catálogo admite filtros dinámicos.
 */
export async function getCatalogProducts(
  page = 0,
  pageSize = 24,
  filters?: { category?: string; search?: string }
): Promise<CatalogProduct[]> {
  let query = supabase
    .from('products')
    .select('id, name, base_price, image_url, category, stock, rarity, set')
    .range(page * pageSize, (page + 1) * pageSize - 1)
    .order('created_at', { ascending: false });

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error cargando catálogo:', error);
    return [];
  }

  return (data ?? []).map((p: any) => ({
    id: String(p.id),
    name: p.name ?? 'Producto TCG',
    price: parseFloat(p.base_price) || 0,
    image_url: p.image_url ?? null,
    category: p.category ?? null,
    stock: p.stock ?? 0,
    rarity: p.rarity ?? null,
    set: p.set ?? null,
  }));
}
