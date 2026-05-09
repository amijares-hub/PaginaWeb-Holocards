import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Heart, 
  Search, 
  Menu, 
  X,
  User,
  Zap,
  Bell,
  Trash2,
  Check
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/StoreContext';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { StoreDrawer } from './StoreDrawer';
import { motion as m } from 'framer-motion';

const PokeballIcon = ({ isOpen, size = 8 }: { isOpen: boolean; size?: number }) => (
  <m.div 
    animate={{ 
      rotate: isOpen ? 180 : 0,
      scale: isOpen ? 1.1 : 1
    }}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    className={cn(
      "relative flex items-center justify-center cursor-pointer",
      size === 8 ? "w-8 h-8" : "w-14 h-14"
    )}
  >
    <div className={cn(
      "absolute inset-0 rounded-full border-2 border-black overflow-hidden bg-white shadow-2xl",
      isOpen ? "shadow-red-600/40" : "shadow-black/40"
    )}>
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-red-600 border-b-[2px] border-black" />
      <div className="absolute top-1/2 left-0 right-0 h-1/2 bg-white" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-white border-2 border-black rounded-full z-10 flex items-center justify-center">
        <div className={cn(
          "w-1/2 h-1/2 rounded-full transition-colors duration-300",
          isOpen ? "bg-red-500 animate-pulse" : "bg-zinc-200"
        )} />
      </div>
    </div>
    
    {/* Pulse Effect when closed */}
    {!isOpen && (
      <div className="absolute inset-0 rounded-full bg-red-600/20 animate-ping -z-10" />
    )}
  </m.div>
);

export const StoreNavbar = () => {
  const { cart, favorites } = useStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'cart' | 'favorites'>('cart');
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  React.useEffect(() => {
    fetchNotifications();
    const sub = supabase
      .channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const fetchNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase.from('user_notifications').update({ read: true }).eq('id', id);
    fetchNotifications();
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const favoritesCount = favorites.length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/catalog?q=${encodeURIComponent(searchTerm)}`);
      setIsSearchOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100]">
      {/* Upper Navbar */}
      {/* Upper Navbar */}
      <div className={cn(
        "transition-all duration-300",
        isMenuOpen ? "bg-black" : "bg-black/80 backdrop-blur-xl border-b border-white/5"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <img src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Imagen%20De%20Logo%20de%20Empresa/logo%20Holocard.jpg" alt="HoloCards" className="h-10 sm:h-12 w-auto object-contain" />
          </Link>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xl relative group">
            <form onSubmit={handleSearch} className="w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Pesquisar cartas, coleções, acessórios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
              />
            </form>
          </div>

          {/* Desktop Nav Actions */}
          <div className="hidden md:flex items-center gap-6 shrink-0">
            <Link to="/catalog" className="text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">Catálogo</Link>

            
            <div className="flex items-center gap-4 border-l border-white/10 pl-6">
              <button 
                onClick={() => {
                  setDrawerTab('favorites');
                  setIsDrawerOpen(true);
                }}
                className="relative group"
              >
                <Heart className="w-6 h-6 text-zinc-400 group-hover:text-red-500 transition-colors" />
                {favoritesCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-black">
                    {favoritesCount}
                  </span>
                )}
              </button>

              <button 
                onClick={() => {
                  setDrawerTab('cart');
                  setIsDrawerOpen(true);
                }}
                className="relative group"
              >
                <ShoppingCart className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-white text-black text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-black">
                    {cartCount}
                  </span>
                )}
              </button>
              
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative group p-2 rounded-full hover:bg-white/5 transition-colors"
                >
                  <Bell className={cn("w-6 h-6 text-zinc-400 group-hover:text-cyan-400 transition-colors", unreadCount > 0 && "animate-pulse")} />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 bg-cyan-500 text-black text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center ring-2 ring-black">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-4 w-80 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[110]"
                    >
                      <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Incoming Data</h3>
                        <span className="text-[8px] font-mono text-zinc-500">Node Sync: Active</span>
                      </div>
                      <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center opacity-30">
                            <Bell className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-[10px] font-mono uppercase tracking-widest">No signals detected</p>
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div 
                              key={n.id} 
                              className={cn(
                                "p-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors relative group/n",
                                !n.read && "bg-cyan-500/[0.03]"
                              )}
                            >
                              {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500" />}
                              <div className="flex gap-3">
                                <div className="p-2 rounded-lg bg-zinc-900 border border-white/5 shrink-0">
                                  {n.type === 'gift' ? <Zap className="w-3.5 h-3.5 text-yellow-500" /> : <Bell className="w-3.5 h-3.5 text-zinc-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] text-zinc-200 leading-relaxed mb-1">{n.message}</p>
                                  <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-tighter">
                                    {new Date(n.created_at).toLocaleTimeString()} • {n.type}
                                  </p>
                                </div>
                                {!n.read && (
                                  <button 
                                    onClick={() => markAsRead(n.id)}
                                    className="opacity-0 group-hover/n:opacity-100 p-1.5 hover:bg-cyan-500/10 rounded-md transition-all"
                                  >
                                    <Check className="w-3 h-3 text-cyan-400" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <Link 
                        to="/perfil" 
                        onClick={() => setShowNotifications(false)}
                        className="block p-3 text-center text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white bg-black hover:bg-white/5 transition-all"
                      >
                        Open Control Center
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link to="/login" className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center hover:bg-zinc-800 transition-colors">
                <User className="w-5 h-5 text-zinc-400" />
              </Link>
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-4">
            <button 
              onClick={() => setIsSearchOpen(true)} 
              className="p-2 text-zinc-400 hover:text-white transition-colors"
              title="Buscar"
            >
              <Search className="w-6 h-6" />
            </button>
            <button 
               onClick={() => {
                setDrawerTab('cart');
                setIsDrawerOpen(true);
              }} 
              className="relative p-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-black">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Lower Sticky Menu - Desktop Only */}
      <div className="hidden md:block bg-black/90 backdrop-blur-xl border-b border-white/5 py-2.5 overflow-x-auto no-scrollbar scroll-smooth">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-start sm:justify-center gap-8 sm:gap-16">
            {[
              { label: 'HOME', path: '/' },
              { label: 'MEGAEVOLUCION', path: '/catalog?category=mega' },
              { label: 'ESCARLATA Y PURPURA', path: '/catalog?category=scarlet-violet' },
              { label: 'ESPADA Y ESCUDO', path: '/catalog?category=sword-shield' },
              { label: 'VINTAGE', path: '/catalog?category=vintage' },
              { label: 'POKEMON', path: '/catalog?category=pokemon' }
            ].map(item => (
              <Link 
                key={item.label} 
                to={item.path}
                className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-zinc-400 hover:text-red-500 transition-colors whitespace-nowrap px-2"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 bg-black p-6 border-b border-white/10 z-[110]"
          >
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Pesquisar..."
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-red-500 transition-all px-4"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                type="button" 
                onClick={() => setIsSearchOpen(false)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest"
              >
                Cancelar
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 z-[90] bg-[#09090b] pt-24 px-6 md:hidden"
          >
            <div className="space-y-6">
              <Link onClick={() => setIsMenuOpen(false)} to="/" className="block text-2xl font-black uppercase italic tracking-tighter hover:text-red-500 transition-colors">Home</Link>
              
              {/* Categories Section */}
              <div className="space-y-3 pt-4">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 mb-4">Colecciones</p>
                {[
                  { label: 'MEGAEVOLUCION', path: '/catalog?category=mega' },
                  { label: 'ESCARLATA Y PURPURA', path: '/catalog?category=scarlet-violet' },
                  { label: 'ESPADA Y ESCUDO', path: '/catalog?category=sword-shield' },
                  { label: 'VINTAGE', path: '/catalog?category=vintage' },
                  { label: 'POKEMON', path: '/catalog?category=pokemon' }
                ].map(item => (
                  <Link 
                    key={item.label} 
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className="block text-xl font-black uppercase italic tracking-tighter hover:text-red-500 transition-colors border-l-2 border-white/5 pl-4 ml-1"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="space-y-4 pt-6 border-t border-white/5">
                <button 
                  onClick={() => {
                    setIsMenuOpen(false);
                    setDrawerTab('favorites');
                    setIsDrawerOpen(true);
                  }} 
                  className="block text-2xl font-black uppercase italic tracking-tighter hover:text-red-500 transition-colors text-left w-full"
                >
                  Favoritos ({favoritesCount})
                </button>
                <Link onClick={() => setIsMenuOpen(false)} to="/login" className="block text-2xl font-black uppercase italic tracking-tighter hover:text-red-500 transition-colors text-zinc-500">Login</Link>
              </div>
            </div>


          </motion.div>
        )}
      </AnimatePresence>

      <StoreDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        tab={drawerTab} 
      />

      {/* Floating Mobile Menu Button - Pokeball */}
      <div className="fixed bottom-10 left-0 right-0 flex justify-center z-[120] md:hidden pointer-events-none">
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="relative group p-0 m-0 bg-transparent border-none outline-none focus:outline-none active:scale-95 transition-transform pointer-events-auto"
          title="Menú Principal"
        >
          <PokeballIcon isOpen={isMenuOpen} size={14} />
        </button>
      </div>
    </nav>
  );
};
