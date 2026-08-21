/**
 * Screen 4 — Reward catalog
 * Ecommerce grade grid. Items above balance render locked with a progress bar
 * showing exactly how far off the recipient is.
 * Figma: "04 · Reward Catalog"
 */
import { useMemo, useState } from 'react'
import {
  Coffee, Film, Gift, Headphones, Lock, Package, Shirt, SlidersHorizontal,
  Sparkles, Sun, Utensils, Zap,
} from 'lucide-react'
import AppShell from '../components/shell/AppShell'
import { ChipRow, ProgressBar, SearchInput, SegmentedTabs, cx } from '../components/ui'
import { RECIPIENT, REWARDS, REWARD_CATEGORIES, formatPoints } from '../lib/data'

const ICONS = { Coffee, Utensils, Package, Film, Shirt, Headphones, Sparkles, Sun }

const CATEGORY_MATCH = {
  All: () => true,
  'Gift cards': (r) => r.category === 'Gift card',
  Experiences: (r) => r.category === 'Experience',
  Merch: (r) => r.category === 'Merch',
  Wellness: (r) => r.category === 'Wellness' || r.category === 'Time off',
}

export function RewardCard({ reward, onRedeem }) {
  const Icon = ICONS[reward.icon]
  const locked = reward.cost > RECIPIENT.balance
  const short = reward.cost - RECIPIENT.balance
  const pct = (RECIPIENT.balance / reward.cost) * 100

  return (
    <article
      className={cx(
        'group flex flex-col overflow-hidden rounded-2xl border border-stroke-subtle bg-surface-base',
        'shadow-elevation-sm transition-all duration-300 ease-smooth md:shadow-elevation-md',
        !locked && 'hover:-translate-y-1 hover:shadow-elevation-lg'
      )}
    >
      {/* media */}
      <div
        className="relative grid h-24 place-items-center overflow-hidden md:h-[146px]"
        style={{ backgroundImage: `linear-gradient(135deg, ${reward.from} 0%, ${reward.to} 100%)` }}
      >
        <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/[0.16] blur-[50px]" />
        <Icon
          className={cx(
            'relative transition-transform duration-500 ease-smooth',
            locked ? 'text-white/40' : 'text-white/95 group-hover:scale-110'
          )}
          size={34}
          strokeWidth={1.6}
        />
        <span className="absolute left-3 top-3 hidden rounded-full border border-white/25 bg-white/20 px-2.5 py-1 font-mono text-[11px] leading-4 text-white/95 md:block">
          {reward.category}
        </span>
        {locked && (
          <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full border border-white/25 bg-white/20 md:h-7 md:w-7">
            <Lock size={12} className="text-white/90" />
          </span>
        )}
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col p-3 md:p-4">
        <h3 className={cx('text-label-md md:text-heading-sm', locked ? 'text-ink-secondary' : 'text-ink-primary')}>
          <span className="md:hidden">{reward.short}</span>
          <span className="hidden md:inline">{reward.title}</span>
        </h3>
        <p className="mt-0.5 font-mono text-[11px] leading-4 text-ink-muted md:mt-1 md:font-sans md:text-body-sm">
          <span className="md:hidden">{reward.category}</span>
          <span className="hidden md:inline">{reward.desc}</span>
        </p>

        <p className="mt-2.5 flex items-center gap-1.5 md:mt-3">
          <Zap size={14} className={locked ? 'text-ink-muted' : 'text-gold-solid'} fill={locked ? 'none' : 'currentColor'} />
          <span className={cx('text-label-md md:text-numeric-lg', locked ? 'text-ink-secondary' : 'text-ink-primary')}>
            {formatPoints(reward.cost)}
          </span>
          <span className="hidden text-label-xs text-ink-muted md:inline">pts</span>
        </p>

        <div className="mt-3 md:mt-3.5">
          {locked ? (
            <>
              <div className="flex items-center justify-between font-mono text-[11px] leading-4 text-ink-muted">
                <span>Need {formatPoints(short)} more</span>
                <span className="hidden md:inline">{Math.round(pct)}%</span>
              </div>
              <ProgressBar value={pct} height={5} className="mt-1.5" barClassName="bg-gold-solid" />
              <button
                type="button"
                disabled
                className="mt-2.5 hidden h-10 w-full items-center justify-center gap-1.5 rounded-[10px] bg-surface-subtle text-label-sm text-ink-muted md:inline-flex"
              >
                <Lock size={13} />
                Locked
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onRedeem?.(reward)}
              className="inline-flex h-10 w-full items-center justify-center rounded-[10px] text-label-sm text-white transition-all duration-200 ease-smooth hover:brightness-110 active:scale-[0.97]"
              style={{ backgroundImage: 'var(--brand-gradient)' }}
            >
              Redeem
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default function Screen4({ onRedeem, ...props }) {
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')

  const visible = useMemo(
    () =>
      REWARDS.filter(CATEGORY_MATCH[category]).filter((r) =>
        r.title.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [category, query]
  )

  return (
    <AppShell role="recipient" active="catalog" title="Rewards" {...props}>
      <div className="mx-auto max-w-[1120px]">
        <div className="hidden items-center md:flex">
          <div>
            <h1 className="text-display-lg text-ink-primary">Rewards catalog</h1>
            <p className="mt-1.5 text-body-md text-ink-secondary">
              42 rewards from 12 partners. Points never expire.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2.5 rounded-xl border border-stroke-subtle bg-surface-base px-4 py-2.5 shadow-elevation-sm">
            <Zap size={16} className="text-gold-solid" fill="currentColor" />
            <div>
              <p className="font-mono text-[11px] leading-4 text-ink-muted">Your balance</p>
              <p className="text-label-md text-ink-primary">{formatPoints(RECIPIENT.balance)} pts</p>
            </div>
          </div>
        </div>

        {/* filters */}
        <div className="flex items-center gap-2.5 md:mt-6">
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rewards"
            className="flex-1 md:max-w-[260px] md:flex-none"
          />
          <SegmentedTabs
            className="hidden md:inline-flex"
            options={REWARD_CATEGORIES}
            value={category}
            onChange={setCategory}
          />
          <button
            type="button"
            aria-label="Sort and filter"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-stroke-subtle bg-surface-base text-ink-secondary md:ml-auto md:hidden"
          >
            <SlidersHorizontal size={16} />
          </button>
          <button
            type="button"
            className="ml-auto hidden h-10 items-center gap-2 rounded-[10px] border border-stroke-subtle bg-surface-base px-3.5 text-label-sm text-ink-secondary transition hover:text-ink-primary md:inline-flex"
          >
            <SlidersHorizontal size={14} />
            Points: low to high
          </button>
        </div>

        <ChipRow className="mt-3 md:hidden" options={REWARD_CATEGORIES} value={category} onChange={setCategory} />

        {/* grid: 2 up on mobile, 4 up on desktop */}
        <div className="mt-4 grid grid-cols-2 gap-3 md:mt-5 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {visible.map((reward) => (
            <RewardCard key={reward.id} reward={reward} onRedeem={onRedeem} />
          ))}
        </div>

        {visible.length === 0 && (
          <div className="mt-16 flex flex-col items-center text-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-subtle">
              <Gift size={26} className="text-brand-solid" />
            </span>
            <h3 className="mt-4 text-heading-sm text-ink-primary">Nothing matches that</h3>
            <p className="mt-1.5 text-body-sm text-ink-muted">Try a different search or category.</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
