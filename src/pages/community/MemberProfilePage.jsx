import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, Award, CircleCheck, Heart, Info, Loader2, MessageSquare, Pencil, PenSquare, Send, UserX, X } from 'lucide-react'
import { Button, Card, EmptyState, Field, Input, SectionTitle } from '@/components/ui'
import PostCard from '@/components/community/PostCard'
import { BadgeChip, CharCount, ErrorState, FieldError, LoadMore, LoadingCards, Textarea, TimeAgo, UserAvatar } from '@/components/community/CommunityUI'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/context/ToastContext'
import { useAreaBase, useFeed } from '@/hooks/useCommunity'
import { useContributions, useMemberProfile, useStartConversation, useUpdateCommunityProfile } from '@/hooks/useCommunityPeople'
import { CONTRIBUTION_LABELS, LIMITS, REPUTATION_RULES, cleanLine, friendlyError, parseTags } from '@/lib/community'

function Stat({ icon: Icon, label, value, tone = 'text-ink-muted' }) {
  return (
    <div className="rounded-xl bg-surface-subtle px-3 py-3">
      <p className="flex items-center gap-1.5 text-body-sm text-ink-muted"><Icon size={13} className={tone} /> {label}</p>
      <p className="mt-1 text-heading-lg text-ink-primary">{Number(value || 0).toLocaleString()}</p>
    </div>
  )
}

function EditProfileForm({ member, onDone }) {
  const toast = useToast()
  const save = useUpdateCommunityProfile()
  const [jobTitle, setJobTitle] = useState(member.job_title || '')
  const [bio, setBio] = useState(member.bio || '')
  const [skills, setSkills] = useState(member.skills || [])
  const [skillInput, setSkillInput] = useState('')
  const [error, setError] = useState(null)

  const addSkills = () => {
    const next = parseTags([...skills, ...skillInput.split(',')]).map((s) => s.replace(/-/g, ' '))
    if (next.some((s) => s.length > LIMITS.skillMax)) return setError(`Each skill must be ${LIMITS.skillMax} characters or fewer.`)
    if (next.length > LIMITS.skillsMax) return setError(`Add at most ${LIMITS.skillsMax} skills.`)
    setError(null)
    setSkills(next)
    setSkillInput('')
  }

  const submit = (e) => {
    e.preventDefault()
    const title = cleanLine(jobTitle)
    if (title.length > LIMITS.jobTitleMax) return setError(`Job title must be ${LIMITS.jobTitleMax} characters or fewer.`)
    if (bio.trim().length > LIMITS.bioMax) return setError(`Bio must be ${LIMITS.bioMax} characters or fewer.`)
    const pendingSkills = skillInput.trim() ? parseTags([...skills, ...skillInput.split(',')]).map((s) => s.replace(/-/g, ' ')) : skills
    if (pendingSkills.length > LIMITS.skillsMax) return setError(`Add at most ${LIMITS.skillsMax} skills.`)
    setError(null)
    save.mutate(
      { job_title: title, bio: bio.trim(), skills: pendingSkills },
      { onSuccess: () => { toast.success('Profile updated'); onDone() }, onError: (e2) => toast.error(friendlyError(e2)) }
    )
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4 border-t border-stroke-subtle pt-5" noValidate>
      <Field label="Job title" hint={<CharCount value={jobTitle} max={LIMITS.jobTitleMax} />}>
        <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Senior Frontend Engineer" />
      </Field>
      <Field label="About you" hint={<CharCount value={bio} max={LIMITS.bioMax} />}>
        <Textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What you work on and what people can ask you about" />
      </Field>
      <div>
        <span className="mb-2 block text-label-sm text-ink-primary">Skills & expertise</span>
        <div className="flex gap-2">
          <Input
            className="flex-1"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); addSkills() }
            }}
            placeholder="e.g. react, sql, onboarding"
            aria-label="Add skills, comma separated"
          />
          <Button variant="secondary" onClick={addSkills} disabled={!skillInput.trim()}>Add</Button>
        </div>
        {skills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full bg-brand-subtle py-0.5 pl-2.5 pr-1 text-label-xs text-brand-text">
                {s}
                <button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))} aria-label={`Remove ${s}`} className="grid h-5 w-5 place-items-center rounded-full hover:bg-brand-solid/15">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="mt-1.5 text-body-sm text-ink-muted">{skills.length}/{LIMITS.skillsMax} — colleagues can find you by these in the directory.</p>
      </div>
      <FieldError>{error}</FieldError>
      <p className="text-body-sm text-ink-muted">Your name, department and photo come from your Kudos account and are managed by HR.</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone} disabled={save.isPending}>Cancel</Button>
        <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 size={14} className="animate-spin" />} Save profile</Button>
      </div>
    </form>
  )
}

export default function MemberProfilePage({ self = false }) {
  const { userId: paramId } = useParams()
  const { profile } = useAuth()
  const base = useAreaBase()
  const navigate = useNavigate()
  const toast = useToast()
  const userId = self ? profile?.id : paramId
  const isMe = userId === profile?.id

  const memberQuery = useMemberProfile(userId)
  const contributions = useContributions(isMe ? userId : null)
  const postsQuery = useFeed({ mode: 'author', authorId: userId })
  const startConversation = useStartConversation()
  const [editing, setEditing] = useState(false)
  const posts = useMemo(() => postsQuery.data?.pages.flat() || [], [postsQuery.data])

  useEffect(() => setEditing(false), [userId])

  // /directory/<my id> → my own profile page.
  if (!self && isMe) return <Navigate to={`${base}/profile`} replace />

  if (memberQuery.isLoading) return <div className="mx-auto max-w-[960px]"><LoadingCards count={2} /></div>
  if (memberQuery.isError) return <div className="mx-auto max-w-[960px]"><ErrorState error={memberQuery.error} onRetry={memberQuery.refetch} /></div>
  const member = memberQuery.data
  if (!member) {
    return (
      <Card className="mx-auto max-w-[960px]">
        <EmptyState icon={UserX} title="Profile not found" body="This person isn't in your organization, or their account was removed." action={<Link to={`${base}/directory`} className="text-label-sm text-brand-text">Back to directory</Link>} />
      </Card>
    )
  }

  const message = () =>
    startConversation.mutate(member.user_id, {
      onSuccess: (conversationId) => navigate(`${base}/messages/${conversationId}`),
      onError: (e) => toast.error(friendlyError(e)),
    })

  return (
    <div className="mx-auto max-w-[960px] animate-fade-in">
      {!self && (
        <Link to={`${base}/directory`} className="inline-flex items-center gap-1.5 text-label-sm text-ink-secondary hover:text-ink-primary">
          <ArrowLeft size={15} /> Directory
        </Link>
      )}
      {self && <h1 className="hidden text-display-lg text-ink-primary md:block">My profile</h1>}

      <Card className="mt-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <UserAvatar user={{ name: member.name, avatar_url: member.avatar_url }} size={72} />
          <div className="min-w-0 flex-1">
            <h2 className="text-heading-lg text-ink-primary">{member.name}</h2>
            <p className="text-body-md text-ink-secondary">
              {[member.job_title, member.team].filter(Boolean).join(' · ') || (member.role === 'admin' ? 'HR' : 'Team member')}
              {member.role === 'admin' && member.job_title && ' · HR'}
            </p>
            {member.joined_at && (
              <p className="mt-0.5 text-body-sm text-ink-muted">Joined {format(new Date(member.joined_at), 'MMM yyyy')}</p>
            )}
            {member.bio && <p className="mt-3 max-w-[60ch] whitespace-pre-line text-body-md text-ink-secondary">{member.bio}</p>}
            {member.skills?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {member.skills.map((s) => (
                  <Link key={s} to={`${base}/directory?skill=${encodeURIComponent(s)}`} className="rounded-full bg-surface-subtle px-2.5 py-1 text-label-xs text-ink-secondary hover:text-ink-primary">{s}</Link>
                ))}
              </div>
            )}
            {isMe && !member.job_title && !member.skills?.length && !editing && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-body-sm text-ink-muted"><Info size={14} /> Add a job title and skills so colleagues know what to ask you about.</p>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            {isMe ? (
              !editing && <Button variant="secondary" onClick={() => setEditing(true)}><Pencil size={15} /> Edit profile</Button>
            ) : (
              <Button onClick={message} disabled={startConversation.isPending}>
                {startConversation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Message
              </Button>
            )}
          </div>
        </div>

        {editing && <EditProfileForm member={member} onDone={() => setEditing(false)} />}

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Stat icon={Award} label="Reputation" value={member.reputation} tone="text-gold-solid" />
          <Stat icon={CircleCheck} label="Accepted answers" value={member.accepted_answers} tone="text-success-solid" />
          <Stat icon={Heart} label="Appreciations" value={member.appreciations} tone="text-danger-solid" />
          <Stat icon={PenSquare} label="Posts" value={member.post_count} />
          <Stat icon={MessageSquare} label="Answers & comments" value={member.answer_count} />
        </div>

        <div className="mt-5">
          <p className="text-label-sm text-ink-primary">Badges</p>
          {member.badges?.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">{member.badges.map((b) => <BadgeChip key={b.key} badge={b} />)}</div>
          ) : (
            <p className="mt-1 text-body-sm text-ink-muted">No badges yet.</p>
          )}
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="posts-heading" className="min-w-0">
          <h2 id="posts-heading" className="text-heading-md text-ink-primary">{isMe ? 'Your posts' : 'Recent posts'}</h2>
          <div className="mt-3 space-y-3">
            {postsQuery.isLoading ? (
              <LoadingCards count={2} />
            ) : postsQuery.isError ? (
              <ErrorState error={postsQuery.error} onRetry={postsQuery.refetch} />
            ) : posts.length === 0 ? (
              <Card><EmptyState icon={PenSquare} title="No posts yet" body={isMe ? 'Ask a question or share a tip to get started.' : `${member.name.split(' ')[0]} hasn't posted yet.`} /></Card>
            ) : (
              <>
                {posts.map((p) => <PostCard key={p.id} post={p} />)}
                <LoadMore query={postsQuery} />
              </>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <Card>
            <SectionTitle title="How reputation works" subtitle="Separate from your redeemable points" />
            <ul className="mt-3 space-y-2.5">
              {REPUTATION_RULES.map((r) => (
                <li key={r.kind} className="flex gap-3 text-body-sm">
                  <span className="w-9 shrink-0 font-mono text-label-sm text-gold-text">+{r.points}</span>
                  <span className="text-ink-secondary">{r.label}<span className="block text-ink-muted">{r.note}</span></span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-body-sm text-ink-muted">Reputation never converts to points automatically. HR may recognise great contributors through the normal rewards process.</p>
          </Card>

          {isMe && (
            <Card>
              <SectionTitle title="Recent reputation" />
              {contributions.isLoading ? (
                <p className="mt-3 text-body-sm text-ink-muted">Loading…</p>
              ) : !contributions.data?.length ? (
                <p className="mt-3 text-body-sm text-ink-muted">Nothing yet — answer a question to earn your first points.</p>
              ) : (
                <ul className="mt-3 divide-y divide-stroke-subtle">
                  {contributions.data.map((c) => (
                    <li key={c.id} className="flex items-start gap-3 py-2">
                      <span className="w-9 shrink-0 font-mono text-label-sm text-gold-text">+{c.points}</span>
                      <span className="min-w-0 text-body-sm text-ink-secondary">
                        {CONTRIBUTION_LABELS[c.kind]}
                        <span className="block text-ink-muted"><TimeAgo date={c.created_at} /></span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}
