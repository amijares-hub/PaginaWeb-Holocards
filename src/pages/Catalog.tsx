import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronLeft,
  ChevronRight,
  X,
  SlidersHorizontal,
  RotateCcw,
  Lock
} from 'lucide-react';
import HeaderV2 from '../components/layout/HeaderV2';
import AnnouncementBar from '../components/layout/AnnouncementBar';
import { cn, getRealPrice, getOptimizedImageUrl } from '../lib/utils';
import { useCartStore } from '../lib/cartStore';
import { supabase } from '../lib/supabase';
import { Toast } from '../components/ui/Toast';
import { useDebounce } from '../hooks/useDebounce';

interface Product {
  id: string;
  name: string;
  base_price: number;
  image_url: string;
  extra_images?: string[];
  category_id: string;
  base_stock: number;
  status: string;
  categories?: { name: string };
  games?: { name: string };
  game_type?: string;
  game_id?: string;
  set_name?: string;
  rarity?: string;
  set?: string;
  rating?: number;
  language?: string;
  description?: string;
  content?: string;
  franchise?: string; 
  created_at?: string;
  is_upcoming?: boolean;
}

interface CategoryItem {
  id: string;
  name: string;
  allIds: string[];
}

const LANGUAGE_OPTIONS = [
  { id: 'Chino', label: 'CN', url: 'https://flagcdn.com/w20/cn.png' },
  { id: 'Español', label: 'ES', url: 'https://flagcdn.com/w20/es.png' },
  { id: 'Inglés', label: 'EN', url: 'https://flagcdn.com/w20/gb.png' },
  { id: 'Japonés', label: 'JP', url: 'https://flagcdn.com/w20/jp.png' },
  { id: 'Coreano', label: 'KR', url: 'https://flagcdn.com/w20/kr.png' }
];

const FRANCHISE_OPTIONS = [
  { id: 'pokemon', label: 'Pokémon' },
  { id: 'magic', label: 'Magic The Gathering' },
  { id: 'accesorios', label: 'Accesorios' }
];

const isProductUpcoming = (p: Product): boolean => {
  if (!p) return false;
  if (p.is_upcoming) return true;
  
  const st = String(p.status || '').toLowerCase().trim();
  if (['upcoming', 'proximamente', 'próximamente', 'draft', 'soon', 'coming_soon', 'coming soon', 'pendiente'].includes(st)) {
    return true;
  }
  
  const fullText = `${p.name || ''} ${p.description || ''} ${p.content || ''} ${p.set || ''} ${p.set_name || ''} ${p.franchise || ''} ${p.status || ''}`.toLowerCase();
  return fullText.includes('proximamente') || fullText.includes('próximamente') || fullText.includes('upcoming');
};

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
  const safePrice = Number(price) || 0;
  if (safePrice <= 0) {
    return (
      <div className="flex items-start font-black text-yellow-400 mt-1">
        <span className="text-xl sm:text-2xl leading-none tracking-tight uppercase">Consultar</span>
      </div>
    );
  }
  const parts = safePrice.toFixed(2).split('.');
  return (
    <div className="flex items-start font-black text-foreground">
      <span className="text-3xl leading-none">{parts[0]}</span>
      <div className="flex flex-col ml-1">
        <span className="text-base leading-none mt-0.5">.{parts[1]}€</span>
      </div>
    </div>
  );
};

const FiltersPanel = ({
  categories,
  selectedCategories,
  selectedLanguages,
  selectedFranchises,
  priceRange,
  maxPrice,
  searchTerm,
  languageCounts,
  onToggleCategory,
  onToggleLanguage,
  onToggleFranchise,
  onPriceChange,
  onReset,
}: {
  categories: CategoryItem[];
  selectedCategories: string[];
  selectedLanguages: string[];
  selectedFranchises: string[];
  priceRange: [number, number];
  maxPrice: number;
  searchTerm: string;
  languageCounts: Record<string, number>;
  onToggleCategory: (id: string) => void;
  onToggleLanguage: (lang: string) => void;
  onToggleFranchise: (id: string) => void;
  onPriceChange: (val: number) => void;
  onReset: () => void;
}) => (
  <div>
    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-6">
      <Filter className="w-4 h-4" /> Filtros Avanzados
    </div>

    <FilterSection title="Franquicia">
      <div className="space-y-3">
        {FRANCHISE_OPTIONS.map((fran) => (
          <label 
            key={fran.id} 
            onClick={() => onToggleFranchise(fran.id)}
            className="flex items-center group cursor-pointer select-none"
          >
            <div 
              className={cn(
                "w-4 h-4 rounded-sm border transition-all flex items-center justify-center mr-3 shrink-0",
                selectedFranchises.includes(fran.id) 
                  ? "bg-primary border-primary" 
                  : "bg-background border-border group-hover:border-primary/50"
              )}
            >
              {selectedFranchises.includes(fran.id) && <Check className="w-2.5 h-2.5 text-white" strokeWidth={5} />}
            </div>
            <span className={cn(
              "text-[11px] font-bold uppercase tracking-widest transition-colors",
              selectedFranchises.includes(fran.id) ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
            )}>
              {fran.label}
            </span>
          </label>
        ))}
      </div>
    </FilterSection>

    <FilterSection title="Idioma">
      <div className="space-y-3">
        {LANGUAGE_OPTIONS.map((lang) => {
          const count = languageCounts[lang.id] || 0;
          return (
            <label 
              key={lang.id} 
              onClick={() => onToggleLanguage(lang.id)}
              className="flex items-center group cursor-pointer select-none"
            >
              <div 
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
                {lang.url && <img src={lang.url} alt={lang.label} className="w-4 h-3 object-cover rounded-sm shadow-sm" />}
              </span>
              <span className={cn(
                "text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-1.5",
                selectedLanguages.includes(lang.id) ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
              )}>
                {lang.label} 
                <span className="text-xs font-extrabold text-gray-300 opacity-90">({count})</span>
              </span>
            </label>
          );
        })}
      </div>
    </FilterSection>

    <FilterSection title="Tipo de Producto">
      <div className="space-y-3 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
        {categories.map((cat) => (
          <label 
            key={cat.id} 
            onClick={() => onToggleCategory(cat.id)}
            className="flex items-center group cursor-pointer select-none"
          >
            <div 
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
          max={maxPrice} 
          step="1"
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

    {(selectedCategories.length > 0 || selectedLanguages.length > 0 || selectedFranchises.length > 0 || searchTerm || priceRange[1] < maxPrice) && (
      <button 
        onClick={onReset}
        className="mt-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-red-600 transition-colors flex items-center gap-2"
      >
        <X className="w-3 h-3" /> Limpiar Filtros
      </button>
    )}
  </div>
);

const ProductCardItem = ({ 
  product, 
  quantity, 
  onUpdateQuantity, 
  onAddToCart,
  onImageClick 
}: { 
  product: Product; 
  quantity: number; 
  onUpdateQuantity: (id: string, delta: number) => void; 
  onAddToCart: (product: Product) => void; 
  onImageClick: (product: Product) => void;
  key?: string | number;
}) => {
  const isUpcoming = isProductUpcoming(product);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group flex flex-col relative"
    >
      <div className="aspect-square mb-3 sm:mb-6 relative w-full">
        <motion.div
          layoutId={`product-wrapper-${product.id}`}
          onClick={() => onImageClick(product)}
          className="absolute inset-0 bg-transparent flex items-center justify-center p-2.5 sm:p-4 cursor-zoom-in transition-shadow duration-500 hover:shadow-2xl hover:shadow-cyan-500/20 border-[1.5px] border-cyan-500/40 rounded-2xl overflow-hidden"
        >
          <img 
            src={getOptimizedImageUrl(product.image_url, 400)} 
            className={cn(
              "w-full h-full object-contain transition-transform duration-700 group-hover:scale-105",
              isUpcoming && "opacity-80 grayscale-[20%]"
            )} 
            alt={product.name} 
          />
          
          {isUpcoming ? (
            <div className="absolute top-2 left-2 z-30 pointer-events-none">
              <span className="bg-[#F3B91C] text-black font-extrabold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full shadow-xl border border-yellow-300 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-black" /> PRÓXIMAMENTE
              </span>
            </div>
          ) : product.base_stock === 0 ? (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center p-4">
              <span className="bg-foreground text-background text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-2xl">Agotado</span>
            </div>
          ) : null}
        </motion.div>
      </div>

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

          {isUpcoming ? (
            <button 
              disabled
              className="w-full h-10 sm:h-12 bg-white/5 border border-yellow-500/30 text-yellow-400 font-extrabold uppercase tracking-widest text-[10px] sm:text-[11px] rounded-xl flex items-center justify-center gap-2 cursor-not-allowed select-none opacity-90 shadow-sm"
            >
              <Lock className="w-3.5 h-3.5 text-yellow-400" />
              <span>PRÓXIMAMENTE</span>
            </button>
          ) : (
            <div className="flex gap-2 h-10 sm:h-12">
              <div className="flex items-center bg-input border border-border rounded-xl px-1 sm:px-2">
                <button 
                  onClick={() => onUpdateQuantity(product.id, -1)}
                  title="Disminuir cantidad"
                  className="w-7 sm:w-8 h-full flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 sm:w-8 text-center text-[10px] sm:text-[11px] font-black">{quantity}</span>
                <button 
                  onClick={() => onUpdateQuantity(product.id, 1)}
                  title="Aumentar cantidad"
                  className="w-7 sm:w-8 h-full flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <button 
                onClick={() => onAddToCart(product)}
                disabled={product.base_stock === 0}
                className="flex-1 bg-primary hover:bg-foreground disabled:bg-muted disabled:text-muted-foreground text-primary-foreground rounded-xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] flex items-center justify-center gap-1 sm:gap-2 transition-all active:scale-95 shadow-xl shadow-primary/10"
              >
                <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Añadir</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<string>('recommended');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedFranchises, setSelectedFranchises] = useState<string[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 250);

  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [isModalFlipped, setIsModalFlipped] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [searchParams] = useSearchParams();
  const addItem = useCartStore(state => state.addItem);

  const maxCatalogPrice = useMemo(() => {
    if (!products || products.length === 0) return 500;
    const maxVal = Math.max(...products.map(p => Number(p.base_price) || 0));
    return maxVal > 0 ? Math.ceil(maxVal) : 500;
  }, [products]);

  useEffect(() => {
    if (products.length > 0) {
      setPriceRange([0, maxCatalogPrice]);
    }
  }, [products, maxCatalogPrice]);

  useEffect(() => {
    if (categories.length === 0) return;

    const brand = searchParams.get('brand');
    if (brand && FRANCHISE_OPTIONS.some(f => f.id === brand.toLowerCase())) {
      setSelectedFranchises([brand.toLowerCase()]);
    }

    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      const normalize = (str: string) => str.toLowerCase().replace(/[\s\-\/]/g, '');
      const matchedCat = categories.find(c => normalize(c.name) === normalize(categoryParam));
      if (matchedCat) {
        setSelectedCategories([matchedCat.id]);
      }
    }
  }, [searchParams, categories]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: cats } = await supabase.from('categories').select('*').order('name');
      if (cats) {
        const uniqueMap = new Map<string, CategoryItem>();
        cats.forEach((c: any) => {
          const normName = (c.name || '').trim().toUpperCase();
          if (!normName) return;
          if (!uniqueMap.has(normName)) {
            uniqueMap.set(normName, { id: c.id, name: c.name.trim(), allIds: [c.id] });
          } else {
            uniqueMap.get(normName)!.allIds.push(c.id);
          }
        });
        setCategories(Array.from(uniqueMap.values()));
      }

      // Consulta Resiliente Dual
      let prodsData: any[] = [];
      const { data: relationalData, error: relErr } = await supabase
        .from('products')
        .select('*, categories(name), games(name)');

      if (!relErr && relationalData && relationalData.length > 0) {
        prodsData = relationalData;
      } else {
        const { data: plainData } = await supabase.from('products').select('*');
        prodsData = plainData || [];
      }

      setProducts(prodsData.map(p => {
        const extraImgs: string[] = [];
        const mainImg = p.image_url || p.img_url || (Array.isArray(p.images) ? p.images[0] : '');
        
        const addIfNew = (img: any) => {
          if (img && typeof img === 'string' && img !== mainImg && !extraImgs.includes(img)) {
            extraImgs.push(img);
          }
        };

        if (Array.isArray(p.top_hits_images)) p.top_hits_images.forEach(addIfNew);
        if (Array.isArray(p.images)) p.images.forEach(addIfNew);
        if (Array.isArray(p.gallery)) p.gallery.forEach(addIfNew);

        return {
          ...p,
          image_url: mainImg,
          extra_images: extraImgs,
          base_price: Number(getRealPrice(p)) || 0,
          rating: 4.5,
          rarity: 'Rare',
          set: p.categories?.name || p.set || 'General',
          description: p.description || '',
          content: p.content || ''
        };
      }));
    } catch (err) {
      console.error("Error al cargar productos del catálogo:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const languageCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'Chino': 0,
      'Español': 0,
      'Inglés': 0,
      'Japonés': 0,
      'Coreano': 0,
    };
    products.forEach(p => {
      const l = String(p.language || '').toLowerCase().trim();
      if (l.includes('es') || l.includes('spa')) counts['Español']++;
      else if (l.includes('en') || l.includes('gb') || l.includes('ing')) counts['Inglés']++;
      else if (l.includes('jp') || l.includes('jap')) counts['Japonés']++;
      else if (l.includes('cn') || l.includes('chin')) counts['Chino']++;
      else if (l.includes('kr') || l.includes('cor')) counts['Coreano']++;
    });
    return counts;
  }, [products]);

  const allProductImages = useMemo(() => {
    if (!activeProduct) return [];
    const imgs: string[] = [];
    if (activeProduct.image_url) imgs.push(activeProduct.image_url);
    if (activeProduct.extra_images) {
      activeProduct.extra_images.forEach(img => {
        if (!imgs.includes(img)) imgs.push(img);
      });
    }
    return imgs;
  }, [activeProduct]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [activeProduct?.id]);

  const filteredProducts = useMemo(() => {
    let list = products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.some(catId => {
        const selectedCat = categories.find(c => c.id === catId);
        if (!selectedCat) return false;
        
        const prodCatId = String(product.category_id || '');
        if (selectedCat.allIds.includes(prodCatId) || prodCatId === String(selectedCat.id)) return true;

        const norm = (s: string) => s.toLowerCase().replace(/[\s\-\/_]/g, '');
        const prodCatName = norm(product.categories?.name || '');
        const selCatName = norm(selectedCat.name || '');
        
        return prodCatName && selCatName && (prodCatName === selCatName || prodCatName.includes(selCatName) || selCatName.includes(prodCatName));
      });

      const matchesPrice = product.base_price >= priceRange[0] && product.base_price <= priceRange[1];
      
      const matchesLanguage = selectedLanguages.length === 0 || selectedLanguages.some(selLang => {
        const pLang = String(product.language || '').toLowerCase().trim();
        const sLang = selLang.toLowerCase().trim();
        if (sLang === 'español' || sLang === 'es') return pLang.includes('es') || pLang.includes('spa') || pLang.includes('español');
        if (sLang === 'inglés' || sLang === 'gb' || sLang === 'en') return pLang.includes('gb') || pLang.includes('en') || pLang.includes('ing') || pLang.includes('ingles') || pLang.includes('english');
        if (sLang === 'japonés' || sLang === 'jp') return pLang.includes('jp') || pLang.includes('jap') || pLang.includes('japonés') || pLang.includes('japanese');
        if (sLang === 'chino' || sLang === 'cn') return pLang.includes('cn') || pLang.includes('chin') || pLang.includes('chinese');
        if (sLang === 'coreano' || sLang === 'kr') return pLang.includes('kr') || pLang.includes('cor') || pLang.includes('korean');
        return pLang.includes(sLang) || sLang.includes(pLang);
      });

      const matchesFranchise = selectedFranchises.length === 0 || selectedFranchises.some(franchiseId => {
        const pName = (product.name || '').toLowerCase();
        const pCat = (product.categories?.name || '').toLowerCase();
        const pGame = (product.games?.name || '').toLowerCase();
        const pGameType = (product.game_type || '').toLowerCase();
        const pFranchise = (product.franchise || '').toLowerCase();
        const pSet = (product.set_name || product.set || '').toLowerCase();
        const pDesc = (product.description || '').toLowerCase();
        const pContent = (product.content || '').toLowerCase();

        const combinedText = `${pName} ${pCat} ${pGame} ${pGameType} ${pFranchise} ${pSet} ${pDesc} ${pContent}`;

        if (franchiseId === 'accesorios') {
          const accKeywords = [
            'funda', 'sleeve', 'binder', 'carpeta', 'deck box', 'caja de mazo', 
            'toploader', 'playmat', 'tapete', 'album', 'álbum', 'hojas', 'accesorio', 'dice', 'dados', 'protector', 'portadeck'
          ];
          return accKeywords.some(kw => combinedText.includes(kw)) || pGameType.includes('accesorio') || pCat.includes('accesorio') || pFranchise.includes('accesorio');
        }

        if (franchiseId === 'pokemon') {
          if (pGame.includes('magic') || pGame.includes('mtg') || pFranchise.includes('magic') || pGame.includes('one piece') || pGame.includes('onepiece')) return false;
          if (pFranchise.includes('pokemon') || pFranchise.includes('pokémon') || pGameType.includes('pokemon') || pGame.includes('pokemon') || pGame.includes('pokémon')) return true;

          const pkmKeywords = [
            'pokemon', 'pokémon', 'pkmn', 'pkm', 'pikachu', 'charizard', 'mewtwo', 
            'scarlet', 'violet', 'escarlata', 'púrpura', 'purpura', 'paldea', '151', 
            'paradox', 'obsidian', 'stellar', 'surging', 'crown zenith', 'lost origin', 
            'silver tempest', 'fusion strike', 'brilliant stars', 'shrouded', 'twilight', 
            'temporal', 'destinos', 'evoluciones', 'rivales', 'caos', 'etb', 'pokeball', 'pokéball', 
            'elite trainer', 'booster', 'sobres', 'caja', 'vmax', 'vstar', 'ex'
          ];
          return pkmKeywords.some(kw => combinedText.includes(kw));
        }

        if (franchiseId === 'magic') {
          if (pGame.includes('pokemon') || pGame.includes('pokémon') || pFranchise.includes('pokemon') || pGame.includes('one piece') || pGame.includes('onepiece')) return false;
          if (pFranchise.includes('magic') || pFranchise.includes('mtg') || pGameType.includes('magic') || pGame.includes('magic') || pGame.includes('mtg')) return true;

          const magicKeywords = [
            'magic', 'mtg', 'gathering', 'commander', 'planeswalker', 'bloomburrow', 
            'duskmourn', 'tarkir', 'ixalan', 'ravnica', 'eldraine', 'lorwyn', 'karlov', 
            'foundations', 'modern', 'draft booster', 'play booster', 'collector booster', 
            'secret lair', 'multiverso', 'reforjado', 'malkor', 'tales of middle-earth', 
            'outlaws', 'thunder junction', 'dominaria', 'innistrad', 'kamigawa', 'phyrexia', 'prerelease', 'bundle'
          ];
          return magicKeywords.some(kw => combinedText.includes(kw));
        }

        return false;
      });

      return matchesSearch && matchesCategory && matchesPrice && matchesLanguage && matchesFranchise;
    });

    if (sortOption === 'newest') {
      list = [...list].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    } else if (sortOption === 'price-asc') {
      list = [...list].sort((a, b) => a.base_price - b.base_price);
    } else if (sortOption === 'price-desc') {
      list = [...list].sort((a, b) => b.base_price - a.base_price);
    }

    list = [...list].sort((a, b) => {
      const aUpcoming = isProductUpcoming(a);
      const bUpcoming = isProductUpcoming(b);

      if (aUpcoming && !bUpcoming) return 1;
      if (!aUpcoming && bUpcoming) return -1;
      return 0;
    });

    return list;
  }, [products, categories, debouncedSearchTerm, selectedCategories, selectedLanguages, selectedFranchises, priceRange, sortOption]);

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

  const toggleFranchise = (id: string) => {
    setSelectedFranchises(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta)
    }));
  };

  const handleAddToCart = (product: Product) => {
    if (isProductUpcoming(product)) return;

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
    setSelectedFranchises([]);
    setSearchTerm('');
    setSortOption('recommended');
    setPriceRange([0, maxCatalogPrice]);
  };

  const activeFilterCount = selectedCategories.length + selectedLanguages.length + selectedFranchises.length + (searchTerm ? 1 : 0);

  const closeModal = () => {
    setActiveProduct(null);
    setSelectedImageIndex(0);
    setTimeout(() => setIsModalFlipped(false), 300);
  };

  return (
    <div className="min-h-screen bg-[#050914] font-sans selection:bg-cyan-400/30 text-white transition-colors duration-500 relative overflow-x-hidden">
      
      <img 
        src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Fondos/Fondo.webp"
        alt="Fondo Holocards"
        className="fixed inset-0 w-full h-full object-cover opacity-40 z-0 pointer-events-none mix-blend-screen"
      />

      <div className="relative z-10">
        <AnnouncementBar />
        <HeaderV2 />

        <main className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-20">
          <div className="mb-8 sm:mb-12">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              <Link to="/" className="hover:text-cyan-400 transition-colors">Inicio</Link>
              <span className="text-gray-700">/</span>
              <span className="text-white">Catálogo</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight italic mb-4 text-white">Nuestro Catálogo</h1>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">
                {filteredProducts.length} Productos
              </p>

              <div className="flex items-center gap-3 w-full sm:w-auto">
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

                <select 
                  title="Ordenar productos"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="bg-input border border-border rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-foreground px-3 py-2.5 hidden sm:block"
                >
                  <option value="recommended">Recomendados</option>
                  <option value="newest">Más recientes</option>
                  <option value="price-asc">Precio: Bajo a Alto</option>
                  <option value="price-desc">Precio: Alto a Bajo</option>
                </select>

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
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-32 max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar pr-4 pb-8">
                <FiltersPanel
                  categories={categories}
                  selectedCategories={selectedCategories}
                  selectedLanguages={selectedLanguages}
                  selectedFranchises={selectedFranchises}
                  priceRange={priceRange}
                  maxPrice={maxCatalogPrice}
                  searchTerm={searchTerm}
                  languageCounts={languageCounts}
                  onToggleCategory={toggleCategory}
                  onToggleLanguage={toggleLanguage}
                  onToggleFranchise={toggleFranchise}
                  onPriceChange={(val) => setPriceRange([priceRange[0], val])}
                  onReset={handleReset}
                />
              </div>
            </aside>

            <div className="flex-1">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6">
                  <AnimatePresence mode="popLayout">
                    {filteredProducts.map((product) => (
                      <ProductCardItem 
                        key={product.id}
                        product={product}
                        quantity={quantities[product.id] || 1}
                        onUpdateQuantity={handleUpdateQuantity}
                        onAddToCart={handleAddToCart}
                        onImageClick={(p) => {
                          setIsModalFlipped(false);
                          setSelectedImageIndex(0);
                          setActiveProduct(p);
                        }} 
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {isMobileFilterOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileFilterOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-xs bg-[#0a1628] border-l border-white/10 p-6 overflow-y-auto flex flex-col justify-between z-[160]"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                  <h3 className="text-base font-black uppercase tracking-wider text-white">Filtros</h3>
                  <button onClick={() => setIsMobileFilterOpen(false)} className="p-2 text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <FiltersPanel
                  categories={categories}
                  selectedCategories={selectedCategories}
                  selectedLanguages={selectedLanguages}
                  selectedFranchises={selectedFranchises}
                  priceRange={priceRange}
                  maxPrice={maxCatalogPrice}
                  searchTerm={searchTerm}
                  languageCounts={languageCounts}
                  onToggleCategory={toggleCategory}
                  onToggleLanguage={toggleLanguage}
                  onToggleFranchise={toggleFranchise}
                  onPriceChange={(val) => setPriceRange([priceRange[0], val])}
                  onReset={handleReset}
                />
              </div>

              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-full mt-8 py-3 bg-yellow-400 text-black font-black uppercase rounded-xl text-xs"
              >
                Ver {filteredProducts.length} Resultados
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-8 cursor-zoom-out"
            onClick={closeModal}
          >
            <motion.div
              layoutId={`product-wrapper-${activeProduct.id}`}
              className="relative w-full max-w-[280px] sm:max-w-sm md:max-w-md lg:max-w-[450px] aspect-[3/4] cursor-pointer group"
              style={{ perspective: "1500px" }}
              onClick={(e) => { 
                e.stopPropagation(); 
                setIsModalFlipped(!isModalFlipped); 
              }}
            >
              <motion.div
                className="w-full h-full relative"
                style={{ transformStyle: "preserve-3d" }}
                animate={{ rotateY: isModalFlipped ? 180 : 0 }}
                transition={{ duration: 0.7, type: "spring", stiffness: 200, damping: 25 }}
              >
                {/* CARA FRONTAL DEL MODAL */}
                <div 
                  className="absolute inset-0 bg-[#0a1628] rounded-2xl md:rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(6,182,212,0.4)] border border-cyan-500/50 flex items-center justify-center p-4 md:p-8" 
                  style={{ backfaceVisibility: "hidden" }}
                >
                  <img
                    src={activeProduct.image_url}
                    alt={activeProduct.name}
                    className="w-full h-full object-contain"
                  />
                  {isProductUpcoming(activeProduct) && (
                    <div className="absolute top-4 left-4 z-20">
                      <span className="bg-[#F3B91C] text-black text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 border border-yellow-300">
                        <Lock className="w-3.5 h-3.5 text-black" /> PRÓXIMAMENTE
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsModalFlipped(!isModalFlipped);
                      }}
                      className="bg-[#0a1628]/90 hover:bg-yellow-400 text-yellow-400 hover:text-black border border-yellow-400/50 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 backdrop-blur-md shadow-[0_0_15px_rgba(250,204,21,0.25)] hover:shadow-[0_0_20px_rgba(250,204,21,0.6)] transition-all active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      VER DETALLES
                    </button>
                  </div>
                </div>

                {/* CARA TRASERA DEL MODAL */}
                <div 
                  className="absolute inset-0 bg-[#050914] rounded-2xl md:rounded-[2rem] overflow-hidden p-4 md:p-5 border border-cyan-500/50 shadow-[0_0_80px_rgba(6,182,212,0.4)] flex flex-col items-center justify-between text-center" 
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <div className="w-full flex items-center justify-between border-b border-white/10 pb-2 shrink-0">
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest truncate pr-2">
                      {activeProduct.set || activeProduct.name}
                    </span>
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 shrink-0"/>
                  </div>

                  <div className="relative w-full flex-1 min-h-0 bg-transparent rounded-xl overflow-hidden border border-yellow-400/20 group my-1 flex items-center justify-center">
                    {selectedImageIndex > 0 && (
                      <div className="absolute top-2 left-2 z-30 pointer-events-none">
                        <span className="bg-[#F3B91C] text-black font-extrabold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xl border border-yellow-300">
                          ⭐ Mejores cartas
                        </span>
                      </div>
                    )}

                    {allProductImages.length > 0 ? (
                      <img
                        src={allProductImages[Math.min(selectedImageIndex, allProductImages.length - 1)]}
                        alt={activeProduct.name}
                        className="w-full h-full object-contain filter drop-shadow-xl transition-all duration-300"
                      />
                    ) : (
                      <span className="text-gray-600 font-black text-[10px] uppercase">Sin Imagen</span>
                    )}

                    {allProductImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImageIndex(prev => prev > 0 ? prev - 1 : allProductImages.length - 1);
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-[#F3B91C] hover:text-black text-white p-1 rounded-full transition-all z-20 backdrop-blur-sm"
                        >
                          <ChevronLeft className="w-3.5 h-3.5"/>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImageIndex(prev => prev < allProductImages.length - 1 ? prev + 1 : 0);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-[#F3B91C] hover:text-black text-white p-1 rounded-full transition-all z-20 backdrop-blur-sm"
                        >
                          <ChevronRight className="w-3.5 h-3.5"/>
                        </button>

                        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 z-20 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                          {allProductImages.map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(idx); }}
                              className={`h-1 rounded-full transition-all ${
                                selectedImageIndex === idx ? "bg-[#F3B91C] w-3" : "bg-white/40 hover:bg-white/70 w-1"
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="w-full shrink-0 max-h-32 overflow-y-auto text-left px-1 my-1 space-y-2 custom-scrollbar">
                    <div>
                      <span className="text-[10px] font-black uppercase text-yellow-400 tracking-wider block">
                        DESCRIPCIÓN DEL PRODUCTO
                      </span>
                      <p className="text-gray-200 text-xs leading-relaxed font-medium">
                        {activeProduct.description && activeProduct.description.trim() !== ''
                          ? activeProduct.description
                          : 'Sin descripción asignada para este producto.'}
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-white/10">
                      <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider block">
                        CONTENIDO DEL PRODUCTO
                      </span>
                      <p className="text-gray-200 text-xs leading-relaxed font-medium">
                        {activeProduct.content && activeProduct.content.trim() !== ''
                          ? activeProduct.content
                          : 'Sin contenido especificado para este producto.'}
                      </p>
                    </div>
                  </div>

                  <div className="w-full flex flex-col items-center gap-2 shrink-0 pt-2 border-t border-white/10">
                    <p className="text-white font-black text-xs sm:text-sm uppercase tracking-tight line-clamp-1">
                      {activeProduct.name}
                    </p>

                    {isProductUpcoming(activeProduct) ? (
                      <button 
                        disabled
                        className="w-full bg-white/5 border border-yellow-500/30 text-yellow-400 font-extrabold uppercase tracking-widest py-2 rounded-xl text-xs flex items-center justify-center gap-2 cursor-not-allowed select-none"
                      >
                        <Lock className="w-3.5 h-3.5 text-yellow-400" /> PRÓXIMAMENTE
                      </button>
                    ) : (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleAddToCart(activeProduct); 
                        }}
                        disabled={activeProduct.base_stock === 0}
                        className="w-full bg-primary hover:bg-cyan-300 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-black uppercase tracking-widest py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                      >
                        <ShoppingCart className="w-4 h-4" /> 
                        {activeProduct.base_stock === 0 ? "Agotado" : "Agregar al Carrito"}
                      </button>
                    )}

                    <span className="bg-white/5 border border-white/10 text-muted-foreground text-[9px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full flex items-center gap-1 hover:text-white transition-colors">
                      <RotateCcw className="w-3 h-3" /> Volver a girar
                    </span>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            <button
              onClick={(e) => { e.stopPropagation(); closeModal(); }}
              className="absolute top-4 right-4 md:top-8 md:right-8 bg-black/60 backdrop-blur-md text-white p-3 rounded-full border border-white/10 hover:bg-cyan-500 hover:text-black transition-all hover:scale-110 z-50"
            >
              <X className="w-6 h-6" />
            </button>
          </motion.div>
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