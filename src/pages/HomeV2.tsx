import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  ChevronRight, 
  Truck, 
  ShieldCheck, 
  CheckCircle2, 
  Headset,
  Package,
  Box,
  Layers,
  Sword,
  UserCircle,
  MapPin,
  Target
} from 'lucide-react';
import { StoreNavbar } from '../components/layout/StoreNavbar';
import { cn } from '../lib/utils';
import { useStore } from '../lib/StoreContext';
import { DynamicCollectionShelf } from '../components/ui/DynamicCollectionShelf';

const TRUST_ITEMS = [
  { icon: Truck, title: 'ENVÍOS A TODA CANARIAS', desc: 'Reparto rápido en todas las islas.' },
  { icon: ShieldCheck, title: 'PAGOS SEGUROS', desc: 'Compra 100% protegida.' },
  { icon: CheckCircle2, title: 'PRODUCTOS ORIGINALES', desc: 'Solo material oficial.' },
  { icon: Headset, title: 'ATENCIÓN PERSONALIZADA', desc: 'Soporte local desde las islas.' },
];

export default function HomeV2() {
  const navigate = useNavigate();
  const { homepageDesign, marketing } = useStore();
  const [showPopup, setShowPopup] = React.useState(false);
  const [activeFilterPokemon, setActiveFilterPokemon] = React.useState('all');
  const [activeFilterMagic, setActiveFilterMagic] = React.useState('all');

  React.useEffect(() => {
    if (marketing?.gamification?.popupEnabled) {
      const timer = setTimeout(() => {
        setShowPopup(true);
      }, 5000); // Aparece a los 5 segundos
      return () => clearTimeout(timer);
    }
  }, [marketing?.gamification]);

  // Static product list for display
  const heroData = homepageDesign['ui_hero_split'] || {
    pokemon: {
      bgImage: '/Imagenes/Pokemon/Diseño sin título (10).png',
      bgColor: '#FBBF24',
      title: 'POKÉMON',
      subtitle: 'TRADING CARD GAME',
      description: 'Encuentra sobres, cajas, colecciones, y accesorios del Pokémon TCG.',
      buttonText: 'VER PRODUCTOS',
      buttonLink: '/catalog?game=pokemon',
      buttonBgColor: '#000000',
      buttonTextColor: '#FFFFFF',
      expansionLogos: [
        'https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Imagenes%20de%20Cartas/me04-slider-logo-es.png',
        'https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Imagenes%20de%20Cartas/me05-slider-logo-es.png',
        'https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Imagenes%20de%20Cartas/me2pt5-slider-logo-es.png'
      ]
    },
    magic: {
      bgImage: '/Imagenes/liliana_hero.png',
      bgColor: '#1E1B4B',
      title: 'MAGIC',
      subtitle: 'THE GATHERING',
      description: 'Explora sobres, cajas, mazos, y accesorios de Magic: The Gathering.',
      buttonText: 'VER PRODUCTOS',
      buttonLink: '/catalog?game=mtg',
      buttonBgColor: '#6D28D9',
      buttonTextColor: '#FFFFFF',
      expansionLogos: [
        '/Imagenes/Magic The Gathering/logo expansion.webp',
        '/Imagenes/Magic The Gathering/logo expansion2.webp',
        '/Imagenes/Magic The Gathering/logo expansion3.webp'
      ]
    }
  };

  // Featured Shelves Data
  const shelvesData = homepageDesign['ui_featured_shelves'] || {
    title: 'PRODUCTOS DESTACADOS',
    pokemonBg: '#FFFFFF',
    magicBg: '#0A0A1F',
    filterTags: [
      { label: 'TODOS', filterCategory: 'all' },
      { label: 'SOBRES', filterCategory: 'packs' },
      { label: 'CAJAS', filterCategory: 'boxes' },
      { label: 'ACCESORIOS', filterCategory: 'accessories' }
    ]
  };

  // Static product list for display
  const POKEMON_PRODUCTS = [
    { name: 'Sobre de Expansión Escarlata y Púrpura', price: '5,99€', img: '/Imagenes/me04-booster-bundle-169-es.png' },
    { name: 'Elite Trainer Box Paldea Evolved', price: '44,99€', img: '/Imagenes/me04-elite-trainer-box-169-es.png' },
    { name: 'Caja de Sobres Temporal Forces', price: '129,99€', img: '/Imagenes/me04-booster-display-box-es.png' },
    { name: 'Lata de Colección Paradox Pokémon', price: '23,99€', img: '/Imagenes/me04-build-battle-box-es.png' },
  ];

  const MAGIC_PRODUCTS = [
    { name: 'Sobre de Draft Tarkir: Tormenta Dracónica', price: '4,49€', img: '/Imagenes/Magic The Gathering/magic-realidad-fracturada-mazo-de-commander-multiverso-reforjado-castellano.webp' },
    { name: 'Caja de Sobres de Play Tarkir Dracónica', price: '134,99€', img: '/Imagenes/Magic The Gathering/8dc45e2231b8616ff3a95a01dd32a80b.webp' },
    { name: 'Mazo Commander Maestros de la Maldad', price: '54,99€', img: '/Imagenes/Magic The Gathering/74077499_o.webp' },
    { name: 'Bundle Wilds of Eldraine', price: '49,99€', img: '/Imagenes/Magic The Gathering/magic-the-gathering-vraska-the-unseen-0oq6rgvt7kjlbji4.webp' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-red-500/30 transition-colors duration-500 overflow-x-hidden">
      <StoreNavbar />

      {/* --- HERO SECTION --- */}
      <div className="pt-20 flex flex-col lg:flex-row lg:h-[calc(100vh-80px)]">
        
        {/* POKÉMON PANEL */}
        <div 
          className="relative flex-1 min-h-[70vh] lg:min-h-0 overflow-hidden flex flex-col p-4 lg:p-6 transition-all duration-500"
          style={{ backgroundColor: heroData.pokemon.bgColor }}
        >
          {/* Character image — full visible, right-aligned */}
          {heroData.pokemon.bgImage && (
            <img
              src={heroData.pokemon.bgImage}
              alt="Pokémon Character"
              className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none z-0 transition-transform"
              style={{
                transform: `translate(${heroData.pokemon.imageConfig?.x || 0}px, ${heroData.pokemon.imageConfig?.y || 0}px) scale(${heroData.pokemon.imageConfig?.scale || 1}) rotate(${heroData.pokemon.imageConfig?.rotate || 0}deg)`,
                opacity: heroData.pokemon.imageConfig?.opacity ?? 1
              }}
            />
          )}
          {/* Left gradient to keep text legible over the character image */}
          <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: `linear-gradient(to right, ${heroData.pokemon.bgColor} 30%, transparent 70%)` }} />

          {/* Expansion logos — absolute top-right — desktop only to avoid clash with character image */}
          {heroData.pokemon.expansionLogos.length > 0 && (
            <div className="absolute top-3 right-3 z-10 hidden lg:flex flex-col items-end gap-2">
              {heroData.pokemon.expansionLogos.map((logo: string, idx: number) => (
                <img
                  key={idx}
                  src={logo}
                  alt={`Colección Pokémon ${idx + 1}`}
                  className="h-10 w-auto object-contain drop-shadow-xl hover:scale-105 transition-transform duration-300"
                />
              ))}
            </div>
          )}
          
          <div className="relative z-10 flex flex-col h-full">
            {/* ── MOBILE ONLY: Pikachu absolutely positioned top-right ── */}
            <div className="absolute right-0 top-0 lg:hidden w-[48%] max-w-[200px] h-[220px] sm:h-[260px] pointer-events-none z-[5]">
              <img
                src={heroData.pokemon.featuredImage || '/Imagenes/pikachu_hero.png'}
                alt="Pikachu"
                className="w-full h-full object-contain object-right-top drop-shadow-2xl"
                style={heroData.pokemon.featuredImageConfig ? {
                  transform: `translate(${heroData.pokemon.featuredImageConfig.x || 0}px, ${heroData.pokemon.featuredImageConfig.y || 0}px) scale(${heroData.pokemon.featuredImageConfig.scale || 1}) rotate(${heroData.pokemon.featuredImageConfig.rotate || 0}deg)`,
                  opacity: heroData.pokemon.featuredImageConfig.opacity ?? 1
                } : undefined}
              />
            </div>

            <div className="mb-2 flex flex-row items-center w-full">
              {/* Text — gets right padding on mobile to clear the character image */}
              <div className="flex flex-col justify-center flex-1 pr-[46%] lg:pr-0">
              <div className="flex items-center gap-2 bg-black/10 backdrop-blur-md w-fit px-3 py-1 rounded-full mb-3 border border-black/5">
                <MapPin className="w-4 h-4 text-black" />
                <span className="text-[10px] font-black text-black tracking-[0.2em] uppercase">Exclusivo Islas Canarias</span>
              </div>
              
              <div className="flex flex-col gap-2 mb-3">

                <div className="flex flex-col">
                  <motion.h2 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-[38px] lg:text-[48px] leading-[0.9] font-black text-black tracking-tight uppercase"
                  >
                    {heroData.pokemon.title}
                  </motion.h2>
                  <motion.p 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-[11px] lg:text-[13px] font-black text-black uppercase tracking-[0.15em] mt-1"
                  >
                    {heroData.pokemon.subtitle}
                  </motion.p>
                </div>
                
                <p className="text-black/80 font-medium max-w-[420px] text-[11px] leading-snug mt-1">
                  {heroData.pokemon.description}
                </p>
              </div>

              <button 
                onClick={() => navigate(heroData.pokemon.buttonLink)}
                title={`Explorar catálogo de ${heroData.pokemon.title}`}
                className="mt-2 w-fit px-6 py-2.5 rounded-xl font-black text-[10px] tracking-widest flex items-center gap-2 hover:scale-105 transition-all duration-300 uppercase shadow-2xl active:scale-95"
                style={{ 
                  backgroundColor: heroData.pokemon.buttonBgColor || '#000000',
                  color: heroData.pokemon.buttonTextColor || '#FFFFFF'
                }}
              >
                {heroData.pokemon.buttonText} <ArrowRight className="w-5 h-5" />
              </button>
              </div>

              {/* DESKTOP ONLY: featured image in flex row */}
              <div className="hidden lg:flex w-[220px] xl:w-[280px] h-[160px] xl:h-[200px] mr-24 xl:mr-32 items-center justify-center relative pointer-events-none">
                <img
                  src={heroData.pokemon.featuredImage || '/Imagenes/pikachu_hero.png'}
                  alt="Pikachu"
                  className="w-full h-full object-contain drop-shadow-2xl"
                  style={heroData.pokemon.featuredImageConfig ? {
                    transform: `translate(${heroData.pokemon.featuredImageConfig.x || 0}px, ${heroData.pokemon.featuredImageConfig.y || 0}px) scale(${heroData.pokemon.featuredImageConfig.scale || 1}) rotate(${heroData.pokemon.featuredImageConfig.rotate || 0}deg)`,
                    opacity: heroData.pokemon.featuredImageConfig.opacity ?? 1
                  } : undefined}
                />
              </div>
            </div>

            <div 
              className="mt-2 rounded-[1.5rem] p-3 lg:p-4 shadow-2xl border border-white flex flex-col overflow-visible transition-colors duration-500"
              style={{ backgroundColor: shelvesData.pokemonBg || '#FFFFFF' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-black">
                  <Package className="w-4 h-4 text-yellow-600 opacity-30" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">{shelvesData.title}</span>
                </div>
                <button 
                  title="Ver todos los productos destacados"
                  className="text-[12px] font-bold text-black/20 hover:text-black transition-colors flex items-center gap-1 uppercase tracking-widest"
                >
                  Ver todos <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-2">
                {heroData.pokemon.collection_tag_id ? (
                  <DynamicCollectionShelf 
                    tagId={heroData.pokemon.collection_tag_id} 
                    theme="light" 
                    activeFilter={activeFilterPokemon}
                  />
                ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                    {POKEMON_PRODUCTS.map((prod, i) => (
                      <div key={i} className="group cursor-pointer">
                        <div className="aspect-square bg-zinc-50 rounded-xl flex items-center justify-center p-2 mb-1 border border-zinc-100 group-hover:border-yellow-400 transition-all duration-500 group-hover:shadow-xl">
                          <img src={prod.img} alt={prod.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" />
                        </div>
                        <p className="text-[9px] font-bold text-black leading-tight mb-0.5 line-clamp-2">{prod.name}</p>
                        <p className="text-[11px] font-black text-black">{prod.price}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex sm:grid sm:grid-cols-4 gap-1.5 pt-2 border-t border-zinc-100 overflow-x-auto scrollbar-hide snap-x">
                {shelvesData.filterTags.map((item: any, i: number) => {
                  const Icon = item.label === 'TODOS' ? Layers : 
                               item.label === 'SOBRES' ? Package :
                               item.label === 'CAJAS' ? Box : UserCircle;
                  const isActive = activeFilterPokemon === item.filterCategory;
                  
                  return (
                    <button 
                      key={i}
                      onClick={() => setActiveFilterPokemon(item.filterCategory)}
                      title={`Filtrar por ${item.label}`}
                      className={cn(
                        "flex items-center justify-center gap-1 px-3 sm:px-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-[0.1em] transition-all duration-300 min-w-[80px] sm:min-w-0 sm:w-full snap-start shrink-0",
                        isActive ? 'bg-black text-white shadow-xl' : 'bg-zinc-50 text-black/30 hover:bg-zinc-100 hover:text-black'
                      )}
                    >
                      <Icon className="w-4 h-4 hidden sm:inline" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* MAGIC PANEL */}
        <div 
          className="relative flex-1 min-h-[70vh] lg:min-h-0 overflow-hidden flex flex-col p-4 lg:p-6 border-t lg:border-t-0 lg:border-l border-white/10 transition-all duration-500"
          style={{ backgroundColor: heroData.magic.bgColor }}
        >
          {/* Character image — full visible, right-aligned */}
          {heroData.magic.bgImage && (
            <img
              src={heroData.magic.bgImage}
              alt="Magic Character"
              className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none z-0 transition-transform"
              style={{
                transform: `translate(${heroData.magic.imageConfig?.x || 0}px, ${heroData.magic.imageConfig?.y || 0}px) scale(${heroData.magic.imageConfig?.scale || 1}) rotate(${heroData.magic.imageConfig?.rotate || 0}deg)`,
                opacity: heroData.magic.imageConfig?.opacity ?? 1
              }}
            />
          )}
          {/* Left gradient to keep text legible */}
          <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: `linear-gradient(to right, ${heroData.magic.bgColor} 30%, transparent 70%)` }} />

          {/* Expansion logos — absolute top-right — desktop only to avoid clash with character image */}
          {heroData.magic.expansionLogos.length > 0 && (
            <div className="absolute top-3 right-3 z-10 hidden lg:flex flex-col items-end gap-2">
              {heroData.magic.expansionLogos.map((logo: string, idx: number) => (
                <img
                  key={idx}
                  src={logo}
                  alt={`Colección Magic ${idx + 1}`}
                  className="h-10 w-auto object-contain drop-shadow-xl hover:scale-105 transition-transform duration-300"
                />
              ))}
            </div>
          )}
          
          <div className="relative z-10 flex flex-col h-full">
            {/* ── MOBILE ONLY: Planeswalker absolutely positioned top-right ── */}
            <div className="absolute right-0 top-0 lg:hidden w-[46%] max-w-[190px] h-[200px] sm:h-[240px] pointer-events-none z-[5]">
              <img
                src={heroData.magic.featuredImage || '/Imagenes/magic_planeswalker_white.png'}
                alt="Planeswalker"
                className="w-full h-full object-contain object-right-top drop-shadow-2xl"
                style={heroData.magic.featuredImageConfig ? {
                  transform: `translate(${heroData.magic.featuredImageConfig.x || 0}px, ${heroData.magic.featuredImageConfig.y || 0}px) scale(${heroData.magic.featuredImageConfig.scale || 1}) rotate(${heroData.magic.featuredImageConfig.rotate || 0}deg)`,
                  opacity: heroData.magic.featuredImageConfig.opacity ?? 1
                } : undefined}
              />
            </div>

            <div className="mb-2 flex flex-row items-center w-full">
              {/* Text — gets right padding on mobile to clear the character image */}
              <div className="flex flex-col justify-center flex-1 pr-[44%] lg:pr-0">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md w-fit px-3 py-1 rounded-full mb-3 border border-white/5">
                <MapPin className="w-4 h-4 text-purple-400" />
                <span className="text-[10px] font-black text-white tracking-[0.2em] uppercase">Exclusivo Islas Canarias</span>
              </div>
 
              <div className="flex flex-col gap-2 mb-3">


                <div className="flex flex-col">
                  <motion.h2 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-[38px] lg:text-[48px] leading-[0.9] font-black text-white tracking-tight uppercase"
                  >
                    {heroData.magic.title}
                  </motion.h2>
                  <motion.p 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-[11px] lg:text-[13px] font-black text-white uppercase tracking-[0.15em] mt-1"
                  >
                    {heroData.magic.subtitle}
                  </motion.p>
                </div>

                <p className="text-white/80 font-medium max-w-[420px] text-[11px] leading-snug mt-1">
                  {heroData.magic.description}
                </p>
              </div>

              <button 
                onClick={() => navigate(heroData.magic.buttonLink)}
                title={`Explorar catálogo de ${heroData.magic.title}`}
                className="mt-2 w-fit px-6 py-2.5 rounded-xl font-black text-[10px] tracking-widest flex items-center gap-2 hover:scale-105 transition-all duration-300 uppercase shadow-2xl active:scale-95"
                style={{ 
                  backgroundColor: heroData.magic.buttonBgColor || '#6D28D9',
                  color: heroData.magic.buttonTextColor || '#FFFFFF'
                }}
              >
                {heroData.magic.buttonText} <ArrowRight className="w-5 h-5" />
              </button>
              </div>

              {/* DESKTOP ONLY: featured image in flex row */}
              <div className="hidden lg:flex w-[220px] xl:w-[280px] h-[160px] xl:h-[200px] mr-24 xl:mr-32 items-center justify-center relative pointer-events-none">
                <img
                  src={heroData.magic.featuredImage || '/Imagenes/magic_planeswalker_white.png'}
                  alt="Planeswalker"
                  className="w-full h-full object-contain drop-shadow-2xl"
                  style={heroData.magic.featuredImageConfig ? {
                    transform: `translate(${heroData.magic.featuredImageConfig.x || 0}px, ${heroData.magic.featuredImageConfig.y || 0}px) scale(${heroData.magic.featuredImageConfig.scale || 1}) rotate(${heroData.magic.featuredImageConfig.rotate || 0}deg)`,
                    opacity: heroData.magic.featuredImageConfig.opacity ?? 1
                  } : undefined}
                />
              </div>
            </div>

            <div 
              className="mt-2 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] p-3 lg:p-4 shadow-2xl flex flex-col overflow-visible transition-colors duration-500"
              style={{ backgroundColor: shelvesData.magicBg ? `${shelvesData.magicBg}F2` : '#0A0A1FF2' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-white">
                  <Package className="w-4 h-4 text-purple-400 opacity-40" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">{shelvesData.title}</span>
                </div>
                <button 
                  title="Ver todos los productos destacados de Magic"
                  className="text-[12px] font-bold text-white/20 hover:text-white transition-colors flex items-center gap-1 uppercase tracking-widest"
                >
                  Ver todos <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-2">
                {heroData.magic.collection_tag_id ? (
                  <DynamicCollectionShelf 
                    tagId={heroData.magic.collection_tag_id} 
                    theme="dark" 
                    activeFilter={activeFilterMagic}
                  />
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                    {MAGIC_PRODUCTS.map((prod, i) => (
                      <div key={i} className="group cursor-pointer">
                        <div className="aspect-square bg-white/5 rounded-xl flex items-center justify-center p-2 mb-1 border border-white/5 group-hover:border-purple-500 transition-all duration-500 group-hover:shadow-purple-500/20">
                          <img src={prod.img} alt={prod.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" />
                        </div>
                        <p className="text-[9px] font-bold text-white leading-tight mb-0.5 line-clamp-2">{prod.name}</p>
                        <p className="text-[11px] font-black text-purple-400">{prod.price}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex sm:grid sm:grid-cols-4 gap-1.5 pt-2 border-t border-white/5 overflow-x-auto scrollbar-hide snap-x">
                {shelvesData.filterTags.map((item: any, i: number) => {
                  const Icon = item.label === 'TODOS' ? Layers : 
                               item.label === 'SOBRES' ? Package :
                               item.label === 'CAJAS' ? Box : Sword;
                  const isActive = activeFilterMagic === item.filterCategory;
                  
                  return (
                    <button 
                      key={i}
                      onClick={() => setActiveFilterMagic(item.filterCategory)}
                      title={`Filtrar por ${item.label}`}
                      className={cn(
                        "flex items-center justify-center gap-1 px-3 sm:px-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-[0.1em] transition-all duration-300 min-w-[80px] sm:min-w-0 sm:w-full snap-start shrink-0",
                        isActive ? 'bg-purple-600 text-white shadow-xl shadow-purple-500/20' : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <Icon className="w-4 h-4 hidden sm:inline" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- TRUST BAR --- */}
      <div className="bg-card border-t border-border py-3 px-4 lg:px-6">
        <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-4">
          {TRUST_ITEMS.map((item, i) => (
            <div key={i} className="flex items-center gap-3 group">
              <div className="p-2 bg-muted rounded-xl group-hover:bg-primary/10 transition-all duration-700 border border-border shrink-0">
                <item.icon className="w-4 h-4 lg:w-5 lg:h-5 text-primary transition-colors" />
              </div>
              <div className="flex flex-col">
                <h4 className="text-[8px] lg:text-[9px] font-black tracking-[0.15em] text-foreground uppercase leading-tight">
                  {item.title}
                </h4>
                <p className="text-[7px] lg:text-[8px] font-medium text-muted-foreground leading-tight hidden sm:block">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- CAPTURE POP-UP (GAMIFICATION) --- */}
      <AnimatePresence>
        {showPopup && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
          className="fixed bottom-4 right-4 left-4 sm:left-auto sm:right-10 sm:bottom-10 z-[200] sm:max-w-sm"
          >
            <div className="bg-card backdrop-blur-3xl p-8 rounded-[2rem] border border-primary/30 shadow-[0_0_50px_rgba(var(--primary),0.2)] relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4">
                  <button onClick={() => setShowPopup(false)} className="text-muted-foreground hover:text-foreground uppercase text-[9px] font-black tracking-widest transition-colors">Cerrar</button>
               </div>
               <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 animate-pulse">
                     <Target className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">¡EVENTO DE CAPTURA!</p>
                    <p className="text-xl font-black text-foreground italic uppercase tracking-tighter">UN {marketing.gamification.currentEntity} SALVAJE</p>
                  </div>
               </div>
               <p className="text-xs text-muted-foreground leading-relaxed mb-6 italic">
                 {marketing.gamification.popupMessage || `¡Un ${marketing.gamification.currentEntity} ha aparecido! Completa una compra ahora para tener un ${marketing.gamification.captureChance * 100}% de probabilidad de capturarlo.`}
               </p>
               <button 
                onClick={() => {
                  navigate('/catalog');
                  setShowPopup(false);
                }}
                className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
               >
                 INTENTAR CAPTURARLO
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

