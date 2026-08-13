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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ catalogItemId, pointsCost }) => {
      const { data, error } = await supabase.rpc('redeem_reward', {
        p_user_id: user.id,
        p_catalog_item_id: catalogItemId,
        p_points: pointsCost,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate everything that depends on the user's balance
      queryClient.invalidateQueries({ queryKey: ['redemptions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['user-transactions'] });

      // Force re-fetch the auth profile to get the updated balance
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });
}
