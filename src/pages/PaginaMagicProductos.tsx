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

const DEFAULT_MAGIC = [
  { id: 'mtg-1', name: 'Booster Box The Lost Caverns of Ixalan', info: '36 sobres · Magic the Gathering', price: 149.99, badge: 'NUEVO' as const, image: '/Imagenes/Magic The Gathering/8dc45e2231b8616ff3a95a01dd32a80b.webp', category: 'BOOSTERS' },
  { id: 'mtg-2', name: 'Commander Masters Bundle', info: '8 boosters + 40 cartas land', price: 54.99, badge: 'STOCK' as const, image: '/Imagenes/Magic The Gathering/magic-realidad-fracturada-mazo-de-commander-multiverso-reforjado-castellano.webp', category: 'SELLADOS' },
  { id: 'mtg-3', name: 'Booster Box Murders at Karlov Manor', info: '36 sobres · Investigación', price: 139.99, image: '/Imagenes/Magic The Gathering/74077499_o.webp', category: 'BOOSTERS' },
  { id: 'mtg-4', name: 'Mazo Commander Duskmourn', info: '100 cartas · Listo para jugar', price: 49.99, image: '/Imagenes/Magic The Gathering/magic-the-gathering-vraska-the-unseen-0oq6rgvt7kjlbji4.webp', category: 'DECKS' },
];

export default function PaginaMagicProductos() {
  const [activeCategory, setActiveCategory] = useState('BOOSTERS');
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [showToast, setShowToast] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    const fetchMagicData = async () => {
      try {
        if (!supabase) return;
        const { data } = await supabase
          .from('products')
          .select('*, categories(name)')
          .eq('status', 'active')
          .limit(16);

        if (data && data.length > 0) {
          const magicOnly = data.filter((p: any) => {
            const str = `${p.name} ${p.description} ${p.categories?.name || ''}`.toLowerCase();
            return str.includes('magic') || str.includes('mtg') || str.includes('gathering');
          });

          if (magicOnly.length > 0) {
            setDbProducts(magicOnly);
          }
        }
      } catch (err) {
        console.warn("Aviso cargando productos Magic:", err);
      }
    };

    fetchMagicData();
  }, []);

  const handleAddToCart = (product: any) => {
    const priceVal = Number(getRealPrice(product)) || Number(product.price) || 0;
    addItem({
      id: product.id,
      name: product.name,
      price: priceVal,
      image_url: product.image_url || product.image || '/Imagenes/Magic The Gathering/8dc45e2231b8616ff3a95a01dd32a80b.webp',
      rarity: product.categories?.name || 'Rare',
      set: product.categories?.name || 'Magic The Gathering',
      stock: product.base_stock || 10
    }, 1);
    setShowToast(true);
  };

  const displayProducts = dbProducts.length > 0 ? dbProducts : DEFAULT_MAGIC;

  // Filtrado activo basado en la pestaña seleccionada
  const filteredCategoryProducts = displayProducts.filter(p => {
    const catStr = `${p.name} ${p.description} ${p.categories?.name || p.info || p.category || ''}`.toLowerCase();
    if (activeCategory === 'BOOSTERS') return catStr.includes('booster') || catStr.includes('sobre') || catStr.includes('pack');
    if (activeCategory === 'SELLADOS') return catStr.includes('bundle') || catStr.includes('box') || catStr.includes('caja') || catStr.includes('etb');
    if (activeCategory === 'DECKS') return catStr.includes('deck') || catStr.includes('mazo') || catStr.includes('commander') || catStr.includes('starter');
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans overflow-x-hidden">
      <AnnouncementBar />
      <HeaderV2 />

      <main>
        <div className="relative w-full h-[42vh] md:h-[52vh] flex flex-col items-center justify-center bg-gray-900 border-b border-gray-800 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.12),_transparent_65%)]" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="z-10 text-center px-4"
          >
            <p className="text-blue-400/70 text-xs font-bold tracking-[0.4em] uppercase mb-3">
              THE GATHERING
            </p>
            <h1 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter mb-3 drop-shadow-lg">
              Magic
            </h1>
            <span className="inline-block px-5 py-1.5 border border-blue-500/30 bg-blue-500/10 rounded-full text-xs font-bold text-blue-400 tracking-[0.3em] uppercase">
              ✦ PLANESWALKERS ✦
            </span>
          </motion.div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <SectionHeading title="Productos Destacados" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayProducts.slice(0, 4).map((p, idx) => {
              const priceNum = Number(getRealPrice(p)) || Number(p.price) || 0;
              return (
                <div key={p.id || idx} onClick={() => handleAddToCart(p)}>
                  <ProductCard 
                    name={p.name} 
                    info={p.categories?.name || p.info || "Magic The Gathering"} 
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
            accentColor="blue"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
            {filteredCategoryProducts.slice(0, 4).map((p, idx) => {
              const priceNum = Number(getRealPrice(p)) || Number(p.price) || 0;
              return (
                <div key={`cat-${p.id || idx}`} onClick={() => handleAddToCart(p)}>
                  <ProductCard 
                    name={p.name} 
                    info={p.categories?.name || p.info || "Magic The Gathering"} 
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

      <Toast show={showToast} message="¡Producto Magic añadido al carrito!" onClose={() => setShowToast(false)} />
    </div>
  );
}