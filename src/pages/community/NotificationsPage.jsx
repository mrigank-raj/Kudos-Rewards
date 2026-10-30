import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Award, Bell, CheckCheck, CircleCheck, Gift, Heart, Loader2, MessageSquare, MessagesSquare, Reply, ShieldAlert, Sparkles, Zap } from 'lucide-react'
import { Button, Card, EmptyState, SegmentedTabs, cx } from '@/components/ui'
import { ErrorState, LoadMore, LoadingCards, TimeAgo } from '@/components/community/CommunityUI'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/context/ToastContext'
import { useMarkNotificationsRead, useNotificationFeed, useUnreadNotificationCount } from '@/hooks/useNotifications'
import { resolveAppLink } from '@/lib/community'

const TYPE_ICON = {
  kudos_received: { icon: Sparkles, tone: 'text-brand-solid bg-brand-subtle' },
  points_credited: { icon: Zap, tone: 'text-gold-solid bg-gold-subtle' },
  redemption_status: { icon: Gift, tone: 'text-success-solid bg-success-subtle' },
  community_comment: { icon: MessageSquare, tone: 'text-brand-solid bg-brand-subtle' },
  community_reply: { icon: Reply, tone: 'text-brand-solid bg-brand-subtle' },
  community_answer_accepted: { icon: CircleCheck, tone: 'text-success-solid bg-success-subtle' },
  community_appreciation: { icon: Heart, tone: 'text-danger-solid bg-danger-subtle' },
  community_message: { icon: MessagesSquare, tone: 'text-brand-solid bg-brand-subtle' },
  community_moderation: { icon: ShieldAlert, tone: 'text-danger-solid bg-danger-subtle' },
  badge_awarded: { icon: Award, tone: 'text-gold-solid bg-gold-subtle' },
}

export default function NotificationsPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [tab, setTab] = useState('all')
  const query = useNotificationFeed({ unreadOnly: tab === 'unread' })
  const { data: unreadCount = 0 } = useUnreadNotificationCount()
  const markRead = useMarkNotificationsRead()
  const items = useMemo(() => query.data?.pages.flat() || [], [query.data])

  const open = (n) => {
    if (!n.read) markRead.mutate([n.id])
    const to = resolveAppLink(profile?.role, n.link)
    if (to) navigate(to)
  }

  return (
    <div className="mx-auto max-w-[760px] animate-fade-in">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="hidden text-display-lg text-ink-primary md:block">Notifications</h1>
          <p className="text-body-md text-ink-secondary md:mt-1.5">
            {unreadCount ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.` : "You're all caught up."}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="ml-auto"
          disabled={!unreadCount || markRead.isPending}
          onClick={() => markRead.mutate(undefined, { onSuccess: () => toast.success('All notifications marked as read') })}
        >
          {markRead.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />} Mark all as read
        </Button>
      </div>

      <SegmentedTabs
        className="mt-4"
        size="sm"
        options={[{ value: 'all', label: 'All' }, { value: 'unread', label: 'Unread', count: unreadCount }]}
        value={tab}
        onChange={setTab}
      />

      <div className="mt-4">
        {query.isLoading ? (
          <LoadingCards count={3} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : items.length === 0 ? (
          <Card><EmptyState icon={Bell} title={tab === 'unread' ? 'No unread notifications' : 'No notifications yet'} body="Replies, answers, appreciation, messages and badges will show up here." /></Card>
        ) : (
          <Card flush>
            <ul className="divide-y divide-stroke-subtle">
              {items.map((n) => {
                const meta = TYPE_ICON[n.type] || { icon: Bell, tone: 'text-ink-muted bg-surface-subtle' }
                const Icon = meta.icon
                const clickable = !!n.link || !n.read
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => open(n)}
                      disabled={!clickable}
                      className={cx(
                        'flex w-full items-start gap-3 px-4 py-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-solid/40',
                        !n.read && 'bg-brand-subtle/30',
                        clickable && 'hover:bg-surface-subtle'
                      )}
                    >
                      <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-xl', meta.tone)}><Icon size={16} /></span>
                      <span className="min-w-0 flex-1">
                        <span className={cx('block text-label-sm', n.read ? 'text-ink-secondary' : 'text-ink-primary')}>{n.title}</span>
                        {n.body && <span className="mt-0.5 block line-clamp-2 text-body-sm text-ink-muted">{n.body}</span>}
                        <span className="mt-1 block text-[11px] text-ink-muted"><TimeAgo date={n.created_at} /></span>
                      </span>
                      {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-solid" aria-label="Unread" />}
                    </button>
                  </li>
                )
              })}
            </ul>
            <LoadMore query={query} />
          </Card>
        )}
      </div>
    </div>
  )
}
