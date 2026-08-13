import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/hooks/useAuth';

export function useKudos() {
  const queryClient = useQueryClient();
  const { profile, refreshProfile } = useAuth();

  // Fetch recent kudos for the organization feed
  const { data: kudosFeed, isLoading: loadingKudos, isError: isKudosError } = useQuery({
    queryKey: ['kudos_feed', profile?.org_id],
    queryFn: async () => {
      if (!profile?.org_id) return [];
      
      const { data, error } = await supabase
        .from('kudos')
        .select(`
          id,
          message,
          points_included,
          created_at,
          from_user:users!from_user_id(id, name, avatar_url),
          to_user:users!to_user_id(id, name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.org_id,
  });

  // Fetch all other active recipients in the org (for the dropdown)
  const { data: recipients, isLoading: loadingRecipients } = useQuery({
    queryKey: ['kudos_recipients', profile?.org_id],
    queryFn: async () => {
      if (!profile?.org_id || !profile?.id) return [];

      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, avatar_url')
        .eq('org_id', profile.org_id)
        .eq('role', 'recipient')
        .neq('id', profile.id) // Exclude self
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.org_id && !!profile?.id,
  });

  // Mutation to send kudos
  const sendKudos = useMutation({
    mutationFn: async ({ toUserId, message, points }) => {
      const { data, error } = await supabase.rpc('send_kudos', {
        p_from_user_id: profile.id,
        p_to_user_id: toUserId,
        p_message: message,
        p_points: points || 0
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Refresh the kudos feed and the user's balance
      queryClient.invalidateQueries(['kudos_feed']);
      queryClient.invalidateQueries(['auth_profile']);
      queryClient.invalidateQueries(['transactions']);
      refreshProfile();
    }
  });

  return {
    kudosFeed,
    loadingKudos,
    isKudosError,
    recipients,
    loadingRecipients,
    sendKudos: sendKudos.mutateAsync,
    isSending: sendKudos.isPending
  };
}
