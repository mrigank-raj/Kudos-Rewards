import { Link } from 'react-router-dom'
import { Bookmark, BookmarkCheck, EyeOff, Heart, Link2, MessageSquare } from 'lucide-react'
import { Card, cx } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/hooks/useAuth'
import { useAreaBase, useToggleBookmark, useTogglePostLike } from '@/hooks/useCommunity'
import { friendlyError } from '@/lib/community'
import { PersonLink, PostTypeBadge, QuestionStatusBadge, TimeAgo, UserAvatar } from './CommunityUI'

export function PostMeta({ post, base }) {
  const author = post.author
  const subtitle = [author?.profile?.job_title, author?.team].filter(Boolean).join(' · ')
  return (
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar user={author} size="md" />
      <div className="min-w-0">
        <p className="truncate text-label-sm text-ink-primary">
          <PersonLink base={base} user={author} />
          {author?.role === 'admin' && <span className="ml-1.5 rounded bg-success-subtle px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-success-text">HR</span>}
        </p>
        <p className="truncate text-body-sm text-ink-muted">
          {subtitle && <>{subtitle} · </>}
          <TimeAgo date={post.created_at} />
          {post.edited_at && <span title="Edited"> · edited</span>}
        </p>
      </div>
    </div>
  )
}

/** Appreciate / comment / save / copy-link row, shared by card and detail. */
export function PostActions({ post, base, compact = false }) {
  const { profile } = useAuth()
  const toast = useToast()
  const like = useTogglePostLike()
  const bookmark = useToggleBookmark()
  const isOwn = post.author_id === profile?.id

  const onLike = () => {
    if (isOwn) return
    like.mutate({ postId: post.id, liked: post.liked }, { onError: (e) => toast.error(friendlyError(e)) })
  }
  const onBookmark = () =>
    bookmark.mutate(
      { postId: post.id, bookmarked: post.bookmarked },
      {
        onSuccess: () => toast.success(post.bookmarked ? 'Removed from saved posts' : 'Saved for later'),
        onError: (e) => toast.error(friendlyError(e)),
      }
    )
  const onCopy = async () => {
    // Role-neutral link: ProtectedRoute maps /app ↔ /admin for community paths.
    const url = `${window.location.origin}/app/community/post/${post.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch {
      toast.info(url)
    }
  }

  const btn = 'inline-flex h-9 items-center gap-1.5 rounded-[10px] px-2.5 text-label-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-solid/40'

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onLike}
        disabled={isOwn || like.isPending}
        aria-pressed={post.liked}
        aria-label={isOwn ? `${post.like_count} appreciations (your post)` : post.liked ? 'Remove appreciation' : 'Appreciate this post'}
        title={isOwn ? "You can't appreciate your own post" : undefined}
        className={cx(btn, post.liked ? 'text-danger-text bg-danger-subtle' : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink-primary', isOwn && 'cursor-default opacity-70')}
      >
        <Heart size={16} fill={post.liked ? 'currentColor' : 'none'} />
        {post.like_count}
      </button>

      <Link to={`${base}/community/post/${post.id}#comments`} className={cx(btn, 'text-ink-secondary hover:bg-surface-subtle hover:text-ink-primary')} aria-label={`${post.comment_count} comments`}>
        <MessageSquare size={16} />
        {post.comment_count}
      </Link>

      <div className="ml-auto flex items-center gap-1">
        {!compact && (
          <button type="button" onClick={onCopy} className={cx(btn, 'text-ink-secondary hover:bg-surface-subtle hover:text-ink-primary')} aria-label="Copy link to post">
            <Link2 size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={onBookmark}
          disabled={bookmark.isPending}
          aria-pressed={post.bookmarked}
          aria-label={post.bookmarked ? 'Remove from saved' : 'Save post'}
          className={cx(btn, post.bookmarked ? 'text-brand-text bg-brand-subtle' : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink-primary')}
        >
          {post.bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          <span className="hidden sm:inline">{post.bookmarked ? 'Saved' : 'Save'}</span>
        </button>
      </div>
    </div>
  )
}

export default function PostCard({ post, onTagClick }) {
  const base = useAreaBase()
  const needsHelp = post.type === 'question' && post.status === 'open'

  return (
    <Card
      flush
      className={cx(
        'p-4 sm:p-5 transition-shadow hover:shadow-elevation-lg',
        needsHelp && 'border-l-4 border-l-danger-solid',
        post.type === 'announcement' && 'border-l-4 border-l-success-solid'
      )}
    >
      <article aria-labelledby={`post-title-${post.id}`}>
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <PostMeta post={post} base={base} />
          <div className="flex shrink-0 flex-wrap gap-1.5 sm:ml-auto sm:justify-end">
            <PostTypeBadge type={post.type} />
            {post.type === 'question' && <QuestionStatusBadge status={post.status} />}
          </div>
        </div>

        {post.is_hidden && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-danger-subtle px-2.5 py-1 text-label-xs text-danger-text">
            <EyeOff size={12} /> Hidden by HR{post.hidden_reason ? ` — ${post.hidden_reason}` : ''}
          </p>
        )}

        <Link to={`${base}/community/post/${post.id}`} className="group mt-3 block focus-visible:outline-none">
          <h2 id={`post-title-${post.id}`} className="text-heading-md text-ink-primary group-hover:text-brand-text group-focus-visible:underline">
            {post.title}
          </h2>
          <p className="mt-1.5 line-clamp-3 text-body-md text-ink-secondary">
            {(post.excerpt || '').replace(/```/g, '').replace(/\s+/g, ' ').trim()}
            {post.excerpt?.length >= 280 && '…'}
          </p>
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {post.category && <span className="rounded-full bg-surface-subtle px-2.5 py-1 text-label-xs text-ink-secondary">{post.category.name}</span>}
          {post.tags?.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTagClick?.(tag)}
              className="rounded-full px-2 py-1 text-label-xs text-brand-text hover:bg-brand-subtle"
            >
              #{tag}
            </button>
          ))}
        </div>

        <div className="mt-3 border-t border-stroke-subtle pt-2">
          <PostActions post={post} base={base} compact />
        </div>
      </article>
    </Card>
  )
}
