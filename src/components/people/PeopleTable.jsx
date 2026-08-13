import LoadingSpinner from '@/components/shared/LoadingSpinner';
import EmptyState from '@/components/shared/EmptyState';
import Button from '@/components/shared/Button';
import { Users, ArrowUpCircle, ArrowDownCircle, History, ArrowUpDown } from 'lucide-react';
import { useState } from 'react';

export default function PeopleTable({ people, isLoading, onCredit, onDebit, onViewHistory }) {
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  if (isLoading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  if (!people || people.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No team members yet"
        description="Recipients will appear here once they sign up and join your organization."
      />
    );
  }

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...people].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortKey === 'points_balance') cmp = a.points_balance - b.points_balance;
    else if (sortKey === 'created_at') cmp = new Date(a.created_at) - new Date(b.created_at);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortButton = ({ label, field }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
    >
      {label}
      <ArrowUpDown className={`w-3 h-3 ${sortKey === field ? 'text-[var(--color-primary-500)]' : ''}`} />
    </button>
  );

  return (
    <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-primary)] overflow-hidden shadow-sm">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-primary)]">
              <th className="text-left px-6 py-3"><SortButton label="Name" field="name" /></th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Email</th>
              <th className="text-right px-6 py-3"><SortButton label="Balance" field="points_balance" /></th>
              <th className="text-left px-6 py-3"><SortButton label="Joined" field="created_at" /></th>
              <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-secondary)]">
            {sorted.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                onClick={() => onViewHistory(user)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full gradient-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {user.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[180px]">
                      {user.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{user.email}</td>
                <td className="px-6 py-4 text-right">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {user.points_balance?.toLocaleString() ?? 0}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)] ml-1">pts</span>
                </td>
                <td className="px-6 py-4 text-sm text-[var(--text-tertiary)]">
                  {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onCredit(user)}
                      className="p-1.5 rounded-lg text-[var(--color-secondary-600)] hover:bg-[var(--color-secondary-50)] dark:hover:bg-emerald-900/30 transition-colors"
                      title="Credit points"
                      aria-label={`Credit points to ${user.name}`}
                    >
                      <ArrowUpCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDebit(user)}
                      className="p-1.5 rounded-lg text-[var(--color-danger-600)] hover:bg-[var(--color-danger-50)] dark:hover:bg-rose-900/30 transition-colors"
                      title="Debit points"
                      aria-label={`Debit points from ${user.name}`}
                    >
                      <ArrowDownCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onViewHistory(user)}
                      className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                      title="View history"
                      aria-label={`View ${user.name}'s history`}
                    >
                      <History className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-[var(--border-secondary)]">
        {sorted.map((user) => (
          <div
            key={user.id}
            className="p-4 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            onClick={() => onViewHistory(user)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full gradient-accent flex items-center justify-center text-white text-xs font-bold">
                  {user.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{user.name}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{user.email}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-[var(--text-primary)]">{user.points_balance?.toLocaleString() ?? 0} pts</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="success" icon={ArrowUpCircle} onClick={() => onCredit(user)}>
                Credit
              </Button>
              <Button size="sm" variant="danger" icon={ArrowDownCircle} onClick={() => onDebit(user)}>
                Debit
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
