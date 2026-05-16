import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus,
  Minus,
  Maximize2,
  Trash2,
  ShieldCheck, 
  Star, 
  ChevronDown,
  Info,
  Heart,
  Share2,
  MessageCircle,
  Users,
  Check,
  Bell,
  Truck,
  Camera,
  X,
  CreditCard,
  Zap,
  Award,
  ShoppingCart,
  Mail,
  Phone,
  ArrowRight,
  ChevronRight,
  Lock,
  Gift,
  Tag
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { cn } from '../lib/utils';
import { StoreNavbar } from '../components/layout/StoreNavbar';
import { useStore } from '../lib/StoreContext';
import { Card } from '../types';

// --- Types ---
interface Product {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  reviews: number;
  rating: number;
  images: string[];
  pokePuntos: number;
  stock: number;
}

const SHIPPING_METHODS = [
  { id: 'standard', name: 'Envío Estándar', price: 4.90, time: '3-5 días laborables' },
  { id: 'express', name: 'Envío Express', price: 9.90, time: '1-2 días laborables' },
  { id: 'priority', name: 'Prioritario Sasori', price: 14.90, time: 'Entrega 24h Garantizada' },
];

const getProduct = (id: string): Product => {
  return { 
    id: id || '1', 
    name: 'POKEPACK Base Set | 5 Sobres + Bonus | Mystery Box Base Set 1ed 1:25', 
    price: 79.90,
    oldPrice: 85.00,
    reviews: 61,
    rating: 4.8,
    images: [
      '/Imagenes/ME03_ES_104.png',
      '/Imagenes/ME03_ES_111.png'
    ],
    pokePuntos: 780,
    stock: 0, 
  };
};

export default function CheckoutFunnel() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addToCart, toggleFavorite, isFavorite, storageImages, calculatePrice } = useStore();
  
  const product = React.useMemo(() => {
    const raw = getProduct(productId || '1');
    if (storageImages.length > 0) {
      // Use consistently for the same ID
      const seed = (productId || '1').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return {
        ...raw,
        images: storageImages.slice(seed % storageImages.length, (seed % storageImages.length) + 2)
      };
    }
    return raw;
  }, [productId, storageImages]);

  // Convert Product to Card for store actions
  const card: Card = {
    id: product.id,
    name: product.name,
    price: product.price,
    image_url: product.images[0],
    rarity: 'Common',
    stock: product.stock,
    set: 'Mystery',
    isFeatured: false
  };
  
  // State
  const [currentStep, setCurrentStep] = useState(0); // 0: Product, 1: Checkout
  const [selectedLanguage, setSelectedLanguage] = useState('EN');
  const [mainImage, setMainImage] = useState(product.images[0]);
  const [viewers] = useState(14);
  const [quantity, setQuantity] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [notifMode, setNotifMode] = useState<'email' | 'sms'>('email');
  const [notifContact, setNotifContact] = useState('');
  
  // Checkout State
  const [selectedShipping, setSelectedShipping] = useState(SHIPPING_METHODS[0]);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string, amount: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'apple' | 'google'>('card');

  // Calculations
  const subtotal = calculatePrice(product.price) * quantity;
  const shippingCost = selectedShipping.price;
  const discountAmount = appliedDiscount?.amount || 0;
  const total = subtotal + shippingCost - discountAmount;

  const handleApplyDiscount = () => {
    if (discountCode.toUpperCase() === 'SASORI10') {
      setAppliedDiscount({ code: 'SASORI10', amount: subtotal * 0.1 });
    } else if (discountCode.toUpperCase() === 'FIRSTBUY') {
      setAppliedDiscount({ code: 'FIRSTBUY', amount: 5.00 * quantity });
    } else {
      alert('Código no válido');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-red-600/30 overflow-x-hidden relative">
      <StoreNavbar />
      <div className="pt-20">
        {/* Sasori Top Protocol */}
      <div className="bg-[#000] text-red-600 px-6 py-2.5 flex justify-between items-center border-b border-white/5">
         <div className="flex items-center gap-3">
           <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
           <span className="text-[10px] font-black uppercase tracking-[0.4em] italic opacity-80">Secured via Sasori_Labs // Authentic Asset Distribution</span>
         </div>
         <div className="hidden md:flex items-center gap-6 text-[9px] font-bold uppercase tracking-widest text-zinc-500">
           <span>Protocol: v2.4.0</span>
           <span>Node: Madrid_Center</span>
         </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8 md:py-16">
        <AnimatePresence mode="wait">
          {currentStep === 0 ? (
            <motion.div 
              key="step-product"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start"
            >
              {/* IMAGE ZOOM OVERLAY */}
              <AnimatePresence>
                {isZoomed && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsZoomed(false)}
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-20 cursor-zoom-out"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="relative max-w-5xl w-full aspect-square rounded-[3rem] overflow-hidden border border-white/10"
                    >
                      <img src={mainImage} className="w-full h-full object-contain" alt="" />
                      <button 
                        title="Cerrar Zoom"
                        aria-label="Cerrar Zoom"
                        className="absolute top-8 right-8 p-4 bg-white/10 hover:bg-red-600 rounded-full transition-colors"
                      >
                        <X className="w-6 h-6 text-white" />
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* COLUMNA IZQUIERDA: Galería */}
              <div className="space-y-6 lg:sticky lg:top-10">
                <div 
                  onClick={() => setIsZoomed(true)}
                  className="relative aspect-square bg-[#111113] rounded-[2.5rem] overflow-hidden border border-white/5 group cursor-zoom-in"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-red-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <img src={mainImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                  <div className="absolute top-8 right-8 flex flex-col gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(card); }}
                      title={isFavorite(card.id) ? "Quitar de favoritos" : "Añadir a favoritos"}
                      aria-label={isFavorite(card.id) ? "Quitar de favoritos" : "Añadir a favoritos"}
                      className={cn(
                        "p-4 backdrop-blur-xl rounded-2xl border transition-all group/heart",
                        isFavorite(card.id) ? "bg-red-600 border-red-600 text-white" : "bg-black/40 border-white/10 text-zinc-400 hover:bg-red-600/20 hover:border-red-600/40"
                      )}
                    >
                      <Heart className={cn("w-5 h-5", isFavorite(card.id) && "fill-current")} />
                    </button>
                    <div className="p-4 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                      <Maximize2 className="w-5 h-5 text-zinc-400" />
                    </div>
                    </div>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {product.images.map((img, i) => (
                    <button 
                      key={i}
                      onClick={() => setMainImage(img)}
                      title={`Ver imagen ${i + 1}`}
                      className={cn(
                        "w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 relative group",
                        mainImage === img ? "border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.3)]" : "border-white/5 opacity-40 hover:opacity-100"
                      )}
                    >
                      <img src={img} className="w-full h-full object-cover" alt="" />
                    </button>
                  ))}
                </div>
              </div>

              {/* COLUMNA DERECHA: Dashboard de Compra */}
              <div className="space-y-8">
                <div className="bg-[#111113]/80 backdrop-blur-3xl p-8 md:p-14 rounded-[3rem] border border-white/5 shadow-2xl space-y-10">
                  
                  <div className="space-y-6">
                    <div className="flex flex-col gap-4">
                      {product.stock === 0 && (
                        <div className="w-fit px-4 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-full shadow-[0_0_20px_rgba(220,38,38,0.4)] animate-pulse">
                          Agotado / Out of Stock
                        </div>
                      )}
                      <h1 className="text-4xl md:text-5xl font-black text-white leading-[1.1] tracking-tighter italic uppercase">{product.name}</h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-6">
                       <div className="flex gap-1 text-red-600">
                          {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
                       </div>
                       <span className="text-sm font-black text-zinc-500 uppercase tracking-widest border-b-2 border-red-600/20 pb-0.5">{product.reviews} RECONOCIMIENTOS</span>
                       <div className="flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full">
                          <Users className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">+10k ADQUIRIDOS</span>
                       </div>
                    </div>
                  </div>

                  {/* Precio */}
                  <div className="flex items-end gap-6 pt-2">
                     <div className="flex items-baseline gap-1">
                        <span className="text-7xl font-black text-white tracking-tighter italic">{Math.floor(calculatePrice(product.price))}</span>
                        <span className="text-3xl font-black text-red-600 tracking-tighter italic">/{((calculatePrice(product.price) % 1) * 100).toFixed(0).padStart(2, '0')}€</span>
                     </div>
                     {product.oldPrice && (
                       <span className="text-2xl text-zinc-600 line-through font-black italic mb-2">{calculatePrice(product.oldPrice).toFixed(2)}€</span>
                     )}
                  </div>

                  {/* Stock Info */}
                  <div className="flex flex-wrap items-center gap-8">
                    <div className="flex items-center gap-4 py-4 px-6 bg-red-600/5 rounded-2xl border border-red-600/10 w-fit">
                       <div className={cn("w-2 h-2 rounded-full", product.stock > 0 ? "bg-emerald-500 shadow-[0_0_10px_#10b981]" : "bg-red-600 shadow-[0_0_10px_#dc2626]")} />
                       <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
                         {product.stock > 0 ? "Bóveda Abierta" : "Bóveda Sellada // Agotado Temporalmente"}
                       </span>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-2 rounded-2xl">
                      <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        title="Reducir cantidad"
                        className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center text-lg font-black italic text-white">{quantity}</span>
                      <button 
                        onClick={() => setQuantity(quantity + 1)}
                        title="Aumentar cantidad"
                        className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Robusta Notification Section */}
                  <div className="bg-[#09090b] border border-white/5 rounded-[2rem] p-8 space-y-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                      <Bell className="w-32 h-32 text-red-600 rotate-12" />
                    </div>
                    
                    <div className="relative space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                          <Bell className="w-6 h-6 text-white" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Activar Protocolo de Alerta</h3>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Infiltrados de Sasori te avisarán del reestock inmediato</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <button 
                           onClick={() => setNotifMode('email')}
                           title="Recibir notificaciones por Email"
                           className={cn(
                             "flex items-center justify-center gap-3 py-4 rounded-xl border font-black uppercase text-[10px] tracking-widest transition-all",
                             notifMode === 'email' ? "bg-red-600 border-red-600 text-white shadow-lg" : "bg-white/5 border-white/5 text-zinc-500 hover:border-white/20"
                           )}
                         >
                           <Mail className="w-4 h-4" />
                           Email
                         </button>
                         <button 
                           onClick={() => setNotifMode('sms')}
                           title="Recibir notificaciones por SMS"
                           className={cn(
                             "flex items-center justify-center gap-3 py-4 rounded-xl border font-black uppercase text-[10px] tracking-widest transition-all",
                             notifMode === 'sms' ? "bg-red-600 border-red-600 text-white shadow-lg" : "bg-white/5 border-white/5 text-zinc-500 hover:border-white/20"
                           )}
                         >
                           <Phone className="w-4 h-4" />
                           SMS
                         </button>
                      </div>

                      <div className="space-y-4">
                        <div className="relative">
                          <Input 
                            value={notifContact}
                            title="Datos de contacto para alerta"
                            onChange={(e) => setNotifContact(e.target.value)}
                            placeholder={notifMode === 'email' ? 'Introduce tu correo cifrado' : 'Introduce tu terminal (+34...)'}
                            className="h-16 px-6 bg-white/5 border-white/10 rounded-2xl font-bold placeholder:text-zinc-600 focus:border-red-600/50 transition-all focus:ring-0" 
                          />
                        </div>
                        
                        <div className="flex items-center gap-3 cursor-pointer group/check">
                          <div className="w-5 h-5 rounded border border-white/20 flex items-center justify-center transition-colors group-hover/check:border-red-600">
                            <Check className="w-3 h-3 text-red-600" />
                          </div>
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex-1 text-left">Acepto recibir comunicaciones críticas del sistema y ofertas exclusivas de la bóveda.</span>
                        </div>

                        <Button className="w-full h-18 bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-[0.2em] rounded-2xl text-lg transition-all shadow-2xl shadow-red-600/20 active:scale-95">
                          Inscribirse en la Alerta
                          <ArrowRight className="ml-3 w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Puntos y Checkout Fast */}
                  <div className="space-y-6">
                    <div className="bg-red-600 p-8 rounded-[2rem] flex flex-col sm:flex-row items-center gap-8 group cursor-pointer overflow-hidden relative">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rotate-45 translate-x-16 -translate-y-16 transition-transform group-hover:scale-150 duration-700" />
                       <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl rotate-3 group-hover:rotate-12 transition-transform">
                          <Star className="w-8 h-8 text-red-600 fill-current" />
                       </div>
                       <div className="flex-1 text-center sm:text-left space-y-1 relative z-10">
                          <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">Protocolo de Lealtad</p>
                          <h4 className="text-2xl font-black uppercase italic text-white tracking-widest">Recuperas {product.pokePuntos} Puntos</h4>
                       </div>
                       <ChevronRight className="w-6 h-6 text-white group-hover:translate-x-2 transition-transform hidden sm:block" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <Button 
                         onClick={() => addToCart(card)}
                         className="h-18 bg-zinc-100 hover:bg-white text-black font-black uppercase italic tracking-widest rounded-2xl shadow-xl disabled:opacity-30"
                       >
                         Añadir al Carrinho
                       </Button>
                       <Button 
                         onClick={() => {
                           addToCart(card);
                           setCurrentStep(1);
                         }}
                         className="h-18 bg-red-600 hover:bg-red-700 text-white font-black uppercase italic tracking-widest rounded-2xl shadow-xl shadow-red-600/20"
                       >
                         Checkout Inmediato
                       </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="step-checkout"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid lg:grid-cols-12 gap-12 items-start"
            >
              {/* LEFT: Checkout Forms */}
              <div className="lg:col-span-8 space-y-8">
                <div className="flex items-center gap-4 mb-8">
                    <button 
                      onClick={() => setCurrentStep(0)} 
                      title="Volver a la vista de producto"
                      className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-red-600/20 transition-all"
                    >
                     <X className="w-5 h-5 text-zinc-400" />
                   </button>
                   <h2 className="text-4xl font-black italic uppercase tracking-tighter">Bóveda de Pago_</h2>
                </div>

                <div className="space-y-8">
                  {/* Shipping Section */}
                  <section className="bg-[#111113] p-10 rounded-[2.5rem] border border-white/5 space-y-8">
                    <div className="flex items-center gap-4">
                      <Truck className="w-6 h-6 text-red-600" />
                      <h3 className="text-xl font-black uppercase tracking-widest">Protocolo de Despliegue</h3>
                    </div>
                    <div className="grid gap-4">
                      {SHIPPING_METHODS.map((method) => (
                        <div 
                          key={method.id}
                          onClick={() => setSelectedShipping(method)}
                          className={cn(
                            "p-6 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between group relative overflow-hidden",
                            selectedShipping.id === method.id 
                              ? "bg-red-600/10 border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.15)]" 
                              : "bg-white/2 border-white/5 hover:border-white/20"
                          )}
                        >
                          {selectedShipping.id === method.id && (
                            <div className="absolute top-0 right-0 p-2 bg-red-600 rounded-bl-xl">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                          <div className="flex items-center gap-6">
                            <div className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                              selectedShipping.id === method.id ? "border-red-600 bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]" : "border-white/20"
                            )}>
                              {selectedShipping.id === method.id && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <div>
                               <p className="font-black uppercase italic tracking-widest text-white">{method.name}</p>
                               <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{method.time}</p>
                            </div>
                          </div>
                          <span className="text-lg font-black text-white italic">{method.price.toFixed(2)}€</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Payment Section */}
                  <section className="bg-[#111113] p-10 rounded-[2.5rem] border border-white/5 space-y-8">
                    <div className="flex items-center gap-4">
                      <CreditCard className="w-6 h-6 text-red-600" />
                      <h3 className="text-xl font-black uppercase tracking-widest">Sistemas de Transferencia</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { id: 'card', name: 'Tarjeta', icon: <CreditCard className="w-5 h-5" /> },
                        { id: 'paypal', name: 'PayPal', icon: <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-4" alt="" /> },
                        { id: 'apple', name: 'Apple Pay', icon: <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" className="h-5 grayscale-0 brightness-200" alt="" /> },
                        { id: 'google', name: 'G Pay', icon: <img src="https://upload.wikimedia.org/wikipedia/commons/c/c7/Google_Pay_Logo_%282020%29.svg" className="h-4" alt="" /> },
                      ].map((pm: any) => (
                        <button 
                          key={pm.id}
                          onClick={() => setPaymentMethod(pm.id)}
                          title={`Pagar con ${pm.name}`}
                          className={cn(
                            "p-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-4 transition-all overflow-hidden relative",
                            paymentMethod === pm.id ? "bg-red-600/10 border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.2)]" : "bg-white/2 border-white/5 hover:border-white/20"
                          )}
                        >
                          <div className="text-white opacity-80">{pm.icon}</div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{pm.name}</span>
                          {paymentMethod === pm.id && (
                            <div className="absolute top-2 right-2">
                               <Check className="w-3 h-3 text-red-600" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="pt-6 space-y-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <Input title="Nombre del Titular" placeholder="Nombre del Titular" className="h-16 bg-white/5 border-white/10 rounded-xl focus:ring-0 focus:border-red-600/50" />
                        <Input title="Número de Tarjeta" placeholder="Número de Enlace Cifrado" className="h-16 bg-white/5 border-white/10 rounded-xl focus:ring-0 focus:border-red-600/50" />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <Input title="Fecha de Expiración" placeholder="MM/YY" className="h-16 bg-white/5 border-white/10 rounded-xl focus:ring-0 focus:border-red-600/50" />
                        <Input title="Código CVC" placeholder="CVC" className="h-16 bg-white/5 border-white/10 rounded-xl focus:ring-0 focus:border-red-600/50" />
                        <div className="hidden md:flex items-center justify-center px-4 bg-white/5 rounded-xl border border-white/5 grayscale opacity-30">
                           <ShieldCheck className="w-6 h-6" />
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              {/* RIGHT: Order Summary */}
              <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-10">
                <div className="bg-[#111113] p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-10">
                   <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Resumen Carga_</h3>
                   
                   <div className="space-y-6">
                      {/* Item */}
                      <div className="flex gap-6 items-center">
                         <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/5 relative bg-[#09090b]">
                            <img src={mainImage} className="w-full h-full object-cover" alt="" />
                            <div className="absolute -top-2 -right-2 w-7 h-7 bg-red-600 rounded-full flex items-center justify-center border-4 border-[#111113] shadow-lg">
                               <span className="text-[10px] font-black text-white">{quantity}</span>
                            </div>
                         </div>
                         <div className="flex-1 space-y-1">
                            <p className="text-[11px] font-black uppercase text-white leading-tight italic">{product.name}</p>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{selectedLanguage === 'ES' ? 'Edición Español' : 'Global Edition'}</p>
                            <p className="text-sm font-black text-red-600 italic mt-2">{(calculatePrice(product.price) * quantity).toFixed(2)}€</p>
                         </div>
                      </div>

                      <div className="h-px bg-white/5 my-8" />

                      {/* Discount Code */}
                      <div className="space-y-4">
                         <div className="flex gap-2">
                           <div className="relative flex-1">
                             <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                             <Input 
                               value={discountCode}
                               title="Código de Descuento"
                               onChange={(e) => setDiscountCode(e.target.value)}
                               placeholder="CÓDIGO_SASORI" 
                               className="h-14 pl-12 bg-white/5 border-white/10 rounded-xl font-bold uppercase tracking-widest placeholder:text-zinc-600 focus:ring-0" 
                             />
                           </div>
                           <Button onClick={handleApplyDiscount} className="h-14 px-6 bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest rounded-xl">
                             Aplicar
                           </Button>
                         </div>
                         {appliedDiscount && (
                           <div className="flex items-center justify-between p-3 bg-red-600/10 border border-red-600/20 rounded-xl animate-in fade-in slide-in-from-top-2">
                             <div className="flex flex-col gap-0.5">
                               <span className="text-[10px] font-black uppercase tracking-widest text-red-600 flex items-center gap-2">
                                 <Gift className="w-3 h-3" />
                                 Código: {appliedDiscount.code}
                               </span>
                               <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest italic">Ahorro Aplicado: -{appliedDiscount.amount.toFixed(2)}€</span>
                             </div>
                             <button 
                               onClick={() => setAppliedDiscount(null)} 
                               title="Eliminar descuento"
                               className="p-2 bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors"
                             >
                               <X className="w-3 h-3" />
                             </button>
                           </div>
                         )}
                      </div>

                      {/* Pricing Breakdown */}
                      <div className="space-y-4 pt-4">
                         <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                           <span>Subtotal</span>
                           <span className="text-zinc-300">{subtotal.toFixed(2)}€</span>
                         </div>
                         <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                           <span>Envío ({selectedShipping.name})</span>
                           <span className="text-zinc-300">{shippingCost.toFixed(2)}€</span>
                         </div>
                         {appliedDiscount && (
                           <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-red-600">
                             <span>Descuento Aplicado</span>
                             <span>-{discountAmount.toFixed(2)}€</span>
                           </div>
                         )}
                         <div className="h-px bg-white/5 my-4" />
                         <div className="flex justify-between items-end">
                            <span className="text-xs font-black uppercase tracking-[0.4em] text-zinc-500">Total Final_</span>
                            <div className="text-right">
                               <p className="text-4xl font-black italic tracking-tighter text-white">{total.toFixed(2)}€</p>
                               <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">IVA Incluido / Protocolo Seguro</p>
                            </div>
                         </div>
                      </div>
                      
                      <Button className="w-full h-20 bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-[0.3em] rounded-3xl text-xl transition-all shadow-2xl shadow-red-600/30 flex items-center justify-center gap-4 group mt-8">
                        <Lock className="w-6 h-6 transition-transform group-hover:scale-110" />
                        Finalizar Pago
                      </Button>
                      
                      <p className="text-center text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] pt-4">
                        Tus activos serán desplegados en {selectedShipping.time} tras la validación del sistema.
                      </p>
                   </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Footer for Step 0 only */}
        {currentStep === 0 && (
          <section className="mt-32 space-y-16">
             <div className="max-w-4xl mx-auto text-center space-y-8">
                <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-white/90">Reseñas_Infiltradas</h2>
                <div className="bg-[#111113]/50 backdrop-blur-3xl p-12 rounded-[3.5rem] border border-white/5 shadow-2xl flex flex-col items-center gap-8 relative overflow-hidden">
                   <div className="absolute inset-0 bg-red-600/5 opacity-20 pointer-events-none" />
                   <div className="relative flex items-center gap-6">
                      <div className="flex text-red-600 gap-1 shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                        {[...Array(5)].map((_, i) => <Star key={i} className="w-6 h-6 fill-current" />)}
                      </div>
                      <span className="text-5xl font-black italic tracking-tighter text-white">{product.rating}</span>
                   </div>
                   <p className="text-[12px] font-black text-zinc-500 uppercase tracking-[0.5em] relative text-center">Basado en {product.reviews} Registros Certificados</p>
                   <div className="w-full max-w-md h-2 bg-white/5 rounded-full overflow-hidden relative">
                      <div className="absolute top-0 left-0 w-[96%] h-full bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.5)]" />
                   </div>
                   <Button className="h-16 px-12 bg-white text-black hover:bg-zinc-200 font-black italic uppercase tracking-widest rounded-2xl shadow-[0_10px_30px_rgba(255,255,255,0.1)] transition-all active:scale-95">
                      Emitir Señal de Reseña
                   </Button>
                </div>
             </div>
          </section>
        )}
      </main>

      <footer className="py-20 border-t border-white/5 text-center mt-20 opacity-40">
         <div className="flex justify-center gap-12 mb-8 grayscale active:grayscale-0 transition-all">
           {/* Trust logos */}
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
               <ShieldCheck className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
               <Award className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
               <Zap className="w-6 h-6 text-zinc-500" />
            </div>
         </div>
         <p className="text-[10px] font-mono uppercase tracking-[0.8em] text-zinc-500 italic text-center">Sasori Labs // Authentic Distribution Protocol // 2026</p>
      </footer>
      </div>
    </div>
  );
}
