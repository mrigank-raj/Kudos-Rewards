/**
 * Screen 6 — Transaction history
 * Ledger grouped by month, with a running balance so the numbers are auditable.
 * Figma: "06 · Transaction History"
 */
import { useState } from 'react'
import {
  ArrowDownRight, ArrowUpRight, Calendar, Download, Gift, Sparkles, Zap,
} from 'lucide-react'
import AppShell from '../components/shell/AppShell'
import {
  Card, ChipRow, Dropdown, IconTile, SegmentedTabs, cx,
} from '../components/ui'
import { HISTORY_SUMMARY, LEDGER_GROUPS, signedPoints } from '../lib/data'

const ICONS = { Gift, Sparkles, Zap, ArrowUpRight, ArrowDownRight }
const FILTERS = ['All', 'Earned', 'Redeemed', 'Kudos sent']
const MOBILE_FILTERS = ['All', 'Earned', 'Redeemed', 'Sent']

export default function Screen6(props) {
  const [filter, setFilter] = useState('All')

  const groups = LEDGER_GROUPS.map((group) => ({
    ...group,
    rows: group.rows.filter((row) => {
      if (filter === 'All') return true
      if (filter === 'Earned') return row.amount > 0
      if (filter === 'Redeemed') return row.amount < 0 && row.icon === 'Gift'
      return row.amount < 0 && row.icon === 'Sparkles'
    }),
  })).filter((group) => group.rows.length > 0)

  return (
    <AppShell role="recipient" active="history" title="History" {...props}>
      <div className="mx-auto max-w-[1120px]">
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
        <div className="grid grid-cols-2 gap-3 md:mt-6 md:grid-cols-4 md:gap-3.5">
          {HISTORY_SUMMARY.map((stat) => {
            const Icon = ICONS[stat.icon]
            return (
              <div key={stat.label} className="rounded-2xl border border-stroke-subtle bg-surface-base p-4">
                <div className="flex items-center">
                  <span className="text-overline uppercase text-ink-muted">{stat.label}</span>
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
        <ChipRow className="mt-4 md:hidden" options={MOBILE_FILTERS} value={filter === 'Kudos sent' ? 'Sent' : filter} onChange={(v) => setFilter(v === 'Sent' ? 'Kudos sent' : v)} />

        <Card flush className="mt-4 md:mt-5">
          <div className="hidden items-center px-5 py-3.5 md:flex">
            <SegmentedTabs options={FILTERS} value={filter} onChange={setFilter} size="sm" />
            <span className="ml-auto font-mono text-[11px] text-ink-muted">18 transactions</span>
          </div>

          {groups.map((group, gi) => (
            <div key={group.month}>
              <div className="flex items-center bg-surface-sunken px-4 py-2.5 md:px-5 md:border-t md:border-stroke-subtle">
                <span className="text-overline uppercase text-ink-muted">{group.month}</span>
                <span className="ml-auto hidden text-overline uppercase text-ink-muted md:block">Balance</span>
              </div>

              {group.rows.map((row, i) => {
                const Icon = ICONS[row.icon]
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
                        <span className="hidden md:inline">{row.balance} pts</span>
                      </p>
                    </div>
                  </div>
                )
              })}
              {gi < groups.length - 1 && <div className="h-px bg-stroke-subtle" />}
            </div>
          ))}
        </Card>
      </div>
    </AppShell>
  )
}
