// Image caching utilities for better performance

const imageCache = new Map<string, string>();
const MAX_CACHE_SIZE = 50;

/**
 * Preload an image and cache it
 */
export const preloadImage = (src: string): Promise<void> => {
  if (imageCache.has(src)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Implement simple LRU-like cache eviction
      if (imageCache.size >= MAX_CACHE_SIZE) {
        const firstKey = imageCache.keys().next().value;
        imageCache.delete(firstKey);
      }
      imageCache.set(src, src);
      resolve();
    };
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Batch preload multiple images
 */
export const preloadImages = async (urls: string[]): Promise<void> => {
  const uniqueUrls = [...new Set(urls)].filter(url => !imageCache.has(url));
  await Promise.allSettled(uniqueUrls.map(preloadImage));
};

/**
 * Check if image is cached
 */
export const isImageCached = (src: string): boolean => {
  return imageCache.has(src);
};

/**
 * Clear image cache
 */
export const clearImageCache = (): void => {
  imageCache.clear();
};
