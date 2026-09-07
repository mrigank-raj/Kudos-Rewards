import { useState, useMemo } from 'react'
import { ArrowUpDown, Clock, ListFilter, MailPlus, Minus, MoreVertical, Plus, Zap } from 'lucide-react'
import { Avatar, Badge, Card, Checkbox, Dropdown, SearchInput, Sheet, Button, cx } from '@/components/ui'
import { usePeople, useCreditPoints, useDebitPoints, usePendingMembers, useAddPendingMember } from '@/hooks/usePeople'
import { usePrograms } from '@/hooks/usePrograms'
import { useToast } from '@/context/ToastContext'

const TEAMS = ['Design', 'Frontend', 'Backend', 'Product']
const TEAM_FILTER_OPTIONS = ['All teams', ...TEAMS]
const SORT_OPTIONS = [
  { value: 'balance_desc', label: 'Balance: high to low' },
  { value: 'balance_asc', label: 'Balance: low to high' },
  { value: 'name_asc', label: 'Name: A to Z' },
]

function CreditDebitSheet({ open, onClose, user, initialMode = 'credit', onCredit, onDebit, isLoading }) {
  const { data: programs } = usePrograms()
  const toast = useToast()

  const [mode, setMode] = useState(initialMode)
  const [form, setForm] = useState({ points: '', reason: '', programId: '' })
  const [errors, setErrors] = useState({})

  // Update mode if it changes from props
  useMemo(() => { if (open) setMode(initialMode) }, [open, initialMode])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => { const n = { ...prev }; delete n[name]; return n })
    }
  }

  const validate = () => {
    const errs = {}
    const points = Number(form.points)
    if (!form.points || points <= 0) errs.points = 'Must be > 0'
    if (!form.reason.trim()) errs.reason = 'Reason is required'
    if (mode === 'debit' && user && points > user.points_balance) {
      errs.points = `Insufficient balance (${user.points_balance} max)`
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      userId: user.id,
      points: Number(form.points),
      reason: form.reason.trim(),
      ...(mode === 'credit' && form.programId ? { programId: form.programId } : {}),
    }

    try {
      if (mode === 'credit') {
        await onCredit(payload)
        toast.success(`${form.points} points credited to ${user.name}!`)
      } else {
        await onDebit(payload)
        toast.success(`${form.points} points debited from ${user.name}.`)
      }
      onClose()
      setForm({ points: '', reason: '', programId: '' })
    } catch (err) {
      toast.error(err.message || `Failed to ${mode} points.`)
    }
  }

  const activePrograms = (programs || []).filter((p) => p.is_active)
  const inputClass = "w-full h-11 rounded-xl border border-stroke-subtle bg-surface-subtle px-3.5 text-body-sm text-ink-primary outline-none focus:border-brand-solid focus:ring-1 focus:ring-brand-solid"

  if (!user) return null

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`${mode === 'credit' ? 'Credit' : 'Debit'} Points`}
      subtitle={`Adjusting balance for ${user.name}`}
      width={480}
      footer={
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} className="sm:w-auto" disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="sm:w-auto" disabled={isLoading}>
            {isLoading ? 'Processing...' : mode === 'credit' ? 'Credit points' : 'Debit points'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* User Info */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface-sunken">
          <Avatar initials={user.name.charAt(0)} size="lg" />
          <div className="min-w-0">
            <p className="font-medium text-ink-primary">{user.name}</p>
            <p className="text-body-sm text-ink-muted">
              Current balance: <span className="text-ink-primary font-mono">{user.points_balance?.toLocaleString() ?? 0}</span> pts
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('credit')}
            className={cx(
              "flex-1 h-11 rounded-xl text-label-sm transition-all",
              mode === 'credit' ? "bg-success-subtle text-success-solid border border-success-solid" : "bg-surface-subtle text-ink-secondary hover:text-ink-primary border border-stroke-subtle"
            )}
          >
            Credit (+)
          </button>
          <button
            type="button"
            onClick={() => setMode('debit')}
            className={cx(
              "flex-1 h-11 rounded-xl text-label-sm transition-all",
              mode === 'debit' ? "bg-danger-subtle text-danger-solid border border-danger-solid" : "bg-surface-subtle text-ink-secondary hover:text-ink-primary border border-stroke-subtle"
            )}
          >
            Debit (-)
          </button>
        </div>

        <div>
          <label className="block text-label-sm text-ink-primary mb-2">Points</label>
          <input
            name="points" type="number" min="1" value={form.points} onChange={handleChange}
            placeholder="e.g. 100"
            className={cx(inputClass, errors.points && 'border-danger-solid')}
          />
          {errors.points && <p className="mt-1 text-xs text-danger-solid">{errors.points}</p>}
        </div>

        <div>
          <label className="block text-label-sm text-ink-primary mb-2">Reason</label>
          <textarea
            name="reason" value={form.reason} onChange={handleChange}
            placeholder="Why is this adjustment being made?"
            rows={2}
            className={cx(inputClass, 'py-3 resize-none h-auto', errors.reason && 'border-danger-solid')}
          />
        </div>

        {mode === 'credit' && activePrograms.length > 0 && (
          <div>
            <label className="block text-label-sm text-ink-primary mb-2">Link to Program (Optional)</label>
            <select
              name="programId" value={form.programId} onChange={handleChange}
              className={inputClass}
            >
              <option value="">No program</option>
              {activePrograms.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.points_value} pts)</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </Sheet>
  )
}

function InviteMemberSheet({ open, onClose }) {
  const addPendingMember = useAddPendingMember()
  const toast = useToast()

  const [form, setForm] = useState({ name: '', email: '', role: 'recipient', team: '' })
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n })
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    try {
      await addPendingMember.mutateAsync({
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        team: form.team || null,
      })
      toast.success(`${form.name} added — they'll show up here once they sign up.`)
      setForm({ name: '', email: '', role: 'recipient', team: '' })
      onClose()
    } catch (err) {
      toast.error(err.message?.includes('duplicate') ? 'Someone with this email is already invited.' : (err.message || 'Failed to add member.'))
    }
  }

  const inputClass = "w-full h-11 rounded-xl border border-stroke-subtle bg-surface-subtle px-3.5 text-body-sm text-ink-primary outline-none focus:border-brand-solid focus:ring-1 focus:ring-brand-solid"

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add a member"
      subtitle="They'll appear once they sign up with this email — no invite email is sent"
      width={440}
      footer={
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} className="sm:w-auto" disabled={addPendingMember.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="sm:w-auto" disabled={addPendingMember.isPending}>
            {addPendingMember.isPending ? 'Adding...' : 'Add member'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="block text-label-sm text-ink-primary mb-2">Full name</label>
          <input name="name" value={form.name} onChange={handleChange} placeholder="Jane Doe" className={cx(inputClass, errors.name && 'border-danger-solid')} />
          {errors.name && <p className="mt-1 text-xs text-danger-solid">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-label-sm text-ink-primary mb-2">Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="jane@company.com" className={cx(inputClass, errors.email && 'border-danger-solid')} />
          {errors.email && <p className="mt-1 text-xs text-danger-solid">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-label-sm text-ink-primary mb-2">Team</label>
          <select name="team" value={form.team} onChange={handleChange} className={inputClass}>
            <option value="">Unassigned</option>
            {TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-label-sm text-ink-primary mb-2">Role</label>
          <select name="role" value={form.role} onChange={handleChange} className={inputClass}>
            <option value="recipient">Team member (recipient)</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
    </Sheet>
  )
}

export default function PeoplePage() {
  const { data: rawPeople, isLoading } = usePeople()
  const { data: rawPending, isLoading: pendingLoading } = usePendingMembers()
  const creditPoints = useCreditPoints()
  const debitPoints = useDebitPoints()

  const [query, setQuery] = useState('')
  const [teamFilter, setTeamFilter] = useState('All teams')
  const [sort, setSort] = useState('balance_desc')
  const [selectedUser, setSelectedUser] = useState(null)
  const [sheetMode, setSheetMode] = useState('credit')
  const [showSheet, setShowSheet] = useState(false)
  const [showInvite, setShowInvite] = useState(false)

  const people = useMemo(() => {
    return (rawPeople || []).map(p => ({
      ...p,
      initials: (p.name || 'User').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      color: p.avatar_url,
      team: p.team || null,
      balance: p.points_balance || 0,
      lifetime: p.points_balance || 0,
      joined: new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      pending: false,
    }))
  }, [rawPeople])

  const pendingPeople = useMemo(() => {
    return (rawPending || []).map(p => ({
      id: `pending-${p.id}`,
      pendingId: p.id,
      name: p.name,
      email: p.email,
      initials: (p.name || 'User').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      team: p.team || null,
      balance: null,
      lifetime: null,
      joined: null,
      pending: true,
    }))
  }, [rawPending])

  const visible = useMemo(() => {
    const combined = [...people, ...pendingPeople]
      .filter((p) => teamFilter === 'All teams' || p.team === teamFilter)
      .filter((p) =>
        p.name.toLowerCase().includes(query.trim().toLowerCase()) ||
        (p.email || '').toLowerCase().includes(query.trim().toLowerCase())
      )

    const sorted = [...combined].sort((a, b) => {
      if (a.pending !== b.pending) return a.pending ? 1 : -1 // pending members sink to the bottom
      if (sort === 'name_asc') return a.name.localeCompare(b.name)
      if (sort === 'balance_asc') return (a.balance ?? 0) - (b.balance ?? 0)
      return (b.balance ?? 0) - (a.balance ?? 0) // balance_desc
    })

    return sorted
  }, [people, pendingPeople, teamFilter, query, sort])

  const handleActionClick = (user, mode) => {
    setSelectedUser(user)
    setSheetMode(mode)
    setShowSheet(true)
  }

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label

  return (
    <div className="mx-auto max-w-[1120px] animate-fade-in">
      <div className="hidden items-center gap-2.5 md:flex">
        <div>
          <h1 className="text-display-lg text-ink-primary">People</h1>
          <p className="mt-1.5 text-body-md text-ink-secondary">
            {people.length} members across the workspace{pendingPeople.length > 0 ? `, ${pendingPeople.length} invited` : ''}.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-stroke bg-surface-base px-3.5 text-label-sm text-ink-primary transition hover:bg-surface-subtle active:scale-[0.98]"
          >
            <MailPlus size={15} className="text-ink-secondary" />
            Add member
          </button>
        </div>
      </div>

      {/* sticky search on mobile, inline filter row on desktop */}
      <div className="sticky top-[60px] z-10 -mx-4 border-b border-stroke-subtle bg-surface-base px-4 py-3 md:static md:mx-0 md:mt-6 md:border-0 md:bg-transparent md:p-0">
        <div className="flex items-center gap-2.5">
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="flex-1 md:max-w-[300px] md:flex-none"
          />
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            aria-label="Add member"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-stroke-subtle bg-surface-base text-ink-secondary md:hidden"
          >
            <MailPlus size={16} />
          </button>
          <Dropdown
            icon={ListFilter}
            className="hidden md:inline-flex"
            options={TEAM_FILTER_OPTIONS}
            value={teamFilter}
            onChange={setTeamFilter}
          >
            {teamFilter}
          </Dropdown>
          <Dropdown
            icon={ArrowUpDown}
            className="hidden md:inline-flex"
            options={SORT_OPTIONS}
            value={sort}
            onChange={setSort}
            align="right"
          >
            {sortLabel}
          </Dropdown>
        </div>

        <div className="mt-2.5 flex items-center font-mono text-[11px] text-ink-muted md:hidden">
          <span>Sorted by {sort === 'name_asc' ? 'name' : 'balance'}</span>
          <span className="ml-auto">{visible.length} of {people.length + pendingPeople.length} members</span>
        </div>
      </div>

      {/* ------------------------------------------- mobile: stacked cards */}
      <div className="mt-4 flex flex-col gap-3 md:hidden">
        {isLoading || pendingLoading ? (
          <div className="p-8 text-center text-ink-muted">Loading people...</div>
        ) : visible.length === 0 ? (
          <div className="p-8 text-center text-ink-muted">No members found.</div>
        ) : visible.map((person) => (
          <div key={person.id} className="rounded-2xl border border-stroke-subtle bg-surface-base p-3.5 shadow-elevation-sm">
            <div className="flex items-center gap-3">
              <Avatar initials={person.initials} color={person.color} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-label-md text-ink-primary">{person.name}</p>
                <p className="truncate text-body-sm text-ink-muted">{person.email}</p>
              </div>
              {!person.pending && (
                <button
                  type="button"
                  aria-label={`More options for ${person.name}`}
                  className="ml-auto shrink-0 p-1.5 text-ink-muted"
                >
                  <MoreVertical size={15} />
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{person.team || 'Unassigned'}</Badge>
              {person.pending ? (
                <Badge tone="gold" dot>
                  <Clock size={11} />
                  Invited
                </Badge>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <Zap size={13} className="text-gold-solid" fill="currentColor" />
                    <span className="text-label-md text-ink-primary">{person.balance}</span>
                    <span className="font-mono text-[11px] text-ink-muted">pts</span>
                  </span>
                  <span className="ml-auto font-mono text-[11px] text-ink-muted">
                    {person.lifetime} lifetime
                  </span>
                </>
              )}
            </div>

            {!person.pending && (
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleActionClick(person, 'credit')}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[10px] bg-success-subtle text-label-sm text-success-text active:scale-[0.97]"
                >
                  <Plus size={14} className="text-success-solid" />
                  Credit
                </button>
                <button
                  type="button"
                  onClick={() => handleActionClick(person, 'debit')}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[10px] bg-danger-subtle text-label-sm text-danger-text active:scale-[0.97]"
                >
                  <Minus size={14} className="text-danger-solid" />
                  Debit
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* -------------------------------------------------- desktop: table */}
      <Card flush className="mt-5 hidden overflow-hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-sunken text-left">
              <th className="w-[52px] py-3 pl-5">
                <Checkbox checked={false} onChange={() => {}} label="Select all" />
              </th>
              <th className="py-3 text-overline-sm uppercase text-ink-muted">Member</th>
              <th className="py-3 text-overline-sm uppercase text-ink-muted">Team</th>
              <th className="py-3 text-right text-overline-sm uppercase text-ink-muted">Balance</th>
              <th className="py-3 text-right text-overline-sm uppercase text-ink-muted">Lifetime earned</th>
              <th className="py-3 text-right text-overline-sm uppercase text-ink-muted">Joined</th>
              <th className="py-3 pr-5 text-right text-overline-sm uppercase text-ink-muted">Actions</th>
            </tr>
          </thead>

          <tbody>
            {isLoading || pendingLoading ? (
              <tr><td colSpan="7" className="py-8 text-center text-ink-muted">Loading people...</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan="7" className="py-8 text-center text-ink-muted">No members found.</td></tr>
            ) : visible.map((person) => (
              <tr
                key={person.id}
                className={cx('border-t border-stroke-subtle transition-colors hover:bg-surface-subtle/60', person.pending && 'opacity-70')}
              >
                <td className="py-2.5 pl-5">
                  <Checkbox checked={false} onChange={() => {}} label={`Select ${person.name}`} />
                </td>

                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-3">
                    <Avatar initials={person.initials} color={person.color} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-label-sm text-ink-primary">{person.name}</p>
                      <p className="truncate text-body-sm text-ink-muted">{person.email}</p>
                    </div>
                  </div>
                </td>

                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-1.5">
                    <Badge tone="neutral">{person.team || 'Unassigned'}</Badge>
                    {person.pending && (
                      <Badge tone="gold" dot>
                        <Clock size={11} />
                        Invited
                      </Badge>
                    )}
                  </div>
                </td>

                <td className="py-2.5 pr-4 text-right">
                  {person.pending ? (
                    <span className="font-mono text-[11px] text-ink-muted">—</span>
                  ) : (
                    <>
                      <span className="text-numeric-lg text-ink-primary">{person.balance}</span>
                      <span className="ml-1 font-mono text-[11px] text-ink-muted">pts</span>
                    </>
                  )}
                </td>

                <td className="py-2.5 pr-4 text-right text-label-sm text-ink-secondary">
                  {person.pending ? '—' : person.lifetime}
                </td>

                <td className="py-2.5 pr-4 text-right font-mono text-[11px] text-ink-muted">
                  {person.pending ? 'Not yet' : person.joined}
                </td>

                <td className="py-2.5 pr-5">
                  {!person.pending && (
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleActionClick(person, 'credit')}
                        aria-label={`Credit points to ${person.name}`}
                        className="grid h-8 w-8 place-items-center rounded-lg bg-success-subtle transition active:scale-95"
                      >
                        <Plus size={14} className="text-success-solid" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleActionClick(person, 'debit')}
                        aria-label={`Debit points from ${person.name}`}
                        className="grid h-8 w-8 place-items-center rounded-lg bg-danger-subtle transition active:scale-95"
                      >
                        <Minus size={14} className="text-danger-solid" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center border-t border-stroke-subtle px-5 py-3.5">
          <span className="text-body-sm text-ink-muted">
            Showing {visible.length} of {people.length + pendingPeople.length} members
          </span>
        </div>
      </Card>

      <CreditDebitSheet
        open={showSheet}
        onClose={() => setShowSheet(false)}
        user={selectedUser}
        initialMode={sheetMode}
        onCredit={async (p) => await creditPoints.mutateAsync(p)}
        onDebit={async (p) => await debitPoints.mutateAsync(p)}
        isLoading={creditPoints.isPending || debitPoints.isPending}
      />

      <InviteMemberSheet open={showInvite} onClose={() => setShowInvite(false)} />
    </div>
  )
}
