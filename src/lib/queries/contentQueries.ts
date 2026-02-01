import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

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
    staleTime: 10 * 60 * 1000,
    enabled: !!slug,
  });
}
