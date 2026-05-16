export interface Card {
  id: string;
  name: string;
  rarity: string;
  price: number;
  stock: number;
  set: string;
  image_url: string;
  images?: string[];
  threshold?: number;
  isFeatured?: boolean;
  supplier_id?: string;
  game_type?: 'pokemon' | 'mtg';
}
