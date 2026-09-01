import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Heart, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useStore } from '../../lib/StoreContext';
import { useCartStore } from '../../lib/cartStore';
import { formatCurrency, cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

interface StoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tab: 'cart' | 'favorites';
}

export const StoreDrawer: React.FC<StoreDrawerProps> = ({ isOpen, onClose, tab: initialTab }) => {
  const { items: cart, removeItem: removeFromCart, updateQuantity } = useCartStore();
  const { favorites, toggleFavorite, addToCart } = useStore();
  const [activeTab, setActiveTab] = React.useState<'cart' | 'favorites'>(initialTab);
  const navigate = useNavigate();

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  const cartTotal = cart.reduce((acc, item) => acc + ((Number(item.price) || 0) * (item.quantity || 1)), 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm" />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 bottom-0 z-[130] w-full max-w-md bg-background border-l border-border flex flex-col shadow-2xl">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex gap-4">
                <button onClick={() => setActiveTab('cart')} className={cn("text-xs font-black uppercase px-4 py-2 rounded-xl", activeTab === 'cart' ? "bg-white text-black" : "text-zinc-500")}>
                  Carrito ({cart.length})
                </button>
                <button onClick={() => setActiveTab('favorites')} className={cn("text-xs font-black uppercase px-4 py-2 rounded-xl", activeTab === 'favorites' ? "bg-white text-black" : "text-zinc-500")}>
                  Favoritos ({favorites.length})
                </button>
              </div>
              <button onClick={onClose} className="p-2"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'cart' ? (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <img src={item.image_url} className="w-20 h-24 object-cover rounded-xl bg-zinc-900 shrink-0" alt="" />
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div className="flex justify-between">
                          <h4 className="text-sm font-black uppercase">{item.name}</h4>
                          <button onClick={() => removeFromCart(item.id)} className="text-zinc-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm font-black">{formatCurrency((Number(item.price) || 0) * item.quantity)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {favorites.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <img src={item.image_url} className="w-20 h-24 object-cover rounded-xl bg-zinc-900 shrink-0" alt="" />
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <h4 className="text-sm font-black uppercase">{item.name}</h4>
                        <button onClick={() => { const { quantity, ...card } = item as any; addToCart(card); }} className="text-xs font-black uppercase bg-white text-black px-3 py-1.5 rounded-lg">
                          Añadir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {activeTab === 'cart' && cart.length > 0 && (
              <div className="p-6 border-t border-border bg-card/50 space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black uppercase text-muted-foreground">Total</span>
                  <span className="text-2xl font-black">{formatCurrency(cartTotal)}</span>
                </div>
                <button onClick={() => { onClose(); navigate('/checkout'); }} className="w-full bg-primary text-white font-black uppercase h-14 rounded-2xl flex items-center justify-center gap-3">
                  Continuar Checkout <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};