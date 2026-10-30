import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { format } from 'date-fns'
import { Award, CircleCheck, CircleHelp, Flag, Heart, Loader2, MessagesSquare, Sparkles, Trophy, Users, Zap } from 'lucide-react'
import { Button, Card, EmptyState, Field, Input, SectionTitle, SegmentedTabs, Sheet, cx } from '@/components/ui'
import { ErrorState, LoadingCards, Textarea, UserAvatar } from '@/components/community/CommunityUI'
import { useToast } from '@/context/ToastContext'
import { useAwardBadge, useCommunityBadges, useCommunityOverview, useTopContributors } from '@/hooks/useCommunityAdmin'
import { useCreditPoints } from '@/hooks/usePeople'
import { REPUTATION_RULES, friendlyError } from '@/lib/community'

const PERIODS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
]
const AXIS = { fill: 'rgb(var(--ink-muted))', fontSize: 11 }

function Kpi({ icon: Icon, label, value, hint, tone }) {
  return (
    <Card className="!p-4">
      <p className="flex items-center gap-1.5 text-body-sm text-ink-muted"><Icon size={14} className={tone} /> {label}</p>
      <p className="mt-1.5 text-display-lg text-ink-primary" style={{ fontSize: '1.75rem', lineHeight: 1.1 }}>{value}</p>
      {hint && <p className="mt-1 text-body-sm text-ink-muted">{hint}</p>}
    </Card>
  )
}

function AwardBadgeSheet({ person, onClose }) {
  const toast = useToast()
  const { data: badges = [] } = useCommunityBadges()
  const award = useAwardBadge()
  const [badgeKey, setBadgeKey] = useState('')
  const [reason, setReason] = useState('')

  return (
    <Sheet
      open={!!person}
      onClose={award.isPending ? undefined : onClose}
      title={`Award a badge to ${person?.name}`}
      subtitle="Badges are recognition only — they don't add points."
      icon={<Award size={17} className="text-white" />}
      width={500}
      footer={
        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={award.isPending}>Cancel</Button>
          <Button
            disabled={!badgeKey || award.isPending}
            onClick={() =>
              award.mutate(
                { userId: person.user_id, badgeKey, reason },
                { onSuccess: () => { toast.success('Badge awarded'); setBadgeKey(''); setReason(''); onClose() }, onError: (e) => toast.error(friendlyError(e)) }
              )
            }
          >
            {award.isPending && <Loader2 size={14} className="animate-spin" />} Award badge
          </Button>
        </div>
      }
    >
      <div className="grid gap-2" role="radiogroup" aria-label="Badge">
        {badges.map((b) => (
          <button
            key={b.key}
            type="button"
            role="radio"
            aria-checked={badgeKey === b.key}
            onClick={() => setBadgeKey(b.key)}
            className={cx(
              'rounded-xl border px-3.5 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-solid/40',
              badgeKey === b.key ? 'border-brand-solid bg-brand-subtle' : 'border-stroke-subtle hover:bg-surface-subtle'
            )}
          >
            <span className="block text-label-sm text-ink-primary">{b.name}</span>
            <span className="block text-body-sm text-ink-muted">{b.description}</span>
          </button>
        ))}
      </div>
      <label className="mt-4 block">
        <span className="mb-2 block text-label-sm text-ink-primary">Note for the audit log (optional)</span>
        <Textarea rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
    </Sheet>
  )
}

/**
 * Official points go through the existing, admin-only credit_points RPC —
 * the same audited ledger the People page uses. Nothing is automatic.
 */
function AwardPointsSheet({ person, onClose }) {
  const toast = useToast()
  const credit = useCreditPoints()
  const [points, setPoints] = useState('100')
  const [reason, setReason] = useState('')

  const amount = parseInt(points, 10)
  const valid = Number.isInteger(amount) && amount > 0 && amount <= 100000 && reason.trim().length >= 3
  const effectiveReason = reason.trim() ? `Community contribution: ${reason.trim()}` : ''

  return (
    <Sheet
      open={!!person}
      onClose={credit.isPending ? undefined : onClose}
      title={`Award points to ${person?.name}`}
      subtitle="Credits the official rewards wallet via the standard admin workflow."
      icon={<Zap size={17} className="text-white" />}
      width={500}
      footer={
        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={credit.isPending}>Cancel</Button>
          <Button
            disabled={!valid || credit.isPending}
            onClick={() =>
              credit.mutate(
                { userId: person.user_id, points: amount, reason: effectiveReason },
                { onSuccess: () => { toast.success(`${amount} points credited to ${person.name}`); setReason(''); onClose() }, onError: (e) => toast.error(friendlyError(e)) }
              )
            }
          >
            {credit.isPending && <Loader2 size={14} className="animate-spin" />} Credit points
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Points">
          <Input type="number" min={1} max={100000} value={points} onChange={(e) => setPoints(e.target.value)} />
        </Field>
        <Field label="Reason (recorded on the transaction)">
          <Input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="e.g. 5 accepted answers helping onboard new hires" />
        </Field>
        {person && (
          <p className="rounded-xl bg-surface-subtle px-3.5 py-3 text-body-sm text-ink-muted">
            This period: {Number(person.period_reputation)} reputation · {Number(person.period_accepted)} accepted answers · {Number(person.period_appreciations)} appreciations.
          </p>
        )}
      </div>
    </Sheet>
  )
}

export default function CommunityInsightsPage() {
  const [days, setDays] = useState(30)
  const overview = useCommunityOverview(days)
  const contributors = useTopContributors(days)
  const [badgeFor, setBadgeFor] = useState(null)
  const [pointsFor, setPointsFor] = useState(null)

  const o = overview.data
  const resolutionRate = o?.questions ? Math.round((o.resolved_questions / o.questions) * 100) : null
  const weekly = (o?.weekly || []).map((w) => ({ ...w, label: format(new Date(w.week), 'd MMM') }))

  return (
    <div className="mx-auto max-w-[1120px] animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="hidden text-display-lg text-ink-primary md:block">Community insights</h1>
          <p className="text-body-md text-ink-secondary md:mt-1.5">Aggregate engagement and the people consistently helping colleagues. Private messages are never included.</p>
        </div>
        <SegmentedTabs className="sm:ml-auto" size="sm" options={PERIODS} value={days} onChange={setDays} />
      </div>

      {overview.isLoading ? (
        <div className="mt-6"><LoadingCards count={2} /></div>
      ) : overview.isError ? (
        <div className="mt-6"><ErrorState error={overview.error} onRetry={overview.refetch} /></div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi icon={MessagesSquare} label="Posts" value={o.posts} hint={`${o.questions} questions · ${o.tips} tips`} tone="text-brand-solid" />
            <Kpi icon={CircleCheck} label="Resolution rate" value={resolutionRate == null ? '—' : `${resolutionRate}%`} hint={`${o.resolved_questions} of ${o.questions} questions`} tone="text-success-solid" />
            <Kpi icon={Users} label="Active members" value={o.active_members} hint={`of ${o.members} in the org`} tone="text-brand-solid" />
            <Kpi icon={Heart} label="Appreciations" value={o.appreciations} hint={`${o.comments} answers & comments`} tone="text-danger-solid" />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Link to="/admin/community?filter=unanswered" className="flex items-center gap-3 rounded-2xl border border-stroke-subtle bg-surface-base p-4 transition hover:bg-surface-subtle">
              <CircleHelp size={18} className="text-danger-solid" />
              <span className="text-label-sm text-ink-primary">{o.unanswered_questions} unanswered question{o.unanswered_questions === 1 ? '' : 's'}</span>
              <span className="ml-auto text-label-sm text-brand-text">View</span>
            </Link>
            <Link to="/admin/community/moderation" className="flex items-center gap-3 rounded-2xl border border-stroke-subtle bg-surface-base p-4 transition hover:bg-surface-subtle">
              <Flag size={18} className="text-gold-solid" />
              <span className="text-label-sm text-ink-primary">{o.open_reports} open report{o.open_reports === 1 ? '' : 's'} · {o.hidden_items} hidden item{o.hidden_items === 1 ? '' : 's'}</span>
              <span className="ml-auto text-label-sm text-brand-text">Review</span>
            </Link>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Card>
              <SectionTitle title="Weekly activity" subtitle="Posts and answers/comments" />
              <div className="mt-4 h-[220px]">
                {weekly.every((w) => !w.posts && !w.comments) ? (
                  <div className="grid h-full place-items-center text-body-sm text-ink-muted">No activity in this period</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weekly} margin={{ top: 4, right: 6, left: -18, bottom: 0 }}>
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS} dy={6} />
                      <YAxis tickLine={false} axisLine={false} tick={AXIS} width={40} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: 'rgb(var(--surface-base))', border: '1px solid rgb(var(--stroke-subtle))', borderRadius: 12, fontSize: 12 }} />
                      <Area isAnimationActive={false} type="monotone" dataKey="posts" name="Posts" stroke="#6366F1" strokeWidth={2.5} fill="#6366F1" fillOpacity={0.12} />
                      <Area isAnimationActive={false} type="monotone" dataKey="comments" name="Answers & comments" stroke="#10B981" strokeWidth={2.5} fill="#10B981" fillOpacity={0.1} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
            <Card>
              <SectionTitle title="By category" />
              <ul className="mt-3 space-y-2">
                {(o.by_category || []).map((c) => (
                  <li key={c.name} className="flex items-center gap-2 text-body-sm">
                    <span className="min-w-0 flex-1 truncate text-ink-secondary">{c.name}</span>
                    <span className="font-mono text-ink-primary">{c.posts}</span>
                    <span className="w-16 text-right text-ink-muted">{c.resolved} solved</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}

      <Card flush className="mt-4">
        <div className="p-5 pb-3">
          <SectionTitle title="Top contributors" subtitle="Ranked by community reputation earned in this period" />
        </div>
        {contributors.isLoading ? (
          <div className="p-5"><LoadingCards count={1} /></div>
        ) : contributors.isError ? (
          <div className="p-5"><ErrorState error={contributors.error} onRetry={contributors.refetch} /></div>
        ) : !contributors.data.length ? (
          <EmptyState icon={Trophy} title="No contributions yet" body="When colleagues answer questions and get appreciated, they'll appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-body-sm">
              <thead className="border-y border-stroke-subtle text-label-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Employee</th>
                  <th className="px-3 py-2.5 text-right font-medium">Reputation</th>
                  <th className="px-3 py-2.5 text-right font-medium">Accepted</th>
                  <th className="px-3 py-2.5 text-right font-medium">Appreciated</th>
                  <th className="px-3 py-2.5 text-right font-medium">Answers</th>
                  <th className="px-3 py-2.5 text-right font-medium">Badges</th>
                  <th className="px-5 py-2.5 text-right font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke-subtle">
                {contributors.data.map((p, i) => (
                  <tr key={p.user_id}>
                    <td className="px-5 py-3">
                      <Link to={`/admin/directory/${p.user_id}`} className="flex items-center gap-3 hover:underline">
                        <span className="w-5 text-center font-mono text-ink-muted">{i + 1}</span>
                        <UserAvatar user={{ name: p.name, avatar_url: p.avatar_url }} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-label-sm text-ink-primary">{p.name}</span>
                          <span className="block truncate text-ink-muted">{[p.job_title, p.team].filter(Boolean).join(' · ') || '—'}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-ink-primary">
                      {Number(p.period_reputation)} <span className="text-ink-muted">/ {Number(p.total_reputation)}</span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono">{Number(p.period_accepted)}</td>
                    <td className="px-3 py-3 text-right font-mono">{Number(p.period_appreciations)}</td>
                    <td className="px-3 py-3 text-right font-mono">{Number(p.period_answers)}</td>
                    <td className="px-3 py-3 text-right font-mono">{Number(p.badge_count)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => setBadgeFor(p)}><Sparkles size={14} /> Badge</Button>
                        <Button variant="ghost" size="sm" onClick={() => setPointsFor(p)}><Zap size={14} /> Points</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <SectionTitle title="How reputation is earned" subtitle="Calculated in the database; employees can't set it and it's separate from points" />
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {REPUTATION_RULES.map((r) => (
            <li key={r.kind} className="flex gap-3 rounded-xl bg-surface-subtle p-3 text-body-sm">
              <span className="font-mono text-label-sm text-gold-text">+{r.points}</span>
              <span className="text-ink-secondary">{r.label}<span className="block text-ink-muted">{r.note}</span></span>
            </li>
          ))}
        </ul>
      </Card>

      <AwardBadgeSheet person={badgeFor} onClose={() => setBadgeFor(null)} />
      <AwardPointsSheet person={pointsFor} onClose={() => setPointsFor(null)} />
    </div>
  )
}
