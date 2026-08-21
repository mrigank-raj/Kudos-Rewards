/**
 * Screen 8 — Reward programs
 * Card grid on desktop, stacked list on mobile. Toggles flip a program live.
 * Figma: "08 · Reward Programs"
 */
import { useMemo, useState } from 'react'
import { Hand, MoreVertical, Plus, Search, Star, Zap } from 'lucide-react'
import AppShell from '../components/shell/AppShell'
import {
  AvatarStack, BRAND_GRADIENT, Badge, ChipRow, SearchInput, SegmentedTabs, Toggle, cx,
} from '../components/ui'
import { PROGRAMS, formatPoints } from '../lib/data'

const ICONS = { Zap, Star, Hand }
const TONE = { Active: 'success', Inactive: 'danger', Draft: 'brand' }

// Written out in full because Tailwind's JIT only sees complete class strings.
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

export default function Screen8(props) {
  const [programs, setPrograms] = useState(PROGRAMS)
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')

  const toggle = (id) =>
    setPrograms((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, on: !p.on, status: !p.on ? 'Active' : 'Inactive' } : p
      )
    )

  const counts = useMemo(
    () => ({
      All: programs.length,
      Active: programs.filter((p) => p.status === 'Active').length,
      Inactive: programs.filter((p) => p.status === 'Inactive').length,
      Draft: programs.filter((p) => p.status === 'Draft').length,
    }),
    [programs]
  )

  const visible = programs
    .filter((p) => (filter === 'All' ? true : p.status === filter))
    .filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))

  const tabs = ['All', 'Active', 'Inactive', 'Draft'].map((key) => ({
    value: key,
    label: key,
    count: counts[key],
  }))

  return (
    <AppShell role="admin" active="programs" title="Programs" {...props}>
      <div className="mx-auto max-w-[1120px]">
        <div className="hidden items-center md:flex">
          <div>
            <h1 className="text-display-lg text-ink-primary">Reward programs</h1>
            <p className="mt-1.5 text-body-md text-ink-secondary">
              Define how points are earned. Six programs configured, three live.
            </p>
          </div>
          <button
            type="button"
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-[10px] px-4 text-label-sm text-white shadow-glow-brand transition-all duration-200 ease-smooth hover:brightness-110 active:scale-[0.97]"
            style={BRAND_GRADIENT}
          >
            <Plus size={15} />
            Create program
          </button>
        </div>

        {/* filters */}
        <div className="flex items-center gap-2.5 md:mt-6">
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search programs"
            className="flex-1 md:max-w-[280px] md:flex-none"
          />
          <SegmentedTabs className="hidden md:inline-flex" options={tabs} value={filter} onChange={setFilter} />
          <span className="ml-auto hidden font-mono text-[11px] text-ink-muted md:block">
            Sorted by points issued
          </span>
        </div>

        <ChipRow
          className="mt-3 md:hidden"
          options={['All', 'Active', 'Inactive', 'Draft']}
          value={filter}
          onChange={setFilter}
        />

        {/* grid */}
        <div className="mt-4 grid gap-3.5 md:mt-5 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
          {visible.map((program) => {
            const Icon = ICONS[program.icon]
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
                    <Toggle checked={program.on} onChange={() => toggle(program.id)} label={`Toggle ${program.name}`} />
                    <button
                      type="button"
                      aria-label={`More options for ${program.name}`}
                      className="hidden p-1.5 text-ink-muted transition hover:text-ink-secondary md:block"
                    >
                      <MoreVertical size={15} />
                    </button>
                  </div>
                </div>

                <div className="hidden md:block">
                  <h3 className="mt-3.5 text-heading-sm text-ink-primary">{program.name}</h3>
                </div>

                <p className="mt-2.5 text-body-sm text-ink-muted md:mt-1.5">{program.desc}</p>

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
                    {formatPoints(program.points)}
                  </span>
                  <span className="text-label-xs text-ink-muted">pts</span>

                  {program.people.length > 0 && (
                    <AvatarStack people={program.people} size="xs" className="ml-auto" />
                  )}
                  <span className="ml-auto font-mono text-[11px] text-ink-muted md:hidden">
                    {program.issued ? `${program.issued} issued` : 'Not launched'}
                  </span>
                </div>

                <div className="mt-2.5 hidden items-center font-mono text-[11px] text-ink-muted md:flex">
                  <span>{program.issued ? `${program.issued} pts issued` : 'No points issued'}</span>
                  <span className="ml-auto">{program.awards}</span>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        className="md:hidden fixed bottom-6 right-4 z-30 inline-flex h-[52px] items-center gap-2 rounded-full px-5 text-label-sm text-white shadow-glow-brand active:scale-95"
        style={BRAND_GRADIENT}
      >
        <Plus size={17} />
        New program
      </button>
    </AppShell>
  )
}
