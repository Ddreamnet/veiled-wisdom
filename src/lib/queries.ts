import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, Category, Curiosity, Listing, ListingPrice } from '@/lib/supabase';

// Categories queries
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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCategoryWithSubcategories(slug: string | undefined) {
  return useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      if (!slug) return null;

      // Get main category
      const { data: categoryData } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .is('parent_id', null)
        .single();

      if (!categoryData) return null;

      // Get subcategories and listing counts in parallel
      const [subCategoriesResult, listingCountsResult] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .eq('parent_id', categoryData.id)
          .order('display_order', { ascending: true }),
        // Get all listing counts in a single query
        supabase
          .from('listings')
          .select('category_id')
          .eq('is_active', true)
      ]);

      const subCategories = subCategoriesResult.data || [];
      const listings = listingCountsResult.data || [];

      // Calculate counts from the listings array
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

export function useSubCategoryListings(slug: string | undefined, subslug: string | undefined) {
  return useQuery({
    queryKey: ['subcategory-listings', slug, subslug],
    queryFn: async () => {
      if (!slug || !subslug) return null;

      // Get main category and subcategory in parallel
      const { data: mainCat } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .is('parent_id', null)
        .single();

      if (!mainCat) return null;

      const { data: subCat } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', subslug)
        .eq('parent_id', mainCat.id)
        .single();

      if (!subCat) return { mainCategory: mainCat, subCategory: null, listings: [] };

      // Get listings
      const { data: listingsRows } = await supabase
        .from('listings')
        .select('*')
        .eq('category_id', subCat.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!listingsRows || listingsRows.length === 0) {
        return { mainCategory: mainCat, subCategory: subCat, listings: [] };
      }

      const teacherIds = [...new Set(listingsRows.map(l => l.teacher_id).filter(Boolean))] as string[];
      const listingIds = listingsRows.map(l => l.id);

      // Fetch profiles and prices in parallel
      const [profilesResult, pricesResult] = await Promise.all([
        teacherIds.length > 0
          ? supabase.from('profiles').select('id, username, avatar_url').in('id', teacherIds)
          : Promise.resolve({ data: [] }),
        listingIds.length > 0
          ? supabase.from('listing_prices').select('listing_id, price').in('listing_id', listingIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profilesMap: Record<string, { username: string; avatar_url: string | null }> = {};
      (profilesResult.data || []).forEach(p => {
        profilesMap[p.id] = { username: p.username, avatar_url: p.avatar_url };
      });

      const pricesMap: Record<string, number> = {};
      (pricesResult.data || []).forEach(p => {
        if (!pricesMap[p.listing_id] || p.price < pricesMap[p.listing_id]) {
          pricesMap[p.listing_id] = p.price;
        }
      });

      const listings = listingsRows.map(l => ({
        ...l,
        profiles: {
          username: profilesMap[l.teacher_id]?.username ?? 'Öğretmen',
          avatar_url: profilesMap[l.teacher_id]?.avatar_url ?? null,
        },
        minPrice: pricesMap[l.id] ?? undefined,
      }));

      return { mainCategory: mainCat, subCategory: subCat, listings };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!slug && !!subslug,
  });
}

export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: ['listing', id],
    queryFn: async () => {
      if (!id) return null;

      // First fetch the listing
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (listingError || !listingData) return null;

      // Fetch all related data in parallel
      const [
        teacherProfileResult,
        pricesResult,
        categoryResult,
        teacherApprovalResult,
        reviewsResult,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', listingData.teacher_id).maybeSingle(),
        supabase.from('listing_prices').select('*').eq('listing_id', id).order('duration_minutes'),
        supabase.from('categories').select('*').eq('id', listingData.category_id).maybeSingle(),
        supabase
          .from('teacher_approvals')
          .select('specialization, education, years_of_experience')
          .eq('user_id', listingData.teacher_id)
          .eq('status', 'approved')
          .maybeSingle(),
        supabase
          .from('reviews')
          .select('*, customer:profiles!reviews_customer_id_fkey(username, avatar_url)')
          .eq('listing_id', id)
          .order('created_at', { ascending: false }),
      ]);

      // Fetch parent category if exists (this depends on category result)
      let parentCategoryData = null;
      if (categoryResult.data?.parent_id) {
        const { data } = await supabase
          .from('categories')
          .select('*')
          .eq('id', categoryResult.data.parent_id)
          .maybeSingle();
        parentCategoryData = data;
      }

      const teacherProfile = teacherProfileResult.data;
      const teacherApproval = teacherApprovalResult.data;
      const reviewsList = reviewsResult.data || [];
      const averageRating = reviewsList.length > 0
        ? reviewsList.reduce((sum, r) => sum + r.rating, 0) / reviewsList.length
        : 0;

      return {
        ...listingData,
        prices: pricesResult.data || [],
        teacher: {
          username: teacherProfile?.username || 'Unknown',
          avatar_url: teacherProfile?.avatar_url || null,
          bio: teacherProfile?.bio || null,
          specialization: teacherApproval?.specialization,
          education: teacherApproval?.education,
          years_of_experience: teacherApproval?.years_of_experience,
        },
        reviews: reviewsList,
        averageRating: Math.round(averageRating * 10) / 10,
        category: categoryResult.data || undefined,
        parentCategory: parentCategoryData || undefined,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for listings
    enabled: !!id,
  });
}

export function useCuriosities(limit = 3) {
  return useQuery({
    queryKey: ['curiosities', limit],
    queryFn: async () => {
      const { data } = await supabase
        .from('curiosities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useHomeData() {
  return useQuery({
    queryKey: ['home-data'],
    queryFn: async () => {
      const [categoriesResult, curiositiesResult] = await Promise.all([
        supabase.from('categories').select('*').is('parent_id', null).order('display_order', { ascending: true }).limit(4),
        supabase.from('curiosities').select('*').order('created_at', { ascending: false }).limit(3),
      ]);
      return {
        categories: categoriesResult.data || [],
        curiosities: curiositiesResult.data || [],
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
