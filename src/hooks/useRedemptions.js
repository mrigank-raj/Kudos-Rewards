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
 * Admin: fetch every redemption across the org, newest first, with the
 * requester and catalog item attached — the fulfillment queue's data
 * source.
 */
export function useAllRedemptions() {
  const { profile } = useAuth();
  const orgId = profile?.org_id;

  return useQuery({
    queryKey: ['admin-redemptions', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('redemptions')
        .select('*, catalog_items(name, image_url, category), users!inner(name, email, avatar_url, org_id)')
        .eq('users.org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

/**
 * Admin: move a redemption to fulfilled/cancelled/pending via the atomic
 * RPC function (enforces org ownership + admin role server-side too).
 */
export function useUpdateRedemptionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ redemptionId, status }) => {
      const { data, error } = await supabase.rpc('update_redemption_status', {
        p_redemption_id: redemptionId,
        p_status: status,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-redemptions'] });
    },
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
