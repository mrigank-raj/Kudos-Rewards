import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/config/supabase'
import { useAuth } from '@/hooks/useAuth'

/**
 * Employee directory, community profiles and reputation. Directory rows
 * come from the community_directory() RPC (migration 014), which is scoped
 * to the caller's org and never returns email or points balance.
 */

const DIRECTORY_PAGE = 24

export function useDirectory({ search = '', team = '', skill = '' } = {}) {
  const { profile } = useAuth()
  return useInfiniteQuery({
    queryKey: ['community', 'directory', profile?.org_id, { search, team, skill }],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc('community_directory', {
        p_search: search.trim() || null,
        p_team: team || null,
        p_skill: skill || null,
        p_user_id: null,
        p_limit: DIRECTORY_PAGE,
        p_offset: pageParam * DIRECTORY_PAGE,
      })
      if (error) throw error
      return data
    },
    getNextPageParam: (lastPage, allPages) => (lastPage.length === DIRECTORY_PAGE ? allPages.length : undefined),
    enabled: !!profile?.org_id,
  })
}

export function useMemberProfile(userId) {
  return useQuery({
    queryKey: ['community', 'member', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('community_directory', {
        p_search: null,
        p_team: null,
        p_skill: null,
        p_user_id: userId,
        p_limit: 1,
        p_offset: 0,
      })
      if (error) throw error
      return data?.[0] ?? null
    },
    enabled: !!userId,
  })
}

export function useOrgSkills() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['community', 'skills', profile?.org_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('community_org_skills')
      if (error) throw error
      return data
    },
    enabled: !!profile?.org_id,
    staleTime: 1000 * 60 * 10,
  })
}

export function useUpdateCommunityProfile() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ job_title, bio, skills }) => {
      const { error } = await supabase
        .from('community_profiles')
        .upsert({ user_id: profile.id, job_title: job_title || null, bio: bio || null, skills }, { onConflict: 'user_id' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', 'member', profile.id] })
      queryClient.invalidateQueries({ queryKey: ['community', 'directory'] })
      queryClient.invalidateQueries({ queryKey: ['community', 'skills'] })
    },
  })
}

/** Recent contribution ledger rows for one person (reputation is public in-org). */
export function useContributions(userId, limit = 15) {
  return useQuery({
    queryKey: ['community', 'contributions', userId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_contributions')
        .select('id, kind, points, source_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data
    },
    enabled: !!userId,
  })
}

/** Find-or-create a direct conversation with a colleague; returns its id. */
export function useStartConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (otherUserId) => {
      const { data, error } = await supabase.rpc('community_start_conversation', { p_other_user_id: otherUserId })
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] }),
  })
}
