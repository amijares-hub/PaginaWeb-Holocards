import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trash2, Plus, Minus, ArrowRight, 
  ChevronLeft, ShoppingBag, CreditCard, 
  ShieldCheck, Truck, Clock 
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '../lib/cartStore';
import { StoreNavbar } from '../components/layout/StoreNavbar';
import { cn } from '../lib/utils';

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotalPrice, getItemCount } = useCartStore();
  const navigate = useNavigate();
  const subtotal = getTotalPrice();
  const itemCount = getItemCount();

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans">
      <StoreNavbar />

      <main className="max-w-[1400px] mx-auto px-6 pt-32 pb-20">
        {/* Breadcrumbs / Header */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest mb-4 group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Volver a la tienda
            </button>
            <h1 className="text-5xl lg:text-7xl font-black tracking-tighter uppercase italic leading-none">
              Tu <span className="text-red-600">Carrito</span>
            </h1>
          </div>
          <div className="flex items-center gap-4 text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">
            <span>01 CARRITO</span>
            <span className="w-8 h-px bg-white/10" />
            <span className="opacity-30">02 CHECKOUT</span>
            <span className="w-8 h-px bg-white/10" />
            <span className="opacity-30">03 PAGO</span>
          </div>
        </div>

        {items.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-[3rem] p-20 text-center flex flex-col items-center gap-8 backdrop-blur-xl"
          >
            <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center border border-white/5">
              <ShoppingBag className="w-10 h-10 text-zinc-700" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tight">El carrito está vacío</h2>
              <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                Parece que aún no has añadido ningún HoloCard a tu colección. Explora nuestra bóveda para encontrar piezas únicas.
              </p>
            </div>
            <Link 
              to="/catalog"
              className="px-10 py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl transition-all shadow-2xl shadow-red-600/20 active:scale-95"
            >
              Explorar Catálogo
            </Link>
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            {/* LEFT COLUMN: Items List */}
            <div className="lg:col-span-8 space-y-6">
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <motion.div 
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group relative bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 lg:p-8 flex flex-col sm:flex-row gap-8 hover:bg-white/[0.04] transition-all"
                  >
                    {/* Image Container */}
                    <div className="w-full sm:w-40 aspect-[3/4] rounded-2xl bg-black/40 border border-white/10 overflow-hidden shrink-0 shadow-2xl relative">
                      <img 
                        src={item.image_url} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Content Container */}
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">{item.rarity} // {item.set}</p>
                          <h3 className="text-2xl lg:text-3xl font-black uppercase italic leading-tight group-hover:text-red-500 transition-colors">
                            {item.name}
                          </h3>
                        </div>
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="p-3 bg-white/5 hover:bg-red-600/20 text-zinc-500 hover:text-red-500 rounded-xl transition-all group/del"
                          title="Eliminar del carrito"
                        >
                          <Trash2 className="w-5 h-5 group-hover/del:scale-110 transition-transform" />
                        </button>
                      </div>

                      <div className="mt-auto pt-8 flex flex-wrap items-end justify-between gap-6">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-4 bg-black/40 border border-white/5 p-2 rounded-2xl">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-90"
                            title="Disminuir cantidad"
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                          <span className="w-8 text-center text-lg font-black">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-90"
                            title="Aumentar cantidad"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Price Breakdown */}
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Precio Unitario: €{item.price.toFixed(2)}</p>
                          <p className="text-3xl font-black text-white">€{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* RIGHT COLUMN: Summary */}
            <div className="lg:col-span-4 lg:sticky lg:top-32">
              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 lg:p-10 backdrop-blur-3xl space-y-8 relative overflow-hidden shadow-2xl">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 blur-[80px] rounded-full pointer-events-none" />
                
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Resumen del Pedido</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-500">
                    <span>Subtotal ({itemCount} items)</span>
                    <span className="text-white">€{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-zinc-500">
                    <span>Envío (Canarias)</span>
                    <span className="text-emerald-500 font-black">GRATIS</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-600 italic">
                    <span>Impuestos</span>
                    <span>Se calculará en el checkout</span>
                  </div>
                  
                  <div className="pt-6 border-t border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-lg font-black uppercase tracking-widest">Total</span>
                      <span className="text-4xl font-black text-red-600 italic">€{subtotal.toFixed(2)}</span>
                    </div>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase text-right">IVA incluido donde aplique</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={() => navigate('/checkout')}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-3 shadow-2xl shadow-red-900/40 transition-all active:scale-[0.98] group"
                  >
                    <CreditCard className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    Proceder al Pago
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                  </button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center text-center gap-1 border border-white/5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span className="text-[8px] font-black uppercase text-zinc-400">Pago Seguro</span>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 flex flex-col items-center text-center gap-1 border border-white/5">
                      <Truck className="w-4 h-4 text-yellow-500" />
                      <span className="text-[8px] font-black uppercase text-zinc-400">Envío 24/48h</span>
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="p-4 bg-red-600/10 border border-red-500/20 rounded-2xl flex gap-3">
                   <Clock className="w-4 h-4 text-red-500 shrink-0" />
                   <p className="text-[9px] text-red-200/70 font-medium leading-relaxed uppercase tracking-wider">
                     Debido a la alta demanda de esta colección, el tiempo de reserva del carrito es limitado. ¡Finaliza tu compra pronto!
                   </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
