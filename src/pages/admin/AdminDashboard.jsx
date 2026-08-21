import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/config/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownRight, ArrowUpRight, Calendar, Gift, Plus, Sparkles, Trophy, Users, Zap
} from 'lucide-react'
import {
  Avatar, BRAND_GRADIENT, Card, Dropdown, ProgressBar, SectionTitle, TrendPill, cx
} from '@/components/ui'

const ICONS = { Users, Trophy, Zap, Gift }

const formatPoints = (p) => (p || 0).toLocaleString()
const signedPoints = (p) => p > 0 ? `+${(p || 0).toLocaleString()}` : `${(p || 0).toLocaleString()}`

export default function AdminDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const orgId = profile?.org_id

  // Fetch dashboard stats
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['admin-stats', orgId],
    queryFn: async () => {
      if (!orgId) return null

      const [usersRes, programsRes, txRes, redemptionsRes, recentTxRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('role', 'recipient'),
        supabase.from('reward_programs').select('*').eq('org_id', orgId).eq('is_active', true),
        supabase.from('transactions').select('points, type, user_id, reward_programs(name)').in('type', ['manual_credit', 'earn']),
        supabase.from('redemptions').select('id', { count: 'exact', head: true }),
        supabase.from('transactions').select('*, users(name, avatar_url)').order('created_at', { ascending: false }).limit(10),
      ])

      const totalPointsIssued = (txRes.data || []).reduce((sum, t) => sum + (t.points || 0), 0)
      
      // Calculate split
      const splitMap = {}
      ;(txRes.data || []).forEach(tx => {
        const progName = tx.reward_programs?.name || 'Manual Credit'
        splitMap[progName] = (splitMap[progName] || 0) + (tx.points || 0)
      })

      const colors = ['#f59e0b', '#3b82f6', '#ec4899', '#10b981', '#8b5cf6']
      const programSplit = Object.entries(splitMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value], i) => ({
          name,
          value,
          pct: totalPointsIssued ? Math.round((value / totalPointsIssued) * 100) : 0,
          color: colors[i % colors.length]
        }))

      return {
        totalUsers: usersRes.count || 0,
        activePrograms: programsRes.data?.length || 0,
        totalPointsIssued,
        totalRedemptions: redemptionsRes.count || 0,
        programSplit,
        recentTx: recentTxRes.data || []
      }
    },
    enabled: !!orgId,
  })

  const stats = dashboardData || {
    totalUsers: 0, activePrograms: 0, totalPointsIssued: 0, totalRedemptions: 0, programSplit: [], recentTx: []
  }

  const ADMIN_KPIS = [
    { label: 'Active members', value: stats.totalUsers.toLocaleString(), icon: 'Users', trend: '12%', tone: 'success', sub: 'this quarter' },
    { label: 'Programs running', value: stats.activePrograms.toString(), icon: 'Trophy' },
    { label: 'Points issued', value: formatPoints(stats.totalPointsIssued), icon: 'Zap', unit: 'pts' },
    { label: 'Total redemptions', value: stats.totalRedemptions.toLocaleString(), icon: 'Gift' },
  ]

  const mappedLedger = (stats.recentTx || []).map(tx => {
    const initials = tx.users?.name ? tx.users.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'
    const date = new Date(tx.created_at)
    return {
      id: tx.id,
      who: tx.users?.name || 'Unknown',
      meta: tx.reason || 'System transaction',
      amount: tx.points,
      initials,
      color: tx.users?.avatar_url,
      when: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
  })

  // Dummy budget data for demonstration
  const BUDGET = {
    total: 500000,
    used: stats.totalPointsIssued,
    resets: 'Resets Jan 1, 2025'
  }
  const burnPct = Math.min(100, (BUDGET.used / BUDGET.total) * 100)
  const remaining = Math.max(0, BUDGET.total - BUDGET.used)

  return (
    <div className="mx-auto max-w-[1120px] animate-fade-in">
      <div className="hidden items-center gap-2.5 md:flex">
        <div>
          <h1 className="text-display-lg text-ink-primary">Dashboard</h1>
          <p className="mt-1.5 text-body-md text-ink-secondary">
            Program health across {profile?.organizations?.name || 'your workspace'}.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <Dropdown icon={Calendar}>This quarter</Dropdown>
          <button
            type="button"
            onClick={() => navigate('/admin/people')}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] px-4 text-label-sm text-white shadow-glow-brand transition-all duration-200 ease-smooth hover:brightness-110 active:scale-[0.97]"
            style={BRAND_GRADIENT}
          >
            <Plus size={15} />
            Issue points
          </button>
        </div>
      </div>

      {/* KPI row: 2x2 on mobile, 4x1 on large desktop */}
      <div className="grid grid-cols-2 gap-3 mt-4 md:mt-6 lg:grid-cols-4 md:gap-3.5">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-surface-subtle p-4 md:p-[18px] h-[120px] animate-pulse" />
          ))
        ) : (
          ADMIN_KPIS.map((kpi) => {
            const Icon = ICONS[kpi.icon]
            const TrendIcon = kpi.tone === 'success' ? ArrowUpRight : ArrowDownRight
            return (
              <div key={kpi.label} className="rounded-2xl bg-surface-subtle p-4 md:p-[18px]">
                <div className="flex items-center">
                  <span className="text-overline-sm uppercase text-ink-muted">{kpi.label}</span>
                  <span className="ml-auto grid h-6 w-6 place-items-center rounded-[7px] bg-surface-base md:h-7 md:w-7 md:rounded-[9px]">
                    <Icon size={12} className="text-ink-secondary" />
                  </span>
                </div>

                <p className="mt-2.5 flex items-baseline gap-1.5 md:mt-3.5">
                  <span className="text-numeric-lg text-ink-primary md:text-numeric-xl">{kpi.value}</span>
                  {kpi.unit && <span className="text-label-sm text-ink-muted">{kpi.unit}</span>}
                </p>

                {kpi.trend && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 md:mt-2.5">
                    <TrendPill tone={kpi.tone} icon={TrendIcon}>
                      {kpi.trend}
                    </TrendPill>
                    <span className="hidden text-body-sm text-ink-muted md:inline">{kpi.sub}</span>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div className="mt-4 grid gap-5 md:mt-5 xl:grid-cols-[1fr_372px]">
        {/* ------------------------------------------------------ ledger */}
        <Card flush>
          <div className="p-5 pb-4">
            <SectionTitle
              title="Recent ledger activity"
              subtitle="Every debit and credit across the workspace"
            />
          </div>

          <div className="border-t border-stroke-subtle">
            {isLoading ? (
              <div className="p-8 text-center text-ink-muted">Loading activity...</div>
            ) : mappedLedger.length === 0 ? (
              <div className="p-8 text-center text-ink-muted">No recent transactions.</div>
            ) : (
              mappedLedger.map((row, i) => {
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
              })
            )}
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
                <button type="button" onClick={() => navigate('/admin/programs')} className="text-label-sm text-brand-text transition hover:opacity-80">
                  Manage
                </button>
              }
            />
            <div className="mt-4 flex flex-col gap-3.5">
              {stats.programSplit.length === 0 ? (
                <p className="text-body-sm text-ink-muted">No points issued yet.</p>
              ) : (
                stats.programSplit.map((item) => (
                  <div key={item.name}>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
                      <span className="text-label-sm text-ink-primary truncate max-w-[150px]">{item.name}</span>
                      <span className="ml-auto text-label-sm text-ink-primary">{formatPoints(item.value)}</span>
                      <span className="font-mono text-[11px] text-ink-muted w-8 text-right">{item.pct}%</span>
                    </div>
                    <ProgressBar
                      value={item.pct}
                      height={6}
                      className="mt-2"
                      style={{ background: item.color }}
                    />
                  </div>
                ))
              )}
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
      
      {/* mobile primary action */}
      <button
        type="button"
        onClick={() => navigate('/admin/people')}
        className="md:hidden fixed bottom-6 right-4 z-30 inline-flex h-[52px] items-center gap-2 rounded-full px-5 text-label-sm text-white shadow-glow-brand active:scale-95"
        style={BRAND_GRADIENT}
      >
        <Plus size={17} />
        Issue points
      </button>
    </div>
  )
}
