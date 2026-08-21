/**
 * Screen 10 — Analytics and leaderboard
 * Recharts wired to the theme tokens, plus a medalled top earners board.
 * Figma: "10 · Analytics"
 */
import { useState } from 'react'
import {
  Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { ArrowDownRight, Calendar, Download, Info } from 'lucide-react'
import AppShell from '../components/shell/AppShell'
import {
  Avatar, BRAND_GRADIENT, Card, Dropdown, ProgressBar, SectionTitle, SegmentedTabs, TrendPill, cx,
} from '../components/ui'
import {
  ISSUED_VS_REDEEMED, MEDALS, PROGRAM_SPLIT, REDEMPTION_TREND, TOP_EARNERS, formatPoints,
} from '../lib/data'

const AXIS = { fontSize: 10, fontFamily: 'Geist Mono, monospace', fill: 'rgb(var(--ink-muted))' }
const GRID = 'rgb(var(--stroke-subtle))'

function ChartTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2 shadow-elevation-lg">
      <p className="font-mono text-[11px] text-ink-muted">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="mt-1 flex items-center gap-2 text-label-xs text-ink-primary">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="capitalize">{entry.dataKey}</span>
          <span className="ml-auto">{entry.value.toLocaleString()}{suffix}</span>
        </p>
      ))}
    </div>
  )
}

export default function Screen10(props) {
  const [range, setRange] = useState('Overview')

  return (
    <AppShell role="admin" active="analytics" title="Analytics" {...props}>
      <div className="mx-auto max-w-[1120px]">
        <div className="hidden items-center gap-2.5 md:flex">
          <div>
            <h1 className="text-display-lg text-ink-primary">Analytics</h1>
            <p className="mt-1.5 text-body-md text-ink-secondary">
              Where points go, who drives culture, and what it costs.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <Dropdown icon={Calendar}>Feb to Aug 2026</Dropdown>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-stroke bg-surface-base px-3.5 text-label-sm text-ink-primary transition hover:bg-surface-subtle active:scale-[0.98]"
            >
              <Download size={15} className="text-ink-secondary" />
              Export report
            </button>
          </div>
        </div>

        <SegmentedTabs
          className="flex w-full md:hidden [&>button]:flex-1"
          options={['Overview', 'Programs', 'People']}
          value={range}
          onChange={setRange}
        />

        <div className="mt-4 grid gap-4 md:mt-6 md:gap-5 lg:grid-cols-[1fr_356px]">
          {/* ------------------------------------------------- area chart */}
          <Card>
            <SectionTitle
              title="Points issued vs redeemed"
              subtitle="Monthly totals across all programs"
              action={
                // hidden below sm: it overflows the 390px header row
                <div className="hidden items-center gap-3.5 sm:flex">
                  <Legend color="#6366F1" label="Issued" />
                  <Legend color="#F43F5E" label="Redeemed" />
                </div>
              }
            />

            <div className="mt-5 h-[200px] w-full md:h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ISSUED_VS_REDEEMED} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gIssued" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.26} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gRedeemed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#F43F5E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={AXIS} dy={6} />
                  {/* explicit ticks: the auto scale produced 6.5k / 19.5k, which clipped */}
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={AXIS}
                    width={40}
                    domain={[0, 28000]}
                    ticks={[0, 7000, 14000, 21000, 28000]}
                    tickFormatter={(v) => `${v / 1000}k`}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: GRID, strokeDasharray: '3 4' }} />
                  <Area
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="issued"
                    stroke="#6366F1"
                    strokeWidth={2.5}
                    fill="url(#gIssued)"
                    dot={{ r: 3.5, fill: 'rgb(var(--surface-base))', stroke: '#6366F1', strokeWidth: 2 }}
                    activeDot={{ r: 5 }}
                  />
                  <Area
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="redeemed"
                    stroke="#F43F5E"
                    strokeWidth={2.5}
                    fill="url(#gRedeemed)"
                    dot={{ r: 3.5, fill: 'rgb(var(--surface-base))', stroke: '#F43F5E', strokeWidth: 2 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* ------------------------------------------------------ donut */}
          <Card>
            <SectionTitle title="Points by program" subtitle="Share of total issued" />

            {/* fixed size instead of ResponsiveContainer: the container measured a
                zero box inside this square wrapper, so the ring never drew */}
            <div className="relative mx-auto mt-4 h-[176px] w-[176px]">
              <PieChart width={176} height={176}>
                <Pie
                  isAnimationActive={false}
                  data={PROGRAM_SPLIT}
                  dataKey="pct"
                  cx={88}
                  cy={88}
                  innerRadius={52}
                  outerRadius={76}
                  paddingAngle={3}
                  cornerRadius={8}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {PROGRAM_SPLIT.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <p className="text-numeric-lg text-ink-primary">110,200</p>
                  <p className="font-mono text-[11px] text-ink-muted">total pts</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              {PROGRAM_SPLIT.map((item) => (
                <div key={item.name} className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
                  <span className="text-label-sm text-ink-primary">{item.name}</span>
                  <span className="ml-auto font-mono text-[11px] text-ink-muted">{item.pct}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 md:mt-5 md:gap-5 lg:grid-cols-[1fr_356px]">
          {/* ------------------------------------------------ leaderboard */}
          <Card>
            <SectionTitle
              title="Top earners"
              subtitle="Who is driving recognition across Acme Corp"
              action={<Dropdown className="!h-8 !px-3 !text-label-xs">This quarter</Dropdown>}
            />

            <div className="mt-4">
              {TOP_EARNERS.map((person, i) => (
                <div
                  key={person.rank}
                  className={cx('flex items-center gap-3.5 py-2.5', i > 0 && 'border-t border-stroke-subtle')}
                >
                  <span
                    className={cx(
                      'grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full text-label-xs',
                      person.rank > 3 && 'bg-surface-subtle text-ink-muted'
                    )}
                    style={person.rank <= 3 ? { background: MEDALS[person.rank - 1], color: '#fff' } : undefined}
                  >
                    {person.rank}
                  </span>

                  <Avatar initials={person.initials} color={person.color} size="md" />

                  <div className="w-[150px] shrink-0">
                    <p className="truncate text-label-sm text-ink-primary">{person.name}</p>
                    <p className="truncate text-body-sm text-ink-muted">{person.team}</p>
                  </div>

                  <ProgressBar
                    value={person.pct}
                    height={8}
                    className="hidden flex-1 sm:block"
                    style={BRAND_GRADIENT}
                  />

                  <span className="ml-auto shrink-0 text-label-md text-ink-primary sm:ml-0 sm:w-[92px] sm:text-right">
                    {person.points}
                    <span className="ml-1 font-mono text-[11px] text-ink-muted">pts</span>
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* ------------------------------------------------ right column */}
          <div className="flex flex-col gap-4 md:gap-5">
            <Card>
              <SectionTitle title="Redemption rate" />
              <p className="mt-2.5 flex items-center gap-2.5">
                <span className="text-numeric-xl text-ink-primary">30%</span>
                <TrendPill tone="danger" icon={ArrowDownRight}>3%</TrendPill>
              </p>

              <div className="mt-3.5 h-[76px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={REDEMPTION_TREND} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity={0.24} />
                        <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip content={<ChartTooltip suffix="%" />} cursor={false} />
                    <Area isAnimationActive={false} type="monotone" dataKey="rate" stroke="#6366F1" strokeWidth={2.5} fill="url(#gTrend)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-2 flex items-center font-mono text-[11px] text-ink-muted">
                <span>Feb</span>
                <span className="ml-auto">Aug</span>
              </div>
            </Card>

            <div className="rounded-2xl border border-brand-border bg-brand-subtle p-4 md:p-5">
              <p className="flex items-center gap-2.5 text-label-sm text-brand-text">
                <Info size={16} className="text-brand-solid" />
                Worth a look
              </p>
              <p className="mt-2.5 text-body-sm text-ink-secondary">
                Redemption dipped 3% while issuance rose 12%. Unspent balances are up{' '}
                {formatPoints(39800)} pts, which is a growing liability on the books.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-2 text-label-xs text-ink-secondary">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}
