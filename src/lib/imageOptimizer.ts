/**
 * Image optimization utilities for Supabase Storage
 * Note: Image Transformation temporarily disabled - returning original URLs
 * Enable when Supabase Image Transformation is properly configured
 */

type OptimizeOptions = {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'origin';
};

/**
 * Get optimized image URL
 * Currently returns original URL - transformation can be enabled later
 */
export function getOptimizedImageUrl(
  originalUrl: string | null | undefined,
  _options: OptimizeOptions = {}
): string {
  if (!originalUrl) return '';
  return originalUrl;
}

/**
 * Generate srcSet for responsive images
 */
export function getResponsiveSrcSet(
  originalUrl: string | null | undefined,
  widths: number[] = [400, 800, 1200]
): string {
  if (!originalUrl) return '';
  
  return widths
    .map(w => `${getOptimizedImageUrl(originalUrl, { width: w })} ${w}w`)
    .join(', ');
}

/**
 * Get optimized avatar URL (smaller size, circular crop friendly)
 */
export function getOptimizedAvatarUrl(
  originalUrl: string | null | undefined,
  size: number = 100
): string {
  return getOptimizedImageUrl(originalUrl, { width: size, height: size, quality: 85 });
}

/**
 * Get optimized thumbnail URL (for listing cards)
 */
export function getOptimizedThumbnailUrl(
  originalUrl: string | null | undefined
): string {
  return getOptimizedImageUrl(originalUrl, { width: 400, quality: 75 });
}

/**
 * Get optimized cover image URL (for detail pages)
 */
export function getOptimizedCoverUrl(
  originalUrl: string | null | undefined
): string {
  return getOptimizedImageUrl(originalUrl, { width: 1200, quality: 85 });
}
