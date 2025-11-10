import { supabase } from './supabase';

export const AVATAR_BUCKET = 'avatars';
export const LISTING_IMAGES_BUCKET = 'listing-images';
export const CATEGORY_IMAGES_BUCKET = 'category-images';

export type UploadResult = {
  url: string | null;
  error: Error | null;
};

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

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      return { url: null, error: uploadError };
    }

    // Get public URL
    const { data } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(fileName);

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

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${listingId}-${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      return { url: null, error: uploadError };
    }

    // Get public URL
    const { data } = supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .getPublicUrl(fileName);

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

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${categoryId}-${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(CATEGORY_IMAGES_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      return { url: null, error: uploadError };
    }

    // Get public URL
    const { data } = supabase.storage
      .from(CATEGORY_IMAGES_BUCKET)
      .getPublicUrl(fileName);

    return { url: data.publicUrl, error: null };
  } catch (error) {
    return { url: null, error: error as Error };
  }
}
