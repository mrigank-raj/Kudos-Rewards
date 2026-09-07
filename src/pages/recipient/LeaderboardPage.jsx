import { useMemo } from 'react'
import { Trophy, Zap } from 'lucide-react'
import { Avatar, Card, ProgressBar, SectionTitle, cx } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useTopRecipients } from '@/hooks/useAnalytics'

const MEDALS = ['#fbbf24', '#9ca3af', '#b45309']
const formatPoints = (p) => (p || 0).toLocaleString()

export default function LeaderboardPage() {
  const { profile } = useAuth()
  const { data: rawTopRecipients = [], isLoading } = useTopRecipients(20)

  const ranked = useMemo(() => {
    if (!rawTopRecipients.length) return []
    const maxPoints = rawTopRecipients[0].total_earned || 1
    return rawTopRecipients.map((person, index) => ({
      rank: index + 1,
      id: person.user_id,
      name: person.user_name,
      initials: (person.user_name || 'User').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      team: person.team || null,
      points: person.total_earned,
      pct: Math.round((person.total_earned / maxPoints) * 100),
      color: person.avatar_url,
      isMe: person.user_id === profile?.id,
    }))
  }, [rawTopRecipients, profile?.id])

  const myEntry = ranked.find((p) => p.isMe)

  return (
    <div className="mx-auto max-w-[720px] animate-fade-in">
      <div className="hidden md:block">
        <h1 className="text-display-lg text-ink-primary">Leaderboard</h1>
        <p className="mt-1.5 text-body-md text-ink-secondary">
          Ranked by all-time points earned across the organization.
        </p>
      </div>

      {/* your standing */}
      <Card className="mt-4 md:mt-6">
        <div className="flex items-center gap-3.5">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-label-md text-white"
            style={myEntry && myEntry.rank <= 3 ? { background: MEDALS[myEntry.rank - 1] } : { background: 'var(--brand-gradient)' }}
          >
            {myEntry ? `#${myEntry.rank}` : <Trophy size={18} />}
          </span>
          <div className="min-w-0">
            <p className="text-label-md text-ink-primary">
              {myEntry ? `You're ranked #${myEntry.rank}` : "You're not on the board yet"}
            </p>
            <p className="text-body-sm text-ink-muted">
              {formatPoints(profile?.points_balance)} pts available · keep earning to climb
            </p>
          </div>
        </div>
      </Card>

      <Card flush className="mt-4">
        <div className="p-5 pb-4">
          <SectionTitle title="Top recipients" subtitle="All time" />
        </div>

        <div className="border-t border-stroke-subtle">
          {isLoading ? (
            <div className="py-10 text-center text-ink-muted">Loading leaderboard...</div>
          ) : ranked.length === 0 ? (
            <div className="py-10 text-center text-ink-muted">No points earned yet — be the first!</div>
          ) : (
            ranked.map((person, i) => (
              <div
                key={person.id}
                className={cx(
                  'flex items-center gap-3.5 px-5 py-3',
                  i > 0 && 'border-t border-stroke-subtle',
                  person.isMe && 'bg-brand-subtle/50'
                )}
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

                <div className="w-[130px] shrink-0 sm:w-[170px]">
                  <p className="truncate text-label-sm text-ink-primary">
                    {person.name}{person.isMe && <span className="ml-1.5 text-body-sm text-ink-muted">(you)</span>}
                  </p>
                  <p className="truncate text-body-sm text-ink-muted">{person.team || 'Unassigned'}</p>
                </div>

                <ProgressBar
                  value={person.pct}
                  height={8}
                  className="hidden flex-1 sm:block"
                  style={{ backgroundImage: 'var(--brand-gradient)' }}
                />

                <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 text-label-md text-ink-primary sm:ml-0 sm:w-[100px] sm:justify-end">
                  <Zap size={13} className="text-gold-solid" fill="currentColor" />
                  {formatPoints(person.points)}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
