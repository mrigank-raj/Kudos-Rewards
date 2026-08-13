import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/hooks/useAuth';

/**
 * Fetch all users (recipients) in the current admin's organization.
 */
export function usePeople() {
  const { profile } = useAuth();
  const orgId = profile?.org_id;

  return useQuery({
    queryKey: ['people', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('org_id', orgId)
        .eq('role', 'recipient')
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

/**
 * Fetch a single user's transaction history.
 */
export function useUserTransactions(userId) {
  return useQuery({
    queryKey: ['transactions', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select('*, reward_programs(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

/**
 * Credit points to a user via the atomic RPC function.
 */
export function useCreditPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, points, reason, programId }) => {
      const { data, error } = await supabase.rpc('credit_points', {
        p_user_id: userId,
        p_points: points,
        p_reason: reason,
        p_program_id: programId || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

/**
 * Debit points from a user via the atomic RPC function.
 */
export function useDebitPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, points, reason }) => {
      const { data, error } = await supabase.rpc('debit_points', {
        p_user_id: userId,
        p_points: points,
        p_reason: reason,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}
