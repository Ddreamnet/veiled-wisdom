import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useAppointments(userId: string | undefined, role: string | null) {
  return useQuery({
    queryKey: ['appointments', userId, role],
    queryFn: async () => {
      if (!userId) return { pending: [], completed: [] };

      const column = role === 'teacher' ? 'teacher_id' : 'customer_id';
      const now = new Date().toISOString();

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
    staleTime: 1 * 60 * 1000,
    enabled: !!userId,
  });
}
