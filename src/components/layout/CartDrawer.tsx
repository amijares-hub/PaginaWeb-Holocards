import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ShoppingBag, Trash2, Plus, Minus, 
  ArrowRight, CreditCard, ShoppingCart 
} from 'lucide-react';
import { useCartStore } from '../../lib/cartStore';
import { cn } from '../../lib/utils';

export const CartDrawer = () => {
  const { 
    items, 
    isOpen, 
    setIsOpen, 
    removeItem, 
    updateQuantity, 
    getTotalPrice 
  } = useCartStore();

  const subtotal = getTotalPrice();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] cursor-crosshair"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-[450px] bg-background/95 border-l border-border backdrop-blur-2xl z-[101] shadow-2xl flex flex-col transition-colors"
          >
            {/* Header */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/20">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-foreground tracking-tight uppercase transition-colors">Tu Carrito</h2>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {items.length} {items.length === 1 ? 'Producto' : 'Productos'} seleccionados
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                title="Cerrar carrito"
                className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                    <ShoppingCart className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-foreground font-bold uppercase tracking-widest">El carrito está vacío</p>
                    <p className="text-muted-foreground text-xs mt-1">¡Añade algunos HoloCards para empezar!</p>
                  </div>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="px-6 py-2 bg-muted hover:bg-muted/80 text-foreground text-[10px] font-black uppercase tracking-widest rounded-full transition-all border border-border"
                  >
                    Volver a la tienda
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <motion.div 
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative bg-card border border-border p-4 rounded-2xl flex gap-4 hover:border-primary/20 transition-all"
                  >
                    <div className="w-20 h-24 rounded-xl bg-muted border border-border overflow-hidden shrink-0">
                      <img 
                        src={item.image_url} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="text-sm font-bold text-foreground truncate leading-tight transition-colors">{item.name}</h3>
                          <button 
                            onClick={() => removeItem(item.id)}
                            title={`Eliminar ${item.name} del carrito`}
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono mt-1 transition-colors">{item.rarity} // {item.set}</p>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-1 bg-muted rounded-lg p-1 border border-border transition-colors">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            title="Disminuir cantidad"
                            className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background rounded-md transition-all"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-xs font-black text-foreground transition-colors">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            title="Aumentar cantidad"
                            className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background rounded-md transition-all"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-sm font-black text-foreground transition-colors">€{(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer / Checkout */}
            {items.length > 0 && (
              <div className="p-8 bg-muted/50 border-t border-border backdrop-blur-3xl space-y-6 transition-colors">
                <div className="space-y-3">
                  <div className="flex justify-between text-muted-foreground text-[10px] font-bold uppercase tracking-widest transition-colors">
                    <span>Subtotal</span>
                    <span className="text-foreground transition-colors">€{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[10px] font-bold uppercase tracking-widest transition-colors">
                    <span>Envío (Canarias)</span>
                    <span className="text-emerald-500 font-black">Gratis</span>
                  </div>
                  <div className="pt-4 border-t border-border transition-colors flex justify-between items-center">
                    <span className="text-lg font-black text-foreground uppercase tracking-tighter transition-colors">Total</span>
                    <span className="text-2xl font-black text-primary transition-colors">€{subtotal.toFixed(2)}</span>
                  </div>
                </div>

                <button className="w-full bg-primary hover:bg-primary/90 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-xl shadow-primary/20 transition-all active:scale-[0.98] group">
                  <CreditCard className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  Proceder al Pago
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                
                <p className="text-center text-[9px] text-muted-foreground font-bold uppercase tracking-widest transition-colors">
                  🔒 Pago 100% Seguro // SSL Encrypted
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
