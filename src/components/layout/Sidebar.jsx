import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Trophy,
  Users,
  BarChart3,
  Gift,
  History,
  Sparkles,
  X,
} from 'lucide-react';

const adminLinks = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/programs', icon: Trophy, label: 'Programs' },
  { to: '/admin/people', icon: Users, label: 'People' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
];

const recipientLinks = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/catalog', icon: Gift, label: 'Catalog' },
  { to: '/app/history', icon: History, label: 'History' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { profile } = useAuth();
  const location = useLocation();

  const links = profile?.role === 'admin' ? adminLinks : recipientLinks;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64
          bg-[var(--bg-elevated)] border-r border-[var(--border-primary)]
          flex flex-col
          transition-transform duration-300 ease-out
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-[var(--border-primary)]">
          <div className="flex items-center gap-2 text-[var(--color-primary-600)]">
            <Sparkles className="w-6 h-6" />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-emerald-500">
              Kudos
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${
                  isActive
                    ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)] dark:bg-indigo-900/30 dark:text-indigo-300 shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer — Org info */}
        {profile?.organizations?.name && (
          <div className="px-4 py-3 border-t border-[var(--border-primary)]">
            <p className="text-xs text-[var(--text-tertiary)] truncate">Organization</p>
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {profile.organizations.name}
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
