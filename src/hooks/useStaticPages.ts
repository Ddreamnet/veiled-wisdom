import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface StaticPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  updated_at: string;
}

export function useStaticPages() {
  return useQuery({
    queryKey: ['static-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('static_pages')
        .select('*')
        .order('title');
      
      if (error) throw error;
      return data as StaticPage[];
    },
  });
}

export function useStaticPage(slug: string) {
  return useQuery({
    queryKey: ['static-page', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('static_pages')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as StaticPage | null;
    },
  });
}

export function useUpdateStaticPage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ slug, title, content }: { slug: string; title: string; content: string }) => {
      // First try to update
      const { data: existing } = await supabase
        .from('static_pages')
        .select('id')
        .eq('slug', slug)
        .single();
      
      if (existing) {
        const { error } = await supabase
          .from('static_pages')
          .update({ title, content, updated_at: new Date().toISOString() })
          .eq('slug', slug);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('static_pages')
          .insert({ slug, title, content });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['static-pages'] });
      queryClient.invalidateQueries({ queryKey: ['static-page'] });
    },
  });
}
