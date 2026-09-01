import React from 'react';

interface ProductCardProps {
  name: string;
  info: string;
  price: string;
  badge?: 'NUEVO' | 'STOCK';
  imagePlaceholder?: string;
  image?: string;
}

export default function ProductCard({ name, info, price, badge, imagePlaceholder, image }: ProductCardProps) {
  const displayImage = image || imagePlaceholder;

  return (
    <div className="flex flex-col items-center group cursor-pointer w-full">
      
      {/* ─── CONTENEDOR DE LA IMAGEN ─── */}
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

        {/* Contenedor central de la imagen */}
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
      
      {/* ─── CONTENEDOR DE TEXTOS ─── */}
      <div className="flex flex-col items-center mt-5 text-center px-2">
        <h3 className="text-white font-bold text-sm md:text-base leading-tight mb-1 transition-colors group-hover:text-blue-300">
          {name}
        </h3>
        <p className="text-gray-300 text-xs md:text-sm font-light mb-0.5">
          {info}
        </p>
        <span className="text-gray-400 text-xs font-light tracking-wide">
          {price}
        </span>
      </div>
      
    </div>
  );
}