/**
 * Screen 2 — Recipient dashboard
 * Balance card, quick actions, personal ledger, company recognition feed.
 * Figma: "02 · Recipient Dashboard"
 */
import { ChevronRight, Gift, History, ListFilter, Sparkles, Trophy, Zap } from 'lucide-react'
import AppShell from '../components/shell/AppShell'
import {
  Avatar, AvatarStack, Badge, Card, IconTile, PointsPill, ProgressBar,
  SectionTitle, VAULT_GRADIENT, cx,
} from '../components/ui'
import { FEED, MY_ACTIVITY, RECIPIENT, formatPoints, signedPoints } from '../lib/data'

const NEXT_REWARD = { name: 'Wireless Earbuds', cost: 3000 }

/* ------------------------------------------------------------ balance card */

export function BalanceCard({ compact = false }) {
  const remaining = NEXT_REWARD.cost - RECIPIENT.balance
  const pct = (RECIPIENT.balance / NEXT_REWARD.cost) * 100

  return (
    <div
      className={cx('relative overflow-hidden rounded-[20px] shadow-elevation-lg', compact ? 'p-5' : 'p-6 md:p-7')}
      style={VAULT_GRADIENT}
    >
      <div className="pointer-events-none absolute -right-16 -top-28 h-72 w-72 rounded-full bg-[#6b5afa] opacity-55 blur-[90px]" />

      <div className="relative flex items-start">
        <div>
          <p className="text-overline uppercase text-white/55">Available balance</p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className={cx('font-bold tracking-[-0.04em] text-white', compact ? 'text-[44px] leading-[46px]' : 'text-numeric-hero')}>
              {formatPoints(RECIPIENT.balance)}
            </span>
            <span className="text-heading-md text-white/50">pts</span>
          </p>
        </div>
        <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.12] px-3 py-1.5 text-label-xs text-white/90 sm:inline-flex">
          <Zap size={13} className="text-[#fbbf24]" fill="currentColor" />
          +500 this week
        </span>
      </div>

      <div className="relative mt-6">
        <div className="flex items-center text-label-xs text-white/70">
          <span>
            {formatPoints(remaining)} pts to {NEXT_REWARD.name}
          </span>
          <span className="ml-auto font-mono text-[11px] text-white/50">
            {formatPoints(RECIPIENT.balance)} / {formatPoints(NEXT_REWARD.cost)}
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
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-white px-4 text-label-sm text-[#18181b] transition-transform duration-200 ease-smooth active:scale-[0.97] sm:flex-none"
        >
          <Gift size={15} />
          Redeem points
        </button>
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center rounded-[10px] border border-white/[0.16] bg-white/10 px-4 text-label-sm text-white/90 transition-transform duration-200 ease-smooth active:scale-[0.97]"
        >
          View statement
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- feed card */

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
        <PointsPill value={post.points} size="sm" className="ml-auto shrink-0" />
      </div>

      <p className="mt-2.5 text-body-sm text-ink-secondary">{post.message}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {post.tags.map((tag) => (
          <Badge key={tag} tone="brand">
            {tag}
          </Badge>
        ))}
      </div>
    </article>
  )
}

/* ------------------------------------------------------------ the screen */

export default function Screen2(props) {
  const quickActions = [
    { icon: Gift, title: 'Browse rewards', short: 'Rewards', sub: '42 items available', go: 'catalog' },
    { icon: History, title: 'My history', short: 'History', sub: '18 transactions', go: 'history' },
    { icon: Trophy, title: 'Leaderboard', short: `Rank #${RECIPIENT.rank}`, sub: `You rank #${RECIPIENT.rank}`, go: 'dashboard' },
  ]

  return (
    <AppShell role="recipient" active="dashboard" title={`Hi, ${RECIPIENT.first}`} {...props}>
      <div className="mx-auto max-w-[1120px]">
        <div className="hidden md:block">
          <h1 className="text-display-lg text-ink-primary">Good afternoon, {RECIPIENT.first}</h1>
          <p className="mt-1.5 text-body-md text-ink-secondary">
            You have {formatPoints(RECIPIENT.balance)} points ready to spend. Three teammates recognized you this week.
          </p>
        </div>

        <div className="mt-0 grid gap-5 md:mt-6 lg:grid-cols-[1fr_412px]">
          {/* ------------------------------------------------ left column */}
          <div className="flex flex-col gap-4">
            <BalanceCard />

            <div className="grid grid-cols-3 gap-3">
              {quickActions.map(({ icon: Icon, title, short, sub, go }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => props.onNavigate?.(go)}
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
                    <button type="button" className="text-label-sm text-brand-text transition hover:opacity-80">
                      View all
                    </button>
                  }
                />
              </div>
              <div className="border-t border-stroke-subtle">
                {MY_ACTIVITY.map((row, i) => {
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
                })}
              </div>
            </Card>
          </div>

          {/* ----------------------------------------------- right column */}
          <Card flush className="self-start">
            <div className="p-5 pb-4">
              <SectionTitle
                title="Company recognition"
                subtitle="Live across Acme Corp"
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
              {FEED.map((post) => (
                <RecognitionPost key={post.id} post={post} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
