import React, { createContext, useContext, useState, useEffect } from 'react';
import { Card } from '../types';
import { fetchStorageImages } from '../services/imageSync';

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
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Card[]>([]);
  const [storageImages, setStorageImages] = useState<string[]>([]);

  // Load from localStorage and fetch remote images
  useEffect(() => {
    const savedCart = localStorage.getItem('sasori_cart');
    const savedFavorites = localStorage.getItem('sasori_favorites');
    if (savedCart) setCart(JSON.parse(savedCart));
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));

    // Fetch images from Supabase Storage
    fetchStorageImages().then(images => {
      if (images && images.length > 0) {
        setStorageImages(images);
        
        // Normalize existing cart/favorites if they use old unsplash links
        setCart(prev => prev.map((item, i) => ({
          ...item,
          image_url: item.image_url.includes('unsplash.com') ? images[i % images.length] : item.image_url
        })));
        setFavorites(prev => prev.map((item, i) => ({
          ...item,
          image_url: item.image_url.includes('unsplash.com') ? images[i % images.length] : item.image_url
        })));
      }
    });
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('sasori_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('sasori_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const addToCart = (card: Card) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === card.id);
      if (existing) {
        return prev.map(item => 
          item.id === card.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...card, quantity: 1 }];
    });
  };

  const removeFromCart = (cardId: string) => {
    setCart(prev => prev.filter(item => item.id !== cardId));
  };

  const updateQuantity = (cardId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cardId);
      return;
    }
    setCart(prev => prev.map(item => 
      item.id === cardId ? { ...item, quantity } : item
    ));
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

  const clearCart = () => setCart([]);

  return (
    <StoreContext.Provider value={{ 
      cart, 
      favorites, 
      storageImages,
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      toggleFavorite, 
      isFavorite,
      clearCart
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
