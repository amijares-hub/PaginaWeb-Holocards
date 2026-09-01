import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ChevronDown, Search, User, ShoppingCart, X, Plus, Minus, Trash2, Menu, Sparkles 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '../../lib/cartStore';
import { useAuth } from '../../hooks/useAuth';

// ─── CART SIDEBAR DRAWER ───
function CartSidebar({ onClose }: { onClose: () => void }) {
  const { items, updateQuantity, removeItem, getTotalPrice } = useCartStore();
  const navigate = useNavigate();

  const total = getTotalPrice() || 0;

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[150]"
      />

      {/* Panel lateral */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="fixed top-0 right-0 bottom-0 w-[90vw] max-w-[400px] bg-[#050914] border-l border-cyan-900/40 z-[160] flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.8)]"
      >
        {/* Header del drawer */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-cyan-400" />
            <span className="text-white font-black uppercase tracking-widest text-sm">Mi Carrito</span>
            {items.length > 0 && (
              <span className="px-2 py-0.5 bg-cyan-400 text-black text-[10px] font-black rounded-full">
                {items.reduce((acc, i) => acc + (i.quantity || 0), 0)}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de productos */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
              <ShoppingCart className="w-16 h-16 text-gray-700" />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Tu carrito está vacío</p>
              <button
                onClick={() => { navigate('/catalogo'); onClose(); }}
                className="px-6 py-3 bg-cyan-400 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-cyan-300 transition-colors active:scale-95"
              >
                Ver Catálogo
              </button>
            </div>
          ) : (
            items.map((item) => {
              const price = Number(item.price) || 0;
              const itemTotal = price * (item.quantity || 1);
              return (
                <div key={item.id} className="flex gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
                  <div className="w-16 h-16 bg-[#0a1628] rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-1" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-bold truncate leading-snug">{item.name}</p>
                    <p className="text-cyan-400 text-[11px] font-black mt-0.5">
                      {price.toFixed(2)}€
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-red-500/30 rounded-md transition-colors"
                      >
                        <Minus className="w-3 h-3 text-white" />
                      </button>
                      <span className="text-white text-xs font-black w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-cyan-500/30 rounded-md transition-colors"
                      >
                        <Plus className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between shrink-0">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded-md hover:bg-red-400/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-white text-xs font-black">
                      {itemTotal.toFixed(2)}€
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-white/10 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Total</span>
              <span className="text-white text-xl font-black">{total.toFixed(2)}€</span>
            </div>
            <button
              onClick={() => { navigate('/checkout'); onClose(); }}
              className="w-full py-4 bg-cyan-400 hover:bg-cyan-300 text-black font-black uppercase tracking-widest text-xs rounded-xl active:scale-95 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
              Finalizar Compra →
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}

interface HeaderV2Props {
  onHomeClick?: () => void;
  onFranchiseClick?: () => void;
}

export default function HeaderV2({ onHomeClick, onFranchiseClick }: HeaderV2Props) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openMobileAccordion, setOpenMobileAccordion] = useState<string | null>(null);

  const { user } = useAuth();
  const itemCount = useCartStore((state) =>
    state.items.reduce((acc, i) => acc + (i.quantity || 0), 0)
  );

  const toggleDropdown = (menuName: string) => {
    setOpenDropdown(prev => (prev === menuName ? null : menuName));
  };

  const toggleMobileAccordion = (accName: string) => {
    setOpenMobileAccordion(prev => (prev === accName ? null : accName));
  };

  return (
    <>
      <header className="sticky top-0 z-[100] w-full backdrop-blur-xl bg-[#050914]/90 border-b border-cyan-900/30 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">

            {/* Lado Izquierdo: Logo + Menú Hamburguesa en Móvil/Tablet */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Abrir menú"
              >
                <Menu className="w-6 h-6 text-cyan-400" />
              </button>

              <div className="flex-shrink-0 flex items-center">
                {onHomeClick ? (
                  <button onClick={onHomeClick} className="flex items-center gap-2">
                    <img
                      src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logotipos/Isologo%20Transparente.png"
                      alt="Holocards"
                      className="h-9 sm:h-10 object-contain"
                    />
                  </button>
                ) : (
                  <Link to="/" className="flex items-center gap-2">
                    <img
                      src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logotipos/Isologo%20Transparente.png"
                      alt="Holocards"
                      className="h-9 sm:h-10 object-contain"
                    />
                  </Link>
                )}
              </div>
            </div>

            {/* Centro: Navegación Escritorio y Tablet Ancha (≥1024px) */}
            <nav className="hidden lg:flex space-x-6 xl:space-x-8">
              {onHomeClick ? (
                <button
                  onClick={onHomeClick}
                  className="text-xs xl:text-sm font-semibold tracking-wide text-gray-300 hover:text-cyan-400 transition-colors flex items-center uppercase"
                >
                  Inicio
                </button>
              ) : (
                <Link
                  to="/"
                  className="text-xs xl:text-sm font-semibold tracking-wide text-gray-300 hover:text-cyan-400 transition-colors flex items-center uppercase"
                >
                  Inicio
                </Link>
              )}

              {/* ─── DROPDOWN: FRANQUICIAS ─── */}
              <div 
                className="relative group"
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button 
                  onClick={() => {
                    if (onFranchiseClick) onFranchiseClick();
                    toggleDropdown('franquicias');
                  }}
                  className="flex items-center gap-1 text-xs xl:text-sm font-semibold text-gray-300 hover:text-cyan-400 transition-colors uppercase tracking-wide py-2"
                >
                  Pokémon / Magic / One Piece
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${openDropdown === 'franquicias' ? 'rotate-180 text-cyan-400' : 'group-hover:rotate-180'}`} />
                </button>
                <div className={`absolute top-full left-0 mt-1 w-56 bg-[#0a1628]/95 backdrop-blur-xl border border-cyan-900/50 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-all duration-300 flex flex-col overflow-hidden z-50 ${openDropdown === 'franquicias' ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'}`}>
                  <Link to="/catalogo?brand=pokemon" onClick={() => setOpenDropdown(null)} className="px-4 py-3 text-sm text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 flex items-center gap-2">
                    <span className="text-yellow-400 text-xs">◆</span>Pokémon TCG
                  </Link>
                  <Link to="/catalogo?brand=magic" onClick={() => setOpenDropdown(null)} className="px-4 py-3 text-sm text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 flex items-center gap-2">
                    <span className="text-blue-400 text-xs">◆</span>Magic The Gathering
                  </Link>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      alert("La sección One Piece TCG estará disponible próximamente.");
                    }}
                    className="opacity-50 cursor-not-allowed px-4 py-3 text-sm text-gray-200 transition-colors border-b border-white/5 flex items-center justify-between gap-2 w-full text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 text-xs">◆</span>One Piece Card Game
                    </div>
                    <span className="text-[9px] bg-yellow-400 text-black px-1.5 py-0.5 rounded font-black">PROXIMAMENTE</span>
                  </button>
                  <Link to="/catalogo?brand=accesorios" onClick={() => setOpenDropdown(null)} className="px-4 py-3 text-sm text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors flex items-center gap-2">
                    <span className="text-purple-400 text-xs">◆</span>Accesorios
                  </Link>
                </div>
              </div>

              {/* ─── DROPDOWN: TIPOS DE PRODUCTO ─── */}
              <div 
                className="relative group"
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button 
                  onClick={() => toggleDropdown('productos')}
                  className="flex items-center gap-1 text-xs xl:text-sm font-semibold text-gray-300 hover:text-cyan-400 transition-colors uppercase tracking-wide py-2"
                >
                  Productos
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${openDropdown === 'productos' ? 'rotate-180 text-cyan-400' : 'group-hover:rotate-180'}`} />
                </button>
                <div className={`absolute top-full left-0 mt-1 w-64 bg-[#0a1628]/95 backdrop-blur-xl border border-cyan-900/50 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-all duration-300 flex flex-col overflow-hidden z-50 max-h-[70vh] overflow-y-auto custom-scrollbar ${openDropdown === 'productos' ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'}`}>
                  <Link to="/catalogo?category=binders" onClick={() => setOpenDropdown(null)} className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Binders</Link>
                  <Link to="/catalogo?category=blister" onClick={() => setOpenDropdown(null)} className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Blister</Link>
                  <Link to="/catalogo?category=cajas-de-mazo" onClick={() => setOpenDropdown(null)} className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Cajas de Mazo</Link>
                  <Link to="/catalogo?category=cajas-de-sobres" onClick={() => setOpenDropdown(null)} className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Cajas de Sobres</Link>
                  <Link to="/catalogo?category=cajas-etb" onClick={() => setOpenDropdown(null)} className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Cajas ETB</Link>
                  <Link to="/catalogo?category=cartas-gradeadas" onClick={() => setOpenDropdown(null)} className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Cartas Gradeadas</Link>
                  <Link to="/catalogo?category=colecciones" onClick={() => setOpenDropdown(null)} className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Colecciones</Link>
                  <Link to="/catalogo?category=commander" onClick={() => setOpenDropdown(null)} className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Commander</Link>
                  <Link to="/catalogo?category=fundas-toploader" onClick={() => setOpenDropdown(null)} className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors uppercase tracking-wider">Fundas / Toploader</Link>
                </div>
              </div>

              {/* MÁS INFORMACIÓN Dropdown */}
              <div 
                className="relative group"
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button 
                  onClick={() => toggleDropdown('info')}
                  className="flex items-center gap-1 text-xs xl:text-sm font-semibold text-gray-300 hover:text-cyan-400 transition-colors uppercase tracking-wide py-2"
                >
                  Más Información
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${openDropdown === 'info' ? 'rotate-180 text-cyan-400' : 'group-hover:rotate-180'}`} />
                </button>
                <div className={`absolute top-full left-0 mt-1 w-68 bg-[#0a1628]/95 backdrop-blur-xl border border-cyan-900/50 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] transition-all duration-300 flex flex-col overflow-hidden z-50 ${openDropdown === 'info' ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'}`}>
                  <Link to="/sobre-nosotros?section=sobre-nosotros" onClick={() => setOpenDropdown(null)} className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Sobre Nosotros</Link>
                  <Link to="/sobre-nosotros?section=terminos" onClick={() => setOpenDropdown(null)} className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Términos y Condiciones</Link>
                  <Link to="/sobre-nosotros?section=avisos" onClick={() => setOpenDropdown(null)} className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Avisos Legales</Link>
                  <Link to="/sobre-nosotros?section=privacidad" onClick={() => setOpenDropdown(null)} className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors border-b border-white/5 uppercase tracking-wider">Política de Privacidad y Cookies</Link>
                  <Link to="/sobre-nosotros?section=envios" onClick={() => setOpenDropdown(null)} className="px-4 py-3 text-xs font-bold text-gray-200 hover:bg-cyan-900/40 hover:text-cyan-300 transition-colors uppercase tracking-wider">Política de Envíos y Devoluciones</Link>
                </div>
              </div>
            </nav>

            {/* Lado Derecho: Iconos */}
            <div className="flex items-center space-x-2">
              <Link to="/catalogo" className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors" aria-label="Buscar">
                <Search className="w-5 h-5" />
              </Link>
              <Link to={user ? "/perfil" : "/login"} className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors" aria-label="Mi Cuenta">
                <User className="w-5 h-5" />
              </Link>

              {/* CARRITO */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors relative active:scale-95"
                aria-label="Abrir carrito"
              >
                <ShoppingCart className="w-5 h-5" />
                <AnimatePresence>
                  {itemCount > 0 && (
                    <motion.span
                      key={itemCount}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-500 to-yellow-300 text-[10px] font-black text-black border-2 border-[#050914] shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                    >
                      {itemCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* ─── DRAWER MENÚ MÓVIL Y TABLET (`<1024px`) ─── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[140] lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-[360px] bg-[#050914] border-r border-cyan-900/40 z-[150] flex flex-col lg:hidden"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <img
                    src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logotipos/Isologo%20Transparente.png"
                    alt="Holocards"
                    className="h-8 object-contain"
                  />
                  <span className="text-white font-black uppercase tracking-wider text-xs">Menú Principal</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-gray-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 custom-scrollbar">
                {/* Inicio */}
                {onHomeClick ? (
                  <button
                    onClick={() => { onHomeClick(); setIsMobileMenuOpen(false); }}
                    className="w-full text-left font-black uppercase tracking-wider text-sm text-gray-200 hover:text-cyan-400 py-2 border-b border-white/5"
                  >
                    Inicio
                  </button>
                ) : (
                  <Link
                    to="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block font-black uppercase tracking-wider text-sm text-gray-200 hover:text-cyan-400 py-2 border-b border-white/5"
                  >
                    Inicio
                  </Link>
                )}

                {/* Acordeón Franquicias */}
                <div className="border-b border-white/5 pb-2">
                  <button
                    onClick={() => toggleMobileAccordion('franquicias')}
                    className="w-full flex items-center justify-between py-2 text-sm font-black uppercase tracking-wider text-gray-200 hover:text-cyan-400"
                  >
                    <span>Pokémon / Magic / One Piece</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${openMobileAccordion === 'franquicias' ? 'rotate-180 text-cyan-400' : ''}`} />
                  </button>
                  {openMobileAccordion === 'franquicias' && (
                    <div className="pl-4 pt-2 space-y-2 flex flex-col text-xs font-bold text-gray-300">
                      <Link to="/catalogo?brand=pokemon" onClick={() => setIsMobileMenuOpen(false)} className="py-1.5 hover:text-yellow-400">
                        ◆ Pokémon TCG
                      </Link>
                      <Link to="/catalogo?brand=magic" onClick={() => setIsMobileMenuOpen(false)} className="py-1.5 hover:text-blue-400">
                        ◆ Magic The Gathering
                      </Link>
                      <button 
                        onClick={() => alert("La sección One Piece TCG estará disponible próximamente.")}
                        className="text-left py-1.5 opacity-50 flex items-center justify-between"
                      >
                        <span>◆ One Piece Card Game</span>
                        <span className="text-[8px] bg-yellow-400 text-black px-1 rounded font-black">PROX</span>
                      </button>
                      <Link to="/catalogo?brand=accesorios" onClick={() => setIsMobileMenuOpen(false)} className="py-1.5 hover:text-purple-400">
                        ◆ Accesorios
                      </Link>
                    </div>
                  )}
                </div>

                {/* Acordeón Productos */}
                <div className="border-b border-white/5 pb-2">
                  <button
                    onClick={() => toggleMobileAccordion('productos')}
                    className="w-full flex items-center justify-between py-2 text-sm font-black uppercase tracking-wider text-gray-200 hover:text-cyan-400"
                  >
                    <span>Productos</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${openMobileAccordion === 'productos' ? 'rotate-180 text-cyan-400' : ''}`} />
                  </button>
                  {openMobileAccordion === 'productos' && (
                    <div className="pl-4 pt-2 space-y-2 flex flex-col text-xs font-bold text-gray-300 max-h-48 overflow-y-auto custom-scrollbar">
                      <Link to="/catalogo?category=binders" onClick={() => setIsMobileMenuOpen(false)} className="py-1 hover:text-cyan-300 uppercase">Binders</Link>
                      <Link to="/catalogo?category=blister" onClick={() => setIsMobileMenuOpen(false)} className="py-1 hover:text-cyan-300 uppercase">Blister</Link>
                      <Link to="/catalogo?category=cajas-de-mazo" onClick={() => setIsMobileMenuOpen(false)} className="py-1 hover:text-cyan-300 uppercase">Cajas de Mazo</Link>
                      <Link to="/catalogo?category=cajas-de-sobres" onClick={() => setIsMobileMenuOpen(false)} className="py-1 hover:text-cyan-300 uppercase">Cajas de Sobres</Link>
                      <Link to="/catalogo?category=cajas-etb" onClick={() => setIsMobileMenuOpen(false)} className="py-1 hover:text-cyan-300 uppercase">Cajas ETB</Link>
                      <Link to="/catalogo?category=cartas-gradeadas" onClick={() => setIsMobileMenuOpen(false)} className="py-1 hover:text-cyan-300 uppercase">Cartas Gradeadas</Link>
                      <Link to="/catalogo?category=colecciones" onClick={() => setIsMobileMenuOpen(false)} className="py-1 hover:text-cyan-300 uppercase">Colecciones</Link>
                      <Link to="/catalogo?category=commander" onClick={() => setIsMobileMenuOpen(false)} className="py-1 hover:text-cyan-300 uppercase">Commander</Link>
                      <Link to="/catalogo?category=fundas-toploader" onClick={() => setIsMobileMenuOpen(false)} className="py-1 hover:text-cyan-300 uppercase">Fundas / Toploader</Link>
                    </div>
                  )}
                </div>

                {/* Acordeón Más Información */}
                <div className="border-b border-white/5 pb-2">
                  <button
                    onClick={() => toggleMobileAccordion('info')}
                    className="w-full flex items-center justify-between py-2 text-sm font-black uppercase tracking-wider text-gray-200 hover:text-cyan-400"
                  >
                    <span>Más Información</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${openMobileAccordion === 'info' ? 'rotate-180 text-cyan-400' : ''}`} />
                  </button>
                  {openMobileAccordion === 'info' && (
                    <div className="pl-4 pt-2 space-y-2 flex flex-col text-xs font-bold text-gray-300">
                      <Link to="/sobre-nosotros?section=sobre-nosotros" onClick={() => setIsMobileMenuOpen(false)} className="py-1 hover:text-cyan-300 uppercase">Sobre Nosotros</Link>
                      <Link to="/sobre-nosotros?section=terminos" onClick={() => setIsMobileMenuOpen(false)} className="py-1 hover:text-cyan-300 uppercase">Términos y Condiciones</Link>
                      <Link to="/sobre-nosotros?section=avisos" onClick={() => setIsMobileMenuOpen(false)} className="py-1 hover:text-cyan-300 uppercase">Avisos Legales</Link>
                      <Link to="/sobre-nosotros?section=privacidad" onClick={() => setIsMobileMenuOpen(false)} className="py-1 hover:text-cyan-300 uppercase">Privacidad y Cookies</Link>
                      <Link to="/sobre-nosotros?section=envios" onClick={() => setIsMobileMenuOpen(false)} className="py-1 hover:text-cyan-300 uppercase">Envíos y Devoluciones</Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CART SIDEBAR DRAWER */}
      <AnimatePresence>
        {isCartOpen && <CartSidebar onClose={() => setIsCartOpen(false)} />}
      </AnimatePresence>
    </>
  );
}