import { supabase } from './supabase';
import { preloadImage } from './imageCache';

export const AVATAR_BUCKET = 'avatars';
export const LISTING_IMAGES_BUCKET = 'listing-images';
export const CATEGORY_IMAGES_BUCKET = 'category-images';

export type UploadResult = {
  url: string | null;
  error: Error | null;
};

/**
 * Convert image file to WebP format using Canvas API
 * Returns the WebP blob if it's smaller, otherwise returns original
 */
async function convertToWebP(file: File, quality: number = 0.85): Promise<{ blob: Blob; extension: string }> {
  // Skip if already WebP
  if (file.type === 'image/webp') {
    return { blob: file, extension: 'webp' };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      canvas.toBlob(
        (webpBlob) => {
          if (webpBlob && webpBlob.size < file.size) {
            // WebP is smaller, use it
            resolve({ blob: webpBlob, extension: 'webp' });
          } else {
            // Original is smaller or conversion failed, use original
            resolve({ blob: file, extension: file.name.split('.').pop() || 'jpg' });
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      // If image loading fails, use original
      resolve({ blob: file, extension: file.name.split('.').pop() || 'jpg' });
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Upload avatar image to Supabase Storage
 */
export async function uploadAvatar(file: File, userId: string): Promise<UploadResult> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { url: null, error: new Error('Sadece resim dosyaları yüklenebilir') };
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { url: null, error: new Error('Dosya boyutu maksimum 5MB olabilir') };
    }

    // Convert to WebP for better compression
    const { blob, extension } = await convertToWebP(file, 0.85);
    const fileName = `${userId}-${Date.now()}.${extension}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(fileName, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: extension === 'webp' ? 'image/webp' : file.type,
      });

    if (uploadError) {
      return { url: null, error: uploadError };
    }

    // Get public URL
    const { data } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(fileName);

    // Preload the image for better performance
    try {
      await preloadImage(data.publicUrl);
    } catch (preloadError) {
      console.warn('Failed to preload avatar:', preloadError);
    }

    return { url: data.publicUrl, error: null };
  } catch (error) {
    return { url: null, error: error as Error };
  }
}

/**
 * Upload listing image to Supabase Storage
 */
export async function uploadListingImage(file: File, listingId: string): Promise<UploadResult> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { url: null, error: new Error('Sadece resim dosyaları yüklenebilir') };
    }

    // Validate file size (max 10MB for listing images)
    if (file.size > 10 * 1024 * 1024) {
      return { url: null, error: new Error('Dosya boyutu maksimum 10MB olabilir') };
    }

    // Convert to WebP for better compression
    const { blob, extension } = await convertToWebP(file, 0.85);
    const fileName = `${listingId}-${Date.now()}.${extension}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .upload(fileName, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: extension === 'webp' ? 'image/webp' : file.type,
      });

    if (uploadError) {
      return { url: null, error: uploadError };
    }

    // Get public URL
    const { data } = supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .getPublicUrl(fileName);

    // Preload the image for better performance
    try {
      await preloadImage(data.publicUrl);
    } catch (preloadError) {
      console.warn('Failed to preload listing image:', preloadError);
    }

    return { url: data.publicUrl, error: null };
  } catch (error) {
    return { url: null, error: error as Error };
  }
}

/**
 * Delete file from storage
 */
export async function deleteFile(bucket: string, filePath: string): Promise<{ error: Error | null }> {
  try {
    // Extract filename from URL if full URL is provided
    let fileName = filePath;
    if (filePath.includes('/storage/v1/object/public/')) {
      const parts = filePath.split('/storage/v1/object/public/');
      if (parts[1]) {
        fileName = parts[1].split('/').slice(1).join('/');
      }
    }

    const { error } = await supabase.storage
      .from(bucket)
      .remove([fileName]);

    return { error: error || null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Upload category image to Supabase Storage
 */
export async function uploadCategoryImage(file: File, categoryId: string): Promise<UploadResult> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { url: null, error: new Error('Sadece resim dosyaları yüklenebilir') };
    }

    // Validate file size (max 5MB for category images)
    if (file.size > 5 * 1024 * 1024) {
      return { url: null, error: new Error('Dosya boyutu maksimum 5MB olabilir') };
    }

    // Convert to WebP for better compression
    const { blob, extension } = await convertToWebP(file, 0.85);
    const fileName = `${categoryId}-${Date.now()}.${extension}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(CATEGORY_IMAGES_BUCKET)
      .upload(fileName, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: extension === 'webp' ? 'image/webp' : file.type,
      });

    if (uploadError) {
      return { url: null, error: uploadError };
    }

    // Get public URL
    const { data } = supabase.storage
      .from(CATEGORY_IMAGES_BUCKET)
      .getPublicUrl(fileName);

    // Preload the image for better performance
    try {
      await preloadImage(data.publicUrl);
    } catch (preloadError) {
      console.warn('Failed to preload category image:', preloadError);
    }

    return { url: data.publicUrl, error: null };
  } catch (error) {
    return { url: null, error: error as Error };
  }
}
