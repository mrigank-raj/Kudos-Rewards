import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/hooks/useAuth';

/**
 * Fetch all catalog items.
 */
export function useCatalog() {
  return useQuery({
    queryKey: ['catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalog_items')
        .select('*')
        .order('points_cost', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Get distinct categories from the catalog.
 */
export function useCatalogCategories() {
  const { data: items } = useCatalog();

  const categories = items
    ? ['All', ...new Set(items.map((item) => item.category).filter(Boolean))]
    : ['All'];

  return categories;
}
