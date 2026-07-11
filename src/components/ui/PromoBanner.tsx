import React from 'react';
import { motion } from 'motion/react';

interface PromoBannerProps {
  title: React.ReactNode;
  description: React.ReactNode;
  buttonText: string;
  Icon: React.ElementType;
  themeColor: string; // e.g. "blue", "yellow", "red"
}

export default function PromoBanner({
  title,
  description,
  buttonText,
  Icon,
  themeColor
}: PromoBannerProps) {
  
  // Tailwind V4 utility mappings para no usar concatenación dinámica que pueda romper el build
  const themes: Record<string, { border: string, bg: string, text: string }> = {
    yellow: { border: 'border-yellow-500/50', bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
    blue: { border: 'border-blue-500/50', bg: 'bg-blue-500/10', text: 'text-blue-400' },
    red: { border: 'border-red-500/50', bg: 'bg-red-500/10', text: 'text-red-400' },
    cyan: { border: 'border-cyan-500/50', bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
  };

  const selectedTheme = themes[themeColor] || themes.cyan;

  return (
    <div className="w-full max-w-6xl mx-auto rounded-3xl bg-gray-900/40 border border-gray-800 backdrop-blur-md relative overflow-visible shadow-xl">
      <div className="flex flex-col md:flex-row min-h-[300px]">
        
        {/* Mitad Izquierda: Contenido */}
        <div className="w-full md:w-1/2 p-10 z-10 flex flex-col justify-center items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-4">
              {title}
            </div>
            <div className="text-gray-300 text-sm md:text-base mb-8 leading-relaxed max-w-md font-light">
              {description}
            </div>
            <button className={`px-6 py-3 rounded-full font-bold text-white border ${selectedTheme.border} ${selectedTheme.bg} hover:bg-opacity-20 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.2)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]`}>
              {buttonText}
            </button>
          </motion.div>
        </div>

        {/* Mitad Derecha: Personaje 3D (Efecto "salirse" de la caja) */}
        <div className="w-full md:w-1/2 relative h-64 md:h-auto pointer-events-none mt-10 md:mt-0 flex justify-center md:justify-end items-end md:items-center">
          {/* Placeholder del Personaje */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="absolute md:-right-10 md:-top-16 -top-24 w-80 h-80 flex items-center justify-center opacity-40 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
             <Icon className={`w-full h-full ${selectedTheme.text} drop-shadow-2xl`} />
          </motion.div>
        </div>
        
      </div>
    </div>
  );
}
