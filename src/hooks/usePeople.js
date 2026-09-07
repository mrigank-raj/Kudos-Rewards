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

/**
 * Fetch admin-added people who haven't signed up yet (see
 * supabase/migrations/007_team_and_pending_members.sql). They're promoted
 * to a real `users` row automatically the first time they sign up with a
 * matching email.
 */
export function usePendingMembers() {
  const { profile } = useAuth();
  const orgId = profile?.org_id;

  return useQuery({
    queryKey: ['pending-members', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('pending_members')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

/**
 * Admin pre-configures a teammate's name/email/team/role before they have
 * an account. No email is sent — the person still signs up themselves at
 * /signup with the same email.
 */
export function useAddPendingMember() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ name, email, role, team }) => {
      const { data, error } = await supabase
        .from('pending_members')
        .insert({
          org_id: profile.org_id,
          name,
          email,
          role,
          team: team || null,
          invited_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-members'] });
    },
  });
}
