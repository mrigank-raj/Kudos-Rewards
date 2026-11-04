import { useState, useMemo } from 'react'
import {
  ArrowDownRight, ArrowUpRight, Calendar, Download, Gift, PartyPopper, Send, Sparkles, Zap, ArrowDownCircle
} from 'lucide-react'
import { useTransactions } from '@/hooks/useTransactions'
import { useAuth } from '@/hooks/useAuth'
import { Card, ChipRow, Dropdown, IconTile, SegmentedTabs, cx } from '@/components/ui'
import { downloadCsv } from '@/lib/csv'
import { describeTransaction } from '@/lib/ledger'

const ICONS = { Gift, Sparkles, Zap, ArrowUpRight, ArrowDownRight, ArrowDownCircle, Send, PartyPopper }
const FILTERS = ['All', 'Earned', 'Redeemed', 'Sent', 'Deducted']
const RANGES = [
  { value: '30', label: 'Last 30 days' },
  { value: '180', label: 'Last 6 months' },
  { value: 'all', label: 'All time' },
]

const formatPoints = (p) => (p || 0).toLocaleString()
const signedPoints = (p) => p > 0 ? `+${p.toLocaleString()}` : `${p.toLocaleString()}`

export default function HistoryPage() {
  const [filter, setFilter] = useState('All')
  const [range, setRange] = useState('all')
  const { data: transactions, isLoading } = useTransactions('all')
  const { profile } = useAuth()

  const { groups, rows, summary } = useMemo(() => {
    let earned = 0
    let redeemed = 0
    let given = 0

    // Running balance walks backwards from today (rows are newest first),
    // over every row, before any filtering.
    let currentBal = profile?.points_balance || 0
    const since = range === 'all' ? null : Date.now() - Number(range) * 86400000

    const all = (transactions || []).map((tx) => {
      const d = describeTransaction(tx)
      if (tx.type === 'redeem') redeemed -= tx.points // refunds net out
      else if (tx.points > 0) earned += tx.points
      else given -= tx.points
      const row = {
        id: tx.id,
        ...d,
        meta: tx.reason || (tx.reward_programs?.name ? `via ${tx.reward_programs.name}` : ''),
        amount: tx.points,
        date: new Date(tx.created_at),
        balance: currentBal,
      }
      currentBal -= tx.points
      return row
    })

    const visibleRows = all
      .filter((r) => !since || r.date.getTime() >= since)
      .filter((r) => filter === 'All' || r.kind === filter)

    const grouped = {}
    visibleRows.forEach((r) => {
      const month = r.date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      ;(grouped[month] ||= []).push({
        ...r,
        when: r.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      })
    })

    return {
      rows: visibleRows,
      groups: Object.keys(grouped).map((month) => ({ month, rows: grouped[month] })),
      summary: [
        { label: 'Current balance', value: formatPoints(profile?.points_balance), icon: 'Zap', tone: 'brand', sub: 'Available to spend' },
        { label: 'Total earned', value: formatPoints(earned), icon: 'ArrowUpRight', tone: 'success', sub: 'Welcome, HR and Thank You ! points' },
        { label: 'Spent on rewards', value: formatPoints(redeemed), icon: 'Gift', tone: 'warning', sub: 'After refunds' },
        { label: 'Given & deducted', value: formatPoints(given), icon: 'ArrowDownCircle', tone: 'danger', sub: 'Thank You ! sent and HR deductions' },
      ],
    }
  }, [transactions, profile, filter, range])

  const exportCsv = () => downloadCsv(`kiit-points-history-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Date', 'Type', 'Details', 'Points', 'Balance after'],
    ...rows.map((r) => [r.date.toLocaleString('en-IN'), r.title, r.meta, r.amount, r.balance]),
  ])

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
          <Dropdown icon={Calendar} options={RANGES} value={range} onChange={setRange} align="right" />
          <button
            type="button"
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-stroke bg-surface-base px-3.5 text-label-sm text-ink-primary transition hover:bg-surface-subtle active:scale-[0.98] disabled:opacity-50"
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
          <span className="ml-auto font-mono text-[11px] text-ink-muted">{rows.length} transaction{rows.length === 1 ? '' : 's'}</span>
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
                      {row.meta && row.meta !== row.title && <p className="truncate text-body-sm text-ink-muted">{row.meta}</p>}
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
