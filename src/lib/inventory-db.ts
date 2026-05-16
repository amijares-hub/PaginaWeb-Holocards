import { Card } from '../types';

export const INITIAL_CARDS: Card[] = [
  { id: '1', name: 'Charizard VMAX', rarity: 'Secret Rare', price: 450, stock: 2, set: 'Phantasmal Flames', image_url: '/Imagenes/me03-slider-logo-es.png', images: ['/Imagenes/me04-booster-bundle-169-es.png'], threshold: 5, isFeatured: true, game_type: 'pokemon' },
  { id: '2', name: 'Pikachu V', rarity: 'Ultra Rare', price: 120, stock: 8, set: 'Ninja Spinner', image_url: '/Imagenes/me04-booster-display-box-es.png', images: [], threshold: 5, isFeatured: true, game_type: 'pokemon' },
  { id: '3', name: 'Mewtwo GX', rarity: 'Full Art', price: 85, stock: 15, set: 'Munikis Zero', image_url: '/Imagenes/me04-build-battle-box-es.png', images: [], threshold: 10, game_type: 'pokemon' },
  { id: '4', name: 'Rayquaza VMAX', rarity: 'Alt Art', price: 600, stock: 1, set: 'Evolving Skies', image_url: '/Imagenes/me04-elite-trainer-box-169-es.png', images: [], threshold: 2, isFeatured: true, supplier_id: 'vault_imp', game_type: 'pokemon' },
  { id: '5', name: 'Umbreon VMAX', rarity: 'Alt Art', price: 900, stock: 1, set: 'Eevee Heroes', image_url: '/Imagenes/me04-slider-logo-es.png', images: [], threshold: 3, isFeatured: true, game_type: 'pokemon' },
  { id: '6', name: 'Black Lotus', rarity: 'Mythic', price: 3500, stock: 1, set: 'Alpha', image_url: '/Imagenes/Magic%20The%20Gathering/magic-realidad-fracturada-mazo-de-commander-multiverso-reforjado-castellano.webp', images: [], threshold: 1, isFeatured: true, game_type: 'mtg' },
  { id: '7', name: 'Jace, the Mind Sculptor', rarity: 'Mythic', price: 280, stock: 3, set: 'Worldwake', image_url: '/Imagenes/Magic%20The%20Gathering/magic-the-gathering-vraska-the-unseen-0oq6rgvt7kjlbji4.webp', images: [], threshold: 5, isFeatured: true, game_type: 'mtg' },
  { id: '8', name: 'Liliana of the Veil', rarity: 'Mythic', price: 190, stock: 5, set: 'Innistrad', image_url: '/Imagenes/Magic%20The%20Gathering/71llfWQ1bpL.webp', images: [], threshold: 5, game_type: 'mtg' },
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
