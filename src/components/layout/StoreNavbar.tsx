import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Heart, 
  Search, 
  Menu, 
  X,
  User,
  Zap
} from 'lucide-react';
import { useStore } from '../../lib/StoreContext';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { StoreDrawer } from './StoreDrawer';

export const StoreNavbar = () => {
  const { cart, favorites } = useStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'cart' | 'favorites'>('cart');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

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
      <div className="bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center font-black italic text-xl transform group-hover:rotate-12 transition-transform shadow-lg shadow-red-600/20 font-retro pt-1">S</div>
            <span className="text-xl font-black tracking-tighter uppercase italic hidden sm:block font-retro">SASORI<span className="text-red-500 underline decoration-2 underline-offset-4">LABS</span></span>
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
            <Link to="/admin" className="text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">Admin_Portal</Link>
            
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
              
              <Link to="/login" className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center hover:bg-zinc-800 transition-colors">
                <User className="w-5 h-5 text-zinc-400" />
              </Link>
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-4">
            <button onClick={() => setIsSearchOpen(true)} className="p-2">
              <Search className="w-6 h-6 text-zinc-400" />
            </button>
            <button 
               onClick={() => {
                setDrawerTab('cart');
                setIsDrawerOpen(true);
              }} 
              className="relative p-2"
            >
              <ShoppingCart className="w-6 h-6 text-zinc-400" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2">
               {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Lower Sticky Menu */}
      <div className="bg-black/90 backdrop-blur-xl border-b border-white/5 py-3 overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-center gap-12 sm:gap-16">
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
                className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-red-500 transition-colors whitespace-nowrap"
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
              <Link onClick={() => setIsMenuOpen(false)} to="/" className="block text-4xl font-black uppercase italic tracking-tighter hover:text-red-500 transition-colors">Home</Link>
              <Link onClick={() => setIsMenuOpen(false)} to="/catalog" className="block text-4xl font-black uppercase italic tracking-tighter hover:text-red-500 transition-colors">Catálogo</Link>
              <button 
                onClick={() => {
                  setIsMenuOpen(false);
                  setDrawerTab('favorites');
                  setIsDrawerOpen(true);
                }} 
                className="block text-4xl font-black uppercase italic tracking-tighter hover:text-red-500 transition-colors text-left"
              >
                Favoritos ({favoritesCount})
              </button>
              <Link onClick={() => setIsMenuOpen(false)} to="/admin" className="block text-4xl font-black uppercase italic tracking-tighter hover:text-red-500 transition-colors">Admin Portal</Link>
              <Link onClick={() => setIsMenuOpen(false)} to="/login" className="block text-4xl font-black uppercase italic tracking-tighter hover:text-red-500 transition-colors">Login</Link>
            </div>

            <div className="mt-12 pt-12 border-t border-white/5 space-y-4">
               <div className="flex items-center gap-3 p-4 bg-zinc-900 rounded-2xl">
                 <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-red-500" />
                 </div>
                 <div>
                   <p className="text-xs font-black uppercase tracking-widest text-white">Sasori Labs Elite</p>
                   <p className="text-[10px] text-zinc-500 uppercase">Acesse descontos exclusivos</p>
                 </div>
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
    </nav>
  );
};
