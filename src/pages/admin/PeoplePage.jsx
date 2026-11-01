import { useState, useMemo } from 'react'
import { ArrowUpDown, Clock, ListFilter, MailPlus, Minus, Pencil, Plus, UserMinus, Zap } from 'lucide-react'
import { Avatar, Badge, Card, Dropdown, SearchInput, Sheet, Button, cx } from '@/components/ui'
import { usePeople, useCreditPoints, useDebitPoints, usePendingMembers, useAddPendingMember, useRemoveMember, useRemovePendingMember, useSetDepartment } from '@/hooks/usePeople'
import { useAuth } from '@/hooks/useAuth'
import { usePrograms } from '@/hooks/usePrograms'
import { useToast } from '@/context/ToastContext'

const ALL_DEPARTMENTS = 'All departments'
const BIG_CREDIT = 2000

/** Department badge; for people who have signed up, HR can click to edit it. */
function DepartmentChip({ person, onEdit }) {
  if (person.pending) return <Badge tone="neutral">{person.team || 'No department'}</Badge>
  return (
    <button
      type="button"
      onClick={() => onEdit(person)}
      title="Set department"
      className="inline-flex items-center gap-1 rounded-full bg-surface-subtle px-2 py-0.5 text-label-xs text-ink-secondary transition hover:text-ink-primary"
    >
      {person.team || 'No department'}
      <Pencil size={11} className="text-ink-muted" />
    </button>
  )
}

function DepartmentSheet({ person, onClose }) {
  const setDepartment = useSetDepartment()
  const toast = useToast()
  const [team, setTeam] = useState(person.team || '')

  const save = async () => {
    try {
      await setDepartment.mutateAsync({ userId: person.id, team })
      toast.success(team.trim() ? `${person.name} is now in ${team.trim()}.` : `Department cleared for ${person.name}.`)
      onClose()
    } catch (err) {
      toast.error(err.message || 'Could not set the department.')
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Set department"
      subtitle={person.name}
      width={420}
      footer={
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} className="sm:w-auto" disabled={setDepartment.isPending}>Cancel</Button>
          <Button onClick={save} className="sm:w-auto" disabled={setDepartment.isPending}>
            {setDepartment.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      }
    >
      <label className="block text-label-sm text-ink-primary mb-2">Department</label>
      <input
        value={team}
        onChange={(e) => setTeam(e.target.value)}
        maxLength={60}
        placeholder="e.g. School of Computer Engineering"
        className="w-full h-11 rounded-xl border border-stroke-subtle bg-surface-subtle px-3.5 text-body-sm text-ink-primary outline-none focus:border-brand-solid focus:ring-1 focus:ring-brand-solid"
      />
      <p className="mt-2 text-body-sm text-ink-muted">Leave empty to clear it. Used by the community &ldquo;My Department&rdquo; tab and filters.</p>
    </Sheet>
  )
}
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
  const [confirmBig, setConfirmBig] = useState(false)

  // Update mode if it changes from props
  useMemo(() => { if (open) setMode(initialMode) }, [open, initialMode])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (name === 'points') setConfirmBig(false)
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

    // A typo like 50000 for 500 has no undo except a manual debit.
    if (mode === 'credit' && Number(form.points) > BIG_CREDIT && !confirmBig) {
      setConfirmBig(true)
      return
    }

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
      setConfirmBig(false)
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
      title={`${mode === 'credit' ? 'Credit' : 'Debit'} points`}
      subtitle={`Adjusting balance for ${user.name}`}
      width={480}
      footer={
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} className="sm:w-auto" disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="sm:w-auto" disabled={isLoading}>
            {isLoading ? 'Processing...' : confirmBig ? `Yes, credit ${Number(form.points).toLocaleString()} points` : mode === 'credit' ? 'Credit points' : 'Debit points'}
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
          {confirmBig && (
            <p className="mt-2 rounded-lg border border-gold-border bg-gold-subtle p-2.5 text-body-sm text-gold-text">
              That's a large credit. Check the amount, then press the button again to confirm.
            </p>
          )}
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
            <label className="block text-label-sm text-ink-primary mb-2">Link to program (optional)</label>
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
    else if (!/^[^\s@]+@kiit\.ac\.in$/i.test(form.email.trim())) errs.email = 'Use an official @kiit.ac.in email'
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
        team: form.team.trim() || null,
      })
      toast.success(`${form.name} added — they'll show up here once they sign up.`)
      setForm({ name: '', email: '', role: 'recipient', team: '' })
      onClose()
    } catch (err) {
      toast.error(err.message?.includes('duplicate') ? 'This email is already on the approved list.' : (err.message || 'Failed to add member.'))
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
          <input name="name" value={form.name} onChange={handleChange} placeholder="Full name" className={cx(inputClass, errors.name && 'border-danger-solid')} />
          {errors.name && <p className="mt-1 text-xs text-danger-solid">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-label-sm text-ink-primary mb-2">Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="name@kiit.ac.in" className={cx(inputClass, errors.email && 'border-danger-solid')} />
          {errors.email && <p className="mt-1 text-xs text-danger-solid">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-label-sm text-ink-primary mb-2">Department (optional)</label>
          <input name="team" value={form.team} onChange={handleChange} maxLength={60} placeholder="e.g. School of Computer Engineering" className={inputClass} />
        </div>

        <div>
          <label className="block text-label-sm text-ink-primary mb-2">Role</label>
          <select name="role" value={form.role} onChange={handleChange} className={inputClass}>
            <option value="recipient">Employee</option>
            <option value="admin">HR</option>
          </select>
        </div>
      </div>
    </Sheet>
  )
}

function RemoveMemberSheet({ person, onClose }) {
  const removeMember = useRemoveMember()
  const removePending = useRemovePendingMember()
  const toast = useToast()
  const [revoke, setRevoke] = useState(true)

  if (!person) return null

  const busy = removeMember.isPending || removePending.isPending

  const handleRemove = async () => {
    try {
      if (person.pending) {
        await removePending.mutateAsync(person.pendingId)
        toast.success(`${person.name} removed from the approved list.`)
      } else {
        // The server revokes whatever is left at that moment, which may differ
        // from the balance shown here if they just spent or sent points.
        const res = await removeMember.mutateAsync({ userId: person.id, revokePoints: revoke })
        toast.success(res?.points_revoked > 0
          ? `${person.name} removed. ${res.points_revoked} points revoked.`
          : `${person.name} removed from the portal.`)
      }
      onClose()
    } catch (err) {
      toast.error(err.message || 'Could not remove this person.')
    }
  }

  const optionClass = (on) => cx(
    'flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition',
    on ? 'border-brand-solid bg-brand-subtle' : 'border-stroke-subtle bg-surface-subtle hover:border-stroke'
  )

  return (
    <Sheet
      open
      onClose={onClose}
      title={person.pending ? 'Remove from approved list' : 'Remove from portal'}
      subtitle={person.name}
      width={460}
      footer={
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} className="sm:w-auto" disabled={busy}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-danger-solid px-[18px] text-label-sm text-white transition hover:brightness-110 active:scale-[0.97] disabled:opacity-50"
          >
            <UserMinus size={15} />
            {busy ? 'Removing...' : person.pending ? 'Remove from list' : 'Remove person'}
          </button>
        </div>
      }
    >
      {person.pending ? (
        <p className="text-body-md text-ink-secondary">
          {person.name} hasn&apos;t signed up yet. Once removed, they can&apos;t create an account unless HR adds them again.
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-body-md text-ink-secondary">
            {person.name} won&apos;t be able to log in any more. Their past Thank You ! notes, points history and posts stay on record.
          </p>

          {person.balance > 0 ? (
            <div className="space-y-2.5" role="radiogroup" aria-label="Remaining points">
              <p className="text-label-sm text-ink-primary">They still have {person.balance.toLocaleString()} points</p>
              <button type="button" role="radio" aria-checked={revoke} onClick={() => setRevoke(true)} className={optionClass(revoke)}>
                <span className="min-w-0">
                  <span className="block text-label-sm text-ink-primary">Revoke all their points</span>
                  <span className="block text-body-sm text-ink-muted">Recorded as &ldquo;Points revoked on leaving&rdquo;.</span>
                </span>
              </button>
              <button type="button" role="radio" aria-checked={!revoke} onClick={() => setRevoke(false)} className={optionClass(!revoke)}>
                <span className="min-w-0">
                  <span className="block text-label-sm text-ink-primary">Leave the points as they are</span>
                  <span className="block text-body-sm text-ink-muted">They stay frozen on the closed account.</span>
                </span>
              </button>
            </div>
          ) : (
            <p className="text-body-sm text-ink-muted">They have no points left.</p>
          )}

          <p className="rounded-xl bg-surface-sunken p-3 text-body-sm text-ink-muted">
            Before leaving, people can use their points in the reward shop or pass them on with Say Thank You !.
            Any reward requests still waiting must be delivered or cancelled first.
          </p>
        </div>
      )}
    </Sheet>
  )
}

export default function PeoplePage() {
  const { profile } = useAuth()
  const { data: rawPeople, isLoading } = usePeople()
  const { data: rawPending, isLoading: pendingLoading } = usePendingMembers()
  const creditPoints = useCreditPoints()
  const debitPoints = useDebitPoints()

  const [query, setQuery] = useState('')
  const [teamFilter, setTeamFilter] = useState(ALL_DEPARTMENTS)
  const [sort, setSort] = useState('balance_desc')
  const [selectedUser, setSelectedUser] = useState(null)
  const [sheetMode, setSheetMode] = useState('credit')
  const [showSheet, setShowSheet] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [editingDept, setEditingDept] = useState(null)

  const people = useMemo(() => {
    return (rawPeople || []).map(p => ({
      ...p,
      initials: (p.name || 'User').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      color: p.avatar_url,
      team: p.team || null,
      balance: p.points_balance || 0,
      joined: new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      pending: false,
      isHR: p.role === 'admin',
      isSelf: p.id === profile?.id,
    }))
  }, [rawPeople, profile?.id])

  const pendingPeople = useMemo(() => {
    return (rawPending || []).map(p => ({
      id: `pending-${p.id}`,
      pendingId: p.id,
      name: p.name,
      email: p.email,
      initials: (p.name || 'User').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      team: p.team || null,
      balance: null,
      joined: null,
      pending: true,
      isHR: p.role === 'admin',
      isSelf: false,
    }))
  }, [rawPending])

  // Departments are free text (migration 020), so offer whatever is in use.
  const departmentOptions = useMemo(() => {
    const names = new Set([...people, ...pendingPeople].map((p) => p.team).filter(Boolean))
    return [ALL_DEPARTMENTS, ...[...names].sort()]
  }, [people, pendingPeople])

  const visible = useMemo(() => {
    const combined = [...people, ...pendingPeople]
      .filter((p) => teamFilter === ALL_DEPARTMENTS || p.team === teamFilter)
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
            {people.length} people at KIIT University{pendingPeople.length > 0 ? `, ${pendingPeople.length} invited` : ''}.
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
            options={departmentOptions}
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
              {!person.isSelf && (
                <button
                  type="button"
                  onClick={() => setRemoving(person)}
                  aria-label={`Remove ${person.name}`}
                  className="ml-auto shrink-0 p-1.5 text-ink-muted hover:text-danger-solid"
                >
                  <UserMinus size={16} />
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <DepartmentChip person={person} onEdit={setEditingDept} />
              {person.isHR && <Badge tone="brand">HR</Badge>}
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
                </>
              )}
            </div>

            {!person.pending && !person.isSelf && (
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
              <th className="py-3 pl-5 text-overline-sm uppercase text-ink-muted">Member</th>
              <th className="py-3 text-overline-sm uppercase text-ink-muted">Department</th>
              <th className="py-3 text-right text-overline-sm uppercase text-ink-muted">Balance</th>
              <th className="py-3 text-right text-overline-sm uppercase text-ink-muted">Joined</th>
              <th className="py-3 pr-5 text-right text-overline-sm uppercase text-ink-muted">Actions</th>
            </tr>
          </thead>

          <tbody>
            {isLoading || pendingLoading ? (
              <tr><td colSpan="5" className="py-8 text-center text-ink-muted">Loading people...</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan="5" className="py-8 text-center text-ink-muted">No members found.</td></tr>
            ) : visible.map((person) => (
              <tr
                key={person.id}
                className={cx('border-t border-stroke-subtle transition-colors hover:bg-surface-subtle/60', person.pending && 'opacity-70')}
              >
                <td className="py-2.5 pl-5 pr-4">
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
                    <DepartmentChip person={person} onEdit={setEditingDept} />
                    {person.isHR && <Badge tone="brand">HR</Badge>}
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

                <td className="py-2.5 pr-4 text-right font-mono text-[11px] text-ink-muted">
                  {person.pending ? 'Not yet' : person.joined}
                </td>

                <td className="py-2.5 pr-5">
                  <div className="flex items-center justify-end gap-1.5">
                    {!person.pending && !person.isSelf && (<>
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
                    </>)}
                    {person.isSelf ? (
                      <span className="font-mono text-[11px] text-ink-muted">You</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setRemoving(person)}
                        aria-label={`Remove ${person.name}`}
                        title="Remove from portal"
                        className="grid h-8 w-8 place-items-center rounded-lg bg-surface-subtle text-ink-muted transition hover:text-danger-solid active:scale-95"
                      >
                        <UserMinus size={14} />
                      </button>
                    )}
                  </div>
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

      {editingDept && <DepartmentSheet key={editingDept.id} person={editingDept} onClose={() => setEditingDept(null)} />}

      {removing && <RemoveMemberSheet key={removing.id} person={removing} onClose={() => setRemoving(null)} />}
    </div>
  )
}
