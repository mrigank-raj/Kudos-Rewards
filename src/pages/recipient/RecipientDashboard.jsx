import { useAuth } from '@/hooks/useAuth';
import { useTransactions } from '@/hooks/useTransactions';
import PointsBalanceCard from '@/components/dashboard/PointsBalanceCard';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import QuickActions from '@/components/dashboard/QuickActions';
import { LayoutDashboard } from 'lucide-react';

export default function RecipientDashboard() {
  const { profile } = useAuth();
  const { data: transactions, isLoading } = useTransactions('all');

  // Show only the most recent 10 on the dashboard
  const recentTx = (transactions || []).slice(0, 10);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <LayoutDashboard className="w-7 h-7 text-[var(--color-primary-500)]" />
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Welcome back, {profile?.name?.split(' ')[0] || 'there'}!
        </h1>
      </div>

      {/* Layout: Balance + Quick Actions | Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-6">
          <PointsBalanceCard balance={profile?.points_balance ?? 0} />
          <QuickActions />
        </div>

        {/* Right column */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Recent Activity
          </h2>
          <ActivityFeed transactions={recentTx} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
