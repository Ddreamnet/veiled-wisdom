/**
 * Image optimization utilities for Supabase Storage
 * Converts URLs to use Supabase Image Transformation for WebP delivery
 */

type OptimizeOptions = {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'origin';
};

/**
 * Convert a Supabase storage URL to an optimized URL with WebP format
 * Uses Supabase Image Transformation API
 */
export function getOptimizedImageUrl(
  originalUrl: string | null | undefined,
  options: OptimizeOptions = {}
): string {
  if (!originalUrl) return '';
  
  // Only optimize Supabase storage URLs
  if (!originalUrl.includes('supabase.co/storage/v1/object/public/')) {
    return originalUrl;
  }

  const { width, height, quality = 80, format = 'webp' } = options;

  // Convert /object/public/ to /render/image/public/ for transformation
  const transformUrl = originalUrl.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );

  // Build query params
  const params = new URLSearchParams();
  if (width) params.append('width', width.toString());
  if (height) params.append('height', height.toString());
  params.append('quality', quality.toString());
  params.append('format', format);

  return `${transformUrl}?${params.toString()}`;
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
