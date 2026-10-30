import { useEffect } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/config/supabase'
import { useAuth } from '@/hooks/useAuth'

/**
 * One-to-one messaging (migration 013). Participants-only RLS means every
 * query here can only ever see the caller's own conversations.
 */

const MESSAGE_PAGE = 30

export function useConversations() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['messages', 'conversations', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('community_list_conversations')
      if (error) throw error
      return data
    },
    enabled: !!profile?.id,
  })
}

export function useUnreadMessageCount() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['messages', 'unread', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('community_unread_message_count')
      if (error) throw error
      return Number(data) || 0
    },
    enabled: !!profile?.id,
    staleTime: 1000 * 60,
  })
}

/** Newest page first; `fetchNextPage` loads older messages. */
export function useConversationMessages(conversationId) {
  return useInfiniteQuery({
    queryKey: ['messages', 'thread', conversationId],
    initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from('community_messages')
        .select('id, conversation_id, sender_id, body, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(MESSAGE_PAGE)
      if (pageParam) query = query.lt('created_at', pageParam)
      const { data, error } = await query
      if (error) throw error
      return data
    },
    getNextPageParam: (lastPage) => (lastPage.length === MESSAGE_PAGE ? lastPage[lastPage.length - 1].created_at : undefined),
    enabled: !!conversationId,
    staleTime: 1000 * 10,
  })
}

export function useSendMessage(conversationId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body) => {
      const { data, error } = await supabase
        .from('community_messages')
        .insert({ conversation_id: conversationId, body })
        .select('id, conversation_id, sender_id, body, created_at')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (message) => {
      // Put it in the newest page right away; realtime/refetch reconcile.
      queryClient.setQueryData(['messages', 'thread', conversationId], (data) => {
        if (!data) return data
        const [first, ...rest] = data.pages
        if (first.some((m) => m.id === message.id)) return data
        return { ...data, pages: [[message, ...first], ...rest] }
      })
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] })
    },
  })
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (conversationId) => {
      const { error } = await supabase.rpc('community_mark_conversation_read', { p_conversation_id: conversationId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread'] })
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

/**
 * Single app-wide Realtime subscription for new messages. Realtime applies
 * community_messages' RLS, so only rows from my conversations arrive.
 * Mounted once in AppShell (see the channel note on NotificationsBell).
 */
export function useMessagesRealtime() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const userId = profile?.id

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`community-messages:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages' }, (payload) => {
        const conversationId = payload.new?.conversation_id
        if (conversationId) queryClient.invalidateQueries({ queryKey: ['messages', 'thread', conversationId] })
        queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] })
        queryClient.invalidateQueries({ queryKey: ['messages', 'unread'] })
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])
}
