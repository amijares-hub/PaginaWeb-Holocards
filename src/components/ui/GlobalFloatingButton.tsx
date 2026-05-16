import { motion } from 'motion/react';
import { Zap } from 'lucide-react';

export function GlobalFloatingButton() {
  const handleClick = () => {
    console.log('--- GLOBAL FAB ACTIVATED ---');
    // Futura integración: Soporte Live, IA Assistant o God Console
  };

  return (
    <div className="fixed bottom-8 right-8 z-[9999]">
      <motion.button
        onClick={handleClick}
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="relative group flex items-center justify-center w-16 h-16 rounded-full bg-red-600 text-white shadow-2xl overflow-hidden"
        aria-label="Quick Actions"
      >
        {/* Glow */}
        <div className="absolute inset-0 bg-red-500/40 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-30" />

        {/* Icon */}
        <Zap className="relative z-10 w-7 h-7 fill-current" />

        {/* Pulse dot */}
        <span className="absolute top-3 right-3 w-3 h-3 bg-white rounded-full border-2 border-red-600 animate-bounce" />

        {/* Tooltip */}
        <span className="absolute right-20 whitespace-nowrap bg-zinc-900 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 transition-all shadow-2xl pointer-events-none translate-x-2 group-hover:translate-x-0">
          Quick Actions
          <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-zinc-900 border-r border-t border-white/10 rotate-45" />
        </span>
      </motion.button>
    </div>
  );
}
