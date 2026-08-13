import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTransactions } from '@/hooks/useTransactions';
import PointsBalanceCard from '@/components/dashboard/PointsBalanceCard';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import QuickActions from '@/components/dashboard/QuickActions';
import KudosFeed from '@/components/dashboard/KudosFeed';
import GiveKudosModal from '@/components/dashboard/GiveKudosModal';
import Button from '@/components/shared/Button';
import { LayoutDashboard, Gift } from 'lucide-react';

export default function RecipientDashboard() {
  const { profile } = useAuth();
  const { data: transactions, isLoading } = useTransactions('all');
  const [isKudosModalOpen, setIsKudosModalOpen] = useState(false);

  // Show only the most recent 10 on the dashboard
  const recentTx = (transactions || []).slice(0, 10);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-7 h-7 text-[var(--color-primary-500)]" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Welcome back, {profile?.name?.split(' ')[0] || 'there'}!
          </h1>
        </div>
        <Button 
          variant="primary" 
          className="flex items-center gap-2"
          onClick={() => setIsKudosModalOpen(true)}
        >
          <Gift className="w-4 h-4" />
          Give Kudos
        </Button>
      </div>

      {/* Layout: Balance + Quick Actions + Personal Activity | Company Kudos Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-6">
          <PointsBalanceCard balance={profile?.points_balance ?? 0} />
          <QuickActions />
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              My Recent Activity
            </h2>
            <ActivityFeed transactions={recentTx} isLoading={isLoading} />
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Company Recognition
          </h2>
          <KudosFeed />
        </div>
      </div>

      <GiveKudosModal 
        isOpen={isKudosModalOpen} 
        onClose={() => setIsKudosModalOpen(false)} 
      />
    </div>
  );
}
