import { useState, useCallback, useMemo } from 'react'
import {
  ArrowRight, Coffee, Film, Gift, Headphones, Lock, Mail, Package,
  Shield, Shirt, SlidersHorizontal, Sparkles, Sun, Utensils, Zap
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useCatalog, useCatalogCategories } from '@/hooks/useCatalog'
import { useRedeemReward } from '@/hooks/useRedemptions'
import { supabase } from '@/config/supabase'
import { ChipRow, ProgressBar, SearchInput, SegmentedTabs, Sheet, Button, Divider, cx } from '@/components/ui'

const ICONS = {
  'Gift Cards': Coffee,
  'Experiences': Film,
  'Company Swag': Shirt,
  'Time Off': Sun,
}

const GRADIENTS = [
  { from: '#f59e0b', to: '#ef4444' },
  { from: '#10b981', to: '#3b82f6' },
  { from: '#6366f1', to: '#a855f7' },
  { from: '#ec4899', to: '#f43f5e' }
]

function getIconForCategory(cat) {
  return ICONS[cat] || Gift
}

function getGradient(id) {
  if (!id) return GRADIENTS[0]
  const idx = String(id).charCodeAt(0) % GRADIENTS.length
  return GRADIENTS[idx]
}

const formatPoints = (p) => (p || 0).toLocaleString()

function Row({ label, value, tone, emphasis }) {
  return (
    <div className="flex items-center py-3.5">
      <span className={emphasis ? 'text-label-md text-ink-primary' : 'text-body-md text-ink-secondary'}>{label}</span>
      <span className={`ml-auto ${emphasis ? 'text-numeric-lg text-ink-primary' : `text-label-md ${tone ?? 'text-ink-primary'}`}`}>
        {value}
      </span>
    </div>
  )
}

function RedeemSheet({ open, onClose, reward, userBalance, onConfirm, isRedeeming }) {
  const { profile } = useAuth()
  if (!reward) return null
  
  const Icon = getIconForCategory(reward.category)
  const gradient = getGradient(reward.id)
  const after = userBalance - reward.points_cost

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Confirm redemption"
      width={470}
      footer={
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} className="sm:w-auto" disabled={isRedeeming}>
            Cancel
          </Button>
          <Button onClick={onConfirm} className="sm:w-auto" disabled={isRedeeming}>
            {isRedeeming ? 'Redeeming...' : 'Confirm redemption'}
            {!isRedeeming && <ArrowRight size={15} />}
          </Button>
        </div>
      }
    >
      {/* product */}
      <div className="flex items-center gap-3.5 rounded-2xl bg-surface-subtle p-3.5">
        <span
          className="grid h-14 w-14 shrink-0 place-items-center rounded-[13px]"
          style={{ backgroundImage: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)` }}
        >
          <Icon size={24} className="text-white/95" strokeWidth={1.7} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-label-md text-ink-primary md:text-heading-sm">{reward.name}</p>
          <p className="mt-0.5 truncate text-body-sm text-ink-muted">{reward.description} · Digital delivery</p>
        </div>
        <span className="ml-auto hidden shrink-0 items-center gap-1.5 md:flex">
          <Zap size={15} className="text-gold-solid" fill="currentColor" />
          <span className="text-numeric-lg text-ink-primary">{formatPoints(reward.points_cost)}</span>
        </span>
      </div>

      {/* the maths */}
      <div className="mt-5 rounded-2xl border border-stroke-subtle px-4">
        <Row label="Current balance" value={`${formatPoints(userBalance)} pts`} />
        <Divider />
        <Row label="Reward cost" value={`−${formatPoints(reward.points_cost)} pts`} tone="text-danger-text" />
        <Divider />
        <Row label="New balance" value={`${formatPoints(after)} pts`} emphasis />
      </div>

      {/* reassurance */}
      <ul className="mt-4 space-y-2.5">
        <li className="flex items-center gap-2.5 text-body-sm text-ink-muted">
          <Mail size={15} className="shrink-0" />
          Code emailed to {profile?.email || 'your email'} within 5 minutes
        </li>
        <li className="flex items-center gap-2.5 text-body-sm text-ink-muted">
          <Shield size={15} className="shrink-0" />
          Redemptions are final and logged to the ledger
        </li>
      </ul>
    </Sheet>
  )
}

function RewardCard({ reward, userBalance, onRedeem }) {
  const Icon = getIconForCategory(reward.category)
  const gradient = getGradient(reward.id)
  
  const cost = reward.points_cost || 0
  const locked = cost > userBalance
  const short = Math.max(0, cost - userBalance)
  const pct = Math.min(100, (userBalance / cost) * 100)

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
        style={{ backgroundImage: `linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%)` }}
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
          <span className="md:hidden truncate block">{reward.name}</span>
          <span className="hidden md:inline">{reward.name}</span>
        </h3>
        <p className="mt-0.5 font-mono text-[11px] leading-4 text-ink-muted md:mt-1 md:font-sans md:text-body-sm">
          <span className="md:hidden">{reward.category}</span>
          <span className="hidden md:inline truncate block">{reward.description}</span>
        </p>

        <p className="mt-2.5 flex items-center gap-1.5 md:mt-3">
          <Zap size={14} className={locked ? 'text-ink-muted' : 'text-gold-solid'} fill={locked ? 'none' : 'currentColor'} />
          <span className={cx('text-label-md md:text-numeric-lg', locked ? 'text-ink-secondary' : 'text-ink-primary')}>
            {formatPoints(cost)}
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

export default function CatalogPage() {
  const { profile, user } = useAuth()
  const { data: items, isLoading } = useCatalog()
  const rawCategories = useCatalogCategories()
  
  // Create tabs array including "All"
  const categories = ['All', ...rawCategories]
  const redeemReward = useRedeemReward()

  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)

  const [localBalance, setLocalBalance] = useState(null)
  const currentBalance = localBalance ?? profile?.points_balance ?? 0

  const visible = useMemo(
    () =>
      (items || []).filter(r => category === 'All' || r.category === category).filter((r) =>
        r.name.toLowerCase().includes(query.trim().toLowerCase()) || 
        (r.description || '').toLowerCase().includes(query.trim().toLowerCase())
      ),
    [items, category, query]
  )

  const handleConfirmRedeem = useCallback(async () => {
    if (!selectedItem) return

    const payload = {
      rewardId: selectedItem.id,
      pointsCost: selectedItem.points_cost,
    }

    await redeemReward.mutateAsync(payload)

    setLocalBalance((prev) => {
      const base = prev ?? profile?.points_balance ?? 0
      return base - payload.pointsCost
    })

    if (user?.id) {
      const { data } = await supabase
        .from('users')
        .select('points_balance')
        .eq('id', user.id)
        .single()
      if (data) setLocalBalance(data.points_balance)
    }
    
    setSelectedItem(null)
  }, [redeemReward, selectedItem, profile, user])

  return (
    <div className="mx-auto max-w-[1120px] animate-fade-in">
      <div className="hidden items-center md:flex">
        <div>
          <h1 className="text-display-lg text-ink-primary">Rewards catalog</h1>
          <p className="mt-1.5 text-body-md text-ink-secondary">
            {items?.length || 0} rewards from partners. Points never expire.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2.5 rounded-xl border border-stroke-subtle bg-surface-base px-4 py-2.5 shadow-elevation-sm">
          <Zap size={16} className="text-gold-solid" fill="currentColor" />
          <div>
            <p className="font-mono text-[11px] leading-4 text-ink-muted">Your balance</p>
            <p className="text-label-md text-ink-primary">{formatPoints(currentBalance)} pts</p>
          </div>
        </div>
      </div>

      {/* filters */}
      <div className="flex items-center gap-2.5 mt-2 md:mt-6">
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search rewards"
          className="flex-1 md:max-w-[260px] md:flex-none"
        />
        <SegmentedTabs
          className="hidden md:inline-flex"
          options={categories}
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

      <ChipRow className="mt-3 md:hidden" options={categories} value={category} onChange={setCategory} />

      {/* grid: 2 up on mobile, 4 up on desktop */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:mt-5 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {isLoading ? (
          <div className="col-span-full py-20 text-center text-ink-muted">Loading catalog...</div>
        ) : visible.map((reward) => (
          <RewardCard key={reward.id} reward={reward} userBalance={currentBalance} onRedeem={() => setSelectedItem(reward)} />
        ))}
      </div>

      {!isLoading && visible.length === 0 && (
        <div className="mt-16 flex flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-subtle">
            <Gift size={26} className="text-brand-solid" />
          </span>
          <h3 className="mt-4 text-heading-sm text-ink-primary">Nothing matches that</h3>
          <p className="mt-1.5 text-body-sm text-ink-muted">Try a different search or category.</p>
        </div>
      )}

      {/* Redeem Modal */}
      <RedeemSheet 
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        reward={selectedItem}
        userBalance={currentBalance}
        onConfirm={handleConfirmRedeem}
        isRedeeming={redeemReward.isPending}
      />
    </div>
  )
}
