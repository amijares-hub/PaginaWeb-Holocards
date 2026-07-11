import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Search, User, ShoppingCart } from 'lucide-react';
import { motion } from 'motion/react';

export default function HeaderV2() {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-gray-900/80 border-b border-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Lado Izquierdo: Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/v2-landing" className="flex items-center gap-2">
              <img 
                src="https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Logotipos/Isologo%20Transparente.png" 
                alt="Holocards" 
                className="h-10 object-contain" 
              />
            </Link>
          </div>

          {/* Centro: Navegación */}
          <nav className="hidden md:flex space-x-8">
            <Link 
              to="/v2-landing" 
              className="text-sm font-semibold tracking-wide hover:text-primary transition-colors flex items-center"
            >
              INICIO
            </Link>
            
            <div className="relative group cursor-pointer flex items-center">
              <span className="text-sm font-semibold tracking-wide hover:text-primary transition-colors flex items-center gap-1">
                POKÉMON / MAGIC / ONE PIECE
                <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
              </span>
            </div>

            <div className="relative group cursor-pointer flex items-center">
              <span className="text-sm font-semibold tracking-wide hover:text-primary transition-colors flex items-center gap-1">
                PRODUCTOS
                <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
              </span>
            </div>

            <Link 
              to="/v2-landing" 
              className="text-sm font-semibold tracking-wide hover:text-primary transition-colors flex items-center"
            >
              NOVEDADES
            </Link>

            <Link 
              to="/v2-landing" 
              className="text-sm font-semibold tracking-wide hover:text-primary transition-colors flex items-center"
            >
              SOBRE NOSOTROS
            </Link>
          </nav>

          {/* Lado Derecho: Iconos */}
          <div className="flex items-center space-x-6">
            <button className="text-gray-300 hover:text-white transition-colors" aria-label="Buscar">
              <Search className="w-5 h-5" />
            </button>
            <button className="text-gray-300 hover:text-white transition-colors" aria-label="Mi Cuenta">
              <User className="w-5 h-5" />
            </button>
            <button className="text-gray-300 hover:text-white transition-colors relative" aria-label="Carrito">
              <ShoppingCart className="w-5 h-5" />
              {/* Badge dorado simulado */}
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-500 to-yellow-300 text-[10px] font-bold text-black border-2 border-gray-900 shadow-[0_0_10px_rgba(234,179,8,0.5)]"
              >
                3
              </motion.span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
