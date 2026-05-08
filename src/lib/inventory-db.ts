import { Card } from '../types';

export const INITIAL_CARDS: Card[] = [
  { id: '1', name: 'Charizard VMAX', rarity: 'Secret Rare', price: 450, stock: 2, set: 'Phantasmal Flames', image_url: '/Imagenes/me03-slider-logo-es.png', images: ['/Imagenes/me04-booster-bundle-169-es.png'], threshold: 5, isFeatured: true },
  { id: '2', name: 'Pikachu V', rarity: 'Ultra Rare', price: 120, stock: 8, set: 'Ninja Spinner', image_url: '/Imagenes/me04-booster-display-box-es.png', images: [], threshold: 5, isFeatured: true },
  { id: '3', name: 'Mewtwo GX', rarity: 'Full Art', price: 85, stock: 15, set: 'Munikis Zero', image_url: '/Imagenes/me04-build-battle-box-es.png', images: [], threshold: 10 },
  { id: '4', name: 'Rayquaza VMAX', rarity: 'Alt Art', price: 600, stock: 1, set: 'Evolving Skies', image_url: '/Imagenes/me04-elite-trainer-box-169-es.png', images: [], threshold: 2, isFeatured: true },
  { id: '5', name: 'Umbreon VMAX', rarity: 'Alt Art', price: 900, stock: 1, set: 'Eevee Heroes', image_url: '/Imagenes/me04-slider-logo-es.png', images: [], threshold: 3, isFeatured: true },
];

export const getInventory = (): Card[] => {
  const saved = localStorage.getItem('sasori_inventory');
  if (saved) return JSON.parse(saved);
  localStorage.setItem('sasori_inventory', JSON.stringify(INITIAL_CARDS));
  return INITIAL_CARDS;
};

export const saveInventory = (cards: Card[]) => {
  localStorage.setItem('sasori_inventory', JSON.stringify(cards));
};
