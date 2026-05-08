import { supabase } from '../lib/supabase';

export const BUCKET_NAME = 'products';

export async function fetchStorageImages() {
  try {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).list('', {
      limit: 100,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      console.error('Error fetching images from Supabase Storage:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn('No images found in Supabase Storage bucket:', BUCKET_NAME);
      return [];
    }

    const imageUrls = data
      .filter(file => file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))
      .map(file => {
        const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(file.name);
        return publicUrlData.publicUrl;
      });

    console.log(`Successfully synced ${imageUrls.length} images from Supabase Storage [${BUCKET_NAME}]`);
    return imageUrls;
  } catch (err) {
    console.error('Unexpected error in image sync:', err);
    return [];
  }
}

/**
 * Gets a reliable image URL, falling back to a placeholder if needed.
 */
export function getProductImage(index: number, storageImages: string[], fallback: string) {
  if (storageImages.length > 0) {
    return storageImages[index % storageImages.length];
  }
  return fallback;
}
