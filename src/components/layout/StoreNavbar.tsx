import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Search, 
  User,
  ChevronDown,
  Layers,
  Clock
} from 'lucide-react';
import { useStore } from '../../lib/StoreContext';
import { cn } from '../../lib/utils';
import { useCartStore } from '../../lib/cartStore';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useThemeStore } from '../../lib/useThemeStore';

export const StoreNavbar = () => {
  const { homepageDesign, marketing } = useStore();
  const { getItemCount } = useCartStore();
  const navigate = useNavigate();
  const cartCount = getItemCount();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!marketing?.countdown?.isActive || !marketing?.countdown?.endDate) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(marketing.countdown.endDate).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft('00:00:00');
        clearInterval(timer);
        return;
      }

      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [marketing?.countdown]);


  const headerData = homepageDesign['ui_header'] || {
    logo_url: '',
    menu_items: [
      { label: 'INICIO', path: '/dev-store' },
      { label: 'CATÁLOGO', path: '/dev-store/catalogo' },
      { label: 'NOVEDADES', path: '/dev-store/catalogo?filter=new' },
      { label: 'OFERTAS', path: '/dev-store/catalogo?filter=deals' },
      { label: 'HOW TO PLAY', path: '/dev-store/how-to-play' },
      { label: 'SOBRE NOSOTROS', path: '/dev-store/about' }
    ],
    announcement_bar: {
      text: '',
      bgColor: '#F3B91C',
      isActive: false
    }
  };

  return (
    <>
      {marketing?.countdown?.isActive && (
        <div 
          className="fixed top-0 left-0 right-0 z-[120] h-10 flex items-center justify-center gap-4 shadow-sm border-b border-white/5"
          style={{ backgroundColor: marketing.countdown.color }}
        >
          <Clock className="w-4 h-4 text-white animate-pulse" />
          <p className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic">
            {marketing.countdown.message} <span className="font-mono text-xs ml-2">{timeLeft}</span>
          </p>
        </div>
      )}

      {headerData.announcement_bar?.isActive && (
        <div 
          className={cn(
            "fixed left-0 right-0 z-[110] h-8 flex items-center justify-center overflow-hidden",
            marketing?.countdown?.isActive ? "top-10" : "top-0"
          )}
          style={{ backgroundColor: headerData.announcement_bar.bgColor }}
        >
          <div 
            className="flex items-center gap-8 animate-marquee-right whitespace-nowrap"
            style={{ animationDuration: `${headerData.announcement_bar.scroll_speed || 5000}ms` }}
          >
            {[...Array(4)].map((_, i) => (
              <span key={i} className="text-[10px] font-black text-white tracking-[0.3em] uppercase italic">
                {headerData.announcement_bar.text}
              </span>
            ))}
          </div>
        </div>
      )}
      <nav className={cn(
        "fixed left-0 right-0 z-[100] bg-background text-foreground border-b border-border transition-all shadow-sm",
        marketing?.countdown?.isActive && headerData.announcement_bar?.isActive ? "top-18" :
        marketing?.countdown?.isActive ? "top-10" :
        headerData.announcement_bar?.isActive ? "top-8" : "top-0"
      )}>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4 lg:gap-8">
        {/* Mobile Menu Button */}
        <button 
          title="Abrir menú de navegación"
          className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Logo */}
        <Link to="/dev-store" className="flex items-center gap-3 shrink-0 group">
          {headerData.logo_url ? (
            <img 
              src={headerData.logo_url} 
              alt="HoloCard Logo" 
              className="h-10 w-auto object-contain transition-transform" 
              style={{
                transform: `translate(${headerData.logoConfig?.x || 0}px, ${headerData.logoConfig?.y || 0}px) scale(${headerData.logoConfig?.scale || 1}) rotate(${headerData.logoConfig?.rotate || 0}deg)`,
                opacity: headerData.logoConfig?.opacity ?? 1
              }}
            />
          ) : (
            <div className="relative">
               <Layers className="w-8 h-8 text-foreground transform -rotate-12 group-hover:rotate-0 transition-transform" />
               <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-sm" />
            </div>
          )}
          {!headerData.logo_url && <span className="text-xl font-black tracking-tighter uppercase italic">TCG <span className="text-muted-foreground">STORE</span></span>}
        </Link>

        {/* Navigation Links */}
        <div className="hidden lg:flex items-center gap-8 flex-1 justify-center">
          {headerData.menu_items.map((item: any) => (
            <Link 
              key={item.label} 
              to={item.path.startsWith('/dev-store') ? item.path : (item.path === '/' ? '/dev-store' : `/dev-store${item.path}`)}
              className="text-[12px] font-black uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-1"
            >
              {item.label}
              {item.hasDropdown && <ChevronDown className="w-4 h-4 opacity-50" />}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-6 shrink-0">
          <button 
            title="Abrir buscador"
            aria-label="Buscar productos"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <Search className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Buscar</span>
          </button>
          
          <Link 
            to="/dev-store/login" 
            title="Ir a mi cuenta"
            aria-label="Acceder a mi cuenta de usuario"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">Mi cuenta</span>
          </Link>

          <button 
            onClick={() => useThemeStore.getState().toggleTheme()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
            title="Toggle Theme"
          >
            {useThemeStore((state) => state.theme) === 'dark' ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5 text-indigo-400" />
            )}
            <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">Modo</span>
          </button>

          <button 
            onClick={() => navigate('/dev-store/carrito')}
            title="Ir al carrito"
            aria-label={`Ver carrito con ${cartCount} productos`}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors relative group"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center ring-2 ring-background">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">Carrito</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="fixed inset-0 top-20 z-[90] lg:hidden"
          >
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Menu Content */}
            <div className="absolute top-0 left-0 bottom-0 w-[280px] bg-background border-r border-border p-6 flex flex-col gap-8 shadow-2xl">
              <div className="flex flex-col gap-4">
                {headerData.menu_items.map((item: any) => (
                  <Link 
                    key={item.label} 
                    to={item.path.startsWith('/dev-store') ? item.path : (item.path === '/' ? '/dev-store' : `/dev-store${item.path}`)}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-lg font-black uppercase tracking-tighter italic border-b border-border pb-4 hover:text-primary transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              
              <div className="mt-auto pt-8 border-t border-border space-y-4">
                <Link 
                  to="/dev-store/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span className="text-sm font-bold uppercase tracking-widest">Mi Cuenta</span>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </nav>
    </>
  );
};
