/**
 * Screen 7 — Admin dashboard
 * Borderless tonal KPI cards, ledger activity, budget burn, program split.
 * Figma: "07 · Admin Dashboard"
 */
import {
  ArrowDownRight, ArrowUpRight, Calendar, Gift, Plus, Sparkles, Trophy, Users, Zap,
} from 'lucide-react'
import AppShell from '../components/shell/AppShell'
import {
  Avatar, BRAND_GRADIENT, Card, Dropdown, ProgressBar, SectionTitle, TrendPill, cx,
} from '../components/ui'
import { ADMIN_KPIS, ADMIN_LEDGER, BUDGET, PROGRAM_SPLIT, formatPoints, signedPoints } from '../lib/data'

const ICONS = { Users, Trophy, Zap, Gift }

export default function Screen7(props) {
  const burnPct = (BUDGET.used / BUDGET.total) * 100
  const remaining = BUDGET.total - BUDGET.used

  return (
    <AppShell role="admin" active="dashboard" title="Dashboard" {...props}>
      <div className="mx-auto max-w-[1120px]">
        <div className="hidden items-center gap-2.5 md:flex">
          <div>
            <h1 className="text-display-lg text-ink-primary">Dashboard</h1>
            <p className="mt-1.5 text-body-md text-ink-secondary">
              Program health across Acme Corp. Updated 4 minutes ago.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <Dropdown icon={Calendar}>This quarter</Dropdown>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-[10px] px-4 text-label-sm text-white shadow-glow-brand transition-all duration-200 ease-smooth hover:brightness-110 active:scale-[0.97]"
              style={BRAND_GRADIENT}
            >
              <Plus size={15} />
              Issue points
            </button>
          </div>
        </div>

        {/* KPI row: 2x2 on mobile, 4x1 on desktop */}
        <div className="grid grid-cols-2 gap-3 md:mt-6 md:grid-cols-4 md:gap-3.5">
          {ADMIN_KPIS.map((kpi) => {
            const Icon = ICONS[kpi.icon]
            const TrendIcon = kpi.tone === 'success' ? ArrowUpRight : ArrowDownRight
            return (
              <div key={kpi.label} className="rounded-2xl bg-surface-subtle p-4 md:p-[18px]">
                <div className="flex items-center">
                  <span className="text-overline uppercase text-ink-muted">{kpi.label}</span>
                  <span className="ml-auto grid h-6 w-6 place-items-center rounded-[7px] bg-surface-base md:h-7 md:w-7 md:rounded-[9px]">
                    <Icon size={12} className="text-ink-secondary" />
                  </span>
                </div>

                <p className="mt-2.5 flex items-baseline gap-1.5 md:mt-3.5">
                  <span className="text-numeric-lg text-ink-primary md:text-numeric-xl">{kpi.value}</span>
                  {kpi.unit && <span className="text-label-sm text-ink-muted">{kpi.unit}</span>}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2 md:mt-2.5">
                  {kpi.trend && (
                    <TrendPill tone={kpi.tone} icon={TrendIcon}>
                      {kpi.trend}
                    </TrendPill>
                  )}
                  <span className="hidden text-body-sm text-ink-muted md:inline">{kpi.sub}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 grid gap-5 md:mt-5 lg:grid-cols-[1fr_372px]">
          {/* ------------------------------------------------------ ledger */}
          <Card flush>
            <div className="p-5 pb-4">
              <SectionTitle
                title="Recent ledger activity"
                subtitle="Every debit and credit across the workspace"
                action={
                  <button type="button" className="text-label-sm text-brand-text transition hover:opacity-80">
                    View ledger
                  </button>
                }
              />
            </div>

            <div className="border-t border-stroke-subtle">
              {ADMIN_LEDGER.map((row, i) => {
                const positive = row.amount > 0
                return (
                  <div
                    key={row.id}
                    className={cx(
                      'flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-surface-subtle/60',
                      i > 0 && 'border-t border-stroke-subtle'
                    )}
                  >
                    <Avatar initials={row.initials} color={row.color} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-label-sm text-ink-primary">{row.who}</p>
                      <p className="truncate text-body-sm text-ink-muted">{row.meta}</p>
                    </div>
                    <span className="ml-auto hidden shrink-0 font-mono text-[11px] text-ink-muted sm:block">
                      {row.when}
                    </span>
                    <span
                      className={cx(
                        'shrink-0 text-label-md sm:ml-5 md:text-numeric-lg',
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

          {/* ------------------------------------------------ right column */}
          <div className="flex flex-col gap-4">
            <Card>
              <h3 className="text-heading-sm text-ink-primary">Quarterly points budget</h3>
              <p className="mt-0.5 text-body-sm text-ink-muted">{BUDGET.resets}</p>

              <p className="mt-4 flex items-baseline gap-1.5">
                <span className="text-numeric-xl text-ink-primary">{formatPoints(BUDGET.used)}</span>
                <span className="text-label-sm text-ink-muted">of {formatPoints(BUDGET.total)}</span>
              </p>

              <ProgressBar value={burnPct} height={8} className="mt-3.5" style={BRAND_GRADIENT} />

              <div className="mt-2.5 flex items-center">
                <span className="text-label-xs text-ink-secondary">{Math.round(burnPct)}% committed</span>
                <span className="ml-auto font-mono text-[11px] text-ink-muted">
                  {formatPoints(remaining)} left
                </span>
              </div>
            </Card>

            <Card>
              <SectionTitle
                title="Points by program"
                action={
                  <button type="button" className="text-label-sm text-brand-text transition hover:opacity-80">
                    Manage
                  </button>
                }
              />
              <div className="mt-4 flex flex-col gap-3.5">
                {PROGRAM_SPLIT.map((item) => (
                  <div key={item.name}>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
                      <span className="text-label-sm text-ink-primary">{item.name}</span>
                      <span className="ml-auto text-label-sm text-ink-primary">{formatPoints(item.value)}</span>
                      <span className="font-mono text-[11px] text-ink-muted">{item.pct}%</span>
                    </div>
                    <ProgressBar
                      value={item.pct}
                      height={6}
                      className="mt-2"
                      style={{ background: item.color }}
                    />
                  </div>
                ))}
              </div>
            </Card>

            <div className="flex items-center gap-3.5 rounded-2xl border border-brand-border bg-brand-subtle p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={BRAND_GRADIENT}>
                <Sparkles size={17} className="text-white" />
              </span>
              <div className="min-w-0">
                <p className="text-label-sm text-ink-primary">4 nominations awaiting review</p>
                <p className="mt-0.5 text-body-sm text-ink-secondary">
                  Employee of the Month · closes Friday
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* mobile primary action */}
      <button
        type="button"
        className="md:hidden fixed bottom-6 right-4 z-30 inline-flex h-[52px] items-center gap-2 rounded-full px-5 text-label-sm text-white shadow-glow-brand active:scale-95"
        style={BRAND_GRADIENT}
      >
        <Plus size={17} />
        Issue points
      </button>
    </AppShell>
  )
}
