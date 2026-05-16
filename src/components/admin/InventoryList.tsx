import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { 
  Search, Plus, MoreHorizontal, Image as ImageIcon,
  Tag, AlertCircle, CheckCircle2, Package, Filter, Trash2, 
  CheckSquare, Square
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ProductFormModal } from './ProductFormModal';

// Definimos la interfaz basada en la nueva base de datos
interface Product {
  id: string;
  name: string;
  sku: string;
  price?: number;
  stock?: number;
  base_price?: number; // Legacy/Future support
  base_stock?: number; // Legacy/Future support
  status: 'active' | 'draft' | 'archived';
  main_image?: string | null;
  image_url?: string | null;
  categories?: { name: string };
}

export const InventoryList = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Función para cargar los productos y su categoría relacionada
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, sku, status, image_url, base_price, base_stock,
          categories ( name )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filtrado en tiempo real por búsqueda
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDelete = async (ids: string[]) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar ${ids.length === 1 ? 'este producto' : `estos ${ids.length} productos`}? Esta acción no se puede deshacer.`)) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', ids);

      if (error) throw error;
      
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
      fetchProducts();
    } catch (error) {
      console.error('Error deleting products:', error);
      alert('Error al eliminar productos');
    }
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto p-6">
      {/* HEADER Y CONTROLES */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">Inventario Maestro</h2>
          <p className="text-sm text-muted-foreground mt-1">Gestiona productos, variantes y stock general.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              title="Buscar productos por nombre o SKU"
              aria-label="Buscar productos"
              placeholder="Buscar por nombre o SKU..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-input border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <button 
            title="Filtrar inventario"
            className="bg-card border border-border p-2 rounded-xl text-muted-foreground hover:text-foreground hover:border-border/50 transition-all"
          >
            <Filter className="w-4 h-4" />
          </button>
          <button 
            onClick={() => {
              setSelectedProduct(null);
              setIsModalOpen(true);
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap shadow-lg shadow-red-900/20"
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </button>
        </div>
      </div>

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-red-600/10 border border-red-500/20 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckSquare className="w-5 h-5 text-red-500" />
                <span className="text-sm font-bold text-red-100">{selectedIds.length} productos seleccionados</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSelectedIds([])}
                  className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDelete(selectedIds)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-lg shadow-red-900/40"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar Selección
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProductFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchProducts}
        product={selectedProduct}
      />

      {/* DATA GRID (TABLA) */}
      <div className="bg-card/50 border border-border rounded-2xl overflow-hidden backdrop-blur-xl transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50 transition-colors">
                <th className="p-4 w-12 text-center">
                  <button 
                    onClick={toggleSelectAll}
                    title={selectedIds.length === filteredProducts.length ? "Deseleccionar todos" : "Seleccionar todos"}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {selectedIds.length === filteredProducts.length && filteredProducts.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Producto</th>
                <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">SKU</th>
                <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Categoría</th>
                <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Precio</th>
                <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Stock</th>
                <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Estado</th>
                <th className="p-4 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border transition-colors">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-500 text-sm">
                    Cargando inventario...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <Package className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-400 font-medium">No se encontraron productos</p>
                    <p className="text-zinc-600 text-sm mt-1">Intenta buscar con otros términos o crea un nuevo producto.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className={cn(
                    "hover:bg-white/[0.02] transition-colors group",
                    selectedIds.includes(product.id) && "bg-red-600/[0.03] border-l-2 border-l-red-600"
                  )}>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => toggleSelect(product.id)}
                        title={selectedIds.includes(product.id) ? "Deseleccionar" : "Seleccionar"}
                        className={cn(
                          "transition-colors",
                          selectedIds.includes(product.id) ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        )}
                      >
                        {selectedIds.includes(product.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-black/50 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                          {(product.image_url || product.main_image) ? (
                            <img src={product.image_url || product.main_image || ''} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-zinc-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-red-400 transition-colors cursor-pointer">
                            {product.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-zinc-400 font-mono">{product.sku || '---'}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                        <Tag className="w-3 h-3" />
                        {product.categories?.name || 'Sin Categoría'}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-mono text-foreground text-right">
                      €{(product.base_price || product.price || 0).toFixed(2)}
                    </td>
                    <td className="p-4 text-right">
                      <span className={cn(
                        "text-sm font-mono font-bold",
                        (product.base_stock || product.stock || 0) === 0 ? "text-red-500" : 
                        (product.base_stock || product.stock || 0) < 10 ? "text-amber-500" : "text-emerald-500"
                      )}>
                        {product.base_stock || product.stock || 0}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {product.status === 'active' && <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full"><CheckCircle2 className="w-3 h-3"/> Activo</span>}
                      {product.status === 'draft' && <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 bg-zinc-400/10 px-2 py-1 rounded-full"><AlertCircle className="w-3 h-3"/> Borrador</span>}
                      {product.status === 'archived' && <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400 bg-red-400/10 px-2 py-1 rounded-full"><AlertCircle className="w-3 h-3"/> Archivado</span>}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsModalOpen(true);
                          }}
                          className="text-zinc-500 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all"
                          title="Editar"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDelete([product.id])}
                          className="text-zinc-500 hover:text-red-500 p-2 rounded-xl hover:bg-red-500/10 transition-all"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
