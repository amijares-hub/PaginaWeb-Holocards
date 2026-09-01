import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, User, Layers, Clock, Menu, X, Sun, Moon } from 'lucide-react';
import { useStore } from '../../lib/StoreContext';
import { cn } from '../../lib/utils';
import { useCartStore } from '../../lib/cartStore';
import { motion, AnimatePresence } from 'motion/react';
import { useThemeStore } from '../../lib/useThemeStore';
import { useAuth } from '../../hooks/useAuth';

export const StoreNavbar = () => {
  const { homepageDesign, marketing } = useStore();
  const { user } = useAuth();
  const { getItemCount, setIsOpen } = useCartStore();
  const navigate = useNavigate();
  const cartCount = getItemCount();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  const countdownActive = marketing?.countdown?.isActive;
  const endDateStr = marketing?.countdown?.endDate;

  useEffect(() => {
    if (!countdownActive || !endDateStr) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(endDateStr).getTime();
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
  }, [countdownActive, endDateStr]);

  const headerData = homepageDesign['ui_header'] || {
    logo_url: '',
    menu_items: [
      { label: 'INICIO', path: '/' },
      { label: 'CATÁLOGO', path: '/catalogo' },
      { label: 'OFERTAS', path: '/catalogo?filter=deals' }
    ]
  };

  return (
    <>
      {marketing?.countdown?.isActive && (
        <div className="fixed top-0 left-0 right-0 z-[120] h-10 flex items-center justify-center gap-4 bg-red-600 text-white shadow-sm">
          <Clock className="w-4 h-4 animate-pulse" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">
            {marketing.countdown.message} <span className="font-mono text-xs ml-2">{timeLeft}</span>
          </p>
        </div>
      )}

      <nav className={cn(
        "fixed left-0 right-0 z-[100] bg-background text-foreground border-b border-border shadow-sm",
        marketing?.countdown?.isActive ? "top-10" : "top-0"
      )}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          <button className="lg:hidden p-2 text-muted-foreground" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <Link to="/" className="flex items-center gap-3 shrink-0">
            {headerData.logo_url ? (
              <img src={headerData.logo_url} alt="HoloCards" className="h-10 w-auto object-contain" />
            ) : (
              <Layers className="w-8 h-8 text-foreground" />
            )}
            <span className="text-xl font-black uppercase italic">HoloCards</span>
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            {headerData.menu_items.map((item: any) => (
              <Link key={item.label} to={item.path} className="text-[12px] font-black uppercase tracking-widest hover:text-primary transition-colors">
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link to={user ? "/perfil" : "/login"} className="text-muted-foreground hover:text-foreground">
              <User className="w-5 h-5" />
            </Link>

            <button onClick={() => setIsOpen(true)} className="relative text-muted-foreground hover:text-foreground">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};