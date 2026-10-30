import { useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/hooks/useAuth';

/**
 * The current user's notifications, kept live via Supabase Realtime — the
 * same primitive the app already uses for balance sync, so a new kudos or
 * point credit shows up without a page refresh or polling.
 */
export function useNotifications() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const userId = profile?.id;

  const query = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        // '*' rather than INSERT: message notifications are re-surfaced by an
        // upsert (UPDATE) when a conversation gets a new message.
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return query;
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (notificationIds) => {
      const query = supabase.from('notifications').update({ read: true }).eq('user_id', profile.id);
      const { error } = notificationIds?.length ? await query.in('id', notificationIds) : await query.eq('read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

const NOTIFICATION_PAGE = 20;

/** Full, paginated notification history for the Notifications page. */
export function useNotificationFeed({ unreadOnly = false } = {}) {
  const { profile } = useAuth();
  const userId = profile?.id;

  return useInfiniteQuery({
    queryKey: ['notifications', userId, 'feed', unreadOnly],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = pageParam * NOTIFICATION_PAGE;
      let query = supabase
        .from('notifications')
        .select('id, type, title, body, link, read, created_at, actor:users!actor_id(id, name, avatar_url)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, from + NOTIFICATION_PAGE - 1);
      if (unreadOnly) query = query.eq('read', false);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    getNextPageParam: (lastPage, allPages) => (lastPage.length === NOTIFICATION_PAGE ? allPages.length : undefined),
    enabled: !!userId,
  });
}

/** Exact unread count (the bell list is capped at 20 rows). */
export function useUnreadNotificationCount() {
  const { profile } = useAuth();
  const userId = profile?.id;

  return useQuery({
    queryKey: ['notifications', userId, 'unread-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
  });
}
