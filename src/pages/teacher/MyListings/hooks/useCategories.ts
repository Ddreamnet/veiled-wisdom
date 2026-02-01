import { useState, useCallback } from "react";
import { supabase, Category } from "@/lib/supabase";

export function useListingCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Category[]>([]);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .is('parent_id', null)
      .order('name');

    if (data) setCategories(data);
  }, []);

  const fetchSubcategories = useCallback(async (parentId: string) => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('parent_id', parentId)
      .order('name');

    if (data) setSubcategories(data);
  }, []);

  const clearSubcategories = useCallback(() => {
    setSubcategories([]);
  }, []);

  return {
    categories,
    subcategories,
    fetchCategories,
    fetchSubcategories,
    clearSubcategories,
  };
}
