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
  X,
  SlidersHorizontal
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
  language?: string;
}

const LANGUAGE_OPTIONS = [
  { id: 'Chino', label: 'CN', url: 'https://flagcdn.com/w20/cn.png' },
  { id: 'Español', label: 'ES', url: 'https://flagcdn.com/w20/es.png' },
  { id: 'Inglés', label: 'GB', url: 'https://flagcdn.com/w20/gb.png' },
  { id: 'Japonés', label: 'JP', url: 'https://flagcdn.com/w20/jp.png' },
  { id: 'Coreano', label: 'KR', url: 'https://flagcdn.com/w20/kr.png' },
  { id: 'Multilenguaje', label: 'MULTI', emoji: '🌍' }
];

// Filter Section Component (Accordion)
const FilterSection = ({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border py-5 transition-colors">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-xs font-black uppercase tracking-[0.2em] mb-3"
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

// Reusable filters panel (used in sidebar and mobile drawer)
const FiltersPanel = ({
  categories,
  selectedCategories,
  selectedLanguages,
  priceRange,
  searchTerm,
  languageCounts,
  onToggleCategory,
  onToggleLanguage,
  onPriceChange,
  onReset,
}: {
  categories: { id: string; name: string }[];
  selectedCategories: string[];
  selectedLanguages: string[];
  priceRange: [number, number];
  searchTerm: string;
  languageCounts: Record<string, number>;
  onToggleCategory: (id: string) => void;
  onToggleLanguage: (lang: string) => void;
  onPriceChange: (val: number) => void;
  onReset: () => void;
}) => (
  <div>
    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-6">
      <Filter className="w-4 h-4" /> Filtros Avanzados
    </div>

    <FilterSection title="Idioma">
      <div className="space-y-3">
        {LANGUAGE_OPTIONS.map((lang) => {
          const count = languageCounts[lang.id] || 0;
          return (
            <label key={lang.id} className="flex items-center group cursor-pointer">
              <div 
                onClick={() => onToggleLanguage(lang.id)}
                className={cn(
                  "w-4 h-4 rounded-sm border transition-all flex items-center justify-center mr-3 shrink-0",
                  selectedLanguages.includes(lang.id) 
                    ? "bg-primary border-primary" 
                    : "bg-background border-border group-hover:border-primary/50"
                )}
              >
                {selectedLanguages.includes(lang.id) && <Check className="w-2.5 h-2.5 text-white" strokeWidth={5} />}
              </div>
              <span className="text-sm mr-2 flex items-center justify-center w-5">
                {lang.url ? <img src={lang.url} alt={lang.label} className="w-4 h-3 object-cover rounded-sm shadow-sm" /> : lang.emoji}
              </span>
              <span className={cn(
                "text-[11px] font-bold uppercase tracking-widest transition-colors flex gap-1",
                selectedLanguages.includes(lang.id) ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
              )}>
                {lang.label} <span className="opacity-50 font-normal">({count})</span>
              </span>
            </label>
          );
        })}
      </div>
    </FilterSection>

    <FilterSection title="Colección">
      <div className="space-y-3 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
        {categories.map((cat) => (
          <label key={cat.id} className="flex items-center group cursor-pointer">
            <div 
              onClick={() => onToggleCategory(cat.id)}
              className={cn(
                "w-4 h-4 rounded-sm border transition-all flex items-center justify-center mr-3 shrink-0",
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

    <FilterSection title="Precio">
      <div className="space-y-4 pt-2">
        <input 
          type="range" 
          min="0" 
          max="500" 
          step="10"
          aria-label="Rango de precio máximo"
          value={priceRange[1]}
          onChange={(e) => onPriceChange(parseInt(e.target.value))}
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

    {(selectedCategories.length > 0 || selectedLanguages.length > 0 || searchTerm) && (
      <button 
        onClick={onReset}
        className="mt-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-red-600 transition-colors flex items-center gap-2"
      >
        <X className="w-3 h-3" /> Limpiar Filtros
      </button>
    )}
  </div>
);

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
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

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

  const languageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      if (p.language) {
        counts[p.language] = (counts[p.language] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(product.category_id);
      const matchesPrice = product.base_price >= priceRange[0] && product.base_price <= priceRange[1];
      const matchesLanguage = selectedLanguages.length === 0 || selectedLanguages.includes(product.language || '');
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

  const handleReset = () => {
    setSelectedCategories([]);
    setSelectedLanguages([]);
    setSearchTerm('');
  };

  const activeFilterCount = selectedCategories.length + selectedLanguages.length + (searchTerm ? 1 : 0);

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/30 text-foreground transition-colors duration-500">
      <StoreNavbar />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-20">

        {/* Breadcrumbs & Title */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
            <span className="hover:text-foreground cursor-pointer transition-colors">Inicio</span>
            <span className="text-border">/</span>
            <span className="text-foreground">Catálogo</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight italic mb-4">Nuestro Catálogo</h1>

          {/* Search + Sort + Filter trigger */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">
              {filteredProducts.length} Productos
            </p>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Search — always visible */}
              <div className="relative flex-1 sm:flex-none">
                <input 
                  type="text" 
                  placeholder="Buscar producto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-input border border-border rounded-xl px-4 py-2.5 pl-9 text-[10px] font-bold w-full sm:w-56 focus:ring-2 focus:ring-primary/30 transition-all outline-none text-foreground"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              </div>

              {/* Sort */}
              <select 
                title="Ordenar productos"
                className="bg-input border border-border rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-foreground px-3 py-2.5 hidden sm:block"
              >
                <option>Recomendados</option>
                <option>Más recientes</option>
                <option>Precio: Bajo a Alto</option>
              </select>

              {/* Mobile filter button */}
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-foreground text-background rounded-xl text-[10px] font-black uppercase tracking-widest shrink-0 relative"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filtros
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-black text-[9px] font-black rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">

          {/* DESKTOP SIDEBAR */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-32">
              <FiltersPanel
                categories={categories}
                selectedCategories={selectedCategories}
                selectedLanguages={selectedLanguages}
                priceRange={priceRange}
                searchTerm={searchTerm}
                languageCounts={languageCounts}
                onToggleCategory={toggleCategory}
                onToggleLanguage={toggleLanguage}
                onPriceChange={(val) => setPriceRange([priceRange[0], val])}
                onReset={handleReset}
              />
            </div>
          </aside>

          {/* PRODUCT GRID */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-x-8 sm:gap-y-16">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <div className="aspect-square bg-muted animate-pulse rounded-2xl" />
                    <div className="h-3 w-3/4 bg-muted animate-pulse rounded-full" />
                    <div className="h-3 w-1/2 bg-muted animate-pulse rounded-full" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-24 text-center flex flex-col items-center gap-6">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                  <Filter className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter">Sin coincidencias</h3>
                <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">No hay piezas que coincidan con tu búsqueda actual.</p>
                <button onClick={handleReset} className="px-6 py-2.5 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-widest">
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-x-8 sm:gap-y-16">
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
                      <div className="aspect-square bg-muted rounded-2xl mb-3 sm:mb-6 relative overflow-hidden flex items-center justify-center p-3 sm:p-6 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 dark:hover:shadow-primary/20">
                        <img 
                          src={product.image_url} 
                          className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110" 
                          alt={product.name} 
                        />
                        {/* Tags */}
                        <div className="absolute top-2 sm:top-4 left-2 sm:left-4 flex flex-col gap-2">
                          <div className="flex items-center gap-1 bg-background/90 backdrop-blur-md px-2 py-1 rounded-md shadow-sm border border-border">
                            <Star className="w-3 h-3 fill-current text-primary" />
                            <span className="text-[9px] font-black text-foreground">{product.rating?.toFixed(1)}</span>
                          </div>
                        </div>
                        {product.base_stock < 5 && product.base_stock > 0 && (
                          <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 bg-orange-500 text-white text-[8px] font-black uppercase tracking-widest px-2 sm:px-3 py-1 rounded-full shadow-lg">
                            Últimas
                          </div>
                        )}
                        {product.base_stock === 0 && (
                          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center p-4">
                            <span className="bg-foreground text-background text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-2xl">Agotado</span>
                          </div>
                        )}
                      </div>

                      {/* Info Container */}
                      <div className="space-y-3 sm:space-y-4 flex-1 flex flex-col">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-600">
                            {product.set}
                          </p>
                          <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight leading-tight group-hover:text-primary transition-colors line-clamp-2 text-foreground">
                            {product.name}
                          </h3>
                        </div>

                        <div className="mt-auto space-y-3 sm:space-y-6">
                          <PriceDisplay price={product.base_price} />

                          {/* Purchase Actions */}
                          <div className="flex gap-2 h-10 sm:h-12">
                            {/* Qty Selector */}
                            <div className="flex items-center bg-input border border-border rounded-xl px-1 sm:px-2">
                              <button 
                               onClick={() => handleUpdateQuantity(product.id, -1)}
                               title="Disminuir cantidad"
                               className="w-7 sm:w-8 h-full flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 sm:w-8 text-center text-[10px] sm:text-[11px] font-black">{quantities[product.id] || 1}</span>
                              <button 
                               onClick={() => handleUpdateQuantity(product.id, 1)}
                               title="Aumentar cantidad"
                               className="w-7 sm:w-8 h-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                           </div>
                            {/* Add Button */}
                            <button 
                              onClick={() => handleAddToCart(product)}
                              disabled={product.base_stock === 0}
                              className="flex-1 bg-primary hover:bg-foreground disabled:bg-muted disabled:text-muted-foreground text-primary-foreground rounded-xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] flex items-center justify-center gap-1 sm:gap-2 transition-all active:scale-95 shadow-xl shadow-primary/10"
                            >
                              <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span className="hidden xs:inline">Añadir</span>
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

      {/* MOBILE FILTER DRAWER */}
      <AnimatePresence>
        {isMobileFilterOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileFilterOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] lg:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed top-0 right-0 bottom-0 w-[85vw] max-w-[340px] bg-background border-l border-border z-[160] lg:hidden flex flex-col shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
                  <SlidersHorizontal className="w-4 h-4" /> Filtros
                  {activeFilterCount > 0 && (
                    <span className="px-2 py-0.5 bg-primary text-black text-[9px] font-black rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                <FiltersPanel
                  categories={categories}
                  selectedCategories={selectedCategories}
                  selectedLanguages={selectedLanguages}
                  priceRange={priceRange}
                  searchTerm={searchTerm}
                  languageCounts={languageCounts}
                  onToggleCategory={toggleCategory}
                  onToggleLanguage={toggleLanguage}
                  onPriceChange={(val) => setPriceRange([priceRange[0], val])}
                  onReset={handleReset}
                />
              </div>

              {/* Drawer Footer */}
              <div className="p-5 border-t border-border">
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-full py-4 bg-foreground text-background font-black uppercase tracking-widest text-[11px] rounded-2xl active:scale-95 transition-all"
                >
                  Ver {filteredProducts.length} productos
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Toast 
        show={showToast} 
        message="¡Pieza añadida al carrito!" 
        onClose={() => setShowToast(false)} 
      />
    </div>
  );
}
