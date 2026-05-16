import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  ShoppingCart, 
  ShieldCheck, 
  Star, 
  Plus, 
  Minus,
  Loader2,
  Info,
  Package,
  Layers,
  Zap,
  Medal,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Eye,
  Link as LinkIcon,
  MessageCircle,
  Twitter,
  Share2,
  CreditCard,
  Languages,
  Truck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StoreNavbar } from '../components/layout/StoreNavbar';
import { useStore } from '../lib/StoreContext';
import { useCartStore } from '../lib/cartStore';
import { Toast } from '../components/ui/Toast';
import { cn } from '../lib/utils';

// --- Types ---
interface Product {
  id: string;
  name: string;
  description: string;
  base_price: number;
  image_url: string;
  base_stock: number;
  sku: string;
  categories: { name: string; id: string };
  top_hits_images?: string[];
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string>('');
  const [showToast, setShowToast] = useState(false);
  const [selectedLang, setSelectedLang] = useState('ES');
  
  const { homepageDesign } = useStore();
  const pdpConfig = homepageDesign['ui_pdp_config'] || {
    socialProof: { isVisible: true, watching: { min: 10, max: 25 }, inCart: { min: 3, max: 8 } },
    payments: { title: 'PAGO SEGURO', methods: [] },
    sharing: { whatsapp: true, twitter: true, link: true },
    topHits: [],
    languages: [{ id: 'es', label: 'ES', flag: '🇪🇸', isActive: true }]
  };
  
  const addItem = useCartStore(state => state.addItem);

  // Live Stats Randomizer based on Admin Config
  const liveStats = useMemo(() => {
    const wMin = pdpConfig.socialProof.watching?.min || 10;
    const wMax = pdpConfig.socialProof.watching?.max || 30;
    const cMin = pdpConfig.socialProof.inCart?.min || 3;
    const cMax = pdpConfig.socialProof.inCart?.max || 15;
    
    return {
      watching: Math.floor(Math.random() * (wMax - wMin + 1)) + wMin,
      inCart: Math.floor(Math.random() * (cMax - cMin + 1)) + cMin
    };
  }, [pdpConfig]);

  useEffect(() => {
    if (id) {
      fetchProductData();
    }
  }, [id]);

  const fetchProductData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories ( id, name )')
        .eq('id', id)
        .single();

      if (!error && data) {
        setProduct(data);
        setActiveImage(data.image_url);
        
        const { data: related } = await supabase
          .from('products')
          .select('*, categories ( name )')
          .limit(4);
        
        if (related) setRelatedProducts(related);
      }
    } catch (err) {
      console.error('Error fetching product:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      id: product.id,
      name: product.name,
      price: product.base_price,
      image_url: product.image_url,
      rarity: 'Ultra Rare',
      set: product.categories?.name || 'Expansion',
      stock: product.base_stock
    } as any, quantity);
    setShowToast(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-red-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-20 h-20 text-muted-foreground/20 mb-6" />
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-4 italic">Bóveda Vacía</h1>
        <Link to="/catalog" className="px-10 py-4 bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] text-[10px] rounded-xl hover:bg-foreground transition-all">
          Volver al Catálogo
        </Link>
      </div>
    );
  }

  const installmentPrice = (product.base_price / 6).toFixed(2);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 overflow-x-hidden transition-colors duration-500">
      <StoreNavbar />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-24 pb-20">
        
        {/* Breadcrumbs */}
        <nav className="mb-4 flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Inicio</Link>
          <ChevronRight className="w-2.5 h-2.5 opacity-30" />
          <Link to="/catalog" className="hover:text-foreground transition-colors">Productos</Link>
          <ChevronRight className="w-2.5 h-2.5 opacity-30" />
          <span className="opacity-50">{product.categories?.name}</span>
          <ChevronRight className="w-2.5 h-2.5 opacity-30" />
          <span className="text-foreground truncate max-w-[120px]">{product.name}</span>
        </nav>

        {/* --- GRID PRINCIPAL --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
          
          {/* Columna Izquierda (Galería + Sellos) */}
          <div className="lg:col-span-7">
            <div className="flex gap-4">
              <div className="hidden sm:flex flex-col gap-2 w-16 shrink-0">
                {[product.image_url, product.image_url, product.image_url].map((img, idx) => (
                  <div key={idx} className={cn("aspect-[4/5] rounded-lg border overflow-hidden bg-zinc-900/50 cursor-pointer transition-all", idx === 0 ? "border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.2)]" : "border-white/5 hover:border-white/20")}>
                    <img src={img} alt="" className="w-full h-full object-cover opacity-60" />
                  </div>
                ))}
              </div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                className="flex-1 relative aspect-square max-h-[500px] rounded-[2.5rem] bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 flex items-center justify-center p-10 group shadow-[0_40px_100px_rgba(0,0,0,0.5)]"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.05)_0%,transparent_70%)]" />
                <img src={product.image_url} alt={product.name} className="w-full h-full object-contain drop-shadow-[0_0_50px_rgba(239,68,68,0.15)] group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute top-8 left-8 flex flex-col gap-1">
                  <div className="px-3 py-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full">
                    <p className="text-[7px] font-black uppercase tracking-[0.2em] text-red-500">PREMIUM VAULT EDITION</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* --- SELLOS DE CONFIANZA (MINIMALISTAS BAJO LA IMAGEN) --- */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 py-6 border-t border-white/5">
              {pdpConfig.trustSeals.map((seal, i) => {
                const Icon = i === 0 ? Truck : i === 1 ? ShieldCheck : CheckCircle2;
                return (
                  <div key={i} className="flex items-center gap-3 group transition-all">
                    <div className="w-8 h-8 rounded-xl bg-red-600/5 flex items-center justify-center text-red-500/40 group-hover:text-red-500 group-hover:bg-red-600/10 transition-all border border-white/5 group-hover:border-red-600/20">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[9px] font-black uppercase text-foreground tracking-widest">{seal.title}</p>
                      <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-tighter italic">{seal.desc || 'Garantía Sasori'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Columna Derecha (Buy Box REFACTORIZADA) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 h-fit bg-card/40 backdrop-blur-sm p-2 rounded-3xl space-y-6 border border-border/50">
            
            {/* 1. CONTENEDOR SUPERIOR FLEX */}
            <div className="flex justify-between items-start gap-6">
              
              {/* Lado Izquierdo: Info del Producto */}
              <div className="flex flex-col flex-1 space-y-3">
                <div className="space-y-1.5">
                  <span className="inline-block px-2.5 py-0.5 bg-red-600/10 border border-red-600/20 rounded text-[8px] font-black text-red-500 uppercase tracking-[0.2em]">
                    {product.categories?.name || 'PRODUCTO EXCLUSIVO'}
                  </span>
                  <h1 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-tight italic bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                    {product.name}
                  </h1>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-yellow-500 text-yellow-500" />)}
                    </div>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">4.9 <span className="opacity-40">(128 reseñas)</span></span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <p className="text-4xl font-black text-foreground tracking-tighter italic">{product.base_price.toFixed(2)}€</p>
                  <div className="flex items-center gap-1.5 text-zinc-600">
                    <p className="text-[8px] font-bold uppercase tracking-widest">Hasta 6 cuotas de {installmentPrice}€</p>
                    <Info className="w-2.5 h-2.5 opacity-50 cursor-help" />
                  </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 border border-emerald-500/10 w-fit rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">En stock y listo para envío</span>
                </div>

                {/* Gadget de Idiomas */}
                {pdpConfig.languages?.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Idioma / Edición:</p>
                    <div className="flex gap-1.5">
                      {pdpConfig.languages.filter(l => l.isActive).map(lang => (
                        <button 
                          key={lang.id} onClick={() => setSelectedLang(lang.label)}
                          className={cn(
                            "px-3 h-8 rounded-lg border text-[9px] font-black transition-all flex items-center justify-center gap-2",
                            selectedLang === lang.label 
                              ? "border-primary bg-primary/10 text-primary shadow-[0_0_10px_rgba(243,185,28,0.2)]" 
                              : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
                          )}
                        >
                          <span>{lang.flag}</span> {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Lado Derecho: El 'Cuadrado Rojo' (Urgencia y Compartir) */}
              <div className="flex flex-col items-end gap-4 w-[180px] shrink-0 pt-2">
                
                {/* Fila de Compartir */}
                <div className="flex flex-col items-end gap-2">
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Compartir:</span>
                  <div className="flex gap-2">
                    {pdpConfig.sharing.link && <button title="Copiar enlace" className="w-8 h-8 rounded-lg border border-white/5 bg-white/[0.02] flex items-center justify-center hover:bg-white/10 transition-colors shadow-xl"><LinkIcon className="w-3.5 h-3.5 text-zinc-500" /></button>}
                    {pdpConfig.sharing.whatsapp && <button title="Compartir en WhatsApp" className="w-8 h-8 rounded-lg border border-white/5 bg-white/[0.02] flex items-center justify-center hover:bg-white/10 transition-colors shadow-xl"><MessageCircle className="w-3.5 h-3.5 text-zinc-500" /></button>}
                    {pdpConfig.sharing.twitter && <button title="Compartir en Twitter" className="w-8 h-8 rounded-lg border border-white/5 bg-white/[0.02] flex items-center justify-center hover:bg-white/10 transition-colors shadow-xl"><Twitter className="w-3.5 h-3.5 text-zinc-500" /></button>}
                  </div>
                </div>

                {/* Caja de Live Stats */}
                {pdpConfig.socialProof.isVisible && (
                  <div className="w-full flex flex-col gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl shadow-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-600/10 flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-foreground text-xs font-black leading-none">{liveStats.inCart}</span>
                        <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">En carritos</span>
                      </div>
                    </div>
                    <div className="w-full h-[1px] bg-white/5" />
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-600/10 flex items-center justify-center shrink-0">
                        <Eye className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-foreground text-xs font-black leading-none">{liveStats.watching}</span>
                        <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">Viendo ahora</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* 2. BOTONES DE ACCIÓN */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-muted border border-border rounded-xl h-14 px-3 shrink-0">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 flex items-center justify-center hover:bg-background/10 rounded-lg"><Minus className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <span className="w-8 text-center text-sm font-black text-foreground">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-background/10 rounded-lg"><Plus className="w-3.5 h-3.5 text-muted-foreground" /></button>
                </div>
                <button onClick={handleAddToCart} className="flex-1 h-14 bg-primary hover:bg-foreground text-primary-foreground rounded-xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-2xl shadow-primary/20 group">
                  <ShoppingCart className="w-4 h-4 group-hover:rotate-12 transition-transform" /> {pdpConfig.primaryButtonText || 'AGREGAR AL CARRITO'}
                </button>
              </div>
              <button className="w-full h-14 border border-border hover:border-foreground/30 bg-muted/50 hover:bg-muted rounded-xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 transition-all text-foreground">
                <ShieldCheck className="w-4 h-4 text-primary" /> {pdpConfig.secondaryButtonText || 'COMPRAR AHORA'}
              </button>
            </div>

            {/* Gadget Pago Seguro */}
            <div className="pt-2 flex flex-col items-center gap-3 border-t border-white/5">
              <p className="text-[7px] font-black text-zinc-700 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-3 h-3" /> {pdpConfig.payments.title || 'Transacción Encriptada 256-bit'}
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity">
                {pdpConfig.payments.methods.filter(m => m.isActive).map(m => (
                  <div key={m.id} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded text-[7px] font-bold text-zinc-400 uppercase tracking-widest">{m.label}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Banda de Características */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 py-10 border-y border-white/5 mb-16">
          {pdpConfig.breakdownItems?.map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-3 group">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center group-hover:border-red-600/30 transition-all">
                <Layers className="w-5 h-5 text-yellow-500/60 group-hover:text-yellow-500" />
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-white">{item.label}</p>
            </div>
          ))}
        </div>

        {/* 4. Sección Inferior */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-20">
          <div className="lg:col-span-8 space-y-16">
            <div className="space-y-8">
              <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-4">
                <div className="w-10 h-[2px] bg-red-600" /> DESCRIPCIÓN
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-3xl italic">
                {product.description || "Esta exclusiva pieza de colección representa la esencia de la estrategia y el arte de las cartas coleccionables."}
              </p>
            </div>

            <div className="space-y-10 pt-10 border-t border-white/5">
              <h2 className="text-xl font-black uppercase italic tracking-tighter">RELACIONADOS</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {relatedProducts.slice(0, 4).map((item, i) => (
                  <div key={i} className="group space-y-4">
                    <Link to={`/producto/${item.id}`} className="block aspect-square rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center p-6 group-hover:border-red-600/30 overflow-hidden relative transition-all">
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
                    </Link>
                    <div>
                      <h3 className="text-[10px] font-black uppercase text-foreground truncate">{item.name}</h3>
                      <p className="text-xs font-black text-foreground">{item.base_price.toFixed(2)}€</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

            {/* --- TOP HITS SECTION (Individual Product Data) --- */}
            {product.top_hits_images && product.top_hits_images.length > 0 && (
              <div className="lg:col-span-4">
                <div className="p-8 rounded-[3rem] bg-card border border-border shadow-2xl relative overflow-hidden group transition-colors">
                  <div className="relative z-10 space-y-8">
                    <h3 className="text-sm font-black uppercase italic tracking-widest text-foreground border-b border-border pb-4">TOP HITS — VAULT</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {product.top_hits_images.slice(0, 4).map((url, i) => (
                        <div key={i} className="aspect-[2/3] rounded-xl overflow-hidden border border-white/10 bg-zinc-800 shadow-2xl group/hit">
                          <img src={url} alt="Top Hit Card" className="w-full h-full object-cover group-hover/hit:scale-110 transition-transform duration-700" />
                        </div>
                      ))}
                    </div>
                    <button className="w-full py-4 border border-red-600/30 rounded-2xl text-[10px] font-black uppercase text-red-500 transition-all flex items-center justify-center gap-2 hover:bg-red-600/10">
                      <Eye className="w-4 h-4" /> VER LISTA COMPLETA
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>

      </main>

      <Toast show={showToast} message="Añadido a la bóveda" onClose={() => setShowToast(false)} />
    </div>
  );
}
