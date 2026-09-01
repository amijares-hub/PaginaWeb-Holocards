import React from 'react';
import { motion } from 'framer-motion';

export default function AnnouncementBar() {
  const text = "BIENVENIDO A HOLOCARDS • WELCOME TO HOLOCARDS • ";
  const repeatedText = text.repeat(8);

  return (
    <div className="bg-gradient-to-r from-cyan-900 to-blue-900 text-white text-xs py-1.5 overflow-hidden relative flex whitespace-nowrap items-center font-bold tracking-[0.2em] z-50 border-b border-cyan-500/20">
      <motion.div
        className="flex"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ repeat: Infinity, ease: "linear", duration: 25 }}
      >
        <span>{repeatedText}</span>
      </motion.div>
    </div>
  );
}