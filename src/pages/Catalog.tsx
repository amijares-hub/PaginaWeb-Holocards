import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  Search, 
  Filter, 
  Star, 
  Plus, 
  Minus, 
  ShoppingCart,
  Bell,
  Heart
} from 'lucide-react';
import { StoreNavbar } from '../components/layout/StoreNavbar';
import { StoreFooter } from '../components/layout/StoreFooter';
import { cn, formatCurrency } from '../lib/utils';
import { useStore } from '../lib/StoreContext';
import { useSearchParams } from 'react-router-dom';

interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  stock: number;
  tag?: 'OFERTA' | 'AVISO REESTOCK' | 'PREVENTA';
  tagColor?: string;
  discount?: number;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Ultra Rare' | 'Secret Rare';
  set: string;
}

const products: CatalogProduct[] = [
  {
    id: 'c1',
    name: 'Pack 5 Sobres Pokémon TCG',
    price: 9.90,
    originalPrice: 19.90,
    image: '/Imagenes/mega-lucario-ex-league-battle-deck-169-es.png',
    rating: 4.82,
    stock: 50,
    tag: 'OFERTA',
    discount: 50,
    rarity: 'Common',
    set: 'Base Set'
  },
  {
    id: 'c2',
    name: 'Pokémon Day 2026 Collection',
    price: 24.90,
    originalPrice: 34.90,
    image: '/Imagenes/mega-zygarde-ex-premium-collection-169-es.png',
    rating: 4.89,
    stock: 20,
    tag: 'OFERTA',
    discount: 28,
    rarity: 'Uncommon',
    set: 'Promo'
  },
  {
    id: 'c3',
    name: 'Blister 3 Sobres Gastly Héroes Ascendentes | Ascended Heroes',
    price: 21.90,
    originalPrice: 29.90,
    image: '/Imagenes/sv01-slider-logo-es.png',
    rating: 4.92,
    stock: 0,
    tag: 'AVISO REESTOCK',
    discount: 26,
    rarity: 'Rare',
    set: 'Ascended Heroes'
  },
  {
    id: 'c4',
    name: 'Blister 3 Sobres Charmander Héroes Ascendentes | Ascended Heroes',
    price: 22.90,
    originalPrice: 29.90,
    image: '/Imagenes/sv02-slider-logo-es.png',
    rating: 4.92,
    stock: 0,
    tag: 'AVISO REESTOCK',
    discount: 23,
    rarity: 'Rare',
    set: 'Ascended Heroes'
  },
  {
    id: 'c5',
    name: 'Caja de 30 Sobres Stellar Miracle sv7',
    price: 64.90,
    originalPrice: 89.90,
    image: '/Imagenes/sv03-slider-logo-es.png',
    rating: 5.0,
    stock: 15,
    tag: 'OFERTA',
    discount: 27,
    rarity: 'Ultra Rare',
    set: 'Stellar Miracle'
  },
  {
    id: 'c6',
    name: 'Caja de Sobres Chispas Fulgurantes | Surging Sparks Booster Box - sv8',
    price: 119.90,
    originalPrice: 149.90,
    image: '/Imagenes/sv035-slider-logo-es.png',
    rating: 5.0,
    stock: 30,
    tag: 'OFERTA',
    discount: 20,
    rarity: 'Ultra Rare',
    set: 'Surging Sparks'
  },
  {
    id: 'c7',
    name: 'Booster Bundle Fábula Sombría | Shrouded Fable',
    price: 29.90,
    originalPrice: 39.90,
    image: '/Imagenes/sv04-slider-logo-es.png',
    rating: 5.0,
    stock: 12,
    tag: 'OFERTA',
    discount: 25,
    rarity: 'Rare',
    set: 'Shrouded Fable'
  },
  {
    id: 'c8',
    name: 'ETB Púrpura | Élite Violet',
    price: 49.90,
    originalPrice: 64.90,
    image: '/Imagenes/sv045-slider-logo-es.png',
    rating: 5.0,
    stock: 8,
    tag: 'OFERTA',
    discount: 23,
    rarity: 'Ultra Rare',
    set: 'Violet'
  }
];

// Generate more products to test pagination (24 per page request)
const extendedProducts = [...products];
for (let i = 1; i <= 30; i++) {
  extendedProducts.push({
    ...products[Math.floor(Math.random() * products.length)],
    id: `ext-${i}`,
    name: `Pokémon Extra Card ${i} - Limited Edition`,
    price: Math.floor(Math.random() * 200) + 5,
    rating: (Math.random() * 2 + 3).toFixed(2) as any,
    rarity: ['Common', 'Uncommon', 'Rare', 'Ultra Rare', 'Secret Rare'][Math.floor(Math.random() * 5)] as any,
    set: ['Sword & Shield', 'Scarlet & Violet', 'Vintage', 'Sun & Moon'][Math.floor(Math.random() * 4)]
  });
}

const ITEMS_PER_PAGE = 24;
const RARITY_RANK = {
  'Common': 1,
  'Uncommon': 2,
  'Rare': 3,
  'Ultra Rare': 4,
  'Secret Rare': 5
};

export default function Catalog() {
  const { addToCart, toggleFavorite, isFavorite, storageImages } = useStore();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q')?.toLowerCase() || '';

  // Filtering State
  const [minRating, setMinRating] = useState<number>(0);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [sortBy, setSortBy] = useState<string>('char');
  const [currentPage, setCurrentPage] = useState(1);
  const [quickViewProduct, setQuickViewProduct] = useState<CatalogProduct | null>(null);
  const [jumpPage, setJumpPage] = useState<string>('');

  const productsWithImages = extendedProducts.map((p, index) => ({
    ...p,
    image: storageImages.length > 0 ? storageImages[index % storageImages.length] : p.image
  }));

  const filteredProducts = productsWithImages
    .filter(p => p.name.toLowerCase().includes(searchQuery))
    .filter(p => p.rating >= minRating)
    .filter(p => p.price >= priceRange[0] && p.price <= priceRange[1])
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'rarity-asc') return RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity];
      if (sortBy === 'rarity-desc') return RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
      if (sortBy === 'set-az') return a.set.localeCompare(b.set);
      return 0;
    });

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(extendedProducts.map(p => [p.id, 1]))
  );

  const updateQty = (id: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta)
    }));
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1a1a1a]">
      <StoreNavbar />
      
      <div className="pt-32 md:pt-40 pb-20">
        <div className="max-w-7xl mx-auto px-6">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#999] mb-8">
            <a href="/" className="hover:text-red-600 transition-colors">HOME</a>
            <ChevronRight className="w-3 h-3" />
            <a href="#" className="hover:text-red-600 transition-colors">POKEMON</a>
            <ChevronRight className="w-3 h-3" />
            <span className="bg-red-600 text-white px-2 py-0.5 rounded">PRODUCTOS</span>
          </div>

          {/* Header */}
          <div className="h-0.5 bg-red-600 w-12 mb-4" />
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
            <div className="space-y-4">
              <h1 className="text-4xl font-black uppercase tracking-tight leading-none text-[#111]">
                CARTAS POKÉMON TCG - SOBRES Y CAJAS COLECCIONABLES
              </h1>
              <p className="text-[#666] text-sm max-w-2xl leading-relaxed">
                Descubre sobres y cajas coleccionables de Pokémon TCG con cartas exclusivas, expansiones actuales y productos oficiales para coleccionistas y jugadores. Ideal para completar tu colección o mejorar tu baraja.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-black text-[#111]">648</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#999]">PRODUCTOS</span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-12">
            {/* Sidebar Filters */}
            <aside className="w-full lg:w-64 shrink-0 space-y-10">
              <div className="space-y-6">
                <div className="flex items-center justify-between group cursor-pointer">
                  <h3 className="text-xs font-black uppercase tracking-widest border-l-2 border-red-600 pl-3">Idioma</h3>
                  <ChevronRight className="w-4 h-4 rotate-90 text-[#ccc]" />
                </div>
                <div className="space-y-3">
                  {['Caja 10 Bundles Español (1)', 'Caja 10 Bundles Inglés (1)', 'Caja 10 Mini Latas Español (1)', 'Coreano (85)', 'Español (318)', 'Inglés (323)'].map(item => (
                    <label key={item} className="flex items-center gap-3 cursor-pointer group">
                      <div className="w-4 h-4 border border-[#ddd] rounded flex items-center justify-center group-hover:border-red-600 transition-colors"></div>
                      <span className="text-[11px] font-medium text-[#666] group-hover:text-red-600 transition-colors">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between border-t border-[#eee] pt-6 group cursor-pointer">
                  <h3 className="text-xs font-black uppercase tracking-widest border-l-2 border-red-600 pl-3">Colección</h3>
                  <ChevronRight className="w-4 h-4 rotate-90 text-[#ccc]" />
                </div>
              </div>

              <div className="space-y-6">
                 <div className="flex items-center justify-between border-t border-[#eee] pt-6 group cursor-pointer">
                  <h3 className="text-xs font-black uppercase tracking-widest border-l-2 border-red-600 pl-3">Stock</h3>
                  <ChevronRight className="w-4 h-4 rotate-90 text-[#ccc]" />
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-8 h-4 bg-[#eee] rounded-full relative">
                      <div className="absolute left-1 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"></div>
                   </div>
                   <span className="text-[11px] font-medium text-[#666]">En existencia</span>
                </div>
              </div>

              <div className="space-y-6">
                 <div className="flex items-center justify-between border-t border-[#eee] pt-6 group cursor-pointer">
                  <h3 className="text-xs font-black uppercase tracking-widest border-l-2 border-red-600 pl-3">Precio</h3>
                  <ChevronRight className="w-4 h-4 rotate-90 text-[#ccc]" />
                </div>
                <div className="space-y-6">
                   <div className="h-1 bg-[#eee] w-full rounded relative">
                      <div className="absolute h-1 bg-red-600" style={{ left: `${(priceRange[0]/5000)*100}%`, right: `${100 - (priceRange[1]/5000)*100}%` }}></div>
                      <input 
                        type="range" min="0" max="5000" step="10"
                        value={priceRange[0]}
                        onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                        className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-red-600 [&::-webkit-slider-thumb]:rounded-full"
                      />
                      <input 
                        type="range" min="0" max="5000" step="10"
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                        className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-red-600 [&::-webkit-slider-thumb]:rounded-full"
                      />
                   </div>
                   <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center border border-[#ddd] px-3 py-1.5 rounded bg-white">
                        <span className="text-[10px] text-[#999] mr-1">€</span>
                        <input type="text" value={priceRange[0]} className="w-12 text-[11px] font-bold outline-none" onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])} />
                      </div>
                      <div className="flex items-center border border-[#ddd] px-3 py-1.5 rounded bg-white">
                        <span className="text-[10px] text-[#999] mr-1">€</span>
                        <input type="text" value={priceRange[1]} className="w-12 text-[11px] font-bold outline-none" onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 0])} />
                      </div>
                   </div>
                </div>
              </div>

              <div className="space-y-6">
                 <div className="flex items-center justify-between border-t border-[#eee] pt-6 group cursor-pointer">
                  <h3 className="text-xs font-black uppercase tracking-widest border-l-2 border-red-600 pl-3">Valoración</h3>
                  <ChevronRight className="w-4 h-4 rotate-90 text-[#ccc]" />
                </div>
                <div className="space-y-2">
                   {[4, 3, 2, 1].map(rating => (
                     <label key={rating} className="flex items-center gap-3 cursor-pointer group">
                       <input 
                         type="radio" 
                         name="rating" 
                         checked={minRating === rating}
                         onChange={() => setMinRating(rating)}
                         className="hidden"
                       />
                       <div className={cn(
                         "w-4 h-4 border border-[#ddd] rounded-full flex items-center justify-center transition-colors",
                         minRating === rating ? "border-red-600 bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.4)]" : "group-hover:border-red-600"
                       )}>
                         {minRating === rating && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                       </div>
                       <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={cn("w-3 h-3 fill-current", i < rating ? "text-red-500" : "text-[#ddd]")} />
                          ))}
                          <span className="text-[11px] font-medium text-[#666] ml-2 group-hover:text-red-600 transition-colors">y más</span>
                       </div>
                     </label>
                   ))}
                   <button 
                    onClick={() => setMinRating(0)}
                    className="text-[10px] font-bold uppercase tracking-widest text-[#999] hover:text-red-600 transition-colors pt-2"
                   >
                    Limpiar Filtro
                   </button>
                </div>
              </div>
            </aside>

            {/* Product Grid */}
            <main className="flex-1">
              <div className="flex justify-between items-center mb-8">
                <p className="text-[11px] font-bold text-[#999] uppercase tracking-widest">Mostrando {currentProducts.length} de {filteredProducts.length} productos</p>
                <div className="flex items-center gap-2 text-[10px] font-bold text-[#666]">
                  <span>ORDENAR POR:</span>
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent border-b border-[#ddd] py-1 outline-none font-bold uppercase tracking-widest text-[#111]"
                  >
                    <option value="char">Características</option>
                    <option value="price-asc">Precio: Menor a Mayor</option>
                    <option value="price-desc">Precio: Mayor a Menor</option>
                    <option value="rarity-asc">Rareza: Menor a Mayor</option>
                    <option value="rarity-desc">Rareza: Mayor a Menor</option>
                    <option value="set-az">Nombre del Set (A-Z)</option>
                    <option value="rarity-asc">Rareza: Menor a Mayor</option>
                    <option value="rarity-desc">Rareza: Mayor a Menor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {currentProducts.map((product) => (
                  <motion.div 
                    key={product.id}
                    whileHover={{ y: -5 }}
                    className="group"
                  >
                    <div className="bg-[#f5f5f5] rounded-3xl p-6 relative aspect-square flex items-center justify-center overflow-hidden">
                      {product.tag && (
                        <div className={cn(
                          "absolute top-4 left-4 px-3 py-1.5 rounded-full text-[8px] font-black tracking-widest text-white shadow-xl z-20 font-retro pt-2",
                          product.tag === 'OFERTA' ? "bg-red-600" : "bg-[#111]"
                        )}>
                          {product.tag}
                        </div>
                      )}
                      
                      <img src={product.image} alt={product.name} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110" />
                      
                      {/* Interaction Buttons */}
                      <div className="absolute bottom-4 left-0 right-0 px-4 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0 z-20">
                        <button 
                          onClick={() => setQuickViewProduct(product)}
                          className="bg-white text-black p-3 rounded-xl shadow-lg hover:bg-black hover:text-white transition-all transform hover:scale-110"
                        >
                          <Search className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => addToCart({ id: product.id, name: product.name, price: product.price, image_url: product.image, rarity: product.rarity, stock: product.stock, set: product.set, isFeatured: false })}
                          className="bg-red-600 text-white p-3 rounded-xl shadow-lg hover:bg-red-700 transition-all transform hover:scale-110"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                      </div>

                      <button 
                        onClick={() => toggleFavorite({ id: product.id, name: product.name, price: product.price, image_url: product.image, rarity: product.rarity, stock: product.stock, set: product.set, isFeatured: false })}
                        className={cn(
                          "absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all bg-white shadow-lg z-20",
                          isFavorite(product.id) ? "text-red-600" : "text-[#ccc] hover:text-red-600"
                        )}
                      >
                        <Heart className={cn("w-5 h-5", isFavorite(product.id) && "fill-current")} />
                      </button>

                      {product.stock === 0 && (
                        <div className="absolute inset-0 bg-white/40 flex items-center justify-center z-10"></div>
                      )}
                    </div>

                    <div className="mt-6 space-y-3 px-1">
                      <div className="space-y-1">
                        <h3 className="text-[13px] font-bold text-[#111] h-10 line-clamp-2 leading-snug">{product.name}</h3>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={cn("w-3 h-3 fill-current", i < Math.floor(product.rating) ? "text-red-500" : "text-[#ddd]")} />
                          ))}
                          <span className="text-[10px] font-bold ml-1 text-[#999]">{product.rating}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-end gap-2">
                          <span className="text-xl font-black text-[#111] italic leading-none">{formatCurrency(product.price)}</span>
                          {product.originalPrice && (
                            <span className="text-[11px] text-[#999] line-through font-bold">{formatCurrency(product.originalPrice)}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[8px] font-black uppercase text-[#999] tracking-widest font-retro pt-1">{product.rarity}</span>
                          <div className="flex items-center gap-2">
                             <div className={cn("w-1.5 h-1.5 rounded-full", product.stock > 0 ? "bg-[#34a853]" : "bg-red-600")}></div>
                             <span className="text-[10px] font-bold uppercase text-[#666]">{product.stock > 0 ? 'En Stock' : 'Sin Stock'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-16 flex items-center justify-center gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="w-10 h-10 border border-[#ddd] rounded-xl flex items-center justify-center disabled:opacity-30 hover:bg-red-600 hover:text-white transition-all transition-transform active:scale-95"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button 
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={cn(
                        "w-10 h-10 rounded-xl text-xs font-black transition-all transform active:scale-95",
                        currentPage === i + 1 ? "bg-red-600 text-white shadow-xl" : "border border-[#ddd] hover:border-red-600"
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="w-10 h-10 border border-[#ddd] rounded-xl flex items-center justify-center disabled:opacity-30 hover:bg-red-600 hover:text-white transition-all transition-transform active:scale-95"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-[10px] font-black uppercase text-[#999] tracking-widest">Saltar a:</span>
                    <div className="flex items-center gap-1 border border-[#ddd] rounded-xl px-2 py-1 bg-white focus-within:border-red-600 transition-colors">
                      <input 
                        type="text" 
                        value={jumpPage}
                        onChange={(e) => setJumpPage(e.target.value.replace(/\D/g, ''))}
                        className="w-8 text-center text-xs font-bold outline-none"
                      />
                      <button 
                        onClick={() => {
                          const page = parseInt(jumpPage);
                          if (page >= 1 && page <= totalPages) {
                            setCurrentPage(page);
                            setJumpPage('');
                          }
                        }}
                        className="text-[10px] font-black text-red-600 uppercase hover:underline"
                      >
                        IR
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      <AnimatePresence>
        {quickViewProduct && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuickViewProduct(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl bg-[#FDFDFD] rounded-[40px] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="flex flex-col md:flex-row">
                <button 
                  onClick={() => setQuickViewProduct(null)}
                  className="absolute top-6 right-6 z-50 w-10 h-10 bg-black/10 rounded-full flex items-center justify-center hover:bg-red-600 hover:text-white transition-all"
                >
                  <Minus className="w-5 h-5 rotate-45" />
                </button>

                <div className="w-full md:w-1/2 bg-[#f5f5f5] p-8 sm:p-12 flex items-center justify-center">
                  <img src={quickViewProduct.image} className="w-full h-auto max-h-[400px] object-contain drop-shadow-2xl" alt="" />
                </div>

                <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-red-600 font-retro">PX_MARKET_DATA // {quickViewProduct.set.toUpperCase()}</span>
                      <h2 className="text-3xl font-black uppercase tracking-tight leading-none text-[#111]">{quickViewProduct.name}</h2>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={cn("w-4 h-4 fill-current", i < Math.floor(quickViewProduct.rating) ? "text-red-500" : "text-[#ddd]")} />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-[#999]">{quickViewProduct.rating}</span>
                      </div>
                    </div>

                    {/* Google Search Market Integration Placeholder */}
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                         <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Análisis de Mercado en Tiempo Real</p>
                        <p className="text-[11px] text-emerald-800 font-medium leading-tight">Valor estimado (PSA 10): <span className="font-bold">€{(quickViewProduct.price * 12.5).toFixed(2)}</span></p>
                        <p className="text-[9px] text-emerald-600/70 mt-1 uppercase font-bold tracking-tighter">Powered by SASORI-CORE // Google Search API</p>
                      </div>
                    </div>

                    <div className="flex items-end gap-3 pt-4 border-t border-[#eee]">
                      <span className="text-4xl font-black italic text-[#111]">{formatCurrency(quickViewProduct.price)}</span>
                      {quickViewProduct.originalPrice && (
                        <span className="text-lg text-[#999] line-through font-bold mb-1">{formatCurrency(quickViewProduct.originalPrice)}</span>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#f5f5f5] p-4 rounded-3xl">
                          <p className="text-[9px] font-black uppercase text-[#999] tracking-widest mb-1">Rareza</p>
                          <p className="text-sm font-bold text-[#111]">{quickViewProduct.rarity}</p>
                        </div>
                        <div className="bg-[#f5f5f5] p-4 rounded-3xl">
                          <p className="text-[9px] font-black uppercase text-[#999] tracking-widest mb-1">Disponibilidad</p>
                          <p className={cn("text-sm font-bold", quickViewProduct.stock > 0 ? "text-[#34a853]" : "text-red-600")}>
                            {quickViewProduct.stock > 0 ? `${quickViewProduct.stock} Unidades` : 'Agotado'}
                          </p>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          addToCart({ id: quickViewProduct.id, name: quickViewProduct.name, price: quickViewProduct.price, image_url: quickViewProduct.image, rarity: quickViewProduct.rarity, stock: quickViewProduct.stock, set: quickViewProduct.set, isFeatured: false });
                          setQuickViewProduct(null);
                        }}
                        className="w-full h-16 bg-[#eb1c24] hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest italic flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-xl shadow-red-600/20"
                      >
                        <ShoppingCart className="w-5 h-5" />
                        Añadir al Carrito
                      </button>
                      
                      <button 
                        onClick={() => toggleFavorite({ id: quickViewProduct.id, name: quickViewProduct.name, price: quickViewProduct.price, image_url: quickViewProduct.image, rarity: quickViewProduct.rarity, stock: quickViewProduct.stock, set: quickViewProduct.set, isFeatured: false })}
                        className="w-full py-4 text-xs font-black uppercase tracking-widest text-[#999] hover:text-red-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <Heart className={cn("w-4 h-4", isFavorite(quickViewProduct.id) && "fill-current text-red-600")} />
                        {isFavorite(quickViewProduct.id) ? 'En Favoritos' : 'Añadir a Deseos'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Related Products Section */}
              <div className="bg-[#f9f9f9] border-t border-[#eee] p-8 sm:p-12">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#999] mb-6 flex items-center gap-3">
                  <Plus className="w-4 h-4 text-red-600" />
                  Productos relacionados con {quickViewProduct.set}
                </h4>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {extendedProducts
                    .filter(p => p.id !== quickViewProduct.id && (p.set === quickViewProduct.set || p.rarity === quickViewProduct.rarity))
                    .slice(0, 6)
                    .map(related => (
                      <button 
                        key={related.id}
                        onClick={() => setQuickViewProduct(related)}
                        className="w-48 shrink-0 group text-left"
                      >
                        <div className="aspect-square bg-white rounded-2xl p-4 flex items-center justify-center mb-3 border border-[#eee] group-hover:border-red-600 transition-colors relative overflow-hidden">
                           <img src={related.image} className="w-full h-full object-contain group-hover:scale-110 transition-transform" alt="" />
                           <div className="absolute top-2 right-2 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Ver_Ahora</div>
                        </div>
                        <p className="text-[11px] font-bold text-[#111] line-clamp-1 group-hover:text-red-600 transition-colors">{related.name}</p>
                        <p className="text-[10px] font-black italic text-[#111] mt-1">{formatCurrency(related.price)}</p>
                      </button>
                    ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <StoreFooter />
    </div>
  );
}
