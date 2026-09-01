import React, { createContext, useContext, useState, useEffect } from 'react';
import { Card } from '../types';
import { fetchStorageImages } from '../services/imageSync';
import { supabase } from './supabase';
import { useCartStore } from './cartStore';

interface CartItem extends Card {
  quantity: number;
}

interface StoreContextType {
  cart: CartItem[];
  favorites: Card[];
  storageImages: string[];
  addToCart: (card: Card) => void;
  removeFromCart: (cardId: string) => void;
  updateQuantity: (cardId: string, quantity: number) => void;
  toggleFavorite: (card: Card) => void;
  isFavorite: (cardId: string) => boolean;
  clearCart: () => void;
  systemSettings: Record<string, any>;
  calculatePrice: (costPrice: number) => number;
  getLootProbability: (rarity: string) => number;
  freeShippingThreshold: number;
  announcement: { active: boolean; message: string; color: string };
  heroContent: { title: string; subtitle: string; disclaimer: string };
  activeSuppliers: string[];
  homepageDesign: Record<string, any>;
  marketing: Record<string, any>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    items: cartStoreItems, 
    addItem: zustandAddItem, 
    removeItem: zustandRemoveItem, 
    updateQuantity: zustandUpdateQuantity, 
    clearCart: zustandClearCart 
  } = useCartStore();

  const [favorites, setFavorites] = useState<Card[]>([]);
  const [storageImages, setStorageImages] = useState<string[]>([]);
  const [systemSettings, setSystemSettings] = useState<Record<string, any>>({});
  const [homepageDesign, setHomepageDesign] = useState<Record<string, any>>({});

  useEffect(() => {
    const savedFavorites = localStorage.getItem('holocards_favorites');
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));

    fetchStorageImages().then(images => {
      if (images && images.length > 0) {
        setStorageImages(images);
      }
    });

    const fetchSettings = async () => {
      const { data, error } = await supabase.from('system_settings').select('*');
      if (!error && data) {
        const settingsMap = data.reduce((acc: any, item: any) => {
          acc[item.id] = item.value?.value;
          return acc;
        }, {});
        setSystemSettings(settingsMap);
      }
    };
    fetchSettings();

    const fetchDesign = async () => {
      const { data, error } = await supabase.from('homepage_clon_design').select('*');
      if (!error && data) {
        const designMap = data.reduce((acc: any, item: any) => {
          acc[item.component_id] = item.ui_data;
          return acc;
        }, {});
        setHomepageDesign(designMap);
      }
    };
    fetchDesign();

    const settingsSub = supabase
      .channel('system_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, fetchSettings)
      .subscribe();

    const designSub = supabase
      .channel('homepage_design_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homepage_clon_design' }, fetchDesign)
      .subscribe();

    return () => {
      settingsSub.unsubscribe();
      designSub.unsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('holocards_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const addToCart = (card: Card) => {
    zustandAddItem({
      id: card.id,
      name: card.name,
      price: Number(card.price) || 0,
      image_url: card.image_url,
      rarity: card.rarity || 'Rare',
      set: card.set || 'General',
      stock: card.stock || 10
    }, 1);
  };

  const removeFromCart = (cardId: string) => {
    zustandRemoveItem(cardId);
  };

  const updateQuantity = (cardId: string, quantity: number) => {
    zustandUpdateQuantity(cardId, quantity);
  };

  const toggleFavorite = (card: Card) => {
    setFavorites(prev => {
      const isFav = prev.some(item => item.id === card.id);
      if (isFav) {
        return prev.filter(item => item.id !== card.id);
      }
      return [...prev, card];
    });
  };

  const isFavorite = (cardId: string) => {
    return favorites.some(item => item.id === cardId);
  };

  const clearCart = () => zustandClearCart();

  const calculatePrice = (costPrice: number) => {
    const margin = systemSettings['financial_margin'] || 1.15;
    return (Number(costPrice) || 0) * margin;
  };

  const getLootProbability = (rarity: string) => {
    const tables = systemSettings['economy_loot_tables'] || {
      'Common': 70,
      'Uncommon': 40,
      'Rare': 20,
      'Ultra Rare': 10,
      'Secret Rare': 5
    };
    return tables[rarity] || 50;
  };

  const freeShippingThreshold = systemSettings['logistics_shipping']?.free_shipping_threshold || 50;
  const announcement = systemSettings['content_announcement'] || {
    active: true,
    message: "¡BIENVENIDO A HOLOCARDS! ENVÍOS GRATIS EN PEDIDOS SUPERIORES A 50€",
    color: "bg-red-600",
    scroll_speed: 5000
  };

  const heroContent = systemSettings['content_hero'] || {
    title: "EL SANTUARIO POKÉMON EN CANARIAS.",
    subtitle: "DESCUBRE EL COLECCIONISMO DE ÉLITE.",
    disclaimer: "*AUTENTICIDAD GARANTIZADA // ENVÍOS 24/48H"
  };

  const marketing = homepageDesign['ui_marketing'] || {
    countdown: { isActive: false, endDate: '', message: '', color: '#EF4444' },
    gamification: { popupEnabled: false, captureChance: 0.05, currentEntity: 'Charizard', popupMessage: '' }
  };

  const [activeSuppliers, setActiveSuppliers] = useState<string[]>([]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      const { data, error } = await supabase.from('suppliers').select('id').eq('active', true);
      if (!error && data) {
        setActiveSuppliers(data.map(s => s.id));
      }
    };
    fetchSuppliers();
  }, []);

  const cartItemsFormatted: CartItem[] = cartStoreItems.map(i => ({
    id: i.id,
    name: i.name,
    price: i.price,
    image_url: i.image_url,
    rarity: i.rarity,
    set: i.set,
    stock: i.stock,
    quantity: i.quantity,
    isFeatured: true
  }));

  return (
    <StoreContext.Provider value={{ 
      cart: cartItemsFormatted, 
      favorites, 
      storageImages,
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      toggleFavorite, 
      isFavorite,
      clearCart,
      systemSettings,
      calculatePrice,
      getLootProbability,
      freeShippingThreshold,
      announcement,
      heroContent,
      activeSuppliers,
      homepageDesign,
      marketing
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within a StoreProvider');
  return context;
};