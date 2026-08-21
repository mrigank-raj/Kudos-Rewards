/**
 * Screen 9 — People and teams
 * A real table on desktop. On mobile the same rows become stacked cards under a
 * sticky search bar, because tables do not survive a 390px viewport.
 * Figma: "09 · People"
 */
import { useMemo, useState } from 'react'
import {
  ArrowUpDown, ChevronLeft, ChevronRight, ListFilter, MailPlus, Minus,
  MoreVertical, Plus, Zap,
} from 'lucide-react'
import AppShell from '../components/shell/AppShell'
import {
  Avatar, BRAND_GRADIENT, Badge, Card, Checkbox, Dropdown, SearchInput, cx,
} from '../components/ui'
import { PEOPLE } from '../lib/data'

export default function Screen9(props) {
  const [selected, setSelected] = useState([1, 2])
  const [query, setQuery] = useState('')

  const visible = useMemo(
    () =>
      PEOPLE.filter(
        (p) =>
          p.name.toLowerCase().includes(query.trim().toLowerCase()) ||
          p.email.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [query]
  )

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const allChecked = visible.length > 0 && visible.every((p) => selected.includes(p.id))

  return (
    <AppShell role="admin" active="people" title="People" {...props}>
      <div className="mx-auto max-w-[1120px]">
        <div className="hidden items-center gap-2.5 md:flex">
          <div>
            <h1 className="text-display-lg text-ink-primary">People</h1>
            <p className="mt-1.5 text-body-md text-ink-secondary">
              128 members across 6 teams. 12 joined in the last 30 days.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-stroke bg-surface-base px-3.5 text-label-sm text-ink-primary transition hover:bg-surface-subtle active:scale-[0.98]"
            >
              <MailPlus size={15} className="text-ink-secondary" />
              Invite members
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-[10px] px-4 text-label-sm text-white shadow-glow-brand transition-all duration-200 ease-smooth hover:brightness-110 active:scale-[0.97]"
              style={BRAND_GRADIENT}
            >
              <Plus size={15} />
              Credit points
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
              aria-label="Filter"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-stroke-subtle bg-surface-base text-ink-secondary md:hidden"
            >
              <ListFilter size={16} />
            </button>
            <Dropdown icon={ListFilter} className="hidden md:inline-flex">All teams</Dropdown>
            <Dropdown icon={ArrowUpDown} className="hidden md:inline-flex">Balance: high to low</Dropdown>

            {selected.length > 0 && (
              <span className="ml-auto hidden items-center gap-2.5 rounded-full border border-brand-border bg-brand-subtle px-3 py-2 text-label-xs text-brand-text md:inline-flex">
                {selected.length} selected
                <span className="h-3.5 w-px bg-brand-border" />
                <button type="button" className="transition hover:opacity-80">Credit all</button>
              </span>
            )}
          </div>

          <div className="mt-2.5 flex items-center font-mono text-[11px] text-ink-muted md:hidden">
            <span>Sorted by balance</span>
            <span className="ml-auto">{visible.length} of 128 members</span>
          </div>
        </div>

        {/* ------------------------------------------- mobile: stacked cards */}
        <div className="mt-4 flex flex-col gap-3 md:hidden">
          {visible.map((person) => (
            <div key={person.id} className="rounded-2xl border border-stroke-subtle bg-surface-base p-3.5 shadow-elevation-sm">
              <div className="flex items-center gap-3">
                <Avatar initials={person.initials} color={person.color} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-label-md text-ink-primary">{person.name}</p>
                  <p className="truncate text-body-sm text-ink-muted">{person.email}</p>
                </div>
                <button
                  type="button"
                  aria-label={`More options for ${person.name}`}
                  className="ml-auto shrink-0 p-1.5 text-ink-muted"
                >
                  <MoreVertical size={15} />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{person.team}</Badge>
                <span className="inline-flex items-center gap-1.5">
                  <Zap size={13} className="text-gold-solid" fill="currentColor" />
                  <span className="text-label-md text-ink-primary">{person.balance}</span>
                  <span className="font-mono text-[11px] text-ink-muted">pts</span>
                </span>
                <span className="ml-auto font-mono text-[11px] text-ink-muted">
                  {person.lifetime} lifetime
                </span>
              </div>

              {/* 44px touch targets */}
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[10px] bg-success-subtle text-label-sm text-success-text active:scale-[0.97]"
                >
                  <Plus size={14} className="text-success-solid" />
                  Credit
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[10px] bg-danger-subtle text-label-sm text-danger-text active:scale-[0.97]"
                >
                  <Minus size={14} className="text-danger-solid" />
                  Debit
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* -------------------------------------------------- desktop: table */}
        <Card flush className="mt-5 hidden overflow-hidden md:block">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-sunken text-left">
                <th className="w-[52px] py-3 pl-5">
                  <Checkbox
                    checked={allChecked}
                    onChange={() => setSelected(allChecked ? [] : visible.map((p) => p.id))}
                    label="Select all"
                  />
                </th>
                {['Member', 'Team'].map((h) => (
                  <th key={h} className="py-3 text-overline uppercase text-ink-muted">
                    <span className="inline-flex items-center gap-1.5">
                      {h}
                      <ArrowUpDown size={11} />
                    </span>
                  </th>
                ))}
                {['Balance', 'Lifetime earned', 'Joined'].map((h) => (
                  <th key={h} className="py-3 text-right text-overline uppercase text-ink-muted">
                    <span className="inline-flex items-center gap-1.5">
                      {h}
                      <ArrowUpDown size={11} />
                    </span>
                  </th>
                ))}
                <th className="py-3 pr-5 text-right text-overline uppercase text-ink-muted">Actions</th>
              </tr>
            </thead>

            <tbody>
              {visible.map((person) => {
                const isSelected = selected.includes(person.id)
                return (
                  <tr
                    key={person.id}
                    className={cx(
                      'border-t border-stroke-subtle transition-colors',
                      isSelected ? 'bg-brand-subtle' : 'hover:bg-surface-subtle/60'
                    )}
                  >
                    <td className="py-2.5 pl-5">
                      <Checkbox checked={isSelected} onChange={() => toggle(person.id)} label={`Select ${person.name}`} />
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
                      <Badge tone="neutral">{person.team}</Badge>
                    </td>

                    <td className="py-2.5 pr-4 text-right">
                      <span className="text-numeric-lg text-ink-primary">{person.balance}</span>
                      <span className="ml-1 font-mono text-[11px] text-ink-muted">pts</span>
                    </td>

                    <td className="py-2.5 pr-4 text-right text-label-sm text-ink-secondary">{person.lifetime}</td>

                    <td className="py-2.5 pr-4 text-right font-mono text-[11px] text-ink-muted">{person.joined}</td>

                    <td className="py-2.5 pr-5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          aria-label={`Credit points to ${person.name}`}
                          className="grid h-8 w-8 place-items-center rounded-lg bg-success-subtle transition active:scale-95"
                        >
                          <Plus size={14} className="text-success-solid" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Debit points from ${person.name}`}
                          className="grid h-8 w-8 place-items-center rounded-lg bg-danger-subtle transition active:scale-95"
                        >
                          <Minus size={14} className="text-danger-solid" />
                        </button>
                        <button
                          type="button"
                          aria-label={`More options for ${person.name}`}
                          className="p-1.5 text-ink-muted transition hover:text-ink-secondary"
                        >
                          <MoreVertical size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="flex items-center border-t border-stroke-subtle px-5 py-3.5">
            <span className="text-body-sm text-ink-muted">
              Showing 1 to {visible.length} of 128 members
            </span>
            <div className="ml-auto flex items-center gap-2">
              <PageButton aria-label="Previous page">
                <ChevronLeft size={14} />
              </PageButton>
              {['1', '2', '3', '…', '16'].map((p, i) => (
                <PageButton key={p + i} active={p === '1'}>
                  {p}
                </PageButton>
              ))}
              <PageButton aria-label="Next page">
                <ChevronRight size={14} />
              </PageButton>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}

function PageButton({ active, children, ...rest }) {
  return (
    <button
      type="button"
      className={cx(
        'grid h-8 min-w-[32px] place-items-center rounded-lg px-2 text-label-xs transition active:scale-95',
        active
          ? 'bg-brand-solid text-white'
          : 'border border-stroke-subtle bg-surface-base text-ink-secondary hover:text-ink-primary'
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
