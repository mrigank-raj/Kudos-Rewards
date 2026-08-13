import LoadingSpinner from '@/components/shared/LoadingSpinner';
import Badge from '@/components/shared/Badge';
import { ArrowUpCircle, ArrowDownCircle, Gift, Zap } from 'lucide-react';

const typeConfig = {
  manual_credit: { icon: ArrowUpCircle, label: 'Credit', variant: 'success', sign: '+' },
  earn: { icon: Zap, label: 'Earned', variant: 'success', sign: '+' },
  manual_debit: { icon: ArrowDownCircle, label: 'Debit', variant: 'danger', sign: '' },
  redeem: { icon: Gift, label: 'Redeemed', variant: 'warning', sign: '' },
};

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ActivityFeed({ transactions, isLoading }) {
  if (isLoading) {
    return <LoadingSpinner className="py-8" />;
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="p-6 rounded-2xl border border-dashed border-[var(--border-primary)] bg-[var(--bg-elevated)] text-center">
        <p className="text-sm text-[var(--text-tertiary)]">
          No activity yet. Points you earn and redeem will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-primary)] divide-y divide-[var(--border-secondary)] shadow-sm overflow-hidden">
      {transactions.map((tx) => {
        const config = typeConfig[tx.type] || typeConfig.earn;
        const Icon = config.icon;

        return (
          <div
            key={tx.id}
            className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <div
              className={`p-2 rounded-lg flex-shrink-0 ${
                config.variant === 'success'
                  ? 'bg-[var(--color-secondary-50)] text-[var(--color-secondary-600)] dark:bg-emerald-900/30 dark:text-emerald-400'
                  : config.variant === 'danger'
                  ? 'bg-[var(--color-danger-50)] text-[var(--color-danger-600)] dark:bg-rose-900/30 dark:text-rose-400'
                  : 'bg-[var(--color-warning-50)] text-[var(--color-warning-600)] dark:bg-amber-900/30 dark:text-amber-400'
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant={config.variant}>{config.label}</Badge>
                {tx.reward_programs?.name && (
                  <span className="text-xs text-[var(--text-tertiary)] truncate">
                    via {tx.reward_programs.name}
                  </span>
                )}
              </div>
              {tx.reason && (
                <p className="text-sm text-[var(--text-secondary)] mt-0.5 truncate">
                  {tx.reason}
                </p>
              )}
            </div>

            <div className="text-right flex-shrink-0">
              <p
                className={`text-sm font-semibold ${
                  tx.points > 0
                    ? 'text-[var(--color-secondary-600)]'
                    : 'text-[var(--color-danger-600)]'
                }`}
              >
                {config.sign}
                {Math.abs(tx.points)?.toLocaleString()} pts
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">{formatDate(tx.created_at)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
