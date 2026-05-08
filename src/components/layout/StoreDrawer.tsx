import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ShoppingCart, 
  Heart, 
  Trash2, 
  Plus, 
  Minus,
  ArrowRight,
  Package
} from 'lucide-react';
import { useStore } from '../../lib/StoreContext';
import { formatCurrency, cn } from '../../lib/utils';
import { Link, useNavigate } from 'react-router-dom';

interface StoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tab: 'cart' | 'favorites';
}

export const StoreDrawer: React.FC<StoreDrawerProps> = ({ isOpen, onClose, tab: initialTab }) => {
  const { cart, favorites, removeFromCart, updateQuantity, toggleFavorite, addToCart } = useStore();
  const [activeTab, setActiveTab] = React.useState<'cart' | 'favorites'>(initialTab);
  const navigate = useNavigate();

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleCheckout = () => {
    onClose();
    if (cart.length > 0) {
      navigate(`/checkout/${cart[0].id}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 z-[130] w-full max-w-md bg-[#09090b] border-l border-white/10 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex gap-4">
                <button 
                  onClick={() => setActiveTab('cart')}
                  className={cn(
                    "text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all",
                    activeTab === 'cart' ? "bg-white text-black" : "text-zinc-500 hover:text-white"
                  )}
                >
                  Carrinho ({cart.length})
                </button>
                <button 
                  onClick={() => setActiveTab('favorites')}
                  className={cn(
                    "text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all",
                    activeTab === 'favorites' ? "bg-white text-black" : "text-zinc-500 hover:text-white"
                  )}
                >
                  Favoritos ({favorites.length})
                </button>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              {activeTab === 'cart' ? (
                <div className="space-y-6">
                  {cart.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto border border-white/5">
                        <ShoppingCart className="w-8 h-8 text-zinc-600" />
                      </div>
                      <p className="text-sm font-black uppercase italic tracking-widest text-zinc-500">Seu carrinho está vazio</p>
                      <button 
                        onClick={onClose}
                        className="text-xs font-black uppercase tracking-tighter text-red-500 hover:underline"
                      >
                         Explorar Bóveda
                      </button>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.id} className="flex gap-4 group">
                        <div className="w-20 h-24 bg-zinc-900 rounded-xl overflow-hidden border border-white/5 shrink-0">
                          <img src={item.image_url} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-1">
                          <div className="flex justify-between gap-4">
                            <h4 className="text-sm font-black uppercase italic leading-tight">{item.name}</h4>
                            <button onClick={() => removeFromCart(item.id)} className="text-zinc-600 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between mt-4">
                             <div className="flex items-center gap-3 bg-zinc-900 border border-white/5 rounded-lg p-1">
                                <button 
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  className="w-6 h-6 flex items-center justify-center hover:bg-white/5 rounded-md"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                <button 
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="w-6 h-6 flex items-center justify-center hover:bg-white/5 rounded-md"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                             </div>
                             <span className="text-sm font-black italic">{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                   {favorites.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto border border-white/5">
                        <Heart className="w-8 h-8 text-zinc-600" />
                      </div>
                      <p className="text-sm font-black uppercase italic tracking-widest text-zinc-500">Sem favoritos ainda</p>
                    </div>
                  ) : (
                    favorites.map((item) => (
                      <div key={item.id} className="flex gap-4 group">
                        <div className="w-20 h-24 bg-zinc-900 rounded-xl overflow-hidden border border-white/5 shrink-0">
                          <img src={item.image_url} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-1">
                          <div className="flex justify-between gap-4">
                            <h4 className="text-sm font-black uppercase italic leading-tight">{item.name}</h4>
                            <button onClick={() => toggleFavorite(item)} className="text-red-500">
                              <Heart className="w-4 h-4 fill-current" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between mt-4">
                             <span className="text-sm font-black italic">{formatCurrency(item.price)}</span>
                             <button 
                              onClick={() => {
                                const { quantity, ...card } = item as any;
                                addToCart(card);
                              }}
                              className="text-[10px] font-black uppercase bg-white text-black px-3 py-1.5 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                             >
                               Adicionar
                             </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {activeTab === 'cart' && cart.length > 0 && (
              <div className="p-6 border-t border-white/5 bg-zinc-900/30 space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Subtotal</span>
                  <span className="text-2xl font-black italic">{formatCurrency(cartTotal)}</span>
                </div>
                <button 
                  onClick={handleCheckout}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-[0.2em] h-14 rounded-2xl shadow-xl shadow-red-600/20 flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                  Continuar Checkout
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
