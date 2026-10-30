// Shared, framework-free community helpers: constants mirrored from the
// DB constraints in supabase/migrations/012-015, client-side validation
// (the database re-validates everything), comment-tree building and small
// formatters. Kept free of React/Supabase imports so it can be unit-tested
// with `node --test`.

export const POST_TYPES = {
  question: { label: 'Question', verb: 'Ask a question', tone: 'brand' },
  discussion: { label: 'Discussion', verb: 'Start a discussion', tone: 'neutral' },
  tip: { label: 'Tip', verb: 'Share a tip', tone: 'gold' },
  announcement: { label: 'Announcement', verb: 'Post an announcement', tone: 'success' },
}

export const QUESTION_STATUS = {
  open: { label: 'Needs help', tone: 'danger' },
  answered: { label: 'Answered', tone: 'brand' },
  resolved: { label: 'Resolved', tone: 'success' },
}

export const FEED_FILTERS = [
  { value: 'latest', label: 'Latest' },
  { value: 'trending', label: 'Trending' },
  { value: 'unanswered', label: 'Unanswered' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'tips', label: 'Tips & Knowledge' },
  { value: 'department', label: 'My Department' },
]

export const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'harassment', label: 'Harassment or disrespect' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'misinformation', label: 'Misleading information' },
  { value: 'off_topic', label: 'Off topic' },
  { value: 'other', label: 'Something else' },
]

// Mirrors the CHECK constraints in 012_community_core.sql.
export const LIMITS = {
  titleMin: 8,
  titleMax: 150,
  bodyMin: 20,
  bodyMax: 10000,
  tagsMax: 5,
  tagMax: 30,
  commentMin: 2,
  commentMax: 5000,
  messageMax: 4000,
  skillsMax: 15,
  skillMax: 40,
  jobTitleMax: 80,
  bioMax: 500,
}

export const MAX_COMMENT_DEPTH = 2

// Mirrors the contribution rules documented in 014.
export const REPUTATION_RULES = [
  { kind: 'accepted_answer', points: 15, label: 'Your answer is accepted as the solution', note: 'Not for answering your own question' },
  { kind: 'tip_shared', points: 5, label: 'A tip you shared is appreciated by 3+ colleagues', note: 'Once per tip' },
  { kind: 'post_appreciated', points: 2, label: 'A colleague appreciates your post', note: 'Once per colleague, removed if they undo it' },
  { kind: 'comment_appreciated', points: 2, label: 'A colleague appreciates your answer or comment', note: 'Once per colleague, removed if they undo it' },
]

export const CONTRIBUTION_LABELS = Object.fromEntries(REPUTATION_RULES.map((r) => [r.kind, r.label]))

export const COMMUNITY_BADGE_KEYS = [
  'community_helpful_contributor',
  'community_problem_solver',
  'community_knowledge_sharer',
  'community_collaborator',
  'community_champion',
]

/** Collapse whitespace runs in a single-line field and trim. */
export function cleanLine(value) {
  return (value || '').replace(/\s+/g, ' ').trim()
}

/** Parse a comma/space separated tag string into the normalised list the DB stores. */
export function parseTags(input) {
  const raw = Array.isArray(input) ? input : (input || '').split(/[,\n]/)
  const seen = new Set()
  const out = []
  for (const t of raw) {
    const tag = t.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-')
    if (tag && !seen.has(tag)) {
      seen.add(tag)
      out.push(tag)
    }
  }
  return out
}

/**
 * Validate a post draft. Returns { errors, value } where value is the
 * trimmed payload ready to send and errors maps field → message.
 */
export function validatePost(draft, { canAnnounce = false } = {}) {
  const errors = {}
  const title = cleanLine(draft.title)
  const body = (draft.body || '').trim()
  const tags = parseTags(draft.tags)

  if (!POST_TYPES[draft.type]) errors.type = 'Choose a post type.'
  else if (draft.type === 'announcement' && !canAnnounce) errors.type = 'Only HR admins can post announcements.'

  if (!draft.categoryId) errors.categoryId = 'Choose a category.'

  if (!title) errors.title = 'A title is required.'
  else if (title.length < LIMITS.titleMin) errors.title = `Use at least ${LIMITS.titleMin} characters.`
  else if (title.length > LIMITS.titleMax) errors.title = `Keep it under ${LIMITS.titleMax} characters.`

  if (!body) errors.body = 'Add some detail so colleagues can help.'
  else if (body.length < LIMITS.bodyMin) errors.body = `Use at least ${LIMITS.bodyMin} characters.`
  else if (body.length > LIMITS.bodyMax) errors.body = `Keep it under ${LIMITS.bodyMax.toLocaleString()} characters.`

  if (tags.length > LIMITS.tagsMax) errors.tags = `Use at most ${LIMITS.tagsMax} tags.`
  else if (tags.some((t) => t.length > LIMITS.tagMax)) errors.tags = `Each tag must be ${LIMITS.tagMax} characters or fewer.`

  return {
    errors,
    value: { type: draft.type, category_id: draft.categoryId, title, body, tags },
  }
}

export function validateComment(body) {
  const value = (body || '').trim()
  if (value.length < LIMITS.commentMin) return { error: 'Write a little more before posting.', value }
  if (value.length > LIMITS.commentMax) return { error: `Keep it under ${LIMITS.commentMax.toLocaleString()} characters.`, value }
  return { error: null, value }
}

const COMMENT_SORTS = {
  oldest: (a, b) => new Date(a.created_at) - new Date(b.created_at),
  newest: (a, b) => new Date(b.created_at) - new Date(a.created_at),
  helpful: (a, b) => b.like_count - a.like_count || new Date(a.created_at) - new Date(b.created_at),
}

/**
 * Turn the flat comment list for a post into a tree. Top-level comments are
 * ordered by `sort` with the accepted answer pinned first; replies always
 * read oldest-first so conversations stay in order. Orphans (parent not in
 * the list, e.g. hidden) are promoted to top level rather than dropped.
 */
export function buildCommentTree(comments, { sort = 'oldest', acceptedId = null } = {}) {
  const byId = new Map()
  for (const c of comments || []) byId.set(c.id, { ...c, replies: [] })

  const roots = []
  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : null
    if (parent) parent.replies.push(node)
    else roots.push(node)
  }

  const sortReplies = (node) => {
    node.replies.sort(COMMENT_SORTS.oldest)
    node.replies.forEach(sortReplies)
  }
  roots.forEach(sortReplies)

  roots.sort(COMMENT_SORTS[sort] || COMMENT_SORTS.oldest)
  if (acceptedId) {
    const idx = roots.findIndex((r) => r.id === acceptedId)
    if (idx > 0) roots.unshift(roots.splice(idx, 1)[0])
  }
  return roots
}

/** Comments that count toward a post's total (matches comment_count in the DB). */
export function countVisibleComments(comments) {
  return (comments || []).filter((c) => !c.is_deleted && !c.is_hidden).length
}

export function initialsOf(name) {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/** Base path for the current role's area. */
export function areaBase(role) {
  return role === 'admin' ? '/admin' : '/app'
}

/**
 * Notification links are stored role-neutral (e.g. "/community/post/…")
 * so the same row works for employees and HR; prefix with the area.
 */
export function resolveAppLink(role, link) {
  if (!link) return null
  if (link.startsWith('/app/') || link.startsWith('/admin/')) return link
  return `${areaBase(role)}${link.startsWith('/') ? link : `/${link}`}`
}

/** Map a Postgres/PostgREST error to something worth showing a person. */
export function friendlyError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback
  const code = error.code
  const message = error.message || ''
  if (code === '23505') {
    if (/just posted/i.test(message)) return message
    return 'That already exists.'
  }
  if (code === '23514') return 'Some fields are outside the allowed length or format.'
  if (code === '42501') {
    // Our own RAISE messages carry 42501 and are written for people.
    if (message && !/row-level security|permission denied/i.test(message)) return message
    return "You don't have permission to do that."
  }
  if (code === 'PGRST116') return 'Not found.'
  if (/Failed to fetch|NetworkError/i.test(message)) return 'Network error — check your connection.'
  if (code === 'P0001' && message) return message
  return message || fallback
}

const URL_RE = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g

/**
 * Split text into renderable segments for the safe formatter: fenced code
 * blocks, bullet lists, paragraphs; inline `code` and bare URLs. Returns
 * plain data — no HTML strings — so rendering can't inject markup.
 */
export function parseRichText(text) {
  const blocks = []
  const lines = (text || '').replace(/\r\n/g, '\n').split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim().startsWith('```')) {
      const code = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i++])
      i++ // closing fence (or end)
      blocks.push({ type: 'code', text: code.join('\n') })
      continue
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ''))
      blocks.push({ type: 'list', items: items.map(parseInline) })
      continue
    }
    if (!line.trim()) {
      i++
      continue
    }
    const para = []
    while (i < lines.length && lines[i].trim() && !lines[i].trim().startsWith('```') && !/^\s*[-*]\s+/.test(lines[i])) {
      para.push(lines[i++])
    }
    blocks.push({ type: 'paragraph', lines: para.map(parseInline) })
  }
  return blocks
}

export function parseInline(text) {
  const out = []
  const parts = text.split(/(`[^`]+`)/g)
  for (const part of parts) {
    if (!part) continue
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      out.push({ type: 'code', text: part.slice(1, -1) })
      continue
    }
    let last = 0
    for (const m of part.matchAll(URL_RE)) {
      if (m.index > last) out.push({ type: 'text', text: part.slice(last, m.index) })
      out.push({ type: 'link', href: m[0], text: m[0] })
      last = m.index + m[0].length
    }
    if (last < part.length) out.push({ type: 'text', text: part.slice(last) })
  }
  return out
}

/** URL-safe slug for an admin-created category. */
export function slugify(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}
