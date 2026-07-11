import React from 'react';
import { motion } from 'motion/react';

export default function AnnouncementBar() {
  const text = "BIENVENIDO A HOLOCARDS OFICIAL • WELCOME TO HOLOCARDS • ";
  // Repetimos el texto varias veces para que el bucle no tenga cortes
  const repeatedText = text.repeat(10);

  return (
    <div className="bg-gradient-to-r from-cyan-900 to-blue-900 text-white text-xs py-1 overflow-hidden relative flex whitespace-nowrap items-center font-bold tracking-[0.2em] z-50">
      <motion.div
        className="flex"
        animate={{ x: [0, -1000] }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration: 20
        }}
      >
        <span>{repeatedText}</span>
      </motion.div>
    </div>
  );
}
