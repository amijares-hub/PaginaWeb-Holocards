import React from 'react';

export default function FeatureIconsBanner() {
  // URLs reales proporcionadas en orden
  const icons = [
    { 
      id: 1, 
      src: "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Recurso%2018.png", 
      alt: "Confianza y Garantía" 
    },
    { 
      id: 2, 
      src: "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Recurso%2013.png", 
      alt: "Novedades y Destacados" 
    },
    { 
      id: 3, 
      src: "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Envios.png", 
      alt: "Envíos Rápidos" 
    },
    { 
      id: 4, 
      src: "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/Recurso%2025.png", 
      alt: "Compra Segura" 
    }
  ];

  return (
    <div className="w-full py-16 my-8 flex items-center justify-center">
      <div className="max-w-5xl w-full flex justify-between md:justify-around items-center px-4 md:px-12 gap-4">
        {icons.map((icon) => (
          <div key={icon.id} className="group cursor-pointer flex justify-center w-1/4">
            <img 
              src={icon.src} 
              alt={icon.alt} 
              // Tamaños escalables y efecto hover con brillo azul cyan para que resalte
              className="w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 object-contain transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_25px_rgba(34,211,238,0.5)] opacity-80 group-hover:opacity-100"
            />
          </div>
        ))}
      </div>
    </div>
  );
}