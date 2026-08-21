import { ChevronRight, Gift, History, ListFilter, Sparkles, Trophy, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTransactions } from '@/hooks/useTransactions'
import { useKudos } from '@/hooks/useKudos'
import {
  AvatarStack, Badge, Card, IconTile, PointsPill, ProgressBar,
  SectionTitle, VAULT_GRADIENT, cx,
} from '@/components/ui'

const NEXT_REWARD = { name: 'Wireless Earbuds', cost: 3000 }

const formatPoints = (p) => (p || 0).toLocaleString()
const signedPoints = (p) => p > 0 ? `+${p}` : `${p}`

export function BalanceCard({ balance, onRedeem, compact = false }) {
  const safeBalance = balance || 0
  const remaining = Math.max(0, NEXT_REWARD.cost - safeBalance)
  const pct = Math.min(100, (safeBalance / NEXT_REWARD.cost) * 100)

  return (
    <div
      className={cx('relative overflow-hidden rounded-[20px] shadow-elevation-lg', compact ? 'p-5' : 'p-6 md:p-7')}
      style={VAULT_GRADIENT}
    >
      <div className="pointer-events-none absolute -right-16 -top-28 h-72 w-72 rounded-full bg-[#6b5afa] opacity-55 blur-[90px]" />

      <div className="relative flex items-start">
        <div>
          <p className="text-overline-sm uppercase text-white/55">Available balance</p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className={cx('font-bold tracking-[-0.04em] text-white', compact ? 'text-[44px] leading-[46px]' : 'text-numeric-hero')}>
              {formatPoints(safeBalance)}
            </span>
            <span className="text-heading-md text-white/50">pts</span>
          </p>
        </div>
      </div>

      <div className="relative mt-6">
        <div className="flex items-center text-label-xs text-white/70">
          <span>
            {formatPoints(remaining)} pts to {NEXT_REWARD.name}
          </span>
          <span className="ml-auto font-mono text-[11px] text-white/50">
            {formatPoints(safeBalance)} / {formatPoints(NEXT_REWARD.cost)}
          </span>
        </div>
        <ProgressBar
          value={pct}
          height={6}
          className="mt-2.5 bg-white/[0.14]"
          style={{ backgroundImage: 'linear-gradient(90deg, #8c80ff 0%, #fbbf24 100%)' }}
        />
      </div>

      <div className="relative mt-6 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={onRedeem}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-white px-4 text-label-sm text-[#18181b] transition-transform duration-200 ease-smooth active:scale-[0.97] sm:flex-none"
        >
          <Gift size={15} />
          Redeem points
        </button>
      </div>
    </div>
  )
}

export function RecognitionPost({ post }) {
  return (
    <article className="rounded-2xl bg-surface-subtle p-3.5">
      <div className="flex items-center gap-2.5">
        <AvatarStack people={[post.from, post.to]} size="sm" ringClass="ring-surface-subtle" />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-label-sm text-ink-primary">
            <span className="truncate">{post.from.name}</span>
            <ChevronRight size={11} className="shrink-0 text-ink-muted" />
            <span className="truncate">{post.to.name}</span>
          </p>
          <p className="font-mono text-[11px] leading-4 text-ink-muted">{post.time}</p>
        </div>
        {post.points > 0 && (
          <PointsPill value={post.points} size="sm" className="ml-auto shrink-0" />
        )}
      </div>

      <p className="mt-2.5 text-body-sm text-ink-secondary">{post.message}</p>

      {post.tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <Badge key={tag} tone="brand">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </article>
  )
}

export default function RecipientDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { data: transactions } = useTransactions('all')
  const { kudosFeed } = useKudos()

  const firstName = profile?.name?.split(' ')[0] || 'User'
  const balance = profile?.points_balance || 0

  const quickActions = [
    { icon: Gift, title: 'Browse rewards', short: 'Rewards', sub: 'Redeem your points', go: '/app/catalog' },
    { icon: History, title: 'My history', short: 'History', sub: 'View transactions', go: '/app/history' },
    { icon: Trophy, title: 'Leaderboard', short: 'Rank', sub: 'View top earners', go: '/app/dashboard' },
  ]

  const mappedActivity = (transactions || []).slice(0, 5).map(tx => ({
    id: tx.id,
    title: tx.type === 'earn' ? 'Earned points' : 'Redeemed reward',
    amount: tx.type === 'earn' ? tx.amount : -tx.amount,
    date: new Date(tx.created_at).toLocaleDateString(),
    icon: tx.type === 'earn' ? (tx.description?.toLowerCase().includes('kudos') ? 'Sparkles' : 'Zap') : 'Gift',
    meta: tx.description || 'System transaction'
  }))

  const mappedFeed = (kudosFeed || []).map(post => ({
    id: post.id,
    from: { name: post.from_user?.name || 'Unknown', avatar: post.from_user?.avatar_url },
    to: { name: post.to_user?.name || 'Unknown', avatar: post.to_user?.avatar_url },
    time: new Date(post.created_at).toLocaleDateString(),
    points: post.points_included || 0,
    message: post.message,
    tags: []
  }))

  return (
    <div className="mx-auto max-w-[1120px] animate-fade-in">
      <div className="hidden lg:block">
        <h1 className="text-display-lg text-ink-primary">Good afternoon, {firstName}</h1>
        <p className="mt-1.5 text-body-md text-ink-secondary">
          You have {formatPoints(balance)} points ready to spend.
        </p>
      </div>

      <div className="min-h-full pb-8">
        <div className="mx-auto mt-6 grid max-w-6xl items-start gap-4 lg:mt-8 xl:grid-cols-[1fr_360px] xl:gap-8">
          {/* ----------------------------------------------- left column */}
          <div className="flex flex-col gap-4">
          <BalanceCard balance={balance} onRedeem={() => navigate('/app/catalog')} />

          <div className="grid grid-cols-3 gap-3">
            {quickActions.map(({ icon: Icon, title, short, sub, go }) => (
              <button
                key={title}
                type="button"
                onClick={() => navigate(go)}
                className={cx(
                  'rounded-2xl border border-stroke-subtle bg-surface-base p-4 text-left',
                  'transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:shadow-elevation-md active:scale-[0.98]'
                )}
              >
                <IconTile icon={Icon} tone="brand" size={32} iconSize={16} className="rounded-[9px]" />
                <p className="mt-3 text-label-md text-ink-primary">
                  <span className="hidden sm:inline">{title}</span>
                  <span className="sm:hidden">{short}</span>
                </p>
                <p className="mt-0.5 hidden text-body-sm text-ink-muted sm:block">{sub}</p>
              </button>
            ))}
          </div>

          <Card flush>
            <div className="p-5 pb-4">
              <SectionTitle
                title="My recent activity"
                action={
                  <button type="button" onClick={() => navigate('/app/history')} className="text-label-sm text-brand-text transition hover:opacity-80">
                    View all
                  </button>
                }
              />
            </div>
            <div className="border-t border-stroke-subtle">
              {mappedActivity.length === 0 ? (
                <div className="p-5 text-center text-body-sm text-ink-muted">No recent activity</div>
              ) : (
                mappedActivity.map((row, i) => {
                  const positive = row.amount > 0
                  const Icon = row.icon === 'Gift' ? Gift : row.icon === 'Sparkles' ? Sparkles : Zap
                  return (
                    <div
                      key={row.id}
                      className={cx(
                        'flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-surface-subtle/60',
                        i > 0 && 'border-t border-stroke-subtle'
                      )}
                    >
                      <IconTile icon={Icon} tone={positive ? 'success' : 'danger'} size={34} iconSize={16} />
                      <div className="min-w-0">
                        <p className="truncate text-label-sm text-ink-primary">{row.title}</p>
                        <p className="truncate text-body-sm text-ink-muted">
                          {row.meta} · {row.date}
                        </p>
                      </div>
                      <span
                        className={cx(
                          'ml-auto shrink-0 text-numeric-lg',
                          positive ? 'text-success-text' : 'text-danger-text'
                        )}
                      >
                        {signedPoints(row.amount)}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </Card>
        </div>

        {/* ----------------------------------------------- right column */}
        <Card flush className="self-start">
          <div className="p-5 pb-4">
            <SectionTitle
              title="Company recognition"
              subtitle="Live across your organization"
              action={
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-surface-subtle px-2.5 py-1.5 text-label-xs text-ink-secondary transition hover:text-ink-primary"
                >
                  <ListFilter size={12} />
                  All
                </button>
              }
            />
          </div>
          <div className="flex flex-col gap-2.5 border-t border-stroke-subtle p-4">
            {mappedFeed.length === 0 ? (
              <div className="text-center text-body-sm text-ink-muted py-4">No kudos yet. Be the first to send one!</div>
            ) : (
              mappedFeed.map((post) => (
                <RecognitionPost key={post.id} post={post} />
              ))
            )}
          </div>
        </Card>
      </div>
      </div>
    </div>
  )
}
