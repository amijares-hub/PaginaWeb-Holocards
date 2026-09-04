import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import HeaderV2 from '../components/layout/HeaderV2';
import AnnouncementBar from '../components/layout/AnnouncementBar';
import SectionHeading from '../components/ui/SectionHeading';
import ProductCard from '../components/ui/ProductCard';
import TcgCategoryMenu from '../components/ui/TcgCategoryMenu';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../lib/cartStore';
import { getRealPrice } from '../lib/utils';
import { Toast } from '../components/ui/Toast';

const DEFAULT_ONEPIECE = [
  { id: 'op-1', name: 'Booster Box Romance Dawn OP01', info: '24 sobres · Expansión 1', price: 129.99, badge: 'NUEVO' as const, image: '/Imagenes/ME03_ES_104.png', category: 'BOOSTERS' },
  { id: 'op-2', name: 'Starter Deck Roronoa Zoro', info: '51 cartas + 1 Leader', price: 19.99, badge: 'STOCK' as const, image: '/Imagenes/ME03_ES_111.png', category: 'DECKS' },
  { id: 'op-3', name: 'Booster Box Paramount War OP02', info: '24 sobres · Expansión 2', price: 119.99, image: '/Imagenes/ME03_ES_85.png', category: 'BOOSTERS' },
  { id: 'op-4', name: 'Premium Card Collection Luffy Gear 5', info: 'Carta promo + 4 boosters', price: 49.99, image: '/Imagenes/ME03_ES_88.png', category: 'SELLADOS' },
];

export default function PaginaOnepieceProductos() {
  const [activeCategory, setActiveCategory] = useState('BOOSTERS');
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [showToast, setShowToast] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    const fetchOPData = async () => {
      try {
        if (!supabase) return;
        const { data } = await supabase
          .from('products')
          .select('*, categories(name)')
          .eq('status', 'active')
          .limit(16);

        if (data && data.length > 0) {
          const opOnly = data.filter((p: any) => {
            const str = `${p.name} ${p.description} ${p.categories?.name || ''}`.toLowerCase();
            return str.includes('one piece') || str.includes('onepiece') || str.includes('op-');
          });

          if (opOnly.length > 0) {
            setDbProducts(opOnly);
          }
        }
      } catch (err) {
        console.warn("Aviso cargando productos One Piece:", err);
      }
    };

    fetchOPData();
  }, []);

  const handleAddToCart = (product: any) => {
    const priceVal = Number(getRealPrice(product)) || Number(product.price) || 0;
    addItem({
      id: product.id,
      name: product.name,
      price: priceVal,
      image_url: product.image_url || product.image || '/Imagenes/ME03_ES_104.png',
      rarity: product.categories?.name || 'Rare',
      set: product.categories?.name || 'One Piece TCG',
      stock: product.base_stock || 10
    }, 1);
    setShowToast(true);
  };

  const displayProducts = dbProducts.length > 0 ? dbProducts : DEFAULT_ONEPIECE;

  // Filtrado activo basado en la pestaña seleccionada
  const filteredCategoryProducts = displayProducts.filter(p => {
    const catStr = `${p.name} ${p.description} ${p.categories?.name || p.info || p.category || ''}`.toLowerCase();
    if (activeCategory === 'BOOSTERS') return catStr.includes('booster') || catStr.includes('sobre') || catStr.includes('pack');
    if (activeCategory === 'SELLADOS') return catStr.includes('collection') || catStr.includes('box') || catStr.includes('caja') || catStr.includes('tin');
    if (activeCategory === 'DECKS') return catStr.includes('deck') || catStr.includes('starter') || catStr.includes('leader');
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans overflow-x-hidden">
      <AnnouncementBar />
      <HeaderV2 />

      <main>
        <div className="relative w-full h-[42vh] md:h-[52vh] flex flex-col items-center justify-center bg-gray-900 border-b border-gray-800 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(239,68,68,0.12),_transparent_65%)]" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="z-10 text-center px-4"
          >
            <p className="text-red-400/70 text-xs font-bold tracking-[0.4em] uppercase mb-3">
              CARD GAME
            </p>
            <h1 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter mb-3 drop-shadow-lg">
              One Piece
            </h1>
            <span className="inline-block px-5 py-1.5 border border-red-500/30 bg-red-500/10 rounded-full text-xs font-bold text-red-400 tracking-[0.3em] uppercase">
              ✦ LEADER CARDS ✦
            </span>
          </motion.div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <SectionHeading title="Productos Destacados" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayProducts.slice(0, 4).map((p, idx) => {
              const priceNum = Number(getRealPrice(p)) || Number(p.price) || 0;
              return (
                <div key={p.id || idx} onClick={() => handleAddToCart(p)}>
                  <ProductCard 
                    name={p.name} 
                    info={p.categories?.name || p.info || "One Piece TCG"} 
                    price={`${priceNum.toFixed(2)}€`} 
                    badge={p.badge} 
                    image={p.image_url || p.image} 
                    description={p.description}
                  />
                </div>
              );
            })}
          </div>

          <TcgCategoryMenu
            active={activeCategory}
            setActive={setActiveCategory}
            accentColor="red"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
            {filteredCategoryProducts.slice(0, 4).map((p, idx) => {
              const priceNum = Number(getRealPrice(p)) || Number(p.price) || 0;
              return (
                <div key={`op-cat-${p.id || idx}`} onClick={() => handleAddToCart(p)}>
                  <ProductCard 
                    name={p.name} 
                    info={p.categories?.name || p.info || "One Piece TCG"} 
                    price={`${priceNum.toFixed(2)}€`} 
                    image={p.image_url || p.image} 
                    description={p.description}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <Toast show={showToast} message="¡Producto One Piece añadido al carrito!" onClose={() => setShowToast(false)} />
    </div>
  );
}