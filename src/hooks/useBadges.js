import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/hooks/useAuth';

/** Badges the current user has earned (see migration 010 for the award rules). */
export function useMyBadges() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['user-badges', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('user_badges')
        .select('awarded_at, badges(key, name, description, icon)')
        .eq('user_id', profile.id)
        .order('awarded_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });
}
