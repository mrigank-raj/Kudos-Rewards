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
          tags,
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

  // Everyone else still at the org, HR included (for the dropdown)
  const { data: recipients, isLoading: loadingRecipients } = useQuery({
    queryKey: ['kudos_recipients', profile?.org_id],
    queryFn: async () => {
      if (!profile?.org_id || !profile?.id) return [];

      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, avatar_url, role')
        .eq('org_id', profile.org_id)
        .is('removed_at', null)
        .neq('id', profile.id) // Exclude self
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.org_id && !!profile?.id,
  });

  // Mutation to send kudos
  const sendKudos = useMutation({
    mutationFn: async ({ toUserId, message, points, tags }) => {
      const { data, error } = await supabase.rpc('send_kudos', {
        p_from_user_id: profile.id,
        p_to_user_id: toUserId,
        p_message: message,
        p_points: points || 0,
        p_tags: tags || []
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Refresh the kudos feed and the user's balance
      queryClient.invalidateQueries({ queryKey: ['kudos_feed'] });
      queryClient.invalidateQueries({ queryKey: ['user-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
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
