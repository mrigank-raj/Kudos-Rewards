import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/config/supabase'
import { useAuth } from '@/hooks/useAuth'
import { COMMUNITY_BADGE_KEYS } from '@/lib/community'

/**
 * HR-only community management. Every call here is re-checked in the
 * database (community_require_admin() / admin RLS policies in migration
 * 015) — the admin route guard is a convenience, not the security boundary.
 */

export function useCommunityOverview(days) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['community-admin', 'overview', profile?.org_id, days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('community_hr_overview', { p_days: days })
      if (error) throw error
      return data
    },
    enabled: profile?.role === 'admin',
  })
}

export function useTopContributors(days, limit = 20) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['community-admin', 'contributors', profile?.org_id, days, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('community_top_contributors', { p_days: days, p_limit: limit })
      if (error) throw error
      return data
    },
    enabled: profile?.role === 'admin',
  })
}

export function useReports(status) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['community-admin', 'reports', profile?.org_id, status],
    queryFn: async () => {
      let query = supabase
        .from('community_reports')
        .select(`
          id, target_type, post_id, comment_id, reason, details, status, resolution_note, created_at, resolved_at,
          reporter:users!reporter_id(id, name, avatar_url),
          target_author:users!target_author_id(id, name, avatar_url),
          resolver:users!resolved_by(id, name),
          post:community_posts(id, title, type, is_hidden),
          comment:community_comments(id, post_id, body, is_hidden, is_deleted)
        `)
        .order('created_at', { ascending: false })
        .limit(100)
      query = status === 'open' ? query.eq('status', 'open') : query.neq('status', 'open')
      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: profile?.role === 'admin',
  })
}

export function useHiddenContent() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['community-admin', 'hidden', profile?.org_id],
    queryFn: async () => {
      const [posts, comments] = await Promise.all([
        supabase
          .from('community_posts')
          .select('id, title, hidden_reason, hidden_at, author:users!author_id(id, name)')
          .eq('is_hidden', true)
          .order('hidden_at', { ascending: false })
          .limit(50),
        supabase
          .from('community_comments')
          .select('id, post_id, body, hidden_reason, hidden_at, author:users!author_id(id, name)')
          .eq('is_hidden', true)
          .order('hidden_at', { ascending: false })
          .limit(50),
      ])
      if (posts.error) throw posts.error
      if (comments.error) throw comments.error
      return [
        ...posts.data.map((p) => ({ ...p, targetType: 'post' })),
        ...comments.data.map((c) => ({ ...c, targetType: 'comment' })),
      ].sort((a, b) => new Date(b.hidden_at) - new Date(a.hidden_at))
    },
    enabled: profile?.role === 'admin',
  })
}

export function useModerationLog() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['community-admin', 'log', profile?.org_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_moderation_actions')
        .select('id, action, target_type, target_id, target_label, reason, created_at, moderator:users!moderator_id(id, name), target_author:users!target_author_id(id, name)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data
    },
    enabled: profile?.role === 'admin',
  })
}

function invalidateModeration(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['community-admin'] })
  queryClient.invalidateQueries({ queryKey: ['community'] })
}

/** Hide / unhide / delete a post or comment (always audited server-side). */
export function useModerate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ targetType, targetId, action, reason }) => {
      const { error } = await supabase.rpc('community_moderate', {
        p_target_type: targetType,
        p_target_id: targetId,
        p_action: action,
        p_reason: reason || null,
      })
      if (error) throw error
    },
    onSuccess: () => invalidateModeration(queryClient),
  })
}

export function useResolveReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ reportId, status, note }) => {
      const { error } = await supabase.rpc('community_resolve_report', {
        p_report_id: reportId,
        p_status: status,
        p_note: note || null,
      })
      if (error) throw error
    },
    onSuccess: () => invalidateModeration(queryClient),
  })
}

export function useCommunityBadges() {
  return useQuery({
    queryKey: ['community', 'badge-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badges')
        .select('id, key, name, description, icon')
        .in('key', COMMUNITY_BADGE_KEYS)
        .order('name')
      if (error) throw error
      return data
    },
    staleTime: 1000 * 60 * 60,
  })
}

export function useAwardBadge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, badgeKey, reason }) => {
      const { error } = await supabase.rpc('community_award_badge', {
        p_user_id: userId,
        p_badge_key: badgeKey,
        p_reason: reason || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-admin'] })
      queryClient.invalidateQueries({ queryKey: ['community', 'member'] })
      queryClient.invalidateQueries({ queryKey: ['community', 'directory'] })
    },
  })
}

export function useSaveCategory() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ id, name, slug, description, is_active, sort_order }) => {
      const { error } = id
        ? await supabase.from('community_categories').update({ name, description, is_active, sort_order }).eq('id', id)
        : await supabase
            .from('community_categories')
            .insert({ org_id: profile.org_id, name, slug, description, sort_order: sort_order ?? 50 })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community', 'categories'] }),
  })
}
