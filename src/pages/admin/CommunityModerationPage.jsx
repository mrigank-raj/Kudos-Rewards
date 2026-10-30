import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, EyeOff, Flag, FolderCog, History, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, SegmentedTabs, Toggle } from '@/components/ui'
import { ConfirmDialog, ErrorState, LoadingCards, TimeAgo, UserAvatar } from '@/components/community/CommunityUI'
import { useToast } from '@/context/ToastContext'
import { useCategories } from '@/hooks/useCommunity'
import { useHiddenContent, useModerate, useModerationLog, useReports, useResolveReport, useSaveCategory } from '@/hooks/useCommunityAdmin'
import { REPORT_REASONS, friendlyError, slugify } from '@/lib/community'

const REASON_LABEL = Object.fromEntries(REPORT_REASONS.map((r) => [r.value, r.label]))
const ACTION_LABEL = {
  hide_post: 'Hid post', unhide_post: 'Restored post', delete_post: 'Removed post',
  hide_comment: 'Hid comment', unhide_comment: 'Restored comment', delete_comment: 'Removed comment',
  dismiss_report: 'Dismissed report', action_report: 'Resolved report', award_badge: 'Awarded badge',
}

function targetLink(r) {
  if (r.post) return `/admin/community/post/${r.post.id}`
  if (r.comment) return `/admin/community/post/${r.comment.post_id}?comment=${r.comment.id}`
  return null
}

function ReportsTab({ status }) {
  const toast = useToast()
  const query = useReports(status)
  const moderate = useModerate()
  const resolve = useResolveReport()
  const [pending, setPending] = useState(null) // { kind: 'hide'|'delete'|'dismiss', report }

  if (query.isLoading) return <LoadingCards count={2} />
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />
  if (!query.data.length) {
    return <Card><EmptyState icon={ShieldCheck} title={status === 'open' ? 'No open reports' : 'No resolved reports yet'} body={status === 'open' ? 'Nothing needs review right now.' : 'Resolved and dismissed reports will appear here.'} /></Card>
  }

  const confirm = (reason) => {
    const { kind, report } = pending
    const done = (msg) => ({ onSuccess: () => { toast.success(msg); setPending(null) }, onError: (e) => toast.error(friendlyError(e)) })
    if (kind === 'dismiss') {
      resolve.mutate({ reportId: report.id, status: 'dismissed', note: reason }, done('Report dismissed'))
    } else {
      moderate.mutate(
        { targetType: report.target_type, targetId: report.post?.id || report.comment?.id, action: kind, reason },
        done(kind === 'hide' ? 'Content hidden' : 'Content removed')
      )
    }
  }

  return (
    <>
      <div className="space-y-3">
        {query.data.map((r) => {
          const gone = !r.post && !r.comment
          const link = targetLink(r)
          const isHidden = r.post?.is_hidden || r.comment?.is_hidden
          return (
            <Card key={r.id} className="!p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="danger"><Flag size={11} /> {REASON_LABEL[r.reason] || r.reason}</Badge>
                <Badge>{r.target_type}</Badge>
                {isHidden && <Badge tone="gold"><EyeOff size={11} /> hidden</Badge>}
                {r.status !== 'open' && <Badge tone={r.status === 'actioned' ? 'success' : 'neutral'}>{r.status}</Badge>}
                <span className="ml-auto text-body-sm text-ink-muted"><TimeAgo date={r.created_at} /></span>
              </div>

              <div className="mt-3 rounded-xl bg-surface-subtle p-3">
                {gone ? (
                  <p className="text-body-sm italic text-ink-muted">Content has since been deleted.</p>
                ) : r.post ? (
                  <p className="text-label-sm text-ink-primary">{r.post.title}</p>
                ) : (
                  <p className="line-clamp-3 text-body-sm text-ink-secondary">{r.comment.is_deleted ? <em>Comment deleted by author</em> : r.comment.body}</p>
                )}
                <p className="mt-1.5 text-body-sm text-ink-muted">
                  By {r.target_author?.name || 'former colleague'} · reported by {r.reporter?.name || 'former colleague'}
                </p>
                {r.details && <p className="mt-1.5 text-body-sm text-ink-secondary">“{r.details}”</p>}
              </div>

              {r.status !== 'open' ? (
                <p className="mt-2 text-body-sm text-ink-muted">
                  {r.resolver?.name ? `${r.resolver.name} · ` : ''}<TimeAgo date={r.resolved_at} />{r.resolution_note ? ` — ${r.resolution_note}` : ''}
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {link && <Link to={link} className="inline-flex h-9 items-center rounded-[10px] px-3 text-label-sm text-brand-text hover:bg-brand-subtle">View in context</Link>}
                  <div className="ml-auto flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setPending({ kind: 'dismiss', report: r })}><Check size={14} /> Dismiss</Button>
                    {!gone && !isHidden && <Button variant="secondary" size="sm" onClick={() => setPending({ kind: 'hide', report: r })}><EyeOff size={14} /> Hide</Button>}
                    {!gone && <Button variant="secondary" size="sm" className="!text-danger-text" onClick={() => setPending({ kind: 'delete', report: r })}><Trash2 size={14} /> Remove</Button>}
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        title={pending?.kind === 'dismiss' ? 'Dismiss report?' : pending?.kind === 'hide' ? 'Hide this content?' : 'Remove this content?'}
        body={
          pending?.kind === 'dismiss'
            ? 'The content stays visible. The reporter is not notified.'
            : pending?.kind === 'hide'
              ? 'Only the author and HR will be able to see it. The author is notified with your reason.'
              : 'This permanently deletes the content. The author is notified with your reason.'
        }
        confirmLabel={pending?.kind === 'dismiss' ? 'Dismiss' : pending?.kind === 'hide' ? 'Hide' : 'Remove'}
        danger={pending?.kind !== 'dismiss'}
        requireReason={pending?.kind !== 'dismiss'}
        reasonLabel="Reason (shared with the author)"
        pending={moderate.isPending || resolve.isPending}
        onConfirm={confirm}
      />
    </>
  )
}

function HiddenTab() {
  const toast = useToast()
  const query = useHiddenContent()
  const moderate = useModerate()

  if (query.isLoading) return <LoadingCards count={2} />
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />
  if (!query.data.length) return <Card><EmptyState icon={EyeOff} title="Nothing is hidden" body="Hidden posts and comments appear here so they can be restored." /></Card>

  return (
    <Card flush>
      <ul className="divide-y divide-stroke-subtle">
        {query.data.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-label-sm text-ink-primary">{item.targetType === 'post' ? item.title : item.body}</p>
              <p className="text-body-sm text-ink-muted">
                {item.targetType} by {item.author?.name || 'former colleague'} · hidden <TimeAgo date={item.hidden_at} />
                {item.hidden_reason && ` — ${item.hidden_reason}`}
              </p>
            </div>
            <Link
              to={item.targetType === 'post' ? `/admin/community/post/${item.id}` : `/admin/community/post/${item.post_id}?comment=${item.id}`}
              className="text-label-sm text-brand-text hover:underline"
            >
              View
            </Link>
            <Button
              variant="secondary"
              size="sm"
              disabled={moderate.isPending}
              onClick={() =>
                moderate.mutate(
                  { targetType: item.targetType, targetId: item.id, action: 'unhide' },
                  { onSuccess: () => toast.success('Restored'), onError: (e) => toast.error(friendlyError(e)) }
                )
              }
            >
              Restore
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function LogTab() {
  const query = useModerationLog()
  if (query.isLoading) return <LoadingCards count={2} />
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />
  if (!query.data.length) return <Card><EmptyState icon={History} title="No moderation activity" body="Every HR moderation action is recorded here." /></Card>

  return (
    <Card flush>
      <ul className="divide-y divide-stroke-subtle">
        {query.data.map((a) => (
          <li key={a.id} className="flex items-start gap-3 px-4 py-3">
            <UserAvatar user={a.moderator} size="sm" />
            <div className="min-w-0 flex-1 text-body-sm">
              <p className="text-ink-primary">
                <span className="font-medium">{a.moderator?.name || 'Former admin'}</span> {ACTION_LABEL[a.action]?.toLowerCase() || a.action}
                {a.target_author?.name && <> · {a.target_author.name}</>}
              </p>
              {a.target_label && <p className="truncate text-ink-muted">{a.target_label}</p>}
              {a.reason && <p className="text-ink-secondary">Reason: {a.reason}</p>}
            </div>
            <span className="shrink-0 text-[11px] text-ink-muted"><TimeAgo date={a.created_at} /></span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function CategoriesTab() {
  const toast = useToast()
  const query = useCategories({ includeInactive: true })
  const save = useSaveCategory()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const add = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    const slug = slugify(trimmed)
    if (trimmed.length < 2 || slug.length < 2) return toast.error('Enter a category name (2–40 characters).')
    save.mutate(
      { name: trimmed, slug, description: description.trim() || null },
      { onSuccess: () => { setName(''); setDescription(''); toast.success('Category added') }, onError: (err) => toast.error(friendlyError(err)) }
    )
  }

  if (query.isLoading) return <LoadingCards count={1} />
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />

  return (
    <div className="space-y-4">
      <Card>
        <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
          <Input className="sm:w-56" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="New category name" aria-label="Category name" />
          <Input className="flex-1" value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} placeholder="Short description (optional)" aria-label="Category description" />
          <Button type="submit" disabled={save.isPending || !name.trim()}>{save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add</Button>
        </form>
      </Card>
      <Card flush>
        <ul className="divide-y divide-stroke-subtle">
          {query.data.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-label-sm text-ink-primary">{c.name}</p>
                {c.description && <p className="truncate text-body-sm text-ink-muted">{c.description}</p>}
              </div>
              <span className="text-body-sm text-ink-muted">{c.is_active ? 'Active' : 'Hidden from new posts'}</span>
              <Toggle
                checked={c.is_active}
                label={`${c.is_active ? 'Deactivate' : 'Activate'} ${c.name}`}
                onChange={(v) =>
                  save.mutate(
                    { ...c, is_active: v },
                    { onSuccess: () => toast.success(v ? 'Category activated' : 'Category deactivated'), onError: (err) => toast.error(friendlyError(err)) }
                  )
                }
              />
            </li>
          ))}
        </ul>
      </Card>
      <p className="text-body-sm text-ink-muted">Categories are deactivated rather than deleted so existing posts keep their category.</p>
    </div>
  )
}

const TABS = [
  { value: 'open', label: 'Open reports' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'hidden', label: 'Hidden content' },
  { value: 'log', label: 'Audit log' },
  { value: 'categories', label: 'Categories' },
]

export default function CommunityModerationPage() {
  const [tab, setTab] = useState('open')
  return (
    <div className="mx-auto max-w-[960px] animate-fade-in">
      <h1 className="hidden text-display-lg text-ink-primary md:block">Community moderation</h1>
      <p className="text-body-md text-ink-secondary md:mt-1.5">Review reports, manage hidden content and categories. Every action is recorded in the audit log.</p>
      <div className="-mx-4 mt-5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
        <SegmentedTabs options={TABS} value={tab} onChange={setTab} size="sm" className="whitespace-nowrap" />
      </div>
      <div className="mt-4">
        {tab === 'open' && <ReportsTab status="open" />}
        {tab === 'resolved' && <ReportsTab status="resolved" />}
        {tab === 'hidden' && <HiddenTab />}
        {tab === 'log' && <LogTab />}
        {tab === 'categories' && <CategoriesTab />}
      </div>
      <p className="mt-6 flex items-center gap-1.5 text-body-sm text-ink-muted"><FolderCog size={14} /> Private messages are never visible to HR moderation.</p>
    </div>
  )
}
