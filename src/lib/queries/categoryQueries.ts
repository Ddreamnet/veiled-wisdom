import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .is('parent_id', null)
        .order('display_order', { ascending: true });
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCategoryWithSubcategories(slug: string | undefined) {
  return useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      if (!slug) return null;

      const { data: categoryData } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .is('parent_id', null)
        .single();

      if (!categoryData) return null;

      const [subCategoriesResult, listingCountsResult] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .eq('parent_id', categoryData.id)
          .order('display_order', { ascending: true }),
        supabase
          .from('listings')
          .select('category_id')
          .eq('is_active', true)
      ]);

      const subCategories = subCategoriesResult.data || [];
      const listings = listingCountsResult.data || [];

      const listingCounts: Record<string, number> = {};
      const subCategoryIds = new Set(subCategories.map(sc => sc.id));
      
      listings.forEach(listing => {
        if (subCategoryIds.has(listing.category_id)) {
          listingCounts[listing.category_id] = (listingCounts[listing.category_id] || 0) + 1;
        }
      });

      return {
        category: categoryData,
        subCategories,
        listingCounts,
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  });
}
