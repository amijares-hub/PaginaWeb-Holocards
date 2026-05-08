import { useStore } from '../lib/StoreContext';

/**
 * Hook to get a product image, prioritizing synced storage images.
 */
export function useProductImage() {
  const { storageImages } = useStore();

  const getImageUrl = (index: number, fallback: string) => {
    if (storageImages && storageImages.length > 0) {
      // Use index hash or similar to consistently pick an image if not explicitly assigned
      return storageImages[index % storageImages.length];
    }
    return fallback;
  };

  return { getImageUrl, hasStorageImages: storageImages.length > 0 };
}
