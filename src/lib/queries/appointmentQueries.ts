import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// DB field: customer_id / teacher_id — UI label: "Danışan" / "Uzman"

const APPOINTMENT_SELECT_WITH_JOIN = `
  *,
  listing:listings(title, id),
  customer:profiles!appointments_customer_id_fkey(username),
  teacher:profiles!appointments_teacher_id_fkey(username)
`;

const APPOINTMENT_SELECT_NO_JOIN = `
  *,
  listing:listings(title, id)
`;

async function fetchProfileMap(userIds: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return {};
  const { data } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', unique);
  const map: Record<string, string> = {};
  if (data) data.forEach((p: any) => { map[p.id] = p.username; });
  return map;
}

function enrichWithProfiles(rows: any[], profileMap: Record<string, string>) {
  return rows.map((r: any) => ({
    ...r,
    customer: r.customer ?? { username: profileMap[r.customer_id] || '—' },
    teacher: r.teacher ?? { username: profileMap[r.teacher_id] || '—' },
  }));
}

export function useAppointments(userId: string | undefined, role: string | null) {
  return useQuery({
    queryKey: ['appointments', userId, role],
    queryFn: async () => {
      if (!userId) return { pending: [], completed: [], reviewedIds: new Set<string>() };

      const column = role === 'teacher' ? 'teacher_id' : 'customer_id';
      const now = new Date().toISOString();

      // --- Try with FK joins first, fallback to separate profile query ---
      let pending: any[] = [];
      let completed: any[] = [];
      let usedFallback = false;

      try {
        // Pending query
        let pendingQuery = supabase
          .from('appointments')
          .select(APPOINTMENT_SELECT_WITH_JOIN)
          .eq(column, userId)
          .or(`status.eq.pending,end_ts.gte."${now}"`)
          .order('start_ts', { ascending: true });

        if (role === 'teacher') {
          pendingQuery = pendingQuery.neq('status', 'cancelled');
        }

        const [pendingResult, completedResult] = await Promise.all([
          pendingQuery,
          supabase
            .from('appointments')
            .select(APPOINTMENT_SELECT_WITH_JOIN)
            .eq(column, userId)
            .lt('end_ts', now)
            .neq('status', 'cancelled')
            .neq('status', 'pending')
            .order('start_ts', { ascending: false }),
        ]);

        if (pendingResult.error || completedResult.error) {
          throw new Error(
            `Join query failed: ${pendingResult.error?.message || ''} ${completedResult.error?.message || ''}`
          );
        }

        pending = pendingResult.data || [];
        completed = completedResult.data || [];
      } catch (joinError) {
        // FALLBACK: fetch without profile joins, then map profiles client-side
        console.warn('[appointments] FK join failed, using fallback:', joinError);
        usedFallback = true;

        let pendingQuery = supabase
          .from('appointments')
          .select(APPOINTMENT_SELECT_NO_JOIN)
          .eq(column, userId)
          .or(`status.eq.pending,end_ts.gte."${now}"`)
          .order('start_ts', { ascending: true });

        if (role === 'teacher') {
          pendingQuery = pendingQuery.neq('status', 'cancelled');
        }

        const [pendingResult, completedResult] = await Promise.all([
          pendingQuery,
          supabase
            .from('appointments')
            .select(APPOINTMENT_SELECT_NO_JOIN)
            .eq(column, userId)
            .lt('end_ts', now)
            .neq('status', 'cancelled')
            .neq('status', 'pending')
            .order('start_ts', { ascending: false }),
        ]);

        if (pendingResult.error) throw pendingResult.error;
        if (completedResult.error) throw completedResult.error;

        const allRows = [...(pendingResult.data || []), ...(completedResult.data || [])];
        const allUserIds = allRows.flatMap((r: any) => [r.customer_id, r.teacher_id]);
        const profileMap = await fetchProfileMap(allUserIds);

        pending = enrichWithProfiles(pendingResult.data || [], profileMap);
        completed = enrichWithProfiles(completedResult.data || [], profileMap);
      }

      // Reviews check for customer completed tab
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

      if (usedFallback) {
        console.info('[appointments] Fallback succeeded. Pending:', pending.length, 'Completed:', completed.length);
      }

      return { pending, completed, reviewedIds };
    },
    staleTime: 1 * 60 * 1000,
    enabled: !!userId,
  });
}
