import React from 'react';
import { motion } from 'framer-motion';
import { formatCurrency, cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { Button } from './button';
import { ArrowRight, ShoppingCart, Heart } from 'lucide-react';
import { useStore } from '../../lib/StoreContext';
import { Card as StoreCard } from '../../types';

interface Card {
  id: string;
  name: string;
  price: number;
  image: string;
  image_url?: string;
  category: string;
  rarity?: string;
}

interface ProductCarouselProps {
  cards: Card[];
}

export function ProductCarousel({ cards }: ProductCarouselProps) {
  const navigate = useNavigate();
  const { addToCart, toggleFavorite, isFavorite } = useStore();
  // Triple the items for a smooth infinite scroll
  const displayCards = [...cards, ...cards, ...cards];

  const handleAddToCart = (card: Card) => {
    const storeCard: StoreCard = {
      id: card.id,
      name: card.name,
      price: card.price,
      image_url: card.image_url || card.image,
      rarity: card.rarity || card.category,
      stock: 1,
      set: 'Mystery',
      isFeatured: true
    };
    addToCart(storeCard);
  };

  const handleToggleFavorite = (card: Card) => {
    const storeCard: StoreCard = {
      id: card.id,
      name: card.name,
      price: card.price,
      image_url: card.image_url || card.image,
      rarity: card.rarity || card.category,
      stock: 1,
      set: 'Mystery',
      isFeatured: true
    };
    toggleFavorite(storeCard);
  };

  return (
    <div className="relative w-full overflow-hidden py-12">
      {/* Gradient Overlays - responsive width */}
      <div className="absolute left-0 top-0 bottom-0 z-10 w-16 sm:w-32 bg-gradient-to-r from-[#09090b] to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 z-10 w-16 sm:w-32 bg-gradient-to-l from-[#09090b] to-transparent pointer-events-none" />

      <motion.div
        className="flex gap-4 sm:gap-6 whitespace-nowrap"
        animate={{
          x: [0, -((cards.length * (window.innerWidth < 640 ? 240 : 320)))], // Adjusted for responsive width
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: cards.length * 5,
            ease: "linear",
          },
        }}
      >
        {displayCards.map((card, index) => (
          <div
            key={`${card.id}-${index}`}
            className="w-[200px] sm:w-[260px] md:w-80 group flex-shrink-0"
          >
            <div className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 bg-zinc-900/50">
              <img
                src={card.image}
                alt={card.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              
              {/* Favorite Button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite(card);
                }}
                className={cn(
                  "absolute top-4 left-4 z-30 w-8 h-8 rounded-full flex items-center justify-center transition-all backdrop-blur-md border border-white/10",
                  isFavorite(card.id) ? "bg-red-600 text-white" : "bg-black/60 text-white/60 hover:text-white"
                )}
              >
                <Heart className={cn("w-4 h-4", isFavorite(card.id) && "fill-current")} />
              </button>

              <div className="absolute bottom-6 left-6 right-6">
                <span className="text-red-500 font-mono font-black italic text-[9px] uppercase tracking-[0.3em] mb-1 block">
                  {card.category}
                </span>
                <h3 className="text-base sm:text-xl font-black italic uppercase tracking-tighter text-white mb-0.5 sm:mb-1 truncate">
                  {card.name}
                </h3>
                <p className="text-[10px] sm:text-sm font-bold text-white/60">
                  {formatCurrency(card.price)}
                </p>
              </div>
              
              {/* Premium Glow on hover */}
              <div className="absolute inset-0 bg-red-600/0 group-hover:bg-red-600/5 transition-colors duration-500" />
              
              {/* Hover Overlay Funnel */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 z-30 flex flex-col gap-2 items-center justify-center p-8 backdrop-blur-[2px]">
                <Button 
                  onClick={() => navigate(`/checkout/${card.id}`)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-[0.2em] text-[8px] h-10 rounded-xl shadow-2xl shadow-red-600/40 border border-white/10 flex items-center justify-center gap-2 active:scale-95 transition-all whitespace-nowrap"
                >
                  Checkout_Protocol
                  <ArrowRight className="w-3 h-3" />
                </Button>
                <Button 
                  onClick={() => handleAddToCart(card)}
                  className="w-full bg-white hover:bg-zinc-200 text-black font-black italic uppercase tracking-[0.2em] text-[8px] h-10 rounded-xl shadow-2xl border border-white/10 flex items-center justify-center gap-2 active:scale-95 transition-all whitespace-nowrap"
                >
                  Add_To_Cart
                  <ShoppingCart className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
