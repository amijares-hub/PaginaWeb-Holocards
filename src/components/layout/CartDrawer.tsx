import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, CreditCard, ShoppingCart } from 'lucide-react';
import { useCartStore } from '../../lib/cartStore';

export const CartDrawer = () => {
  const navigate = useNavigate();
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, getTotalPrice } = useCartStore();
  const subtotal = getTotalPrice() || 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 h-full w-full max-w-[450px] bg-background/95 border-l border-border backdrop-blur-2xl z-[101] shadow-2xl flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/20"><ShoppingBag className="w-5 h-5 text-white" /></div>
                <div>
                  <h2 className="text-lg font-black text-foreground uppercase">Tu Carrito</h2>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">{items.length} {items.length === 1 ? 'Producto' : 'Productos'}</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 text-muted-foreground hover:text-foreground"><X className="w-6 h-6" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground" />
                  <p className="text-foreground font-bold uppercase tracking-widest text-xs">El carrito está vacío</p>
                </div>
              ) : (
                items.map((item) => {
                  const price = Number(item.price) || 0;
                  return (
                    <div key={item.id} className="bg-card border border-border p-4 rounded-2xl flex gap-4">
                      <div className="w-20 h-24 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="text-sm font-bold text-foreground truncate">{item.name}</h3>
                          <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 border border-border">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                            <span className="w-6 text-center text-xs font-black">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                          </div>
                          <p className="text-sm font-black text-foreground">{(price * item.quantity).toFixed(2)}€</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {items.length > 0 && (
              <div className="p-8 bg-muted/50 border-t border-border space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-black uppercase">Total</span>
                  <span className="text-2xl font-black text-primary">{subtotal.toFixed(2)}€</span>
                </div>
                <button onClick={() => { setIsOpen(false); navigate('/checkout'); }} className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3">
                  <CreditCard className="w-4 h-4" /> Proceder al Pago <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};