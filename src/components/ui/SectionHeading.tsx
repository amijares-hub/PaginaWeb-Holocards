// SectionHeading.tsx
import React from 'react';

interface SectionHeadingProps {
  title: string;
}

export default function SectionHeading({ title }: SectionHeadingProps) {
  const starIconUrl = "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Brillo%20para%20Categorias.png";

  return (
    <div className="flex items-center gap-3 mb-8">
      <img 
        src={starIconUrl} 
        alt="Estrella de Categoría" 
        className="w-6 h-6 md:w-7 md:h-7 object-contain"
      />
      <h2 className="text-white font-bold text-xl md:text-2xl uppercase tracking-wider">
        {title}
      </h2>
    </div>
  );
}