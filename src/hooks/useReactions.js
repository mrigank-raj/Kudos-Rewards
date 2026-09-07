import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/hooks/useAuth';

export const REACTION_EMOJIS = ['👏', '🎉', '❤️', '🔥'];

/**
 * Fetch reactions for a batch of kudos posts (e.g. everything currently
 * rendered in a feed) in one query.
 */
export function useReactions(kudosIds) {
  return useQuery({
    queryKey: ['kudos-reactions', kudosIds],
    queryFn: async () => {
      if (!kudosIds?.length) return [];
      const { data, error } = await supabase
        .from('kudos_reactions')
        .select('*')
        .in('kudos_id', kudosIds);

      if (error) throw error;
      return data;
    },
    enabled: !!kudosIds?.length,
  });
}

/** Add or remove the current user's reaction on a kudos post. */
export function useToggleReaction() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ kudosId, emoji, alreadyReacted }) => {
      if (alreadyReacted) {
        const { error } = await supabase
          .from('kudos_reactions')
          .delete()
          .eq('kudos_id', kudosId)
          .eq('user_id', profile.id)
          .eq('emoji', emoji);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('kudos_reactions')
          .insert({ kudos_id: kudosId, user_id: profile.id, emoji });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kudos-reactions'] });
    },
  });
}
