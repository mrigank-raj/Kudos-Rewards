import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Award, CircleCheck, Search, Users } from 'lucide-react'
import { Card, Dropdown, EmptyState, SearchInput } from '@/components/ui'
import { ErrorState, LoadMore, LoadingCards, UserAvatar } from '@/components/community/CommunityUI'
import { useAreaBase } from '@/hooks/useCommunity'
import { useDirectory, useOrgSkills } from '@/hooks/useCommunityPeople'

// users.team CHECK constraint (migration 007).
const TEAMS = ['Design', 'Frontend', 'Backend', 'Product']

function MemberCard({ member, base }) {
  return (
    <Link
      to={`${base}/directory/${member.user_id}`}
      className="group flex flex-col rounded-2xl border border-stroke-subtle bg-surface-base p-4 shadow-elevation-md transition hover:shadow-elevation-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-solid/40"
    >
      <div className="flex items-center gap-3">
        <UserAvatar user={{ name: member.name, avatar_url: member.avatar_url }} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-label-md text-ink-primary group-hover:text-brand-text">{member.name}</p>
          <p className="truncate text-body-sm text-ink-muted">
            {[member.job_title, member.team].filter(Boolean).join(' · ') || (member.role === 'admin' ? 'HR' : 'Team member')}
          </p>
        </div>
      </div>
      {member.skills?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {member.skills.slice(0, 4).map((s) => (
            <span key={s} className="rounded-full bg-surface-subtle px-2 py-0.5 text-label-xs text-ink-secondary">{s}</span>
          ))}
          {member.skills.length > 4 && <span className="px-1 text-label-xs text-ink-muted">+{member.skills.length - 4}</span>}
        </div>
      )}
      <div className="mt-auto flex items-center gap-4 pt-3 text-body-sm text-ink-muted">
        <span title="Community reputation" className="inline-flex items-center gap-1"><Award size={13} className="text-gold-solid" /> {Number(member.reputation)}</span>
        <span title="Accepted answers" className="inline-flex items-center gap-1"><CircleCheck size={13} className="text-success-solid" /> {Number(member.accepted_answers)}</span>
        {member.badges?.length > 0 && <span>{member.badges.length} badge{member.badges.length > 1 ? 's' : ''}</span>}
      </div>
    </Link>
  )
}

export default function DirectoryPage() {
  const base = useAreaBase()
  const [params, setParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(params.get('q') || '')
  const [search, setSearch] = useState(searchInput)
  const team = params.get('team') || ''
  const skill = params.get('skill') || ''

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const query = useDirectory({ search, team, skill })
  const { data: skills = [] } = useOrgSkills()
  const members = useMemo(() => query.data?.pages.flat() || [], [query.data])

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <div className="mx-auto max-w-[1120px] animate-fade-in">
      <h1 className="hidden text-display-lg text-ink-primary md:block">Directory</h1>
      <p className="text-body-md text-ink-secondary md:mt-1.5">Find colleagues by name, role or skill — and see who's been helping the community.</p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <SearchInput
          className="flex-1"
          placeholder="Search by name, job title or skill"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Search the directory"
        />
        <Dropdown
          options={[{ value: '', label: 'All departments' }, ...TEAMS.map((t) => ({ value: t, label: t }))]}
          value={team}
          onChange={(v) => setParam('team', v)}
          align="right"
        />
        {skills.length > 0 && (
          <Dropdown
            options={[{ value: '', label: 'Any skill' }, ...skills.map((s) => ({ value: s.skill, label: `${s.skill} (${s.member_count})` }))]}
            value={skill}
            onChange={(v) => setParam('skill', v)}
            align="right"
          />
        )}
      </div>

      <div className="mt-5">
        {query.isLoading ? (
          <LoadingCards count={3} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : members.length === 0 ? (
          <Card>
            <EmptyState icon={search || team || skill ? Search : Users} title="No one matches" body="Try a different name, department or skill." />
          </Card>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {members.map((m) => <MemberCard key={m.user_id} member={m} base={base} />)}
            </div>
            <LoadMore query={query} label="Load more people" />
          </>
        )}
      </div>
    </div>
  )
}
