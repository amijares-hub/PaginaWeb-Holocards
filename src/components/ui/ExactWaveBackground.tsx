import React from 'react';

// URL base del bucket para recursos visuales
const BUCKET_URL = "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Recursos%20Visuales%20Disenador/Iconos%20Pagina%20Web/";

export default function ExactWaveBackground() {
  return (
    // 🌟 CONTENEDOR DE FONDO: Absoluto, cubriendo todo, centrado, z-0
    <div className="absolute inset-0 w-full h-full flex items-center justify-center z-0 bg-black pointer-events-none overflow-hidden">
      
      {/* 🌟 IMAGEN DEL PATRÓN: Cargando el asset exacto (Recurso 22) y centrándolo */}
      <img 
        src={`${BUCKET_URL}Recurso%2022.png`}
        alt="Neon Line Pattern Background"
        // 🌟 Posicionamiento exacto: 'object-contain' asegura que el asset completo se muestre centrado sin recorte
        className="w-full h-full object-contain opacity-40 select-none"
      />

    </div>
  );
}
