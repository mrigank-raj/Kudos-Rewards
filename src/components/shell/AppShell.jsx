import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/context/ThemeContext'
import { useNotifications, useMarkNotificationsRead, useUnreadNotificationCount } from '@/hooks/useNotifications'
import { useMessagesRealtime, useUnreadMessageCount } from '@/hooks/useMessages'
import {
  BarChart3, Bell, Bookmark, ChevronDown, CircleHelp, Contact, FileText, Gift, History, LayoutDashboard,
  Menu, MessagesSquare, Moon, Search, ShieldAlert, Sparkles, Sun, TrendingUp, Trophy, User, UserRound, Users, X, LogOut,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react'
import { Avatar, BRAND_GRADIENT, cx, PointsPill } from '../ui'
import GiveKudosModal from '@/components/dashboard/GiveKudosModal'
import { resolveAppLink } from '@/lib/community'

// `section` groups the sidebar; `badge` names a live count passed down from
// AppShell (unread messages / notifications).
export const NAV = {
  admin: [
    { key: 'dashboard', path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Menu' },
    { key: 'programs', path: '/admin/programs', label: 'Programs', icon: Trophy, section: 'Menu' },
    { key: 'people', path: '/admin/people', label: 'People', icon: Users, section: 'Menu' },
    { key: 'redemptions', path: '/admin/redemptions', label: 'Redemptions', icon: Gift, section: 'Menu' },
    { key: 'analytics', path: '/admin/analytics', label: 'Analytics', icon: BarChart3, section: 'Menu' },
    { key: 'community', path: '/admin/community', label: 'Community', icon: MessagesSquare, section: 'Community' },
    { key: 'moderation', path: '/admin/community/moderation', label: 'Moderation', icon: ShieldAlert, section: 'Community' },
    { key: 'insights', path: '/admin/community/insights', label: 'Contributions', icon: TrendingUp, section: 'Community' },
    { key: 'directory', path: '/admin/directory', label: 'Directory', icon: Contact, section: 'Community' },
    { key: 'messages', path: '/admin/messages', label: 'Messages', icon: MessagesSquare, section: 'Community', badge: 'messages' },
    { key: 'notifications', path: '/admin/notifications', label: 'Notifications', icon: Bell, section: 'Community', badge: 'notifications' },
    { key: 'profile', path: '/admin/profile', label: 'My Profile', icon: UserRound, section: 'Community' },
  ],
  recipient: [
    { key: 'dashboard', path: '/app/dashboard', label: 'Home', icon: LayoutDashboard, section: 'Menu' },
    { key: 'community', path: '/app/community', label: 'Community', icon: MessagesSquare, section: 'Menu' },
    { key: 'ask', path: '/app/community/ask', label: 'Ask for Help', icon: CircleHelp, section: 'Menu' },
    { key: 'mine', path: '/app/community/mine', label: 'My Posts', icon: FileText, section: 'Menu' },
    { key: 'saved', path: '/app/community/saved', label: 'Saved Posts', icon: Bookmark, section: 'Menu' },
    { key: 'messages', path: '/app/messages', label: 'Messages', icon: MessagesSquare, section: 'Menu', badge: 'messages' },
    { key: 'notifications', path: '/app/notifications', label: 'Notifications', icon: Bell, section: 'Menu', badge: 'notifications' },
    { key: 'directory', path: '/app/directory', label: 'Directory', icon: Contact, section: 'Menu' },
    { key: 'profile', path: '/app/profile', label: 'My Profile', icon: UserRound, section: 'Menu' },
    { key: 'catalog', path: '/app/catalog', label: 'Rewards', icon: Gift, section: 'Rewards' },
    { key: 'leaderboard', path: '/app/leaderboard', label: 'Leaderboard', icon: Trophy, section: 'Rewards' },
    { key: 'history', path: '/app/history', label: 'History', icon: History, section: 'Rewards' },
  ],
}

/** Most specific nav item for a path ("/app/community/ask" → Ask, "/app/community/post/…" → Community). */
function findActiveNav(items, pathname) {
  let best = null
  for (const item of items) {
    if (pathname === item.path || pathname.startsWith(item.path + '/')) {
      if (!best || item.path.length > best.path.length) best = item
    }
  }
  return best
}

function groupBySection(items) {
  const groups = []
  for (const item of items) {
    const last = groups[groups.length - 1]
    if (last && last.section === item.section) last.items.push(item)
    else groups.push({ section: item.section, items: [item] })
  }
  return groups
}

function CountBadge({ value, collapsed }) {
  if (!value) return null
  if (collapsed) return <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-danger-solid" aria-hidden />
  return (
    <span className="ml-auto rounded-full bg-brand-solid px-1.5 py-px font-mono text-[11px] leading-4 text-white" aria-label={`${value} unread`}>
      {value > 99 ? '99+' : value}
    </span>
  )
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

function Sidebar({ role, activeKey, isCollapsed, onToggleCollapse, counts }) {
  const { profile } = useAuth()
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
          <button onClick={onToggleCollapse} aria-label="Collapse sidebar" className="text-ink-muted hover:text-ink-primary transition-colors active:scale-95">
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      <nav aria-label="Main" className="-mx-1 mt-[18px] min-h-0 flex-1 overflow-y-auto px-1 pb-3 [scrollbar-width:thin]">
        {groupBySection(items).map(({ section, items: group }) => (
          <div key={section} className="mt-3 first:mt-0">
            <p className={cx("text-overline-sm text-ink-muted uppercase mb-2", isCollapsed ? "text-center px-0 text-[10px]" : "px-3")}>
              {isCollapsed ? section.slice(0, 4) : section}
            </p>
            <div className="flex flex-col gap-[3px]">
              {group.map(({ key, path, label, icon: Icon, badge }) => {
                const isActive = key === activeKey
                return (
                  <Link
                    key={key}
                    to={path}
                    title={isCollapsed ? label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    className={cx(
                      'relative flex items-center rounded-[10px] py-2.5 text-label-md',
                      'transition-all duration-200 ease-smooth active:scale-[0.98]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-solid/40',
                      isCollapsed ? 'justify-center px-0' : 'gap-3 px-3',
                      isActive
                        ? 'bg-brand-subtle text-brand-text'
                        : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink-primary'
                    )}
                  >
                    <Icon size={18} className={isActive ? 'text-brand-solid' : 'text-ink-muted'} />
                    {!isCollapsed && label}
                    <CountBadge value={badge ? counts?.[badge] : 0} collapsed={isCollapsed} />
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cx("mt-3 flex shrink-0 items-center rounded-xl bg-surface-subtle transition-all", isCollapsed ? "justify-center p-2 flex-col gap-3" : "gap-2.5 p-2.5")}>
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
          <button onClick={onToggleCollapse} className="text-ink-muted hover:text-ink-primary transition-colors active:scale-95" title="Expand Sidebar" aria-label="Expand sidebar">
            <PanelLeftOpen size={18} />
          </button>
        )}
      </div>
    </aside>
  )
}

// Takes notifications/onMarkRead as props rather than calling
// useNotifications() itself — TopBar and MobileHeader both render at all
// times (CSS just hides one via `hidden md:flex` / `md:hidden`, it never
// unmounts), so two independent hook instances each opened their own
// Realtime channel on the identical topic `notifications:${userId}`.
// Supabase's realtime-js client caches channels by that topic name, so the
// second `.channel()` call got a reference to the first instance's
// already-`.subscribe()`d channel, and `.on('postgres_changes', ...)` on an
// already-subscribed channel throws. One subscription, shared via props,
// fixes it at the source instead of giving each instance a unique (but
// redundant) channel name.
//
// Items are clickable (mark that one read + open its link); "Mark all read"
// is explicit rather than happening on open, so unread state survives a
// quick peek.
function NotificationsBell({ compact = false, notifications, unreadCount = 0, onMarkRead, role }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const base = role === 'admin' ? '/admin' : '/app'

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const openItem = (n) => {
    if (!n.read) onMarkRead([n.id])
    const to = resolveAppLink(role, n.link)
    if (to) {
      setOpen(false)
      navigate(to)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        className={cx(
          'relative grid place-items-center rounded-[10px] bg-surface-subtle text-ink-secondary transition hover:text-ink-primary active:scale-95',
          compact ? 'h-9 w-9' : 'h-[38px] w-[38px]'
        )}
      >
        <Bell size={compact ? 16 : 17} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 h-[7px] w-[7px] rounded-full bg-danger-solid ring-2 ring-surface-base" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[340px] max-w-[90vw] rounded-2xl border border-stroke-subtle bg-surface-base p-2 shadow-elevation-lg">
          <div className="flex items-center px-2.5 py-2">
            <p className="text-label-sm text-ink-primary">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" onClick={() => onMarkRead()} className="ml-auto text-label-xs text-brand-text hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[340px] overflow-y-auto">
            {!notifications || notifications.length === 0 ? (
              <p className="px-2.5 py-6 text-center text-body-sm text-ink-muted">You're all caught up.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openItem(n)}
                  className={cx('flex w-full gap-2 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-surface-subtle', !n.read && 'bg-brand-subtle/40')}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-label-sm text-ink-primary">{n.title}</span>
                    {n.body && <span className="mt-0.5 block truncate text-body-sm text-ink-muted">{n.body}</span>}
                    <span className="mt-1 block font-mono text-[11px] text-ink-muted">
                      {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </span>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-solid" aria-label="Unread" />}
                </button>
              ))
            )}
          </div>
          <Link
            to={`${base}/notifications`}
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-xl px-2.5 py-2 text-center text-label-sm text-brand-text hover:bg-surface-subtle"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  )
}

function TopBar({ role, onGiveKudos, notifications, unreadCount, onMarkRead }) {
  const { profile, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const base = role === 'admin' ? '/admin' : '/app'

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const initials = getInitials(profile?.name)

  return (
    <header className="hidden md:flex sticky top-0 z-20 h-[72px] items-center gap-3 border-b border-stroke-subtle bg-surface-base/80 px-4 lg:px-8 backdrop-blur-xl">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          const q = query.trim()
          navigate(q ? `${base}/community?q=${encodeURIComponent(q)}` : `${base}/community`)
        }}
        className="flex h-[38px] flex-1 max-w-[360px] min-w-[160px] items-center gap-2.5 rounded-[10px] border border-stroke-subtle bg-surface-subtle px-3 focus-within:border-brand-solid"
      >
        <Search size={15} className="text-ink-muted shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search community discussions"
          aria-label="Search community discussions"
          className="min-w-0 flex-1 bg-transparent text-body-sm text-ink-primary outline-none placeholder:text-ink-muted"
        />
      </form>

      <div className="ml-auto flex items-center gap-3">
        {role === 'recipient' && <PointsPill value={`${profile?.points_balance?.toLocaleString() || 0} pts`} />}

        <NotificationsBell notifications={notifications} unreadCount={unreadCount} onMarkRead={onMarkRead} role={role} />

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="grid h-[38px] w-[38px] place-items-center rounded-[10px] bg-surface-subtle text-ink-secondary transition hover:text-ink-primary active:scale-95"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <span className="h-[26px] w-px bg-stroke-subtle" />

        <Link to={`${base}/profile`} title="My profile" className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-surface-subtle">
          <Avatar initials={initials} color={profile?.avatar_url} size="md" />
          <span className="text-left hidden lg:block">
            <span className="block text-label-sm text-ink-primary">{profile?.name || 'User'}</span>
            <span className="block font-mono text-[11px] leading-4 text-ink-muted capitalize">{profile?.role}</span>
          </span>
          <ChevronDown size={14} className="text-ink-muted hidden lg:block" />
        </Link>

        <button
          type="button"
          onClick={handleSignOut}
          title="Sign Out"
          aria-label="Sign out"
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

function MobileHeader({ role, title, onOpenMenu, notifications, unreadCount, onMarkRead }) {
  const { profile } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const initials = getInitials(profile?.name)

  return (
    <header className="md:hidden sticky top-0 z-30 flex h-[60px] items-center gap-3 border-b border-stroke-subtle bg-surface-base/85 px-4 backdrop-blur-xl">
      {/* Both roles get the drawer now — the community adds more pages than fit in the tab bar. */}
      <button type="button" onClick={onOpenMenu} aria-label="Open menu" className="-ml-1 p-1 text-ink-primary active:scale-90">
        <Menu size={21} />
      </button>

      <h1 className="text-heading-md text-ink-primary truncate">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        {role === 'recipient' && <PointsPill value={(profile?.points_balance || 0).toLocaleString()} size="sm" />}
        <NotificationsBell compact notifications={notifications} unreadCount={unreadCount} onMarkRead={onMarkRead} role={role} />
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
  { key: 'community', path: '/app/community', label: 'Community', icon: MessagesSquare },
  { key: 'messages', path: '/app/messages', label: 'Messages', icon: MessagesSquare, badge: 'messages' },
  { key: 'profile', path: '/app/profile', label: 'Profile', icon: User },
]

// Sub-pages highlight their parent tab.
const TAB_FOR_KEY = { ask: 'community', mine: 'community', saved: 'community', directory: 'community' }

function MobileTabBar({ activeKey, onGiveKudos, counts }) {
  const navigate = useNavigate()
  const activeTab = TAB_FOR_KEY[activeKey] || activeKey
  return (
    <nav aria-label="Primary" className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-stroke-subtle bg-surface-nav/95 pb-5 pt-2.5 backdrop-blur-xl">
      <div className="relative mx-auto flex max-w-md items-start px-2">
        {TABS.slice(0, 2).map(({ key, path, label, icon: Icon }) => (
          <TabButton key={key} label={label} Icon={Icon} active={activeTab === key} onClick={() => navigate(path)} />
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

        {TABS.slice(2).map(({ key, path, label, icon: Icon, badge }) => (
          <TabButton key={key} label={label} Icon={Icon} active={activeTab === key} onClick={() => navigate(path)} count={badge ? counts?.[badge] : 0} />
        ))}
      </div>
      <div className="mx-auto mt-2 h-[5px] w-[134px] rounded-full bg-ink-primary/25" />
    </nav>
  )
}

function TabButton({ label, Icon, active, onClick, count = 0 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-label={count ? `${label} (${count} unread)` : undefined}
      className={cx(
        'relative flex min-h-[56px] flex-1 flex-col items-center gap-1.5 py-2 transition-colors duration-200',
        active ? 'text-brand-text' : 'text-ink-muted'
      )}
    >
      <Icon size={21} className={active ? 'text-brand-solid' : undefined} />
      {count > 0 && <span className="absolute left-1/2 top-1.5 ml-2 h-2 w-2 rounded-full bg-danger-solid" aria-hidden />}
      <span className="text-label-xs">{label}</span>
    </button>
  )
}

function MobileDrawer({ open, onClose, role, activeKey, counts }) {
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

        <nav aria-label="Main" className="mt-5">
          {groupBySection(NAV[role] || []).map(({ section, items }) => (
            <div key={section} className="mt-3 first:mt-0">
              <p className="text-overline-sm text-ink-muted uppercase mb-1.5 px-3">{section}</p>
              <div className="flex flex-col gap-1">
                {items.map(({ key, path, label, icon: Icon, badge }) => {
                  const isActive = key === activeKey
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => {
                        navigate(path)
                        onClose()
                      }}
                      className={cx(
                        'flex min-h-[46px] items-center gap-3 rounded-[10px] px-3 text-label-md transition-colors',
                        isActive ? 'bg-brand-subtle text-brand-text' : 'text-ink-secondary'
                      )}
                    >
                      <Icon size={19} className={isActive ? 'text-brand-solid' : 'text-ink-muted'} />
                      {label}
                      <CountBadge value={badge ? counts?.[badge] : 0} />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
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

  // Single subscription for the whole shell — see the comment on
  // NotificationsBell for why this can't live inside it.
  const { data: notifications } = useNotifications()
  const { data: unreadNotifications = 0 } = useUnreadNotificationCount()
  const markRead = useMarkNotificationsRead()
  const handleMarkRead = (ids) => markRead.mutate(ids)

  // Same single-subscription rule for community messages.
  useMessagesRealtime()
  const { data: unreadMessages = 0 } = useUnreadMessageCount()
  const counts = { messages: unreadMessages, notifications: unreadNotifications }

  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('kudos_sidebar_collapsed') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('kudos_sidebar_collapsed', isCollapsed)
  }, [isCollapsed])

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const role = profile?.role || 'recipient'

  // Determine active key from pathname
  const path = location.pathname
  let activeKey = 'dashboard'
  let title = 'Dashboard'

  const currentNav = findActiveNav(NAV[role] || [], path)
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
        counts={counts}
      />
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} role={role} activeKey={activeKey} counts={counts} />

      <div
        className="flex flex-col min-h-screen transition-all duration-300 md:pl-sidebar"
        style={{ '--sidebar-width': isCollapsed ? '80px' : '260px' }}
      >
        <TopBar
          role={role}
          onGiveKudos={() => setIsKudosModalOpen(true)}
          notifications={notifications}
          unreadCount={unreadNotifications}
          onMarkRead={handleMarkRead}
        />
        <MobileHeader
          role={role}
          title={title}
          onOpenMenu={() => setMenuOpen(true)}
          notifications={notifications}
          unreadCount={unreadNotifications}
          onMarkRead={handleMarkRead}
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

      {role === 'recipient' && <MobileTabBar activeKey={activeKey} counts={counts} onGiveKudos={() => setIsKudosModalOpen(true)} />}

      {/* Global Modals */}
      {role === 'recipient' && (
        <GiveKudosModal isOpen={isKudosModalOpen} onClose={() => setIsKudosModalOpen(false)} />
      )}
    </div>
  )
}
