import { useState, useMemo } from 'react'
import { Hand, MoreVertical, Plus, Search, Star, Zap } from 'lucide-react'
import {
  AvatarStack, BRAND_GRADIENT, Badge, ChipRow, SearchInput, SegmentedTabs, Toggle, Sheet, Button, cx
} from '@/components/ui'
import { usePrograms, useCreateProgram, useUpdateProgram, useToggleProgram } from '@/hooks/usePrograms'
import { useToast } from '@/context/ToastContext'

const ICONS = [Zap, Star, Hand]
const TONE = { Active: 'success', Inactive: 'danger', Draft: 'brand' }

const STATUS_DOT = {
  success: 'bg-success-solid',
  danger: 'bg-danger-solid',
  brand: 'bg-brand-solid',
}
const STATUS_TEXT = {
  success: 'text-success-text',
  danger: 'text-danger-text',
  brand: 'text-brand-text',
}

const formatPoints = (p) => (p || 0).toLocaleString()

function ProgramSheet({ open, onClose, program, onSubmit, isLoading }) {
  const isEditing = !!program
  const [form, setForm] = useState({
    name: program?.name || '',
    description: program?.description || '',
    trigger_type: program?.trigger_type || 'manual',
    rule_metric: program?.rule_metric || '',
    rule_threshold: program?.rule_threshold || '',
    points_value: program?.points_value || '',
  })

  // Reset form when opening a new one
  useMemo(() => {
    if (open) {
      setForm({
        name: program?.name || '',
        description: program?.description || '',
        trigger_type: program?.trigger_type || 'manual',
        rule_metric: program?.rule_metric || '',
        rule_threshold: program?.rule_threshold || '',
        points_value: program?.points_value || '',
      })
    }
  }, [open, program])

  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => { const n = { ...prev }; delete n[name]; return n })
    }
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Required'
    if (!form.points_value || Number(form.points_value) <= 0) errs.points_value = 'Must be > 0'
    if (form.trigger_type === 'rule') {
      if (!form.rule_metric.trim()) errs.rule_metric = 'Required'
      if (!form.rule_threshold || Number(form.rule_threshold) <= 0) errs.rule_threshold = 'Must be > 0'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      ...(isEditing ? { id: program.id } : {}),
      name: form.name.trim(),
      description: form.description.trim(),
      trigger_type: form.trigger_type,
      rule_metric: form.trigger_type === 'rule' ? form.rule_metric.trim() : null,
      rule_threshold: form.trigger_type === 'rule' ? Number(form.rule_threshold) : null,
      points_value: Number(form.points_value),
    })
  }

  const inputClass = "w-full h-11 rounded-xl border border-stroke-subtle bg-surface-subtle px-3.5 text-body-sm text-ink-primary outline-none focus:border-brand-solid focus:ring-1 focus:ring-brand-solid"
  
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Program' : 'Create Program'}
      subtitle={isEditing ? 'Update program details' : 'Define how points are earned'}
      icon={<Star size={19} className="text-white" />}
      width={480}
      footer={
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} className="sm:w-auto" disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="sm:w-auto" disabled={isLoading}>
            {isLoading ? 'Saving...' : isEditing ? 'Save changes' : 'Create program'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="block text-label-sm text-ink-primary mb-2">Program Name</label>
          <input
            name="name" value={form.name} onChange={handleChange}
            placeholder="e.g. Spot Bonus, Sales Star"
            className={cx(inputClass, errors.name && 'border-danger-solid')}
          />
        </div>

        <div>
          <label className="block text-label-sm text-ink-primary mb-2">Description</label>
          <textarea
            name="description" value={form.description} onChange={handleChange}
            placeholder="Describe when and why this program awards points..."
            rows={3}
            className={cx(inputClass, 'py-3 resize-none h-auto')}
          />
        </div>

        <div>
          <label className="block text-label-sm text-ink-primary mb-2">Trigger Type</label>
          <select
            name="trigger_type" value={form.trigger_type} onChange={handleChange}
            className={inputClass}
          >
            <option value="manual">Manual — admin awards points</option>
            <option value="rule">Rule-Based — via thresholds</option>
          </select>
        </div>

        {form.trigger_type === 'rule' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-label-sm text-ink-primary mb-2">Metric</label>
              <input
                name="rule_metric" value={form.rule_metric} onChange={handleChange}
                placeholder="e.g. sales_count"
                className={cx(inputClass, errors.rule_metric && 'border-danger-solid')}
              />
            </div>
            <div>
              <label className="block text-label-sm text-ink-primary mb-2">Threshold</label>
              <input
                name="rule_threshold" type="number" value={form.rule_threshold} onChange={handleChange}
                placeholder="e.g. 50"
                className={cx(inputClass, errors.rule_threshold && 'border-danger-solid')}
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-label-sm text-ink-primary mb-2">Points Value</label>
          <input
            name="points_value" type="number" value={form.points_value} onChange={handleChange}
            placeholder="e.g. 500"
            className={cx(inputClass, errors.points_value && 'border-danger-solid')}
          />
        </div>
      </div>
    </Sheet>
  )
}

export default function ProgramsPage() {
  const { data: rawPrograms, isLoading } = usePrograms()
  const createProgram = useCreateProgram()
  const updateProgram = useUpdateProgram()
  const toggleProgram = useToggleProgram()
  const toast = useToast()

  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [editingProgram, setEditingProgram] = useState(null)
  const [showSheet, setShowSheet] = useState(false)

  const programs = useMemo(() => {
    return (rawPrograms || []).map((p) => {
      const idx = String(p.id).charCodeAt(0) % ICONS.length
      return {
        ...p,
        icon: ICONS[idx],
        on: p.is_active,
        status: p.is_active ? 'Active' : 'Inactive',
        type: p.trigger_type === 'rule' ? 'Rule-based' : 'Manual',
        people: [], // no real DB data for who claimed it yet
      }
    })
  }, [rawPrograms])

  const toggle = async (id, currentState) => {
    try {
      await toggleProgram.mutateAsync({ id, is_active: !currentState })
      toast.success(!currentState ? 'Program activated' : 'Program deactivated')
    } catch (err) {
      toast.error('Failed to toggle program')
    }
  }

  const counts = useMemo(
    () => ({
      All: programs.length,
      Active: programs.filter((p) => p.status === 'Active').length,
      Inactive: programs.filter((p) => p.status === 'Inactive').length,
    }),
    [programs]
  )

  const visible = programs
    .filter((p) => (filter === 'All' ? true : p.status === filter))
    .filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))

  const tabs = ['All', 'Active', 'Inactive'].map((key) => ({
    value: key,
    label: key,
    count: counts[key],
  }))

  const handleCreate = async (data) => {
    try {
      await createProgram.mutateAsync(data)
      toast.success('Program created!')
      setShowSheet(false)
    } catch (err) {
      toast.error('Failed to create program')
    }
  }

  const handleUpdate = async (data) => {
    try {
      await updateProgram.mutateAsync(data)
      toast.success('Program updated!')
      setShowSheet(false)
    } catch (err) {
      toast.error('Failed to update program')
    }
  }

  const handleEditClick = (program) => {
    setEditingProgram(program)
    setShowSheet(true)
  }

  return (
    <div className="mx-auto max-w-[1120px] animate-fade-in">
      <div className="hidden items-center md:flex">
        <div>
          <h1 className="text-display-lg text-ink-primary">Reward programs</h1>
          <p className="mt-1.5 text-body-md text-ink-secondary">
            Define how points are earned. {programs.length} programs configured.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setEditingProgram(null); setShowSheet(true) }}
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-[10px] px-4 text-label-sm text-white shadow-glow-brand transition-all duration-200 ease-smooth hover:brightness-110 active:scale-[0.97]"
          style={BRAND_GRADIENT}
        >
          <Plus size={15} />
          Create program
        </button>
      </div>

      {/* filters */}
      <div className="flex items-center gap-2.5 mt-2 md:mt-6">
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search programs"
          className="flex-1 md:max-w-[280px] md:flex-none"
        />
        <SegmentedTabs className="hidden md:inline-flex" options={tabs} value={filter} onChange={setFilter} />
        <span className="ml-auto hidden font-mono text-[11px] text-ink-muted md:block">
          {programs.length} total programs
        </span>
      </div>

      <ChipRow
        className="mt-3 md:hidden"
        options={['All', 'Active', 'Inactive']}
        value={filter}
        onChange={setFilter}
      />

      {/* grid */}
      <div className="mt-4 grid gap-3.5 md:mt-5 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full py-16 text-center text-ink-muted">Loading programs...</div>
        ) : visible.map((program) => {
          const Icon = program.icon
          const tone = TONE[program.status]
          return (
            <article
              key={program.id}
              className={cx(
                'flex flex-col rounded-2xl border border-stroke-subtle bg-surface-base p-4 md:p-5',
                'shadow-elevation-sm transition-all duration-300 ease-smooth md:shadow-elevation-md',
                'hover:-translate-y-0.5 hover:shadow-elevation-lg',
                !program.on && 'opacity-[0.82]'
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cx(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-[10px]',
                    program.on ? 'bg-brand-subtle' : 'bg-surface-subtle'
                  )}
                >
                  <Icon size={17} className={program.on ? 'text-brand-solid' : 'text-ink-muted'} />
                </span>

                {/* mobile keeps the title beside the icon, desktop drops it below */}
                <div className="min-w-0 md:hidden">
                  <p className="truncate text-label-md text-ink-primary">{program.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-label-xs">
                    <span className={cx('h-1.5 w-1.5 rounded-full', STATUS_DOT[tone])} />
                    <span className={STATUS_TEXT[tone]}>{program.status}</span>
                    <span className="text-ink-muted">· {program.type}</span>
                  </p>
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-1">
                  <Toggle checked={program.on} onChange={() => toggle(program.id, program.on)} label={`Toggle ${program.name}`} />
                  <button
                    type="button"
                    onClick={() => handleEditClick(program)}
                    aria-label={`More options for ${program.name}`}
                    className="p-1.5 text-ink-muted transition hover:text-ink-secondary"
                  >
                    <MoreVertical size={15} />
                  </button>
                </div>
              </div>

              <div className="hidden md:block">
                <h3 className="mt-3.5 text-heading-sm text-ink-primary">{program.name}</h3>
              </div>

              <p className="mt-2.5 text-body-sm text-ink-muted md:mt-1.5 min-h-[40px]">{program.description || 'No description provided.'}</p>

              <div className="mt-3.5 hidden flex-wrap gap-2 md:flex">
                <Badge tone={tone} dot>
                  {program.status}
                </Badge>
                <Badge tone="neutral">{program.type}</Badge>
              </div>

              <div className="mt-3.5 h-px bg-stroke-subtle md:mt-4" />

              <div className="mt-3 flex items-center gap-2">
                <Zap size={14} className={program.on ? 'text-gold-solid' : 'text-ink-muted'} fill={program.on ? 'currentColor' : 'none'} />
                <span className="text-label-md text-ink-primary md:text-numeric-lg">
                  {formatPoints(program.points_value)}
                </span>
                <span className="text-label-xs text-ink-muted">pts</span>

                {program.people.length > 0 && (
                  <AvatarStack people={program.people} size="xs" className="ml-auto" />
                )}
                <span className="ml-auto font-mono text-[11px] text-ink-muted md:hidden">
                  ---
                </span>
              </div>
            </article>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => { setEditingProgram(null); setShowSheet(true) }}
        className="md:hidden fixed bottom-6 right-4 z-30 inline-flex h-[52px] items-center gap-2 rounded-full px-5 text-label-sm text-white shadow-glow-brand active:scale-95"
        style={BRAND_GRADIENT}
      >
        <Plus size={17} />
        New program
      </button>

      <ProgramSheet
        open={showSheet}
        onClose={() => setShowSheet(false)}
        program={editingProgram}
        onSubmit={editingProgram ? handleUpdate : handleCreate}
        isLoading={createProgram.isPending || updateProgram.isPending}
      />
    </div>
  )
}
