import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/hooks/useAuth';

/**
 * Fetch the current user's redemption history.
 */
export function useRedemptions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['redemptions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('redemptions')
        .select('*, catalog_items(name, image_url, category)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

/**
 * Redeem a reward via the atomic RPC function.
 * Handles: INSERT redemption, INSERT transaction, UPDATE balance.
 */
export function useRedeemReward() {
  const queryClient = useQueryClient();
  const { user, refreshProfile } = useAuth();

  return useMutation({
    mutationFn: async ({ catalogItemId }) => {
      const { data, error } = await supabase.rpc('redeem_reward', {
        p_user_id: user.id,
        p_catalog_item_id: catalogItemId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate query caches
      queryClient.invalidateQueries({ queryKey: ['redemptions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['user-transactions'] });

      // Refresh auth profile state to update points balance instantly
      refreshProfile();
    },
  });
}
