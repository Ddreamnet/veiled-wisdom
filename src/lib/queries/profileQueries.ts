import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function usePublicProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['public-profile', userId],
    queryFn: async () => {
      if (!userId) return null;

      const [profileResult, roleResult, teacherApprovalResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
        supabase
          .from('teacher_approvals')
          .select('specialization, education, years_of_experience')
          .eq('user_id', userId)
          .eq('status', 'approved')
          .maybeSingle(),
      ]);

      if (!profileResult.data) return null;

      const profile = profileResult.data;
      const role = roleResult.data?.role as string | null;
      const teacherInfo = teacherApprovalResult.data;

      let listings: any[] = [];
      let reviews: any[] = [];
      let averageRating = 0;
      let totalReviews = 0;

      if (role === 'teacher') {
        const { data: listingsData } = await supabase
          .from('listings')
          .select('*, categories(name, slug), listing_prices(price, duration_minutes)')
          .eq('teacher_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        listings = listingsData || [];

        if (listings.length > 0) {
          const { data: reviewsData } = await supabase
            .from('reviews')
            .select('*, profiles!reviews_customer_id_fkey(username, avatar_url), listings(title)')
            .in('listing_id', listings.map(l => l.id))
            .order('created_at', { ascending: false });
          
          reviews = reviewsData || [];
          totalReviews = reviews.length;
          
          if (totalReviews > 0) {
            averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
            averageRating = Math.round(averageRating * 10) / 10;
          }
        }
      } else {
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('*, profiles!reviews_customer_id_fkey(username, avatar_url), listings(title)')
          .eq('customer_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);
        reviews = reviewsData || [];
      }

      return { 
        profile, 
        role, 
        listings, 
        reviews, 
        teacherInfo, 
        averageRating, 
        totalReviews 
      };
    },
    staleTime: 3 * 60 * 1000,
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
