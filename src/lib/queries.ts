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

export function useCuriosity(slug: string | undefined) {
  return useQuery({
    queryKey: ['curiosity', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data } = await supabase
        .from('curiosities')
        .select('*')
        .eq('slug', slug)
        .single();
      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - content doesn't change often
    enabled: !!slug,
  });
}

export function usePublicProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['public-profile', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Fetch profile, role, and listings in parallel
      const [profileResult, roleResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
      ]);

      if (!profileResult.data) return null;

      const profile = profileResult.data;
      const role = roleResult.data?.role as string | null;

      let listings: any[] = [];
      let reviews: any[] = [];

      if (role === 'teacher') {
        // Fetch listings and reviews in parallel for teachers
        const [listingsResult, reviewsResult] = await Promise.all([
          supabase
            .from('listings')
            .select('*, categories(name, slug), listing_prices(price)')
            .eq('teacher_id', userId)
            .eq('is_active', true)
            .order('created_at', { ascending: false }),
          // We'll fetch reviews after getting listings
          Promise.resolve({ data: [] }),
        ]);

        listings = listingsResult.data || [];

        // Fetch reviews for teacher's listings
        if (listings.length > 0) {
          const { data: reviewsData } = await supabase
            .from('reviews')
            .select('*, profiles!reviews_customer_id_fkey(username, avatar_url), listings(title)')
            .in('listing_id', listings.map(l => l.id))
            .order('created_at', { ascending: false })
            .limit(10);
          reviews = reviewsData || [];
        }
      } else {
        // Fetch reviews given by customer
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('*, profiles!reviews_customer_id_fkey(username, avatar_url), listings(title)')
          .eq('customer_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);
        reviews = reviewsData || [];
      }

      return { profile, role, listings, reviews };
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    enabled: !!userId,
  });
}

export function useAppointments(userId: string | undefined, role: string | null) {
  return useQuery({
    queryKey: ['appointments', userId, role],
    queryFn: async () => {
      if (!userId) return { pending: [], completed: [] };

      const column = role === 'teacher' ? 'teacher_id' : 'customer_id';
      const now = new Date().toISOString();

      // Fetch pending and completed appointments in parallel
      const [pendingResult, completedResult] = await Promise.all([
        supabase
          .from('appointments')
          .select(`
            *,
            listing:listings(title, id),
            customer:profiles!appointments_customer_id_fkey(username),
            teacher:profiles!appointments_teacher_id_fkey(username)
          `)
          .eq(column, userId)
          .gte('start_ts', now)
          .order('start_ts', { ascending: true }),
        supabase
          .from('appointments')
          .select(`
            *,
            listing:listings(title, id),
            customer:profiles!appointments_customer_id_fkey(username),
            teacher:profiles!appointments_teacher_id_fkey(username)
          `)
          .eq(column, userId)
          .lt('start_ts', now)
          .order('start_ts', { ascending: false }),
      ]);

      const pending = pendingResult.data || [];
      const completed = completedResult.data || [];

      // Check reviewed appointments for customers
      let reviewedIds = new Set<string>();
      if (role === 'customer' && completed.length > 0) {
        const listingIds = completed.map((a: any) => a.listing?.id).filter(Boolean);
        if (listingIds.length > 0) {
          const { data: reviews } = await supabase
            .from('reviews')
            .select('listing_id')
            .in('listing_id', listingIds)
            .eq('customer_id', userId);
          
          if (reviews) {
            const reviewedListingIds = new Set(reviews.map(r => r.listing_id));
            completed.forEach((a: any) => {
              if (a.listing?.id && reviewedListingIds.has(a.listing.id)) {
                reviewedIds.add(a.id);
              }
            });
          }
        }
      }

      return { pending, completed, reviewedIds };
    },
    staleTime: 1 * 60 * 1000, // 1 minute - appointments change frequently
    enabled: !!userId,
  });
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!userId,
  });
}
