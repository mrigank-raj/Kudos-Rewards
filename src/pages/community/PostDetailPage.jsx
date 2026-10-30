import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CircleCheck, CircleHelp, EyeOff, Flag, MessageSquare, Pencil, RotateCcw, SearchX, ShieldAlert, Trash2 } from 'lucide-react'
import { Button, Card, EmptyState, SegmentedTabs } from '@/components/ui'
import { PostActions, PostMeta } from '@/components/community/PostCard'
import CommentThread, { CommentComposer } from '@/components/community/CommentThread'
import ReportDialog from '@/components/community/ReportDialog'
import { ConfirmDialog, ErrorState, LinkButton, LoadingCards, PostTypeBadge, QuestionStatusBadge, RichText } from '@/components/community/CommunityUI'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/context/ToastContext'
import { useAreaBase, useComments, useDeletePost, usePost, useReopenQuestion } from '@/hooks/useCommunity'
import { useModerate } from '@/hooks/useCommunityAdmin'
import { buildCommentTree, friendlyError } from '@/lib/community'

const SORTS = [
  { value: 'oldest', label: 'Oldest' },
  { value: 'newest', label: 'Newest' },
  { value: 'helpful', label: 'Most helpful' },
]

export default function PostDetailPage() {
  const { postId } = useParams()
  const [params] = useSearchParams()
  const highlightId = params.get('comment')
  const navigate = useNavigate()
  const base = useAreaBase()
  const toast = useToast()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const postQuery = usePost(postId)
  const commentsQuery = useComments(postId)
  const deletePost = useDeletePost()
  const reopen = useReopenQuestion(postId)
  const moderate = useModerate()

  const [sort, setSort] = useState('oldest')
  const [reportTarget, setReportTarget] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [moderation, setModeration] = useState(null) // { targetType, targetId, action }

  const post = postQuery.data
  const tree = useMemo(
    () => buildCommentTree(commentsQuery.data, { sort, acceptedId: post?.accepted_comment_id }),
    [commentsQuery.data, sort, post?.accepted_comment_id]
  )

  if (postQuery.isLoading) return <div className="mx-auto max-w-[820px]"><LoadingCards count={2} /></div>
  if (postQuery.isError) return <div className="mx-auto max-w-[820px]"><ErrorState error={postQuery.error} onRetry={postQuery.refetch} /></div>
  if (!post) {
    return (
      <Card className="mx-auto max-w-[820px]">
        <EmptyState
          icon={SearchX}
          title="Post not found"
          body="It may have been deleted or hidden by HR, or it belongs to a different organization."
          action={<LinkButton to={`${base}/community`} variant="secondary">Back to community</LinkButton>}
        />
      </Card>
    )
  }

  const isOwn = post.author_id === profile?.id
  const canReopen = post.type === 'question' && post.status === 'resolved' && (isOwn || isAdmin)

  const runModeration = (reason) =>
    moderate.mutate(
      { ...moderation, reason },
      {
        onSuccess: () => {
          toast.success(moderation.action === 'unhide' ? 'Content restored' : moderation.action === 'delete' ? 'Content removed' : 'Content hidden')
          setModeration(null)
          if (moderation.action === 'delete' && moderation.targetType === 'post') navigate(`${base}/community`, { replace: true })
        },
        onError: (e) => toast.error(friendlyError(e)),
      }
    )

  return (
    <div className="mx-auto max-w-[820px] animate-fade-in">
      <Link to={`${base}/community`} className="inline-flex items-center gap-1.5 text-label-sm text-ink-secondary hover:text-ink-primary">
        <ArrowLeft size={15} /> Community
      </Link>

      <Card className="mt-3">
        <article aria-labelledby="post-title">
          <div className="flex flex-wrap items-start gap-3">
            <PostMeta post={post} base={base} />
            <div className="ml-auto flex flex-wrap gap-1.5">
              <PostTypeBadge type={post.type} />
              {post.type === 'question' && <QuestionStatusBadge status={post.status} />}
            </div>
          </div>

          {post.is_hidden && (
            <div role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-danger-border bg-danger-subtle/60 p-3 text-body-sm text-danger-text">
              <EyeOff size={16} className="mt-0.5 shrink-0" />
              <span>Hidden by HR — only you and HR can see this post.{post.hidden_reason && <> Reason: {post.hidden_reason}</>}</span>
            </div>
          )}

          <h1 id="post-title" className="mt-4 text-display-lg text-ink-primary" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', lineHeight: 1.2 }}>
            {post.title}
          </h1>

          {post.type === 'question' && post.status === 'open' && !isOwn && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-subtle px-3 py-2 text-label-sm text-brand-text">
              <CircleHelp size={15} /> {post.author?.name?.split(' ')[0] || 'A colleague'} needs help — can you answer?
            </p>
          )}
          {post.type === 'question' && post.status === 'resolved' && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-success-subtle px-3 py-2 text-label-sm text-success-text">
              <CircleCheck size={15} /> Resolved — see the accepted answer below
            </p>
          )}

          <RichText text={post.body} className="mt-4" />

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {post.category && (
              <Link to={`${base}/community?category=${post.category.id}`} className="rounded-full bg-surface-subtle px-2.5 py-1 text-label-xs text-ink-secondary hover:text-ink-primary">
                {post.category.name}
              </Link>
            )}
            {post.tags?.map((tag) => (
              <Link key={tag} to={`${base}/community?tag=${encodeURIComponent(tag)}`} className="rounded-full px-2 py-1 text-label-xs text-brand-text hover:bg-brand-subtle">
                #{tag}
              </Link>
            ))}
          </div>

          <div className="mt-4 border-t border-stroke-subtle pt-2">
            <PostActions post={post} base={base} />
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {isOwn && (
              <>
                <LinkButton to={`${base}/community/post/${post.id}/edit`} variant="ghost" size="sm"><Pencil size={14} /> Edit</LinkButton>
                <Button variant="ghost" size="sm" className="!text-danger-text" onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Delete</Button>
              </>
            )}
            {canReopen && (
              <Button variant="ghost" size="sm" disabled={reopen.isPending} onClick={() => reopen.mutate(undefined, { onSuccess: () => toast.success('Question reopened'), onError: (e) => toast.error(friendlyError(e)) })}>
                <RotateCcw size={14} /> Reopen question
              </Button>
            )}
            {!isOwn && (
              <Button variant="ghost" size="sm" onClick={() => setReportTarget({ postId: post.id })}><Flag size={14} /> Report</Button>
            )}
            {isAdmin && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setModeration({ targetType: 'post', targetId: post.id, action: post.is_hidden ? 'unhide' : 'hide' })}>
                  <ShieldAlert size={14} /> {post.is_hidden ? 'Unhide' : 'Hide'}
                </Button>
                {!isOwn && (
                  <Button variant="ghost" size="sm" className="!text-danger-text" onClick={() => setModeration({ targetType: 'post', targetId: post.id, action: 'delete' })}>
                    <Trash2 size={14} /> Remove
                  </Button>
                )}
              </>
            )}
          </div>
        </article>
      </Card>

      <section id="comments" aria-labelledby="comments-heading" className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="comments-heading" className="text-heading-md text-ink-primary">
            {post.type === 'question' ? 'Answers' : 'Comments'} <span className="text-ink-muted">({post.comment_count})</span>
          </h2>
          {(commentsQuery.data?.length || 0) > 1 && <SegmentedTabs options={SORTS} value={sort} onChange={setSort} size="sm" className="ml-auto" />}
        </div>

        {!post.is_hidden && (
          <Card className="mt-3">
            <CommentComposer
              postId={post.id}
              placeholder={post.type === 'question' ? (isOwn ? 'Add more detail or reply to an answer…' : 'Share what you know — even partial answers help') : 'Add to the discussion…'}
              submitLabel={post.type === 'question' && !isOwn ? 'Post answer' : 'Post comment'}
            />
          </Card>
        )}

        <div className="mt-3">
          {commentsQuery.isLoading ? (
            <LoadingCards count={2} />
          ) : commentsQuery.isError ? (
            <ErrorState error={commentsQuery.error} onRetry={commentsQuery.refetch} />
          ) : tree.length === 0 ? (
            <Card>
              <EmptyState icon={MessageSquare} title={post.type === 'question' ? 'No answers yet' : 'No comments yet'} body={post.type === 'question' ? 'Be the first to help.' : 'Start the conversation.'} />
            </Card>
          ) : (
            <CommentThread
              tree={tree}
              post={post}
              base={base}
              highlightId={highlightId}
              onReport={setReportTarget}
              onModerate={setModeration}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </section>

      <ReportDialog target={reportTarget} onClose={() => setReportTarget(null)} />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this post?"
        body="The post, its comments and appreciation will be permanently removed."
        confirmLabel="Delete post"
        danger
        pending={deletePost.isPending}
        onConfirm={() =>
          deletePost.mutate(post.id, {
            onSuccess: () => {
              toast.success('Post deleted')
              navigate(`${base}/community/mine`, { replace: true })
            },
            onError: (e) => toast.error(friendlyError(e)),
          })
        }
      />

      <ConfirmDialog
        open={!!moderation}
        onClose={() => setModeration(null)}
        title={moderation?.action === 'unhide' ? 'Restore this content?' : moderation?.action === 'delete' ? 'Remove this content?' : 'Hide this content?'}
        body={
          moderation?.action === 'unhide'
            ? 'It will become visible to everyone again. This is recorded in the moderation log.'
            : moderation?.action === 'delete'
              ? 'This permanently deletes it. The author is notified and the action is logged.'
              : 'Only the author and HR will be able to see it. The author is notified and the action is logged.'
        }
        confirmLabel={moderation?.action === 'unhide' ? 'Restore' : moderation?.action === 'delete' ? 'Remove' : 'Hide'}
        danger={moderation?.action !== 'unhide'}
        requireReason={moderation?.action !== 'unhide'}
        reasonLabel="Reason (shared with the author)"
        pending={moderate.isPending}
        onConfirm={runModeration}
      />
    </div>
  )
}
