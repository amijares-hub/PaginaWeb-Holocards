import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Package, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { useCartStore } from '../../lib/cartStore';
import { Toast } from './Toast';

interface Product {
  id: string;
  name: string;
  base_price: number;
  image_url: string;
  categories?: { name: string };
}

interface DynamicCollectionShelfProps {
  tagId: string;
  theme?: 'light' | 'dark';
  activeFilter?: string; // e.g. 'packs', 'boxes', 'all'
}

export const DynamicCollectionShelf = ({ tagId, theme = 'light', activeFilter = 'all' }: DynamicCollectionShelfProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    if (tagId) fetchProducts();
  }, [tagId]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('product_tags')
      .select(`
        products (
          id, 
          name, 
          base_price, 
          image_url,
          categories ( name )
        )
      `)
      .eq('tag_id', tagId);

    if (!error && data) {
      setProducts(data.map((item: any) => item.products).filter(Boolean));
    }
    setLoading(false);
  };

  // Filtrado en el cliente
  const filteredProducts = products.filter(p => {
    if (activeFilter === 'all') return true;
    const catName = p.categories?.name?.toLowerCase() || '';
    
    if (activeFilter === 'packs') return catName.includes('sobre') || catName.includes('pack');
    if (activeFilter === 'boxes') return catName.includes('caja') || catName.includes('box') || catName.includes('display');
    if (activeFilter === 'accessories') return catName.includes('funda') || catName.includes('tapete') || catName.includes('accesorio');
    
    return true;
  }).slice(0, 4); // Limit to 4 for the hero shelf grid

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
    </div>
  );

  if (products.length === 0) return (
    <div className="py-10 text-center opacity-20">
       <Package className="w-8 h-8 mx-auto mb-2" />
       <p className="text-[10px] font-black uppercase tracking-widest">Sin stock disponible</p>
    </div>
  );

  return (
    <div className="relative min-h-[180px]">
      <AnimatePresence mode="wait">
        <motion.div 
          key={activeFilter}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4, ease: "circOut" }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <motion.div 
                key={product.id}
                whileHover={{ y: -5, scale: 1.02 }}
                className={cn(
                  "group p-3 rounded-2xl border transition-all duration-500",
                  theme === 'light' 
                    ? "bg-white border-zinc-100 hover:border-yellow-400 hover:shadow-2xl hover:shadow-yellow-500/10" 
                    : "bg-[#0c0c2a] border-white/5 hover:border-purple-500 hover:shadow-2xl hover:shadow-purple-500/20"
                )}
              >
                <Link to={`/producto/${product.id}`} className="aspect-square rounded-xl bg-zinc-50/50 dark:bg-black/40 mb-3 overflow-hidden flex items-center justify-center p-2 relative block">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <Package className="w-6 h-6 text-zinc-300" />
                  )}
                  <button 
                    onClick={(e) => {
                      e.preventDefault(); // Evitar navegación al hacer clic en el botón rápido
                      addItem({
                        id: product.id,
                        name: product.name,
                        price: product.base_price,
                        image_url: product.image_url,
                        rarity: 'Common',
                        set: product.categories?.name || 'General',
                        stock: 10
                      } as any);
                      setShowToast(true);
                    }}
                    className={cn(
                      "absolute bottom-2 right-2 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-lg z-10",
                      theme === 'light' ? "bg-black text-white" : "bg-purple-600 text-white"
                    )}
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                </Link>
                <Link to={`/producto/${product.id}`}>
                  <h4 className={cn(
                    "text-[9px] font-black leading-tight line-clamp-2 mb-1 uppercase tracking-tight hover:text-red-500 transition-colors",
                    theme === 'light' ? "text-black" : "text-white"
                  )}>
                    {product.name}
                  </h4>
                </Link>
                <div className="flex items-center justify-between mt-auto">
                  <p className={cn(
                    "text-[11px] font-black font-mono",
                    theme === 'light' ? "text-black" : "text-purple-400"
                  )}>
                    €{product.base_price?.toFixed(2)}
                  </p>
                  <Link to={`/producto/${product.id}`}>
                    <ChevronRight className={cn("w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity", theme === 'light' ? "text-yellow-500" : "text-purple-500")} />
                  </Link>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center opacity-40">
               <p className="text-[10px] font-black uppercase tracking-[0.2em]">No hay productos en esta categoría</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <Toast 
        show={showToast} 
        message="¡Producto añadido al carrito!" 
        onClose={() => setShowToast(false)} 
      />
    </div>
  );
};
