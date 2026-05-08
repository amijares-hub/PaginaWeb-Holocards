import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ShoppingCart, 
  ChevronRight, 
  Star, 
  Zap, 
  ShieldCheck, 
  Truck,
  ArrowRight,
  Plus,
  LayoutDashboard,
  Shield,
  Package,
  Trophy,
  Layers
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { Link } from 'react-router-dom';
import { PulseFitHero } from '../components/ui/pulse-fit-hero';
import TextMarquee from '../components/ui/text-marque';
import { FeatureCarousel } from '../components/ui/feature-carousel';
import { Features } from '../components/ui/features';
import { TrustGrid } from '../components/ui/trust-grid';
import { ProductCarousel } from '../components/ui/product-carousel';
import { CtaCard } from '../components/ui/call-to-action-cta';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../types';
import { getInventory } from '../lib/inventory-db';
import { StoreNavbar } from '../components/layout/StoreNavbar';
import { StoreFooter } from '../components/layout/StoreFooter';
import { useStore } from '../lib/StoreContext';
import { Heart } from 'lucide-react';

const staticFeaturedCards = [
  { id: '1', name: 'Charizard GX Premium', price: 299.99, image: '/Imagenes/ME03_ES_12.png', category: 'Secret Rare' },
  { id: '2', name: 'Elite Pikachu VMAX', price: 149.50, image: '/Imagenes/ME03_ES_123.png', category: 'Holo' },
  { id: '3', name: 'Shadow Lugia EX', price: 475.00, image: '/Imagenes/ME03_ES_14.png', category: 'Legendary' },
  { id: '4', name: 'Rayquaza Delta Species', price: 185.00, image: '/Imagenes/ME03_ES_19.png', category: 'Delta Species' },
  { id: '5', name: 'Mewtwo GX Hidden', price: 210.00, image: '/Imagenes/ME03_ES_22.png', category: 'Shiny' },
  { id: '6', name: 'Umbreon VMAX Alt', price: 850.00, image: '/Imagenes/ME03_ES_28.png', category: 'Alt Art' },
  { id: '7', name: 'Gengar VMAX Fusion', price: 320.00, image: '/Imagenes/ME03_ES_6.png', category: 'VMAX' },
  { id: '8', name: 'Giratina V Alt Art', price: 590.00, image: '/Imagenes/ME03_ES_85.png', category: 'Secret' },
  { id: '9', name: 'Lugia V Alt Art', price: 440.00, image: '/Imagenes/ME03_ES_88.png', category: 'Gold' },
  { id: '10', name: 'Aerodactyl V Alt', price: 280.00, image: '/Imagenes/img_47014_6bbd0ab7d5f676fd4f2a8aa92378e54a_20.jpg', category: 'Alt Art' },
  { id: '11', name: 'Blaziken VMAX Alt', price: 420.00, image: '/Imagenes/me03-slider-logo-es.png', category: 'VMAX Alt' },
  { id: '12', name: 'Charizard Base Set', price: 2500.00, image: '/Imagenes/me04-booster-bundle-169-es.png', category: 'Vintage' },
];

const productCategories = [
  {
    id: 1,
    icon: Shield,
    title: "Cajas Elites",
    description: "Equipamiento de primer nivel para coleccionistas exigentes. Elite Trainer Boxes con sellos de autenticidad.",
    image: "/Imagenes/me04-booster-display-box-es.png",
  },
  {
    id: 2,
    icon: Package,
    title: "Cajas de Sobres",
    description: "Booster Boxes directas de fábrica. Maximiza tus posibilidades de encontrar las cartas más raras.",
    image: "/Imagenes/me04-build-battle-box-es.png",
  },
  {
    id: 3,
    icon: Zap,
    title: "Sobres de Mejoras",
    description: "Packs individuales de las últimas expansiones. La emoción de abrir un nuevo tesoro.",
    image: "/Imagenes/me04-elite-trainer-box-169-es.png",
  },
  {
    id: 4,
    icon: Trophy,
    title: "Cajas de Colección",
    description: "Ediciones especiales con cartas promocionales exclusivas y accesorios de alta calidad.",
    image: "/Imagenes/me04-slider-logo-es.png",
  },
  {
    id: 5,
    icon: Star,
    title: "Cartas Gradeadas",
    description: "Certificaciones internacionales PSA, CGC y BGS. Inversión garantizada con las mejores notas.",
    image: "/Imagenes/me05-slider-logo-es.png",
  },
  {
    id: 6,
    icon: Layers,
    title: "Metacrilatos",
    description: "Protección premium para tus piezas más valiosas. Exhibición segura con filtro UV.",
    image: "/Imagenes/me2pt5-slider-logo-es.png",
  },
];

const vintageEraCards = [
  { id: 'v1', name: 'Alakazam Shadowless', price: 1800, image: '/Imagenes/mega-lucario-ex-league-battle-deck-169-es.png', category: 'Base Set' },
  { id: 'v2', name: 'Gengar EX Full Art', price: 950, image: '/Imagenes/mega-zygarde-ex-premium-collection-169-es.png', category: 'Phantom Forces' },
  { id: 'v3', name: 'Lugia Legend Top', price: 1200, image: '/Imagenes/sv01-slider-logo-es.png', category: 'HS Unleashed' },
];

import { TestimonialsCarousel, Testimonial } from '../components/ui/testimonials-carousel';

const testimonials: Testimonial[] = [
  {
    text: "Increíble selección de cartas y el envío a Tenerife fue súper rápido. Sasori Labs es mi tienda de confianza ahora.",
    highlight: "envío a Tenerife fue súper rápido",
    image: "/Imagenes/sv02-slider-logo-es.png",
    name: "María Rodríguez",
    role: "Coleccionista Elite",
  },
  {
    text: "La autenticidad es clave para mí. Recibir mis cartas PSA con tal nivel de protección fue una experiencia premium total.",
    highlight: "autenticidad es clave",
    image: "/Imagenes/sv03-slider-logo-es.png",
    name: "Carlos Gomez",
    role: "Inversionista TCG",
  },
  {
    text: "El equipo de Sasori Labs realmente entiende lo que buscamos los coleccionistas. Las aperturas en directo son brutales.",
    highlight: "realmente entiende lo que buscamos",
    image: "/Imagenes/sv035-slider-logo-es.png",
    name: "David Soto",
    role: "Entrenador Pokémon",
  },
  {
    text: "He comprado varias cajas de sobres y siempre vienen impecables. El servicio al cliente es de 10 puntos.",
    highlight: "servicio al cliente es de 10",
    image: "/Imagenes/sv04-slider-logo-es.png",
    name: "Elena Ruiz",
    role: "Fan de One Piece TCG",
  }
];

export default function Storefront() {
  const navigate = useNavigate();
  const { addToCart, toggleFavorite, isFavorite, storageImages } = useStore();
  const [cards, setCards] = useState<Card[]>([]);
  
  useEffect(() => {
    // Merge static demo cards with dynamic ones for a rich storefront
    const dynamicCards = getInventory().filter(c => c.isFeatured).map((card, index) => ({
      ...card,
      image_url: storageImages.length > 0 ? storageImages[index % storageImages.length] : card.image_url
    }));
    
    // Map static ones to Card interface if needed, but they are already similar
    const demoCards: Card[] = staticFeaturedCards.map((c, index) => ({
      id: `static-${c.id}`,
      name: c.name,
      price: c.price,
      image_url: storageImages.length > 0 ? storageImages[(dynamicCards.length + index) % storageImages.length] : c.image,
      rarity: c.category,
      stock: 5,
      set: 'Classic',
      isFeatured: true
    }));

    setCards([...dynamicCards, ...demoCards]);
  }, [storageImages]);

  const featuredCards = cards;

  const scrollToExplore = () => {
    document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-red-500/30">
      <StoreNavbar />
      <div className="pt-32 md:pt-40">
        <PulseFitHero 
        title="EL SANTUARIO POKÉMON EN CANARIAS."
        subtitle="DESCUBRE EL COLECCIONISMO DE ÉLITE. CARTAS GRADUADAS, SELLADAS Y RAREZAS EXCLUSIVAS CON ENVÍO ASEGURADO A TODAS LAS ISLAS CON EL SELLO DE SASORI LABS."
        primaryAction={{
          label: "EXPLORAR BÓVEDA",
          onClick: scrollToExplore
        }}
        secondaryAction={{
          label: "VER NOVEDADES",
          onClick: scrollToExplore
        }}
        disclaimer="*AUTENTICIDAD GARANTIZADA // ENVÍOS 24/48H"
        socialProof={{
          avatars: [
            "/Imagenes/ME03_ES_19.png",
            "/Imagenes/ME03_ES_22.png",
            "/Imagenes/ME03_ES_28.png",
            "/Imagenes/ME03_ES_6.png",
          ],
          text: "MÁS DE 5,000 ENTRENADORES CONFÍAN EN NOSOTROS",
        }}
        programs={[
          {
            image: storageImages.length > 0 ? storageImages[0 % storageImages.length] : "/Imagenes/ME03_ES_104.png",
            category: "VINTAGE",
            title: "Tesoros del Base Set",
            onClick: scrollToExplore
          },
          {
            image: storageImages.length > 0 ? storageImages[1 % storageImages.length] : "/Imagenes/ME03_ES_111.png",
            category: "GRADEADAS",
            title: "Certificación PSA/CGC",
            onClick: scrollToExplore
          },
          {
            image: storageImages.length > 0 ? storageImages[2 % storageImages.length] : "/Imagenes/ME03_ES_12.png",
            category: "EXCLUSIVAS",
            title: "Ilustraciones Especiales",
            onClick: scrollToExplore
          },
          {
            image: storageImages.length > 0 ? storageImages[3 % storageImages.length] : "/Imagenes/ME03_ES_123.png",
            category: "JAPANESE",
            title: "Importación Directa",
            onClick: scrollToExplore
          },
          {
            image: storageImages.length > 0 ? storageImages[4 % storageImages.length] : "/Imagenes/ME03_ES_14.png",
            category: "SEALED",
            title: "Elite Trainer Boxes",
            onClick: scrollToExplore
          },
        ]}
      />
      <TextMarquee 
        baseVelocity={-1} 
        clasname="text-2xl md:text-5xl font-black italic tracking-tighter text-white whitespace-nowrap font-retro pt-4"
      >
        ENTREGAS DISPONIBLES EN TODA CANARIAS • PRODUCTOS 100% OFICIALES • 
      </TextMarquee>

      <TrustGrid startIndex={0} />

      <Features 
        features={productCategories}
        sectionTitle="Categorías de Élite"
        sectionSubtitle="Explora nuestro catálogo especializado"
      />

      <TrustGrid startIndex={3} />

      {/* Premium Inventory Section */}
      <section id="explore" className="py-24 bg-zinc-900/40 border-y border-white/5 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-5xl font-black tracking-tighter mb-4 italic uppercase">Premium <span className="text-red-500">Inventory</span></h2>
              <p className="text-zinc-500 font-mono tracking-widest text-xs">CURATED_VAULT_2026 // AUTHENTICATED_ASSETS</p>
            </div>
            <div className="flex gap-4">
               <button className="px-6 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors">
                Filter_By_Era
               </button>
               <button className="px-6 py-2 bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors">
                View_All_Assets
               </button>
            </div>
          </div>

          {/* Featured Cards Carousel */}
          <div className="mb-20">
            <div className="mb-8 flex items-center gap-2">
              <div className="h-[1px] flex-1 bg-white/5"></div>
              <span className="text-[10px] font-mono font-black italic uppercase tracking-[0.4em] text-zinc-600">Flash_Showcase</span>
              <div className="h-[1px] flex-1 bg-white/5"></div>
            </div>
            <ProductCarousel cards={featuredCards} />
          </div>
 
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
            {featuredCards.map((card, i) => (
              <motion.div 
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                whileHover={{ y: -10 }}
                className="group relative"
              >
                <div className="aspect-[3/4] rounded-[2rem] bg-zinc-900 border border-white/5 overflow-hidden relative shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80 z-10"></div>
                  <img src={card.image_url || card.image} alt={card.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  
                  {/* Category Badge */}
                  <div className="absolute top-6 right-6 z-20 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-[8px] font-black uppercase tracking-[0.2em] italic text-white/90 font-retro pt-2">
                    {card.rarity || card.category}
                  </div>

                  {/* Favorite Button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(card);
                    }}
                    className={cn(
                      "absolute top-6 left-6 z-30 w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-md border border-white/10",
                      isFavorite(card.id) ? "bg-red-600 text-white" : "bg-black/60 text-white/60 hover:text-white"
                    )}
                  >
                    <Heart className={cn("w-5 h-5", isFavorite(card.id) && "fill-current")} />
                  </button>

                  {/* Corner Accent */}
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-red-500/30 rounded-tl-[2rem] m-2 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  {/* Hover Overlay Funnel */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 z-30 flex flex-col gap-3 items-center justify-center p-6 backdrop-blur-[2px]">
                    <Button 
                      onClick={() => navigate(`/checkout/${card.id}`)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-[0.2em] text-[10px] h-12 rounded-xl shadow-2xl shadow-red-600/40 border border-white/10 flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                      Protocolo Checkout
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    <Button 
                      onClick={() => addToCart(card)}
                      className="w-full bg-white hover:bg-zinc-200 text-black font-black italic uppercase tracking-[0.2em] text-[10px] h-12 rounded-xl shadow-2xl border border-white/10 flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                      Adicionar ao Carrinho
                      <ShoppingCart className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-8 px-2 space-y-4">
                  <div className="space-y-1">
                    <p className="text-[9px] text-red-500 font-mono font-bold tracking-[0.3em] uppercase font-retro">Asset_{card.id.split('-').pop()?.padStart(3, '0')}</p>
                    <h3 className="text-xl font-black group-hover:text-red-500 transition-colors uppercase italic tracking-tighter leading-none">{card.name}</h3>
                  </div>
                  
                  <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-2xl border border-white/5 group-hover:border-red-500/20 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest font-retro">Market Value</span>
                      <span className="text-xl font-black text-white italic">{formatCurrency(card.price)}</span>
                    </div>
                    <button 
                      onClick={() => addToCart(card)}
                      className="w-12 h-12 bg-white text-black rounded-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all transform group-hover:scale-110 shadow-xl"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>



      {/* Protocol Features Carousel */}
      <TrustGrid startIndex={6} />
      
      {/* Newsletter CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <CtaCard 
            title="ÚNETE AL ÉLITE DEL COLECCIONISMO"
            description="SUSCRÍBETE PARA RECIBIR ALERTAS DE DROPS EXCLUSIVOS, PRE-VENTAS Y PROMOCIONES DE ACCESO PRIVADO DIRECTO A TU BÓVEDA ELECTRÓNICA."
            buttonText="ACTIVAR ACCESO"
            inputPlaceholder="TU_EMAIL@PROTOCOLO.COM"
            imageSrc="/Imagenes/sv045-slider-logo-es.png"
            onButtonClick={(email) => console.log('Subscriber:', email)}
          />
        </div>
      </section>

      <section className="bg-zinc-900/20 py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 mb-12">
          <span className="text-red-500 font-mono font-black text-[10px] uppercase tracking-[0.4em] mb-2 block">Academy_Sourcing</span>
          <h2 className="text-3xl font-black tracking-tighter italic uppercase text-white">Aprende a jugar gratis</h2>
        </div>
        <FeatureCarousel />
      </section>

      <section className="py-24 border-t border-white/5 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center mb-16">
          <h2 className="text-4xl font-black tracking-tighter italic uppercase">Voces de la <span className="text-red-500">Comunidad</span></h2>
          <p className="text-zinc-500 mt-2 font-medium">Testimonios reales de entrenadores y coleccionistas</p>
        </div>
        <TestimonialsCarousel
          testimonials={testimonials}
          speed={30}
          direction="left"
          cardHeight={200}
        />
      </section>

      <StoreFooter />
      </div>
    </div>
  );
}
