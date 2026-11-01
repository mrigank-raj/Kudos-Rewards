import { useState, useCallback, useMemo } from 'react'
import {
  ArrowRight, ArrowUpDown, Coffee, Film, Gift, Lock, Mail,
  Shield, Shirt, SlidersHorizontal, Zap
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useCatalog, useCatalogCategories } from '@/hooks/useCatalog'
import { useRedeemReward, useRedemptions } from '@/hooks/useRedemptions'
import { useToast } from '@/context/ToastContext'
import { Badge, Card, ChipRow, Dropdown, ProgressBar, SearchInput, SectionTitle, SegmentedTabs, Sheet, Button, Divider, cx } from '@/components/ui'

const SORT_OPTIONS = [
  { value: 'points_asc', label: 'Points: low to high' },
  { value: 'points_desc', label: 'Points: high to low' },
  { value: 'name_asc', label: 'Name: A to Z' },
]

// Keys are catalog_items.category values (CHECK constraint, migration 001).
const CATEGORY = {
  gift_card: { label: 'Gift cards', icon: Coffee, gradient: { from: '#14632f', to: '#1a8f47' } },
  experience: { label: 'Experiences', icon: Film, gradient: { from: '#0f4a24', to: '#14632f' } },
  merchandise: { label: 'Merchandise', icon: Shirt, gradient: { from: '#1a8f47', to: '#b45309' } },
}
const categoryLabel = (c) => CATEGORY[c]?.label || c

function getIconForCategory(cat) {
  return CATEGORY[cat]?.icon || Gift
}

function getGradient(cat) {
  return CATEGORY[cat]?.gradient || CATEGORY.gift_card.gradient
}

const STATUS = {
  pending: { label: 'Waiting for HR', tone: 'gold' },
  fulfilled: { label: 'Approved', tone: 'success' },
  cancelled: { label: 'Cancelled · refunded', tone: 'danger' },
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
  const gradient = getGradient(reward.category)
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
          <p className="mt-0.5 truncate text-body-sm text-ink-muted">{reward.description}</p>
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
          HR is notified and will arrange it with you at {profile?.email || 'your email'}
        </li>
        <li className="flex items-center gap-2.5 text-body-sm text-ink-muted">
          <Shield size={15} className="shrink-0" />
          If HR can't fulfil it, the request is cancelled and your points come back
        </li>
      </ul>
    </Sheet>
  )
}

function RewardCard({ reward, userBalance, onRedeem }) {
  const Icon = getIconForCategory(reward.category)
  const gradient = getGradient(reward.category)

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
        {/* Photo when there is one; the gradient + icon stays underneath if it fails to load. */}
        {reward.image_url && (
          <img
            src={reward.image_url}
            alt=""
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
            className={cx('absolute inset-0 h-full w-full object-cover', locked && 'opacity-60 grayscale')}
          />
        )}
        <Icon
          className={cx(
            'relative transition-transform duration-500 ease-smooth',
            locked ? 'text-white/40' : 'text-white/95 group-hover:scale-110'
          )}
          size={34}
          strokeWidth={1.6}
        />
        <span className="absolute left-3 top-3 hidden rounded-full border border-white/25 bg-white/20 px-2.5 py-1 font-mono text-[11px] leading-4 text-white/95 md:block">
          {categoryLabel(reward.category)}
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
          <span className="md:hidden">{categoryLabel(reward.category)}</span>
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
  const { profile } = useAuth()
  const { data: items, isLoading } = useCatalog()
  // useCatalogCategories already starts with 'All'.
  const categories = useCatalogCategories().map((c) => (c === 'All' ? c : { value: c, label: categoryLabel(c) }))
  const redeemReward = useRedeemReward()
  const { data: myRequests = [] } = useRedemptions()
  const toast = useToast()

  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('points_asc')
  const [selectedItem, setSelectedItem] = useState(null)

  const [localBalance, setLocalBalance] = useState(null)
  const currentBalance = localBalance ?? profile?.points_balance ?? 0

  const visible = useMemo(
    () => {
      const filtered = (items || []).filter(r => category === 'All' || r.category === category).filter((r) =>
        r.name.toLowerCase().includes(query.trim().toLowerCase()) ||
        (r.description || '').toLowerCase().includes(query.trim().toLowerCase())
      )
      return [...filtered].sort((a, b) => {
        if (sort === 'name_asc') return a.name.localeCompare(b.name)
        if (sort === 'points_desc') return (b.points_cost || 0) - (a.points_cost || 0)
        return (a.points_cost || 0) - (b.points_cost || 0) // points_asc
      })
    },
    [items, category, query, sort]
  )

  // The hook expects catalogItemId; it used to receive rewardId, so every
  // redeem reached the server with no item and failed silently.
  const handleConfirmRedeem = useCallback(async () => {
    if (!selectedItem) return
    try {
      const res = await redeemReward.mutateAsync({ catalogItemId: selectedItem.id })
      setLocalBalance(res?.new_balance ?? null)
      toast.success(`Requested ${selectedItem.name}. HR has been notified.`)
      setSelectedItem(null)
    } catch (err) {
      toast.error(err.message || 'Could not redeem this reward.')
    }
  }, [redeemReward, selectedItem, toast])

  return (
    <div className="mx-auto max-w-[1120px] animate-fade-in">
      <div className="hidden items-center md:flex">
        <div>
          <h1 className="text-display-lg text-ink-primary">Rewards catalog</h1>
          <p className="mt-1.5 text-body-md text-ink-secondary">
            {visible.length === (items?.length || 0)
              ? `${visible.length} rewards available.`
              : `Showing ${visible.length} of ${items?.length || 0} rewards.`} Points never expire.
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
        <Dropdown
          icon={SlidersHorizontal}
          hideLabel
          ariaLabel="Sort rewards"
          className="md:ml-auto md:hidden !w-10 !px-0 justify-center"
          options={SORT_OPTIONS}
          value={sort}
          onChange={setSort}
          align="right"
        />
        <Dropdown
          icon={ArrowUpDown}
          className="ml-auto hidden md:inline-flex"
          options={SORT_OPTIONS}
          value={sort}
          onChange={setSort}
          align="right"
        />
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

      {myRequests.length > 0 && (
        <Card flush className="mt-8">
          <div className="p-5 pb-3">
            <SectionTitle title="My reward requests" subtitle="HR reviews every request" />
          </div>
          {myRequests.map((r) => (
            <div key={r.id} className="flex items-center gap-3 border-t border-stroke-subtle px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-label-sm text-ink-primary">{r.catalog_items?.name || 'Reward'}</p>
                <p className="font-mono text-[11px] text-ink-muted">
                  {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {formatPoints(r.points_spent)} pts
                </p>
              </div>
              <Badge tone={STATUS[r.status]?.tone || 'neutral'} className="ml-auto shrink-0">{STATUS[r.status]?.label || r.status}</Badge>
            </div>
          ))}
        </Card>
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
