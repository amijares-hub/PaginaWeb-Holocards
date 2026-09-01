// TcgCategoryMenu.tsx
import React from 'react';
import { motion } from 'framer-motion';

interface TcgCategoryMenuProps {
  active: string;
  setActive: (category: string) => void;
  accentColor?: 'blue' | 'yellow' | 'red';
  categories?: string[];
}

export default function TcgCategoryMenu({
  active,
  setActive,
  accentColor = 'blue',
  categories = ['BOOSTERS', 'SELLADOS', 'DECKS'],
}: TcgCategoryMenuProps) {
  const activeStyleMap = {
    blue: 'bg-blue-600 text-white border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.4)]',
    yellow: 'bg-yellow-500 text-black border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.4)]',
    red: 'bg-red-600 text-white border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]',
  };

  return (
    <div className="flex flex-wrap justify-center gap-3 my-10">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => setActive(cat)}
          className={`relative px-8 py-2.5 rounded-full text-sm font-bold tracking-wider uppercase transition-all duration-300 border ${
            active === cat
              ? activeStyleMap[accentColor]
              : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white hover:border-gray-600'
          }`}
        >
          {active === cat && (
            <motion.span
              layoutId="tcg-category-pill"
              className="absolute inset-0 rounded-full"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{cat}</span>
        </button>
      ))}
    </div>
  );
}