import { useState } from 'react'
import {
  BarChart3, Bell, ChevronDown, ChevronsUpDown, Gift, History, LayoutDashboard,
  Menu, Moon, Search, Sparkles, Sun, Trophy, User, Users, X, Zap,
} from 'lucide-react'
import { Avatar, BRAND_GRADIENT, cx, PointsPill } from '../ui'
import { ADMIN, ORG, RECIPIENT } from '../../lib/data'

export const NAV = {
  admin: [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'programs', label: 'Programs', icon: Trophy },
    { key: 'people', label: 'People', icon: Users },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  ],
  recipient: [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'catalog', label: 'Catalog', icon: Gift },
    { key: 'history', label: 'History', icon: History },
  ],
}

/* ------------------------------------------------------------------ logo */

export function Logo({ size = 34, showWord = true, onLight = false }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="grid shrink-0 place-items-center rounded-[10px]"
        style={{ width: size, height: size, ...(onLight ? {} : BRAND_GRADIENT) }}
      >
        <Sparkles size={size * 0.53} className="text-white" />
      </span>
      {showWord && <span className="text-heading-md text-ink-primary">Kudos</span>}
    </div>
  )
}

/* --------------------------------------------------------------- sidebar */

function Sidebar({ role, active, onNavigate }) {
  const items = NAV[role]
  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-[260px] flex-col border-r border-stroke-subtle bg-surface-nav px-4 pb-5 pt-[22px]">
      <div className="px-2">
        <Logo />
      </div>

      <p className="text-overline text-ink-muted uppercase mt-[26px] mb-2 px-3">Menu</p>

      <nav className="flex flex-col gap-[3px]">
        {items.map(({ key, label, icon: Icon }) => {
          const isActive = key === active
          return (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate?.(key)}
              className={cx(
                'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-label-md',
                'transition-all duration-200 ease-smooth active:scale-[0.98]',
                isActive
                  ? 'bg-brand-subtle text-brand-text'
                  : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink-primary'
              )}
            >
              <Icon size={18} className={isActive ? 'text-brand-solid' : 'text-ink-muted'} />
              {label}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 rounded-xl bg-surface-subtle p-2.5">
        <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg bg-brand-subtle text-label-sm text-brand-text">
          {ORG.initial}
        </span>
        <div className="min-w-0">
          <p className="text-label-sm text-ink-primary truncate">{ORG.name}</p>
          <p className="font-mono text-[11px] leading-4 text-ink-muted">{ORG.workspace}</p>
        </div>
        <ChevronsUpDown size={14} className="ml-auto shrink-0 text-ink-muted" />
      </div>
    </aside>
  )
}

/* ---------------------------------------------------------------- top bar */

function TopBar({ role, theme, onToggleTheme, onGiveKudos }) {
  const user = role === 'admin' ? ADMIN : RECIPIENT
  return (
    <header className="hidden md:flex sticky top-0 z-20 h-[72px] items-center gap-3 border-b border-stroke-subtle bg-surface-base/80 px-8 backdrop-blur-xl">
      <div className="flex h-[38px] w-[360px] items-center gap-2.5 rounded-[10px] border border-stroke-subtle bg-surface-subtle px-3">
        <Search size={15} className="text-ink-muted" />
        <span className="text-body-sm text-ink-muted">Search people, rewards, programs</span>
        <kbd className="ml-auto rounded-[5px] border border-stroke-subtle bg-surface-base px-1.5 py-0.5 font-mono text-[11px] leading-4 text-ink-muted">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {role === 'recipient' && <PointsPill value={`${RECIPIENT.balance.toLocaleString()} pts`} />}

        <button
          type="button"
          aria-label="Notifications"
          className="grid h-[38px] w-[38px] place-items-center rounded-[10px] bg-surface-subtle text-ink-secondary transition hover:text-ink-primary active:scale-95"
        >
          <Bell size={17} />
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          className="grid h-[38px] w-[38px] place-items-center rounded-[10px] bg-surface-subtle text-ink-secondary transition hover:text-ink-primary active:scale-95"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <span className="h-[26px] w-px bg-stroke-subtle" />

        <button type="button" className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-surface-subtle">
          <Avatar initials={user.initials} color={user.avatar} size="md" />
          <span className="text-left">
            <span className="block text-label-sm text-ink-primary">{user.name}</span>
            <span className="block font-mono text-[11px] leading-4 text-ink-muted">{user.role}</span>
          </span>
          <ChevronDown size={14} className="text-ink-muted" />
        </button>

        {role === 'recipient' && (
          <button
            type="button"
            onClick={onGiveKudos}
            className="inline-flex h-[42px] items-center gap-2 rounded-[10px] px-4 text-label-sm text-white shadow-glow-brand transition-all duration-200 ease-smooth hover:brightness-110 active:scale-[0.97]"
            style={BRAND_GRADIENT}
          >
            <Sparkles size={16} />
            Give Kudos
          </button>
        )}
      </div>
    </header>
  )
}

/* ----------------------------------------------------------- mobile chrome */

function MobileHeader({ role, title, theme, onToggleTheme, onOpenMenu }) {
  const user = role === 'admin' ? ADMIN : RECIPIENT
  return (
    <header className="md:hidden sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-stroke-subtle bg-surface-base/85 px-4 backdrop-blur-xl">
      {role === 'admin' ? (
        <button type="button" onClick={onOpenMenu} aria-label="Open menu" className="-ml-1 p-1 text-ink-primary active:scale-90">
          <Menu size={21} />
        </button>
      ) : (
        <Logo size={30} showWord={false} />
      )}

      <h1 className="text-heading-md text-ink-primary truncate">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        {role === 'recipient' && <PointsPill value={RECIPIENT.balance.toLocaleString()} size="sm" />}
        <button type="button" onClick={onToggleTheme} aria-label="Toggle theme" className="p-1.5 text-ink-secondary active:scale-90">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <Avatar initials={user.initials} color={user.avatar} size={32} />
      </div>
    </header>
  )
}

const TABS = [
  { key: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { key: 'catalog', label: 'Catalog', icon: Gift },
  { key: 'history', label: 'History', icon: History },
  { key: 'profile', label: 'Profile', icon: User },
]

function MobileTabBar({ active, onNavigate, onGiveKudos }) {
  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-stroke-subtle bg-surface-nav/95 pb-5 pt-2.5 backdrop-blur-xl">
      <div className="relative mx-auto flex max-w-md items-start px-2">
        {TABS.slice(0, 2).map(({ key, label, icon: Icon }) => (
          <TabButton key={key} label={label} Icon={Icon} active={active === key} onClick={() => onNavigate?.(key)} />
        ))}

        {/* centre FAB, 56px touch target well above the 44px minimum */}
        <div className="flex-1">
          <button
            type="button"
            onClick={onGiveKudos}
            aria-label="Give Kudos"
            className="absolute left-1/2 top-[-20px] grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full ring-4 ring-surface-nav shadow-glow-brand transition-transform duration-200 ease-smooth active:scale-95"
            style={BRAND_GRADIENT}
          >
            <Sparkles size={24} className="text-white" />
          </button>
        </div>

        {TABS.slice(2).map(({ key, label, icon: Icon }) => (
          <TabButton key={key} label={label} Icon={Icon} active={active === key} onClick={() => onNavigate?.(key)} />
        ))}
      </div>
      <div className="mx-auto mt-2 h-[5px] w-[134px] rounded-full bg-ink-primary/25" />
    </nav>
  )
}

function TabButton({ label, Icon, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex min-h-[56px] flex-1 flex-col items-center gap-1.5 py-2 transition-colors duration-200',
        active ? 'text-brand-text' : 'text-ink-muted'
      )}
    >
      <Icon size={21} className={active ? 'text-brand-solid' : undefined} />
      <span className="text-label-xs">{label}</span>
    </button>
  )
}

/** Admin hamburger slide over. Recipients get the tab bar instead. */
function MobileDrawer({ open, onClose, role, active, onNavigate }) {
  if (!open) return null
  return (
    <div className="md:hidden fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade-in bg-[#08080d]/60 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="absolute inset-y-0 left-0 flex w-[290px] flex-col border-r border-stroke-subtle bg-surface-nav px-4 pb-6 pt-5 animate-fade-in">
        <div className="flex items-center px-1">
          <Logo />
          <button type="button" onClick={onClose} aria-label="Close menu" className="ml-auto p-1.5 text-ink-secondary active:scale-90">
            <X size={19} />
          </button>
        </div>

        <p className="text-overline text-ink-muted uppercase mt-7 mb-2 px-3">Menu</p>
        <nav className="flex flex-col gap-1">
          {NAV[role].map(({ key, label, icon: Icon }) => {
            const isActive = key === active
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onNavigate?.(key)
                  onClose?.()
                }}
                className={cx(
                  'flex min-h-[48px] items-center gap-3 rounded-[10px] px-3 text-label-md transition-colors',
                  isActive ? 'bg-brand-subtle text-brand-text' : 'text-ink-secondary'
                )}
              >
                <Icon size={19} className={isActive ? 'text-brand-solid' : 'text-ink-muted'} />
                {label}
              </button>
            )
          })}
        </nav>

        <div className="mt-auto flex items-center gap-2.5 rounded-xl bg-surface-subtle p-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-subtle text-label-sm text-brand-text">
            {ORG.initial}
          </span>
          <div>
            <p className="text-label-sm text-ink-primary">{ORG.name}</p>
            <p className="font-mono text-[11px] leading-4 text-ink-muted">{ORG.workspace}</p>
          </div>
        </div>
      </aside>
    </div>
  )
}

/* ------------------------------------------------------------- app shell */

export default function AppShell({
  role = 'recipient',
  active,
  title,
  theme,
  onToggleTheme,
  onNavigate,
  onGiveKudos,
  children,
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-surface-canvas">
      <Sidebar role={role} active={active} onNavigate={onNavigate} />
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} role={role} active={active} onNavigate={onNavigate} />

      <div className="md:pl-[260px]">
        <TopBar role={role} theme={theme} onToggleTheme={onToggleTheme} onGiveKudos={onGiveKudos} />
        <MobileHeader
          role={role}
          title={title}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onOpenMenu={() => setMenuOpen(true)}
        />

        <main
          className={cx(
            'px-4 py-5 md:px-8 md:py-7',
            role === 'recipient' ? 'pb-28 md:pb-8' : 'pb-24 md:pb-8'
          )}
        >
          {children}
        </main>
      </div>

      {role === 'recipient' && <MobileTabBar active={active} onNavigate={onNavigate} onGiveKudos={onGiveKudos} />}
    </div>
  )
}

export { MobileTabBar }
