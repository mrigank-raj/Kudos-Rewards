import { useNavigate } from 'react-router-dom';
import Button from '@/components/shared/Button';
import { Gift, History } from 'lucide-react';

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <button
        onClick={() => navigate('/app/catalog')}
        className="group flex items-center gap-4 p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-primary)] hover:border-[var(--color-primary-300)] hover:shadow-md transition-all duration-200"
      >
        <div className="p-3 rounded-xl bg-[var(--color-primary-50)] text-[var(--color-primary-600)] dark:bg-indigo-900/30 dark:text-indigo-400 group-hover:scale-110 transition-transform">
          <Gift className="w-6 h-6" />
        </div>
        <div className="text-left">
          <p className="font-semibold text-[var(--text-primary)]">Browse Rewards</p>
          <p className="text-sm text-[var(--text-tertiary)]">
            Explore the catalog and redeem points
          </p>
        </div>
      </button>

      <button
        onClick={() => navigate('/app/history')}
        className="group flex items-center gap-4 p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-primary)] hover:border-[var(--color-primary-300)] hover:shadow-md transition-all duration-200"
      >
        <div className="p-3 rounded-xl bg-[var(--color-warning-50)] text-[var(--color-warning-600)] dark:bg-amber-900/30 dark:text-amber-400 group-hover:scale-110 transition-transform">
          <History className="w-6 h-6" />
        </div>
        <div className="text-left">
          <p className="font-semibold text-[var(--text-primary)]">View History</p>
          <p className="text-sm text-[var(--text-tertiary)]">
            See all your past transactions
          </p>
        </div>
      </button>
    </div>
  );
}
