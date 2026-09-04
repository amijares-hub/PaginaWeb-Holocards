import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export const getRealPrice = (p: any): number => {
  const price = parseFloat(p?.base_price ?? p?.price ?? p?.precio ?? 0);
  return isNaN(price) ? 0 : price;
};

export const getOptimizedImageUrl = (url: string, width = 400) => {
  if (!url || !url.includes('supabase.co/storage')) return url;
  return `${url}?width=${width}&format=webp&quality=80`;
};
