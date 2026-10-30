import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/config/supabase'
import { useAuth } from '@/hooks/useAuth'
import { areaBase } from '@/lib/community'

/**
 * Community feed, posts, comments, appreciation and bookmarks.
 *
 * All authorization lives in the database (supabase/migrations/012): the
 * client never sends author_id/org_id, and RLS + triggers reject anything
 * the caller isn't allowed to do. These hooks only shape queries and keep
 * the React Query cache in step.
 */

export const PAGE_SIZE = 12

/** '/app' for employees, '/admin' for HR — community routes exist under both. */
export function useAreaBase() {
  const { profile } = useAuth()
  return areaBase(profile?.role)
}

// `my_like` / `my_bookmark` embed the like/bookmark tables, which RLS
// limits to the caller's own rows — so each is [] or [{user_id}] and tells
// us whether *I* liked/saved the post without an extra query per post.
const AUTHOR = 'id, name, avatar_url, team, role, profile:community_profiles(job_title)'
const POST_CARD_SELECT = `
  id, author_id, category_id, type, title, excerpt, tags, status, accepted_comment_id,
  like_count, comment_count, is_hidden, hidden_reason, created_at, edited_at, last_activity_at,
  author:users!author_id(${AUTHOR}),
  category:community_categories(id, name, slug),
  my_like:community_post_likes(user_id),
  my_bookmark:community_bookmarks(user_id)
`
const POST_DETAIL_SELECT = `${POST_CARD_SELECT}, body, hidden_at`

const COMMENT_SELECT = `
  id, post_id, author_id, parent_id, depth, body, like_count, is_deleted, is_hidden, hidden_reason,
  created_at, edited_at,
  author:users!author_id(${AUTHOR}),
  my_like:community_comment_likes(user_id)
`

const normalizePost = (p) =>
  p && {
    ...p,
    liked: (p.my_like || []).length > 0,
    bookmarked: (p.my_bookmark || []).length > 0,
  }

const normalizeComment = (c) => ({ ...c, liked: (c.my_like || []).length > 0 })

/* ------------------------------------------------------------ categories */

export function useCategories({ includeInactive = false } = {}) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['community', 'categories', profile?.org_id, includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('community_categories')
        .select('id, slug, name, description, is_active, sort_order')
        .order('sort_order')
        .order('name')
      if (!includeInactive) query = query.eq('is_active', true)
      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: !!profile?.org_id,
    staleTime: 1000 * 60 * 30,
  })
}

/* ------------------------------------------------------------------ feed */

/**
 * Paginated feed. `mode` selects the list:
 *   feed   — everyone's posts, narrowed by `filter`
 *   mine   — my posts (including any HR has hidden)
 *   author — one colleague's posts (profile page)
 */
export function useFeed({ mode = 'feed', filter = 'latest', categoryId = null, search = '', tag = '', authorId = null } = {}) {
  const { profile } = useAuth()
  const team = profile?.team

  return useInfiniteQuery({
    queryKey: ['community', 'feed', { mode, filter, categoryId, search, tag, authorId, team }],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const department = mode === 'feed' && filter === 'department'
      // !inner turns the author embed into a join so we can filter on it.
      const select = department
        ? POST_CARD_SELECT.replace('author:users!author_id(', 'author:users!author_id!inner(')
        : POST_CARD_SELECT

      let query = supabase.from('community_posts').select(select)

      if (mode === 'mine') query = query.eq('author_id', profile.id)
      if (mode === 'author') query = query.eq('author_id', authorId)

      if (mode === 'feed') {
        if (filter === 'unanswered') query = query.eq('type', 'question').eq('status', 'open')
        if (filter === 'resolved') query = query.eq('type', 'question').eq('status', 'resolved')
        if (filter === 'tips') query = query.eq('type', 'tip')
        if (department) query = query.eq('author.team', team)
      }
      if (mode !== 'mine') query = query.eq('is_hidden', false)
      if (categoryId) query = query.eq('category_id', categoryId)
      if (tag) query = query.contains('tags', [tag])
      if (search.trim()) query = query.textSearch('search_vector', search.trim(), { type: 'websearch', config: 'english' })

      query =
        mode === 'feed' && filter === 'trending'
          ? query.order('hot_score', { ascending: false })
          : query.order('created_at', { ascending: false })

      const from = pageParam * PAGE_SIZE
      const { data, error } = await query.range(from, from + PAGE_SIZE - 1)
      if (error) throw error
      return data.map(normalizePost)
    },
    getNextPageParam: (lastPage, allPages) => (lastPage.length === PAGE_SIZE ? allPages.length : undefined),
    enabled: !!profile?.id && (mode !== 'feed' || filter !== 'department' || !!team) && (mode !== 'author' || !!authorId),
  })
}

export function useSavedPosts() {
  const { profile } = useAuth()
  return useInfiniteQuery({
    queryKey: ['community', 'saved', profile?.id],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = pageParam * PAGE_SIZE
      const { data, error } = await supabase
        .from('community_bookmarks')
        .select(`created_at, post:community_posts(${POST_CARD_SELECT})`)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1)
      if (error) throw error
      // A saved post that was since hidden/deleted comes back as null.
      return data.map((row) => ({ savedAt: row.created_at, post: normalizePost(row.post) }))
    },
    getNextPageParam: (lastPage, allPages) => (lastPage.length === PAGE_SIZE ? allPages.length : undefined),
    enabled: !!profile?.id,
  })
}

/* ------------------------------------------------------------ single post */

export function usePost(postId) {
  return useQuery({
    queryKey: ['community', 'post', postId],
    queryFn: async () => {
      const { data, error } = await supabase.from('community_posts').select(POST_DETAIL_SELECT).eq('id', postId).maybeSingle()
      if (error) throw error
      return normalizePost(data)
    },
    enabled: !!postId,
    staleTime: 1000 * 30,
  })
}

export function useCreatePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (value) => {
      const { data, error } = await supabase.from('community_posts').insert(value).select('id').single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community', 'feed'] }),
  })
}

export function useUpdatePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, value }) => {
      const { category_id, title, body, tags } = value
      const { data, error } = await supabase
        .from('community_posts')
        .update({ category_id, title, body, tags })
        .eq('id', id)
        .select('id')
      if (error) throw error
      if (!data.length) throw new Error('You can only edit your own posts.')
      return data[0]
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['community', 'post', id] })
      queryClient.invalidateQueries({ queryKey: ['community', 'feed'] })
    },
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { data, error } = await supabase.from('community_posts').delete().eq('id', id).select('id')
      if (error) throw error
      if (!data.length) throw new Error('You can only delete your own posts.')
    },
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ['community', 'post', id] })
      queryClient.invalidateQueries({ queryKey: ['community', 'feed'] })
      queryClient.invalidateQueries({ queryKey: ['community', 'saved'] })
    },
  })
}

/* ------------------------------------------------ optimistic post patches */

// Apply `patch` to a post wherever it's cached (feed pages, saved list,
// detail) and return a snapshot for rollback.
function patchPostEverywhere(queryClient, postId, patch) {
  const snapshot = queryClient.getQueriesData({ queryKey: ['community'] })
  const apply = (p) => (p && p.id === postId ? { ...p, ...patch(p) } : p)

  queryClient.setQueriesData({ queryKey: ['community', 'feed'] }, (data) =>
    data ? { ...data, pages: data.pages.map((page) => page.map(apply)) } : data
  )
  queryClient.setQueriesData({ queryKey: ['community', 'saved'] }, (data) =>
    data ? { ...data, pages: data.pages.map((page) => page.map((row) => ({ ...row, post: apply(row.post) }))) } : data
  )
  queryClient.setQueryData(['community', 'post', postId], (p) => apply(p))
  return snapshot
}

function restore(queryClient, snapshot) {
  snapshot?.forEach(([key, data]) => queryClient.setQueryData(key, data))
}

export function useTogglePostLike() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ postId, liked }) => {
      const { error } = liked
        ? await supabase.from('community_post_likes').delete().eq('post_id', postId).eq('user_id', profile.id)
        : await supabase.from('community_post_likes').insert({ post_id: postId })
      if (error) throw error
    },
    onMutate: async ({ postId, liked }) => {
      await queryClient.cancelQueries({ queryKey: ['community'] })
      return patchPostEverywhere(queryClient, postId, (p) => ({
        liked: !liked,
        like_count: Math.max(0, p.like_count + (liked ? -1 : 1)),
      }))
    },
    onError: (_err, _vars, snapshot) => restore(queryClient, snapshot),
    onSettled: (_d, _e, { postId }) => queryClient.invalidateQueries({ queryKey: ['community', 'post', postId] }),
  })
}

export function useToggleBookmark() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  return useMutation({
    mutationFn: async ({ postId, bookmarked }) => {
      const { error } = bookmarked
        ? await supabase.from('community_bookmarks').delete().eq('post_id', postId).eq('user_id', profile.id)
        : await supabase.from('community_bookmarks').insert({ post_id: postId })
      if (error) throw error
    },
    onMutate: async ({ postId, bookmarked }) => {
      await queryClient.cancelQueries({ queryKey: ['community'] })
      return patchPostEverywhere(queryClient, postId, () => ({ bookmarked: !bookmarked }))
    },
    onError: (_err, _vars, snapshot) => restore(queryClient, snapshot),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['community', 'saved'] }),
  })
}

/* --------------------------------------------------------------- comments */

export function useComments(postId) {
  return useQuery({
    queryKey: ['community', 'comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_comments')
        .select(COMMENT_SELECT)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .limit(500)
      if (error) throw error
      return data.map(normalizeComment)
    },
    enabled: !!postId,
    staleTime: 1000 * 30,
  })
}

function invalidateThread(queryClient, postId) {
  queryClient.invalidateQueries({ queryKey: ['community', 'comments', postId] })
  queryClient.invalidateQueries({ queryKey: ['community', 'post', postId] })
  queryClient.invalidateQueries({ queryKey: ['community', 'feed'] })
}

export function useCreateComment(postId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ body, parentId = null }) => {
      const { data, error } = await supabase
        .from('community_comments')
        .insert({ post_id: postId, parent_id: parentId, body })
        .select('id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateThread(queryClient, postId),
  })
}

export function useUpdateComment(postId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }) => {
      const { data, error } = await supabase.from('community_comments').update({ body }).eq('id', id).select('id')
      if (error) throw error
      if (!data.length) throw new Error('You can only edit your own comments.')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community', 'comments', postId] }),
  })
}

export function useDeleteComment(postId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('community_comments').delete().eq('id', id)
      if (error) throw error
      // A comment with replies is soft-deleted by the DB (row stays, marked
      // is_deleted) so DELETE … RETURNING can't tell us much; re-read it.
      const { data } = await supabase.from('community_comments').select('id, is_deleted').eq('id', id).maybeSingle()
      if (data && !data.is_deleted) throw new Error('You can only delete your own comments.')
    },
    onSuccess: () => invalidateThread(queryClient, postId),
  })
}

export function useToggleCommentLike(postId) {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const key = ['community', 'comments', postId]
  return useMutation({
    mutationFn: async ({ commentId, liked }) => {
      const { error } = liked
        ? await supabase.from('community_comment_likes').delete().eq('comment_id', commentId).eq('user_id', profile.id)
        : await supabase.from('community_comment_likes').insert({ comment_id: commentId })
      if (error) throw error
    },
    onMutate: async ({ commentId, liked }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData(key)
      queryClient.setQueryData(key, (list) =>
        list?.map((c) =>
          c.id === commentId ? { ...c, liked: !liked, like_count: Math.max(0, c.like_count + (liked ? -1 : 1)) } : c
        )
      )
      return previous
    },
    onError: (_err, _vars, previous) => queryClient.setQueryData(key, previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

/* ------------------------------------------------------ question lifecycle */

export function useAcceptAnswer(postId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (commentId) => {
      const { error } = await supabase.rpc('community_accept_answer', { p_comment_id: commentId })
      if (error) throw error
    },
    onSuccess: () => invalidateThread(queryClient, postId),
  })
}

export function useReopenQuestion(postId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('community_reopen_question', { p_post_id: postId })
      if (error) throw error
    },
    onSuccess: () => invalidateThread(queryClient, postId),
  })
}

/* ---------------------------------------------------------------- reports */

export function useReportContent() {
  return useMutation({
    mutationFn: async ({ postId = null, commentId = null, reason, details }) => {
      const { error } = await supabase
        .from('community_reports')
        .insert({ post_id: postId, comment_id: commentId, reason, details: details || null })
      if (error) {
        if (error.code === '23505') throw new Error("You've already reported this. HR will review it.")
        throw error
      }
    },
  })
}
