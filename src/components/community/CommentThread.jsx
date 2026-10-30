import { useEffect, useRef, useState } from 'react'
import { CircleCheck, EyeOff, Flag, Heart, Loader2, Pencil, Reply, RotateCcw, ShieldAlert, Trash2 } from 'lucide-react'
import { Button, cx } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/hooks/useAuth'
import {
  useAcceptAnswer, useCreateComment, useDeleteComment, useReopenQuestion, useToggleCommentLike, useUpdateComment,
} from '@/hooks/useCommunity'
import { LIMITS, MAX_COMMENT_DEPTH, friendlyError, validateComment } from '@/lib/community'
import { CharCount, ConfirmDialog, PersonLink, RichText, Textarea, TimeAgo, UserAvatar } from './CommunityUI'

export function CommentComposer({ postId, parentId = null, placeholder, autoFocus, onDone, submitLabel = 'Post comment' }) {
  const toast = useToast()
  const create = useCreateComment(postId)
  const [body, setBody] = useState('')
  const [error, setError] = useState(null)

  const submit = (e) => {
    e.preventDefault()
    if (create.isPending) return
    const { error: err, value } = validateComment(body)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    create.mutate(
      { body: value, parentId },
      {
        onSuccess: () => {
          setBody('')
          toast.success(parentId ? 'Reply posted' : 'Comment posted')
          onDone?.()
        },
        onError: (e2) => toast.error(friendlyError(e2)),
      }
    )
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <Textarea
        rows={parentId ? 2 : 3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        invalid={!!error}
        aria-label={parentId ? 'Write a reply' : 'Write a comment'}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e)
        }}
      />
      <div className="flex items-center gap-2">
        {error ? <p role="alert" className="text-body-sm text-danger-text">{error}</p> : <CharCount value={body} max={LIMITS.commentMax} />}
        <div className="ml-auto flex gap-2">
          {onDone && parentId && <Button variant="quiet" size="sm" onClick={onDone}>Cancel</Button>}
          <Button type="submit" size="sm" disabled={create.isPending || !body.trim()}>
            {create.isPending && <Loader2 size={14} className="animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  )
}

function CommentItem({ node, post, base, highlightId, onReport, onModerate, isAdmin }) {
  const { profile } = useAuth()
  const toast = useToast()
  const like = useToggleCommentLike(post.id)
  const update = useUpdateComment(post.id)
  const remove = useDeleteComment(post.id)
  const accept = useAcceptAnswer(post.id)
  const reopen = useReopenQuestion(post.id)

  const [replying, setReplying] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(node.body)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const ref = useRef(null)

  const isOwn = node.author_id === profile?.id
  const isPostAuthor = post.author_id === profile?.id
  const isAccepted = post.accepted_comment_id === node.id
  const canAccept = post.type === 'question' && (isPostAuthor || isAdmin) && !post.is_hidden && !node.is_deleted && !node.is_hidden
  const removed = node.is_deleted

  useEffect(() => {
    if (highlightId === node.id && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      ref.current.focus({ preventScroll: true })
    }
  }, [highlightId, node.id])

  const saveEdit = () => {
    const { error, value } = validateComment(draft)
    if (error) return toast.error(error)
    update.mutate(
      { id: node.id, body: value },
      { onSuccess: () => { setEditing(false); toast.success('Comment updated') }, onError: (e) => toast.error(friendlyError(e)) }
    )
  }

  const action = 'inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-label-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-solid/40'

  return (
    <li>
      <div
        id={`comment-${node.id}`}
        ref={ref}
        tabIndex={-1}
        className={cx(
          'rounded-xl p-3 outline-none sm:p-4',
          isAccepted ? 'border border-success-border bg-success-subtle/50' : 'bg-surface-base',
          highlightId === node.id && !isAccepted && 'ring-2 ring-brand-solid/40'
        )}
      >
        {isAccepted && (
          <p className="mb-2 inline-flex items-center gap-1.5 text-label-xs text-success-text">
            <CircleCheck size={14} /> Accepted answer
          </p>
        )}

        <div className="flex items-start gap-3">
          {removed ? (
            <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-surface-subtle text-ink-muted"><Trash2 size={13} /></span>
          ) : (
            <UserAvatar user={node.author} size="sm" />
          )}
          <div className="min-w-0 flex-1">
            {!removed && (
              <p className="text-label-sm text-ink-primary">
                <PersonLink base={base} user={node.author} />
                {node.author_id === post.author_id && <span className="ml-1.5 rounded bg-brand-subtle px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-brand-text">Author</span>}
                <span className="ml-2 text-body-sm font-normal text-ink-muted">
                  <TimeAgo date={node.created_at} />
                  {node.edited_at && ' · edited'}
                </span>
              </p>
            )}

            {node.is_hidden && (
              <p className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-danger-subtle px-2 py-0.5 text-label-xs text-danger-text">
                <EyeOff size={12} /> Hidden by HR{node.hidden_reason ? ` — ${node.hidden_reason}` : ''}
              </p>
            )}

            {removed ? (
              <p className="text-body-sm italic text-ink-muted">This comment was deleted.</p>
            ) : editing ? (
              <div className="mt-2 space-y-2">
                <Textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Edit comment" autoFocus />
                <div className="flex justify-end gap-2">
                  <Button variant="quiet" size="sm" onClick={() => { setEditing(false); setDraft(node.body) }}>Cancel</Button>
                  <Button size="sm" onClick={saveEdit} disabled={update.isPending}>
                    {update.isPending && <Loader2 size={14} className="animate-spin" />} Save
                  </Button>
                </div>
              </div>
            ) : (
              <RichText text={node.body} className="mt-1.5 text-body-md" />
            )}

            {!removed && !editing && (
              <div className="mt-2 flex flex-wrap items-center gap-0.5 -ml-2">
                <button
                  type="button"
                  disabled={isOwn || like.isPending || node.is_hidden}
                  onClick={() => like.mutate({ commentId: node.id, liked: node.liked }, { onError: (e) => toast.error(friendlyError(e)) })}
                  aria-pressed={node.liked}
                  aria-label={node.liked ? 'Remove appreciation' : 'Appreciate this comment'}
                  className={cx(action, node.liked ? 'text-danger-text' : 'text-ink-secondary hover:bg-surface-subtle', isOwn && 'cursor-default opacity-70')}
                >
                  <Heart size={14} fill={node.liked ? 'currentColor' : 'none'} /> {node.like_count > 0 ? node.like_count : ''} <span className="sr-only sm:not-sr-only">Helpful</span>
                </button>
                {!post.is_hidden && !node.is_hidden && (
                  <button type="button" onClick={() => setReplying((r) => !r)} className={cx(action, 'text-ink-secondary hover:bg-surface-subtle')}>
                    <Reply size={14} /> Reply
                  </button>
                )}
                {canAccept && !isAccepted && (
                  <button
                    type="button"
                    onClick={() => accept.mutate(node.id, { onSuccess: () => toast.success('Marked as the accepted answer'), onError: (e) => toast.error(friendlyError(e)) })}
                    disabled={accept.isPending}
                    className={cx(action, 'text-success-text hover:bg-success-subtle')}
                  >
                    <CircleCheck size={14} /> Accept answer
                  </button>
                )}
                {canAccept && isAccepted && (
                  <button
                    type="button"
                    onClick={() => reopen.mutate(undefined, { onSuccess: () => toast.success('Question reopened'), onError: (e) => toast.error(friendlyError(e)) })}
                    disabled={reopen.isPending}
                    className={cx(action, 'text-ink-secondary hover:bg-surface-subtle')}
                  >
                    <RotateCcw size={14} /> Unaccept
                  </button>
                )}
                {isOwn && (
                  <>
                    <button type="button" onClick={() => setEditing(true)} className={cx(action, 'text-ink-secondary hover:bg-surface-subtle')}>
                      <Pencil size={14} /> Edit
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(true)} className={cx(action, 'text-danger-text hover:bg-danger-subtle')}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </>
                )}
                {!isOwn && (
                  <button type="button" onClick={() => onReport({ commentId: node.id })} className={cx(action, 'text-ink-muted hover:bg-surface-subtle')} aria-label="Report comment">
                    <Flag size={14} /> <span className="hidden sm:inline">Report</span>
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onModerate({ targetType: 'comment', targetId: node.id, action: node.is_hidden ? 'unhide' : 'hide' })}
                    className={cx(action, 'text-ink-muted hover:bg-surface-subtle')}
                  >
                    <ShieldAlert size={14} /> {node.is_hidden ? 'Unhide' : 'Hide'}
                  </button>
                )}
              </div>
            )}

            {replying && (
              <div className="mt-3">
                <CommentComposer
                  postId={post.id}
                  parentId={node.id}
                  placeholder={`Reply to ${node.author?.name || 'this comment'}…`}
                  autoFocus
                  submitLabel="Reply"
                  onDone={() => setReplying(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {node.replies.length > 0 && (
        <ul className={cx('mt-2 space-y-2 border-l-2 border-stroke-subtle', node.depth < MAX_COMMENT_DEPTH ? 'ml-4 pl-3 sm:ml-6 sm:pl-4' : 'ml-0 pl-3')}>
          {node.replies.map((child) => (
            <CommentItem key={child.id} node={child} post={post} base={base} highlightId={highlightId} onReport={onReport} onModerate={onModerate} isAdmin={isAdmin} />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete comment?"
        body={node.replies.length ? 'Replies will stay visible, but your comment will show as deleted.' : 'This permanently removes your comment.'}
        confirmLabel="Delete"
        danger
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(node.id, {
            onSuccess: () => { setConfirmDelete(false); toast.success('Comment deleted') },
            onError: (e) => toast.error(friendlyError(e)),
          })
        }
      />
    </li>
  )
}

export default function CommentThread({ tree, ...props }) {
  return (
    <ul className="space-y-3">
      {tree.map((node) => (
        <CommentItem key={node.id} node={node} {...props} />
      ))}
    </ul>
  )
}
