import React, { useState } from 'react';
import { RotateCw, ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  name: string;
  info?: string;
  price: string;
  description?: string;
  badge?: 'NUEVO' | 'STOCK';
  imagePlaceholder?: string;
  image?: string;
  onAddToCart?: () => void;
}

export default function ProductCard({ 
  name, 
  info, 
  price, 
  description, 
  badge, 
  imagePlaceholder, 
  image, 
  onAddToCart 
}: ProductCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const displayImage = image || imagePlaceholder;

  return (
    <div 
      onClick={() => setIsFlipped(!isFlipped)}
      className="w-full max-w-[320px] h-[480px] [perspective:1000px] cursor-pointer group my-2 select-none"
    >
      <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
        
        {/* CARA FRONTAL (HOMEPAGE & HERO) */}
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-between p-4 bg-[#0a1628] border border-white/10 rounded-[32px] [backface-visibility:hidden] shadow-2xl overflow-hidden">
          <div 
            className="w-full aspect-square rounded-[32px] relative flex items-center justify-center p-6 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] bg-center bg-no-repeat bg-[length:100%_100%]"
            style={{ 
              backgroundImage: "url('https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Cuadrado%20para%20Stock.png')" 
            }}
          >
            {badge === 'NUEVO' && (
              <span className="absolute top-4 left-4 bg-blue-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider z-10 shadow-lg">
                NUEVO
              </span>
            )}
            {badge === 'STOCK' && (
              <span className="absolute top-4 left-4 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider z-10 shadow-lg">
                STOCK
              </span>
            )}

            <div className="w-full h-full flex items-center justify-center transition-transform duration-500 group-hover:scale-110 z-0 drop-shadow-xl">
               {displayImage ? (
                 <img src={displayImage} alt={name} className="w-full h-full object-contain" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center bg-black/20 rounded-2xl">
                   <span className="text-zinc-600 font-bold text-xs uppercase">HoloCards</span>
                 </div>
               )}
            </div>
          </div>
          
          <div className="flex flex-col items-center text-center px-2 w-full mt-2">
            <h3 className="text-white font-bold text-sm md:text-base leading-tight mb-1 transition-colors group-hover:text-blue-300 line-clamp-1">
              {name}
            </h3>
            {info && (
              <p className="text-gray-300 text-xs font-light mb-0.5">
                {info}
              </p>
            )}
            <span className="text-yellow-400 font-black text-sm tracking-wide">
              {price}
            </span>

            <div className="mt-2.5 flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase text-yellow-400">
              <RotateCw className="w-3 h-3" /> Haz clic para ver detalles
            </div>
          </div>
        </div>

        {/* CARA TRASERA CON DESCRIPCIÓN Y DIMENSIONES AJUSTADAS */}
        <div className="absolute inset-0 w-full h-full bg-[#030c1a] border border-yellow-400/40 rounded-[32px] p-5 md:p-6 flex flex-col justify-between [transform:rotateY(180deg)] [backface-visibility:hidden] shadow-2xl">
          <div className="flex justify-between items-center border-b border-white/10 pb-3 shrink-0">
            <span className="text-[10px] font-black uppercase text-yellow-400 tracking-widest">
              DETALLES DEL PRODUCTO
            </span>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsFlipped(false);
              }}
              className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg font-bold uppercase"
            >
              <RotateCw className="w-3 h-3" /> Volver
            </button>
          </div>

          <div className="my-auto space-y-2 text-left overflow-y-auto max-h-[240px] pr-1.5 custom-scrollbar min-h-0">
            <h4 className="text-white font-black text-sm uppercase leading-snug">{name}</h4>
            <p className="text-gray-300 text-xs leading-relaxed font-medium">
              {description && description.trim() !== '' 
                ? description 
                : 'Sin descripción asignada para este producto.'}
            </p>
          </div>

          <div className="pt-3 border-t border-white/10 space-y-3 shrink-0">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400 uppercase">Precio</span>
              <span className="text-xl font-black text-yellow-400">{price}</span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onAddToCart) onAddToCart();
              }}
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-yellow-400/20"
            >
              <ShoppingCart className="w-4 h-4" /> AGREGAR AL CARRITO
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}