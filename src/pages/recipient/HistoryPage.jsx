import { useState } from 'react';
import { History as HistoryIcon, ArrowUpCircle, ArrowDownCircle, Gift, Zap } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import EmptyState from '@/components/shared/EmptyState';
import Badge from '@/components/shared/Badge';

const typeConfig = {
  manual_credit: { icon: ArrowUpCircle, label: 'Credit', variant: 'success', sign: '+' },
  earn: { icon: Zap, label: 'Earned', variant: 'success', sign: '+' },
  manual_debit: { icon: ArrowDownCircle, label: 'Debit', variant: 'danger', sign: '' },
  redeem: { icon: Gift, label: 'Redeemed', variant: 'warning', sign: '' },
};

const filters = [
  { key: 'all', label: 'All' },
  { key: 'earned', label: 'Earned' },
  { key: 'redeemed', label: 'Redeemed' },
  { key: 'debited', label: 'Debited' },
];

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryPage() {
  const [filter, setFilter] = useState('all');
  const { data: transactions, isLoading } = useTransactions(filter);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <HistoryIcon className="w-7 h-7 text-[var(--color-primary-500)]" />
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Transaction History</h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            All your points activity in one place.
          </p>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-[var(--color-primary-600)] text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      {isLoading ? (
        <LoadingSpinner size="lg" className="py-12" />
      ) : !transactions || transactions.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No transactions found"
          description={
            filter === 'all'
              ? "You haven't earned or redeemed any points yet."
              : `No ${filter} transactions found.`
          }
        />
      ) : (
        <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-primary)] divide-y divide-[var(--border-secondary)] shadow-sm overflow-hidden">
          {transactions.map((tx) => {
            const config = typeConfig[tx.type] || typeConfig.earn;
            const Icon = config.icon;

            return (
              <div
                key={tx.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                {/* Type icon */}
                <div
                  className={`p-2.5 rounded-xl flex-shrink-0 ${
                    config.variant === 'success'
                      ? 'bg-[var(--color-secondary-50)] text-[var(--color-secondary-600)] dark:bg-emerald-900/30 dark:text-emerald-400'
                      : config.variant === 'danger'
                      ? 'bg-[var(--color-danger-50)] text-[var(--color-danger-600)] dark:bg-rose-900/30 dark:text-rose-400'
                      : 'bg-[var(--color-warning-50)] text-[var(--color-warning-600)] dark:bg-amber-900/30 dark:text-amber-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={config.variant}>{config.label}</Badge>
                    {tx.reward_programs?.name && (
                      <span className="text-xs text-[var(--text-tertiary)]">
                        via {tx.reward_programs.name}
                      </span>
                    )}
                  </div>
                  {tx.reason && (
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      {tx.reason}
                    </p>
                  )}
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">
                    {formatDate(tx.created_at)}
                  </p>
                </div>

                {/* Points */}
                <div className="text-right flex-shrink-0">
                  <p
                    className={`text-base font-bold ${
                      tx.points > 0
                        ? 'text-[var(--color-secondary-600)]'
                        : 'text-[var(--color-danger-600)]'
                    }`}
                  >
                    {config.sign}
                    {Math.abs(tx.points)?.toLocaleString()} pts
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
