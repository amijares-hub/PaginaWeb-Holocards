import React, { useState, useEffect } from 'react';
import HeaderV2 from '../components/layout/HeaderV2';
import AnnouncementBar from '../components/layout/AnnouncementBar';
import SectionHeading from '../components/ui/SectionHeading';
import ProductCard from '../components/ui/ProductCard';
import FeatureIconsBanner from '../components/ui/FeatureIconsBanner';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../lib/cartStore';
import { getRealPrice } from '../lib/utils';
import { Toast } from '../components/ui/Toast';

const DEFAULT_FEATURED = [
  { id: 'pkm-1', name: 'Booster Box Escarlata y Púrpura', info: '36 sobres · Pokémon TCG', price: 129.99, badge: 'NUEVO' as const, image: '/Imagenes/me04-booster-display-box-es.png' },
  { id: 'pkm-2', name: 'Elite Trainer Box Paldea Evolved', info: '9 sobres + accesorios', price: 44.99, badge: 'STOCK' as const, image: '/Imagenes/me04-elite-trainer-box-169-es.png' },
  { id: 'pkm-3', name: 'Sobre de Expansión Temporal Forces', info: '10 cartas · Pokémon TCG', price: 5.99, image: '/Imagenes/me04-booster-bundle-169-es.png' },
  { id: 'pkm-4', name: 'Lata de Colección Paradox Pokémon', info: '4 sobres + carta promo', price: 23.99, image: '/Imagenes/me04-build-battle-box-es.png' },
];

export default function PaginaPokemonProductos() {
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [showToast, setShowToast] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    const fetchPokemonData = async () => {
      try {
        if (!supabase) return;
        const { data } = await supabase
          .from('products')
          .select('*, categories(name)')
          .eq('status', 'active')
          .limit(8);

        if (data && data.length > 0) {
          const pokemonOnly = data.filter((p: any) => {
            const str = `${p.name} ${p.description} ${p.categories?.name || ''}`.toLowerCase();
            return str.includes('poke') || str.includes('pokémon') || str.includes('pokemon');
          });

          if (pokemonOnly.length > 0) {
            setDbProducts(pokemonOnly);
          }
        }
      } catch (err) {
        console.warn("Aviso cargando productos Pokémon:", err);
      }
    };

    fetchPokemonData();
  }, []);

  const handleAddToCart = (product: any) => {
    const priceVal = Number(getRealPrice(product)) || Number(product.price) || 0;
    addItem({
      id: product.id,
      name: product.name,
      price: priceVal,
      image_url: product.image_url || product.image || '/Imagenes/me04-booster-display-box-es.png',
      rarity: product.categories?.name || 'Rare',
      set: product.categories?.name || 'Pokémon TCG',
      stock: product.base_stock || 10
    }, 1);
    setShowToast(true);
  };

  const displayProducts = dbProducts.length > 0 ? dbProducts : DEFAULT_FEATURED;

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans overflow-x-hidden">
      <HeaderV2 />

      <main>
        {/* ─── HERO BANNER POKÉMON ─── */}
        <div className="relative w-full h-[45vh] md:h-[55vh] flex flex-col items-center justify-center bg-[#050914] overflow-hidden border-b border-gray-800">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-[#050914] to-[#050914] z-0"></div>
          
          <img 
            src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Elemento%20grafico%201.png"
            alt="Líneas Neón Fondo"
            className="absolute inset-0 w-full h-full object-cover opacity-80 z-0 pointer-events-none mix-blend-screen"
          />

          <img 
            src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Triangulo.png"
            alt="Triángulo Decorativo"
            className="absolute -top-10 left-1/2 -translate-x-1/2 w-30 md:w-70 object-contain rotate-360 z-20 pointer-events-none drop-shadow-2xl"
          />

          <img 
            src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/mega-latias.png"
            alt="Mega Latias"
            className="absolute left-[-10%] sm:left-[-2%] md:left-[5%] lg:left-[8%] top-[60%] -translate-y-1/2 w-[192px] sm:w-[240px] md:w-[288px] lg:w-[320px] object-contain z-30 drop-shadow-[0_15px_25px_rgba(168,85,247,0.35)] pointer-events-none"
          />

          <img 
            src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/800px-Artwork_Dragapult_UNITE.png"
            alt="Dragapult"
            className="absolute right-[-10%] sm:right-[-2%] md:right-[5%] lg:right-[8%] top-[40%] -translate-y-1/2 w-[192px] sm:w-[240px] md:w-[288px] lg:w-[320px] object-contain z-30 drop-shadow-[0_15px_25px_rgba(6,182,212,0.35)] pointer-events-none"
          />

          <div className="z-20 text-center px-4 flex flex-col items-center mt-8">
            <img 
              src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logo%20TCGs/TCG%20LOGO%20FONDO%20AZUL.png"
              alt="Pokémon Trading Card Game Logo"
              className="w-[280px] sm:w-[350px] md:w-[450px] object-contain drop-shadow-[0_0_35px_rgba(250,204,21,0.25)]"
            />
          </div>
        </div>

        <AnnouncementBar />


        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <section className="mb-16">
            <SectionHeading title="PRODUCTOS DESTACADOS" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {displayProducts.slice(0, 4).map((p, idx) => {
                const priceNum = Number(getRealPrice(p)) || Number(p.price) || 0;
                return (
                  <div key={p.id || idx} onClick={() => handleAddToCart(p)}>
                    <ProductCard 
                      name={p.name} 
                      info={p.categories?.name || p.info || "Pokémon TCG"} 
                      price={`${priceNum.toFixed(2)}€`} 
                      badge={p.badge} 
                      image={p.image_url || p.image}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          <FeatureIconsBanner />

          <section className="mb-8 md:mb-12">
            <SectionHeading title="BOOSTERS Y SOBRES" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {displayProducts.slice(0, 4).map((p, idx) => {
                const priceNum = Number(getRealPrice(p)) || Number(p.price) || 0;
                return (
                  <div key={`booster-${p.id || idx}`} onClick={() => handleAddToCart(p)}>
                    <ProductCard 
                      name={p.name} 
                      info={p.categories?.name || p.info || "Pokémon TCG"} 
                      price={`${priceNum.toFixed(2)}€`} 
                      image={p.image_url || p.image}
                    />
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      </main>

      <Toast show={showToast} message="¡Producto Pokémon añadido al carrito!" onClose={() => setShowToast(false)} />
    </div>
  );
}