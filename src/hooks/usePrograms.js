import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/hooks/useAuth';

/**
 * Fetch all reward programs for the current admin's org.
 */
export function usePrograms() {
  const { profile } = useAuth();
  const orgId = profile?.org_id;

  return useQuery({
    queryKey: ['programs', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('reward_programs')
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
 * Create a new reward program.
 */
export function useCreateProgram() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (programData) => {
      const { data, error } = await supabase
        .from('reward_programs')
        .insert({
          ...programData,
          org_id: profile.org_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}

/**
 * Update an existing reward program.
 */
export function useUpdateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('reward_programs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}

/**
 * Toggle a program's active status.
 */
export function useToggleProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }) => {
      const { data, error } = await supabase
        .from('reward_programs')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}
