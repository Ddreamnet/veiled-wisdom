import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useSubCategoryListings(slug: string | undefined, subslug: string | undefined) {
  return useQuery({
    queryKey: ['subcategory-listings', slug, subslug],
    queryFn: async () => {
      if (!slug || !subslug) return null;

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

      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (listingError || !listingData) return null;

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
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  });
}
