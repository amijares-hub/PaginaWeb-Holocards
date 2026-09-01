import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Minus, Maximize2, Trash2, ShieldCheck, Star,
  X, CreditCard, Zap, Award, ShoppingCart, Mail, Phone,
  ArrowRight, ChevronRight, Lock, Gift, Tag, Users, Check, Bell, Truck, Heart
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { cn } from '../lib/utils';
import { StoreNavbar } from '../components/layout/StoreNavbar';
import { useStore } from '../lib/StoreContext';
import { Card } from '../types';

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
  rarity?: string;
}

const SHIPPING_METHODS = [
  { id: 'standard', name: 'Envío Estándar', price: 4.90, time: '3-5 días laborables' },
  { id: 'express', name: 'Envío Express', price: 9.90, time: '1-2 días laborables' },
  { id: 'priority', name: 'Prioritario HoloCards', price: 14.90, time: 'Entrega 24h Garantizada' },
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
      const seed = (productId || '1').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return {
        ...raw,
        images: storageImages.slice(seed % storageImages.length, (seed % storageImages.length) + 2)
      };
    }
    return raw;
  }, [productId, storageImages]);

  const card: Card = {
    id: product.id,
    name: product.name,
    price: product.price,
    image_url: product.images[0],
    rarity: product.rarity || 'Rare',
    stock: product.stock,
    set: 'Mystery',
    isFeatured: false
  };
  
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedLanguage] = useState('EN');
  const [mainImage, setMainImage] = useState(product.images[0]);
  const [quantity, setQuantity] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [notifMode, setNotifMode] = useState<'email' | 'sms'>('email');
  const [notifContact, setNotifContact] = useState('');
  
  const [selectedShipping, setSelectedShipping] = useState(SHIPPING_METHODS[0]);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'apple' | 'google'>('card');

  const unitPrice = Number(calculatePrice(product.price)) || 0;
  const subtotal = unitPrice * quantity;
  const shippingCost = selectedShipping.price;
  const discountAmount = appliedDiscount?.amount || 0;
  const total = subtotal + shippingCost - discountAmount;

  const handleApplyDiscount = () => {
    if (discountCode.toUpperCase() === 'HOLOCARDS10') {
      setAppliedDiscount({ code: 'HOLOCARDS10', amount: subtotal * 0.1 });
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
        <div className="bg-[#000] text-red-600 px-6 py-2.5 flex justify-between items-center border-b border-white/5">
           <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em] italic opacity-80">Secured via HoloCards // Authentic Asset Distribution</span>
           </div>
           <div className="hidden md:flex items-center gap-6 text-[9px] font-bold uppercase tracking-widest text-zinc-500">
             <span>Protocol: v2.4.0</span>
             <span>Node: Canarias_Center</span>
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
                          className="absolute top-8 right-8 p-4 bg-white/10 hover:bg-red-600 rounded-full transition-colors"
                        >
                          <X className="w-6 h-6 text-white" />
                        </button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-6 lg:sticky lg:top-10">
                  <div 
                    onClick={() => setIsZoomed(true)}
                    className="relative aspect-square bg-[#111113] rounded-[2.5rem] overflow-hidden border border-white/5 group cursor-zoom-in"
                  >
                    <img src={mainImage} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                    <div className="absolute top-8 right-8 flex flex-col gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(card); }}
                        title={isFavorite(card.id) ? "Quitar de favoritos" : "Añadir a favoritos"}
                        className={cn(
                          "p-4 backdrop-blur-xl rounded-2xl border transition-all",
                          isFavorite(card.id) ? "bg-red-600 border-red-600 text-white" : "bg-black/40 border-white/10 text-zinc-400 hover:bg-red-600/20"
                        )}
                      >
                        <Heart className={cn("w-5 h-5", isFavorite(card.id) && "fill-current")} />
                      </button>
                      <div className="p-4 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all">
                        <Maximize2 className="w-5 h-5 text-zinc-400" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {product.images.map((img, i) => (
                      <button 
                        key={i}
                        onClick={() => setMainImage(img)}
                        className={cn(
                          "w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 relative",
                          mainImage === img ? "border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.3)]" : "border-white/5 opacity-40 hover:opacity-100"
                        )}
                      >
                        <img src={img} className="w-full h-full object-cover" alt="" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-[#111113]/80 backdrop-blur-3xl p-8 md:p-14 rounded-[3rem] border border-white/5 shadow-2xl space-y-10">
                    <div className="space-y-6">
                      <h1 className="text-4xl md:text-5xl font-black text-white leading-[1.1] tracking-tighter italic uppercase">{product.name}</h1>
                      <div className="flex flex-wrap items-center gap-6">
                         <div className="flex gap-1 text-red-600">
                            {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
                         </div>
                         <span className="text-sm font-black text-zinc-500 uppercase tracking-widest">{product.reviews} VALORACIONES</span>
                      </div>
                    </div>

                    <div className="flex items-end gap-6 pt-2">
                       <div className="flex items-baseline gap-1">
                          <span className="text-7xl font-black text-white tracking-tighter italic">{Math.floor(unitPrice)}</span>
                          <span className="text-3xl font-black text-red-600 tracking-tighter italic">/{((unitPrice % 1) * 100).toFixed(0).padStart(2, '0')}€</span>
                       </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-8">
                      <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-2 rounded-2xl">
                        <button 
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-lg font-black italic text-white">{quantity}</span>
                        <button 
                          onClick={() => setQuantity(quantity + 1)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <Button 
                           onClick={() => addToCart(card)}
                           className="h-18 bg-zinc-100 hover:bg-white text-black font-black uppercase italic tracking-widest rounded-2xl shadow-xl"
                         >
                           Añadir al Carrito
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
                <div className="lg:col-span-8 space-y-8">
                  <div className="flex items-center gap-4 mb-8">
                      <button 
                        onClick={() => setCurrentStep(0)} 
                        className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-red-600/20 transition-all"
                      >
                       <X className="w-5 h-5 text-zinc-400" />
                     </button>
                     <h2 className="text-4xl font-black italic uppercase tracking-tighter">Bóveda de Pago_</h2>
                  </div>

                  <section className="bg-[#111113] p-10 rounded-[2.5rem] border border-white/5 space-y-8">
                    <div className="flex items-center gap-4">
                      <Truck className="w-6 h-6 text-red-600" />
                      <h3 className="text-xl font-black uppercase tracking-widest">Método de Envío</h3>
                    </div>
                    <div className="grid gap-4">
                      {SHIPPING_METHODS.map((method) => (
                        <div 
                          key={method.id}
                          onClick={() => setSelectedShipping(method)}
                          className={cn(
                            "p-6 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between",
                            selectedShipping.id === method.id 
                              ? "bg-red-600/10 border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.15)]" 
                              : "bg-white/2 border-white/5 hover:border-white/20"
                          )}
                        >
                          <span className="font-black uppercase italic tracking-widest text-white">{method.name}</span>
                          <span className="text-lg font-black text-white italic">{method.price.toFixed(2)}€</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-10">
                  <div className="bg-[#111113] p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-6">
                     {/* Logo + Vendedor */}
                     <div className="flex flex-col items-center gap-1 pb-4 border-b border-white/5">
                       <img
                         src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logotipos/Isologo%20Transparente.png"
                         alt="HoloCards"
                         className="h-10 object-contain"
                       />
                       <p className="text-[8px] text-zinc-500 text-center leading-relaxed">
                         <span className="font-bold text-zinc-400">HOLOCARDS</span><br />
                         Ctra. Monte Las Mercedes, 127 · 38293 San Cristóbal de La Laguna
                       </p>
                     </div>

                     <h3 className="text-2xl font-black italic uppercase text-white">Resumen</h3>
                     <div className="flex justify-between items-end">
                        <span className="text-xs font-black uppercase tracking-[0.4em] text-zinc-500">Total</span>
                        <span className="text-4xl font-black italic tracking-tighter text-white">{total.toFixed(2)}€</span>
                     </div>
                     <div className="flex justify-between items-center">
                       <span className="text-xs font-black uppercase tracking-widest text-zinc-500">IGIC</span>
                       <span className="text-sm font-black text-emerald-400">Exento / 0%</span>
                     </div>
                     <Button className="w-full h-20 bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-[0.3em] rounded-3xl text-xl transition-all shadow-2xl shadow-red-600/30 flex items-center justify-center gap-4">
                       <Lock className="w-6 h-6" />
                       Finalizar Pago
                     </Button>

                      <p className="text-xs sm:text-sm font-medium text-gray-300 tracking-wide text-center leading-relaxed mt-4 opacity-90">
                        *Exención Franquicia Fiscal, Ley 7/2017, de 27 de diciembre, de Presupuestos Generales de la Comunidad Autónoma de Canarias*
                      </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}