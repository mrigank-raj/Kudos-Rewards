import { useState, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/context/ThemeContext'
import {
  BarChart3, Bell, ChevronDown, ChevronsUpDown, Gift, History, LayoutDashboard,
  Menu, Moon, Search, Sparkles, Sun, Trophy, User, Users, X, Zap, LogOut,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react'
import { Avatar, BRAND_GRADIENT, cx, PointsPill } from '../ui'
import GiveKudosModal from '@/components/dashboard/GiveKudosModal'

export const NAV = {
  admin: [
    { key: 'dashboard', path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'programs', path: '/admin/programs', label: 'Programs', icon: Trophy },
    { key: 'people', path: '/admin/people', label: 'People', icon: Users },
    { key: 'analytics', path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  ],
  recipient: [
    { key: 'dashboard', path: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'catalog', path: '/app/catalog', label: 'Catalog', icon: Gift },
    { key: 'history', path: '/app/history', label: 'History', icon: History },
  ],
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

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

function Sidebar({ role, activeKey, isCollapsed, onToggleCollapse }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const items = NAV[role] || []
  
  const orgName = profile?.organizations?.name || 'Acme Corp'
  const orgInitial = orgName.charAt(0).toUpperCase()

  return (
    <aside
      className={cx(
        "hidden md:flex fixed inset-y-0 left-0 z-30 flex-col border-r border-stroke-subtle bg-surface-nav pb-5 pt-[22px] transition-all duration-300",
        isCollapsed ? "px-3" : "px-4"
      )}
      style={{ width: isCollapsed ? 80 : 260 }}
    >
      <div className={cx("flex items-center", isCollapsed ? "justify-center" : "px-2 justify-between")}>
        <Logo showWord={!isCollapsed} />
        {!isCollapsed && (
          <button onClick={onToggleCollapse} className="text-ink-muted hover:text-ink-primary transition-colors active:scale-95">
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      <p className={cx("text-overline-sm text-ink-muted uppercase mt-[26px] mb-2", isCollapsed ? "text-center px-0 text-[10px]" : "px-3")}>
        {isCollapsed ? "Nav" : "Menu"}
      </p>

      <nav className="flex flex-col gap-[3px]">
        {items.map(({ key, path, label, icon: Icon }) => {
          const isActive = key === activeKey
          return (
            <Link
              key={key}
              to={path}
              title={isCollapsed ? label : undefined}
              className={cx(
                'flex items-center rounded-[10px] py-2.5 text-label-md',
                'transition-all duration-200 ease-smooth active:scale-[0.98]',
                isCollapsed ? 'justify-center px-0' : 'gap-3 px-3',
                isActive
                  ? 'bg-brand-subtle text-brand-text'
                  : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink-primary'
              )}
            >
              <Icon size={18} className={isActive ? 'text-brand-solid' : 'text-ink-muted'} />
              {!isCollapsed && label}
            </Link>
          )
        })}
      </nav>

      <div className={cx("mt-auto flex items-center rounded-xl bg-surface-subtle transition-all", isCollapsed ? "justify-center p-2 flex-col gap-3" : "gap-2.5 p-2.5")}>
        <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg bg-brand-subtle text-label-sm text-brand-text">
          {orgInitial}
        </span>
        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-label-sm text-ink-primary truncate">{orgName}</p>
            <p className="font-mono text-[11px] leading-4 text-ink-muted">Workspace</p>
          </div>
        )}
        {isCollapsed && (
          <button onClick={onToggleCollapse} className="text-ink-muted hover:text-ink-primary transition-colors active:scale-95" title="Expand Sidebar">
            <PanelLeftOpen size={18} />
          </button>
        )}
      </div>
    </aside>
  )
}

function TopBar({ role, onGiveKudos }) {
  const { profile, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const initials = getInitials(profile?.name)

  return (
    <header className="hidden md:flex sticky top-0 z-20 h-[72px] items-center gap-3 border-b border-stroke-subtle bg-surface-base/80 px-4 lg:px-8 backdrop-blur-xl">
      <div className="flex h-[38px] flex-1 max-w-[360px] min-w-[160px] items-center gap-2.5 rounded-[10px] border border-stroke-subtle bg-surface-subtle px-3">
        <Search size={15} className="text-ink-muted shrink-0" />
        <span className="text-body-sm text-ink-muted truncate">Search people, rewards, programs</span>
        <kbd className="ml-auto hidden lg:block rounded-[5px] border border-stroke-subtle bg-surface-base px-1.5 py-0.5 font-mono text-[11px] leading-4 text-ink-muted">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {role === 'recipient' && <PointsPill value={`${profile?.points_balance?.toLocaleString() || 0} pts`} />}

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="grid h-[38px] w-[38px] place-items-center rounded-[10px] bg-surface-subtle text-ink-secondary transition hover:text-ink-primary active:scale-95"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <span className="h-[26px] w-px bg-stroke-subtle" />

        <button type="button" className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-surface-subtle">
          <Avatar initials={initials} color={profile?.avatar_url} size="md" />
          <span className="text-left hidden lg:block">
            <span className="block text-label-sm text-ink-primary">{profile?.name || 'User'}</span>
            <span className="block font-mono text-[11px] leading-4 text-ink-muted capitalize">{profile?.role}</span>
          </span>
          <ChevronDown size={14} className="text-ink-muted hidden lg:block" />
        </button>
        
        <button
          type="button"
          onClick={handleSignOut}
          title="Sign Out"
          className="grid h-[38px] w-[38px] place-items-center rounded-[10px] bg-surface-subtle text-ink-secondary transition hover:text-danger-solid active:scale-95"
        >
          <LogOut size={17} />
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

function MobileHeader({ role, title, onOpenMenu }) {
  const { profile } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const initials = getInitials(profile?.name)

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
        {role === 'recipient' && <PointsPill value={(profile?.points_balance || 0).toLocaleString()} size="sm" />}
        <button type="button" onClick={toggleTheme} aria-label="Toggle theme" className="p-1.5 text-ink-secondary active:scale-90">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <Avatar initials={initials} color={profile?.avatar_url} size={32} />
      </div>
    </header>
  )
}

const TABS = [
  { key: 'dashboard', path: '/app/dashboard', label: 'Home', icon: LayoutDashboard },
  { key: 'catalog', path: '/app/catalog', label: 'Catalog', icon: Gift },
  { key: 'history', path: '/app/history', label: 'History', icon: History },
  { key: 'profile', path: '#', label: 'Profile', icon: User },
]

function MobileTabBar({ activeKey, onGiveKudos }) {
  const navigate = useNavigate()
  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-stroke-subtle bg-surface-nav/95 pb-5 pt-2.5 backdrop-blur-xl">
      <div className="relative mx-auto flex max-w-md items-start px-2">
        {TABS.slice(0, 2).map(({ key, path, label, icon: Icon }) => (
          <TabButton key={key} label={label} Icon={Icon} active={activeKey === key} onClick={() => path !== '#' && navigate(path)} />
        ))}

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

        {TABS.slice(2).map(({ key, path, label, icon: Icon }) => (
          <TabButton key={key} label={label} Icon={Icon} active={activeKey === key} onClick={() => path !== '#' && navigate(path)} />
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

function MobileDrawer({ open, onClose, role, activeKey }) {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  
  if (!open) return null
  
  const orgName = profile?.organizations?.name || 'Acme Corp'
  const orgInitial = orgName.charAt(0).toUpperCase()

  return (
    <div className="md:hidden fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade-in bg-[#08080d]/60 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="absolute inset-y-0 left-0 flex w-[290px] flex-col border-r border-stroke-subtle bg-surface-nav px-4 pb-6 pt-5 animate-fade-in overflow-y-auto">
        <div className="flex items-center px-1">
          <Logo />
          <button type="button" onClick={onClose} aria-label="Close menu" className="ml-auto p-1.5 text-ink-secondary active:scale-90">
            <X size={19} />
          </button>
        </div>

        <p className="text-overline-sm text-ink-muted uppercase mt-7 mb-2 px-3">Menu</p>
        <nav className="flex flex-col gap-1">
          {(NAV[role] || []).map(({ key, path, label, icon: Icon }) => {
            const isActive = key === activeKey
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  navigate(path)
                  onClose()
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

        <div className="mt-auto pt-6 flex flex-col gap-2">
          <button
            onClick={async () => {
              await signOut()
              navigate('/login')
            }}
            className="flex min-h-[48px] items-center gap-3 rounded-[10px] px-3 text-label-md text-danger-text hover:bg-danger-subtle transition-colors"
          >
            <LogOut size={19} />
            Sign Out
          </button>
          
          <div className="flex items-center gap-2.5 rounded-xl bg-surface-subtle p-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-subtle text-label-sm text-brand-text">
              {orgInitial}
            </span>
            <div>
              <p className="text-label-sm text-ink-primary">{orgName}</p>
              <p className="font-mono text-[11px] leading-4 text-ink-muted">Workspace</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}

export default function AppShell({ children }) {
  const { profile } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isKudosModalOpen, setIsKudosModalOpen] = useState(false)
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('kudos_sidebar_collapsed') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('kudos_sidebar_collapsed', isCollapsed)
  }, [isCollapsed])

  const role = profile?.role || 'recipient'
  
  // Determine active key from pathname
  const path = location.pathname
  let activeKey = 'dashboard'
  let title = 'Dashboard'
  
  const currentNav = NAV[role]?.find(item => path.includes(item.path))
  if (currentNav) {
    activeKey = currentNav.key
    title = currentNav.label
  }

  return (
    <div className="min-h-screen bg-surface-canvas">
      <Sidebar 
        role={role} 
        activeKey={activeKey} 
        isCollapsed={isCollapsed} 
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)} 
      />
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} role={role} activeKey={activeKey} />

      <div 
        className="flex flex-col min-h-screen transition-all duration-300 md:pl-sidebar"
        style={{ '--sidebar-width': isCollapsed ? '80px' : '260px' }}
      >
        <TopBar role={role} onGiveKudos={() => setIsKudosModalOpen(true)} />
        <MobileHeader
          role={role}
          title={title}
          onOpenMenu={() => setMenuOpen(true)}
        />

        <main
          className={cx(
            'flex-1 px-4 py-5 md:px-8 md:py-7',
            role === 'recipient' ? 'pb-28 md:pb-8' : 'pb-24 md:pb-8'
          )}
        >
          {children}
        </main>
      </div>

      {role === 'recipient' && <MobileTabBar activeKey={activeKey} onGiveKudos={() => setIsKudosModalOpen(true)} />}
      
      {/* Global Modals */}
      {role === 'recipient' && (
        <GiveKudosModal isOpen={isKudosModalOpen} onClose={() => setIsKudosModalOpen(false)} />
      )}
    </div>
  )
}
