import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  Minus, 
  ShoppingCart,
  ChevronDown,
  Filter,
  Check,
  Star,
  ChevronUp,
  X
} from 'lucide-react';
import { StoreNavbar } from '../components/layout/StoreNavbar';
import { cn } from '../lib/utils';
import { useCartStore } from '../lib/cartStore';
import { supabase } from '../lib/supabase';
import { Toast } from '../components/ui/Toast';

interface Product {
  id: string;
  name: string;
  base_price: number;
  image_url: string;
  category_id: string;
  base_stock: number;
  status: string;
  categories?: { name: string };
  rarity?: string;
  set?: string;
  rating?: number;
}

// Filter Section Component (Accordion)
const FilterSection = ({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border py-6 transition-colors">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-xs font-black uppercase tracking-[0.2em] mb-4"
      >
        {title}
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PriceDisplay = ({ price }: { price: number }) => {
  const parts = price.toFixed(2).split('.');
  return (
    <div className="flex items-start font-black text-foreground">
      <span className="text-3xl leading-none">{parts[0]}</span>
      <div className="flex flex-col ml-1">
        <span className="text-base leading-none mt-0.5">.{parts[1]}€</span>
      </div>
    </div>
  );
};

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: cats } = await supabase.from('categories').select('*').order('name');
    if (cats) setCategories(cats);

    const { data: prods } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('status', 'active');
    
    if (prods) {
      setProducts(prods.map(p => ({
        ...p,
        rating: 4.5 + Math.random() * 0.5,
        rarity: 'Rare',
        set: p.categories?.name || 'General'
      })));
    }
    setLoading(false);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(product.category_id);
      const matchesPrice = product.base_price >= priceRange[0] && product.base_price <= priceRange[1];
      // Mock language filter for UI completeness
      const matchesLanguage = selectedLanguages.length === 0 || selectedLanguages.some(lang => product.name.toLowerCase().includes(lang.toLowerCase()));
      return matchesSearch && matchesCategory && matchesPrice && matchesLanguage;
    });
  }, [products, searchTerm, selectedCategories, selectedLanguages, priceRange]);

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta)
    }));
  };

  const handleAddToCart = (product: Product) => {
    const qty = quantities[product.id] || 1;
    addItem({
      id: product.id,
      name: product.name,
      price: product.base_price,
      image_url: product.image_url,
      rarity: product.rarity || 'Common',
      set: product.set || 'General',
      stock: product.base_stock
    }, qty);
    setShowToast(true);
  };

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/30 text-foreground transition-colors duration-500">
      <StoreNavbar />

      <main className="max-w-[1440px] mx-auto px-6 pt-32 pb-20">
        {/* Breadcrumbs & Title */}
        <div className="mb-12">
           <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
             <span className="hover:text-foreground cursor-pointer transition-colors">Inicio</span>
             <span className="text-border">/</span>
             <span className="text-foreground">Catálogo de Piezas</span>
           </div>
           <h1 className="text-4xl lg:text-5xl font-black uppercase tracking-tight italic mb-2">Nuestro Catálogo</h1>
           <div className="flex items-center justify-between border-b border-border pb-6">
             <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{filteredProducts.length} Productos Encontrados</p>
             <div className="flex items-center gap-6">
               <div className="relative group hidden md:block">
                  <input 
                    type="text" 
                    placeholder="BUSCAR EN ESTA COLECCIÓN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-input border border-border rounded-xl px-4 py-2.5 text-[10px] font-bold w-64 focus:ring-2 focus:ring-primary/30 transition-all outline-none text-foreground"
                  />
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
               </div>
               <div className="flex items-center gap-2">
                 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ordenar:</span>
                 <select 
                   title="Ordenar productos"
                   className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-foreground"
                 >
                    <option>Recomendados</option>
                    <option>Más recientes</option>
                    <option>Precio: Bajo a Alto</option>
                 </select>
               </div>
             </div>
           </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-16">
          {/* SIDEBAR FILTERS */}
          <aside className="w-full lg:w-64 shrink-0">
            <div className="sticky top-32">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-8">
                <Filter className="w-4 h-4" /> Filtros Avanzados
              </div>

              {/* Language Filter */}
              <FilterSection title="Idioma">
                <div className="space-y-3">
                  {['Español', 'Japonés', 'Inglés'].map((lang) => (
                    <label key={lang} className="flex items-center group cursor-pointer">
                      <div 
                        onClick={() => toggleLanguage(lang)}
                        className={cn(
                          "w-4 h-4 rounded-sm border transition-all flex items-center justify-center mr-3",
                          selectedLanguages.includes(lang) 
                            ? "bg-primary border-primary" 
                            : "bg-background border-border group-hover:border-primary/50"
                        )}
                      >
                        {selectedLanguages.includes(lang) && <Check className="w-2.5 h-2.5 text-white" strokeWidth={5} />}
                      </div>
                      <span className={cn(
                        "text-[11px] font-bold uppercase tracking-widest transition-colors",
                        selectedLanguages.includes(lang) ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                      )}>
                        {lang}
                      </span>
                    </label>
                  ))}
                </div>
              </FilterSection>

              {/* Collections Filter */}
              <FilterSection title="Colección">
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {categories.map((cat) => (
                    <label key={cat.id} className="flex items-center group cursor-pointer">
                      <div 
                        onClick={() => toggleCategory(cat.id)}
                        className={cn(
                          "w-4 h-4 rounded-sm border transition-all flex items-center justify-center mr-3",
                          selectedCategories.includes(cat.id) 
                            ? "bg-primary border-primary" 
                            : "bg-background border-border group-hover:border-primary/50"
                        )}
                      >
                        {selectedCategories.includes(cat.id) && <Check className="w-2.5 h-2.5 text-white" strokeWidth={5} />}
                      </div>
                      <span className={cn(
                        "text-[11px] font-bold uppercase tracking-widest transition-colors",
                        selectedCategories.includes(cat.id) ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                      )}>
                        {cat.name}
                      </span>
                    </label>
                  ))}
                </div>
              </FilterSection>

              {/* Price Filter */}
              <FilterSection title="Precio">
                <div className="space-y-6 pt-2">
                   <input 
                    type="range" 
                    min="0" 
                    max="500" 
                    step="10"
                    aria-label="Rango de precio máximo"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full accent-primary h-1 bg-muted rounded-full appearance-none cursor-pointer"
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-input border border-border px-3 py-2 rounded-lg text-[10px] font-bold text-muted-foreground">
                      {priceRange[0]}€
                    </div>
                    <span className="text-border">-</span>
                    <div className="flex-1 bg-input border border-border px-3 py-2 rounded-lg text-[10px] font-bold text-muted-foreground text-right">
                      {priceRange[1]}€
                    </div>
                  </div>
                </div>
              </FilterSection>

              {/* Reset All */}
              {(selectedCategories.length > 0 || selectedLanguages.length > 0 || searchTerm) && (
                <button 
                  onClick={() => {
                    setSelectedCategories([]);
                    setSelectedLanguages([]);
                    setSearchTerm('');
                  }}
                  className="mt-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-red-600 transition-colors flex items-center gap-2"
                >
                  <X className="w-3 h-3" /> Limpiar Filtros
                </button>
              )}
            </div>
          </aside>

          {/* PRODUCT GRID */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-x-8 gap-y-16">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-4">
                    <div className="aspect-square bg-muted animate-pulse rounded-2xl" />
                    <div className="h-4 w-3/4 bg-muted animate-pulse rounded-full" />
                    <div className="h-4 w-1/2 bg-muted animate-pulse rounded-full" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-32 text-center flex flex-col items-center gap-6">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                  <Filter className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter">Sin coincidencias</h3>
                <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">No hay piezas que coincidan con tu búsqueda actual.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-x-8 gap-y-16">
                <AnimatePresence mode="popLayout">
                  {filteredProducts.map((product) => (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="group flex flex-col"
                    >
                      {/* Image Container */}
                      <div className="aspect-square bg-muted rounded-2xl mb-6 relative overflow-hidden flex items-center justify-center p-6 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 dark:hover:shadow-primary/20">
                        <img 
                          src={product.image_url} 
                          className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110" 
                          alt={product.name} 
                        />
                        {/* Tags */}
                        <div className="absolute top-4 left-4 flex flex-col gap-2">
                           <div className="flex items-center gap-1 bg-background/90 backdrop-blur-md px-2 py-1 rounded-md shadow-sm border border-border">
                             <Star className="w-3 h-3 fill-current text-primary" />
                             <span className="text-[9px] font-black text-foreground">{product.rating?.toFixed(1)}</span>
                           </div>
                        </div>
                        {product.base_stock < 5 && product.base_stock > 0 && (
                          <div className="absolute bottom-4 left-4 bg-orange-500 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                            Últimas Unidades
                          </div>
                        )}
                        {product.base_stock === 0 && (
                          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center p-6">
                            <span className="bg-foreground text-background text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl shadow-2xl">Agotado</span>
                          </div>
                        )}
                      </div>

                      {/* Info Container */}
                      <div className="space-y-4 flex-1 flex flex-col">
                        <div className="space-y-1.5">
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-600">
                            {product.set}
                          </p>
                          <h3 className="text-sm font-black uppercase tracking-tight leading-tight group-hover:text-primary transition-colors line-clamp-2 min-h-[2.5rem] text-foreground">
                            {product.name}
                          </h3>
                        </div>

                        <div className="mt-auto space-y-6">
                          <PriceDisplay price={product.base_price} />

                          {/* Purchase Actions (Pokemillon style) */}
                          <div className="flex gap-2 h-12">
                            {/* Qty Selector */}
                            <div className="flex items-center bg-input border border-border rounded-xl px-2">
                              <button 
                               onClick={() => handleUpdateQuantity(product.id, -1)}
                               title="Disminuir cantidad"
                               className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center text-[11px] font-black">{quantities[product.id] || 1}</span>
                              <button 
                               onClick={() => handleUpdateQuantity(product.id, 1)}
                               title="Aumentar cantidad"
                               className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                           </div>
                            {/* Add Button */}
                            <button 
                              onClick={() => handleAddToCart(product)}
                              disabled={product.base_stock === 0}
                              className="flex-1 bg-primary hover:bg-foreground disabled:bg-muted disabled:text-muted-foreground text-primary-foreground rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-primary/10"
                            >
                              <ShoppingCart className="w-4 h-4" />
                              Añadir
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </main>

      <Toast 
        show={showToast} 
        message="¡Pieza añadida al carrito!" 
        onClose={() => setShowToast(false)} 
      />
    </div>
  );
}
