import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useHomeData() {
  return useQuery({
    queryKey: ['home-data'],
    queryFn: async () => {
      const [categoriesResult, curiositiesResult] = await Promise.all([
        supabase.from('categories').select('*').is('parent_id', null).order('display_order', { ascending: true }),
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
