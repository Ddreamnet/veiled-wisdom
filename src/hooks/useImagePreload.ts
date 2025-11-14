import { useEffect } from 'react';
import { preloadImages } from '@/lib/imageCache';

/**
 * Hook to preload images for better performance
 * @param imageUrls Array of image URLs to preload
 * @param enabled Whether to enable preloading (default: true)
 */
export const useImagePreload = (imageUrls: string[], enabled = true) => {
  useEffect(() => {
    if (!enabled || imageUrls.length === 0) return;

    const validUrls = imageUrls.filter(url => url && typeof url === 'string');
    
    if (validUrls.length > 0) {
      preloadImages(validUrls).catch(err => {
        console.warn('Failed to preload some images:', err);
      });
    }
  }, [imageUrls, enabled]);
};
