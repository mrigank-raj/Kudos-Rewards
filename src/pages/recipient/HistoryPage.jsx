import { useState, useMemo } from 'react'
import {
  ArrowDownRight, ArrowUpRight, Calendar, Download, Gift, Sparkles, Zap, ArrowDownCircle
} from 'lucide-react'
import { useTransactions } from '@/hooks/useTransactions'
import { useAuth } from '@/hooks/useAuth'
import { Card, ChipRow, Dropdown, IconTile, SegmentedTabs, cx } from '@/components/ui'

const ICONS = { Gift, Sparkles, Zap, ArrowUpRight, ArrowDownRight, ArrowDownCircle }
const FILTERS = ['All', 'Earned', 'Redeemed', 'Debited']

const formatPoints = (p) => (p || 0).toLocaleString()
const signedPoints = (p) => p > 0 ? `+${p.toLocaleString()}` : `${p.toLocaleString()}`

export default function HistoryPage() {
  const [filter, setFilter] = useState('All')
  const { data: transactions, isLoading } = useTransactions('all')
  const { profile } = useAuth()

  const { groups, summary } = useMemo(() => {
    let earned = 0
    let redeemed = 0
    let debited = 0
    
    // Calculate running balance from the end to the start
    // since the array is sorted descending by created_at.
    const txsWithBalance = []
    let currentBal = profile?.points_balance || 0
    
    const validTxs = transactions || []
    
    for (let i = 0; i < validTxs.length; i++) {
      const tx = validTxs[i]
      
      if (tx.points > 0) earned += tx.points
      if (tx.type === 'redeem') redeemed += Math.abs(tx.points)
      if (tx.type === 'manual_debit') debited += Math.abs(tx.points)

      txsWithBalance.push({
        ...tx,
        running_balance: currentBal
      })
      currentBal -= tx.points
    }

    const grouped = {}
    
    txsWithBalance.forEach(tx => {
      const date = new Date(tx.created_at)
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      const whenStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      
      let icon = 'Zap'
      if (tx.type === 'redeem') icon = 'Gift'
      else if (tx.type === 'manual_debit') icon = 'ArrowDownCircle'
      else if (tx.reason?.toLowerCase().includes('kudos')) icon = 'Sparkles'

      if (!grouped[monthYear]) grouped[monthYear] = []
      
      grouped[monthYear].push({
        id: tx.id,
        title: tx.type === 'earn' || tx.type === 'manual_credit' ? 'Earned points' : (tx.type === 'redeem' ? 'Redeemed reward' : 'Debited points'),
        meta: tx.reason || (tx.reward_programs?.name ? `via ${tx.reward_programs.name}` : 'System transaction'),
        amount: tx.points,
        icon,
        when: whenStr,
        balance: tx.running_balance,
        rawType: tx.type
      })
    })

    const groupArray = Object.keys(grouped).map(month => ({
      month,
      rows: grouped[month].filter((row) => {
        if (filter === 'All') return true
        if (filter === 'Earned') return row.amount > 0
        if (filter === 'Redeemed') return row.rawType === 'redeem'
        if (filter === 'Debited') return row.rawType === 'manual_debit'
        return true
      })
    })).filter(g => g.rows.length > 0)

    return {
      groups: groupArray,
      summary: [
        { label: 'Current balance', value: formatPoints(profile?.points_balance), icon: 'Zap', tone: 'brand', sub: 'Available to spend' },
        { label: 'Total earned', value: formatPoints(earned), icon: 'ArrowUpRight', tone: 'success', sub: 'All time' },
        { label: 'Total redeemed', value: formatPoints(redeemed), icon: 'Gift', tone: 'warning', sub: 'All time' },
        { label: 'Total debited', value: formatPoints(debited), icon: 'ArrowDownCircle', tone: 'danger', sub: 'All time' },
      ]
    }
  }, [transactions, profile, filter])

  return (
    <div className="mx-auto max-w-[1120px] animate-fade-in">
      <div className="hidden items-center gap-2.5 md:flex">
        <div>
          <h1 className="text-display-lg text-ink-primary">Transaction history</h1>
          <p className="mt-1.5 text-body-md text-ink-secondary">
            Every point in and out of your account, in one ledger.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <Dropdown icon={Calendar}>Last 6 months</Dropdown>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-stroke bg-surface-base px-3.5 text-label-sm text-ink-primary transition hover:bg-surface-subtle active:scale-[0.98]"
          >
            <Download size={15} className="text-ink-secondary" />
            Export CSV
          </button>
        </div>
      </div>

      {/* summary tiles: 2 up on mobile, 4 up on desktop */}
      <div className="grid grid-cols-2 gap-3 mt-4 md:mt-6 md:grid-cols-4 md:gap-3.5">
        {summary.map((stat) => {
          const Icon = ICONS[stat.icon] || Zap
          return (
            <div key={stat.label} className="rounded-2xl border border-stroke-subtle bg-surface-base p-4">
              <div className="flex items-center">
                <span className="text-overline-sm uppercase text-ink-muted">{stat.label}</span>
                <IconTile icon={Icon} tone={stat.tone} size={24} iconSize={12} className="ml-auto rounded-[7px]" />
              </div>
              <p className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-numeric-lg text-ink-primary md:text-numeric-xl">{stat.value}</span>
                <span className="font-mono text-[11px] text-ink-muted md:text-label-sm md:font-sans">pts</span>
              </p>
              <p className="mt-1 hidden text-body-sm text-ink-muted md:block">{stat.sub}</p>
            </div>
          )
        })}
      </div>

      {/* ledger */}
      <ChipRow className="mt-4 md:hidden" options={FILTERS} value={filter} onChange={setFilter} />

      <Card flush className="mt-4 md:mt-5">
        <div className="hidden items-center px-5 py-3.5 md:flex">
          <SegmentedTabs options={FILTERS} value={filter} onChange={setFilter} size="sm" />
          <span className="ml-auto font-mono text-[11px] text-ink-muted">{transactions?.length || 0} transactions</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-ink-muted">Loading history...</div>
        ) : groups.length === 0 ? (
          <div className="p-8 text-center text-ink-muted">No transactions found for this filter.</div>
        ) : (
          groups.map((group, gi) => (
            <div key={group.month}>
              <div className="flex items-center bg-surface-sunken px-4 py-2.5 md:px-5 md:border-t md:border-stroke-subtle">
                <span className="text-overline-sm uppercase text-ink-muted">{group.month}</span>
                <span className="ml-auto hidden text-overline-sm uppercase text-ink-muted md:block">Balance</span>
              </div>

              {group.rows.map((row, i) => {
                const Icon = ICONS[row.icon] || Zap
                const positive = row.amount > 0
                return (
                  <div
                    key={row.id}
                    className={cx(
                      'flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-surface-subtle/60 md:px-5',
                      i > 0 && 'border-t border-stroke-subtle'
                    )}
                  >
                    <IconTile icon={Icon} tone={positive ? 'success' : 'danger'} size={36} iconSize={16} />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-label-sm text-ink-primary md:text-label-md">{row.title}</p>
                      <p className="truncate text-body-sm text-ink-muted">{row.meta}</p>
                    </div>

                    <span className="ml-auto hidden shrink-0 font-mono text-[11px] text-ink-muted md:block">
                      {row.when}
                    </span>

                    <div className="shrink-0 text-right md:ml-7">
                      <p className={cx('text-label-md md:text-numeric-lg', positive ? 'text-success-text' : 'text-danger-text')}>
                        {signedPoints(row.amount)}
                      </p>
                      <p className="font-mono text-[11px] leading-4 text-ink-muted">
                        <span className="md:hidden">{row.when.split(',')[0]}</span>
                        <span className="hidden md:inline">{formatPoints(row.balance)} pts</span>
                      </p>
                    </div>
                  </div>
                )
              })}
              {gi < groups.length - 1 && <div className="h-px bg-stroke-subtle" />}
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
