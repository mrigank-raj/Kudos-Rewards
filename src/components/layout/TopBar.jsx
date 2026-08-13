import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import {
  Sun, Moon, LogOut, Menu, Zap,
} from 'lucide-react';

export default function TopBar({ onMenuClick }) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Generate initials for avatar fallback
  const initials = profile?.name
    ? profile.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <header className="sticky top-0 z-30 h-16 bg-[var(--bg-elevated)] border-b border-[var(--border-primary)] flex items-center justify-between px-4 sm:px-6">
      {/* Left — Hamburger (mobile) */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right — Actions */}
      <div className="flex items-center gap-3">
        {/* Points Balance — Recipient only */}
        {profile?.role === 'recipient' && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-warning-50)] dark:bg-amber-900/30 text-[var(--color-warning-600)] dark:text-amber-300 text-sm font-medium">
            <Zap className="w-4 h-4" />
            <span>{profile.points_balance?.toLocaleString() ?? 0} pts</span>
          </div>
        )}

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* User Avatar + Name */}
        <div className="flex items-center gap-3 pl-3 border-l border-[var(--border-primary)]">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full gradient-accent flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[120px]">
              {profile?.name || 'User'}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] capitalize">
              {profile?.role || ''}
            </p>
          </div>

          {/* Logout */}
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--color-danger-50)] hover:text-[var(--color-danger-600)] transition-colors"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
