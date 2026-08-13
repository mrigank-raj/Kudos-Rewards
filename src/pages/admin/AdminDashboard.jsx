import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/hooks/useAuth';
import StatCard from '@/components/shared/StatCard';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import Badge from '@/components/shared/Badge';
import {
  LayoutDashboard, Users, Trophy, Zap, Gift,
  ArrowUpCircle, ArrowDownCircle,
} from 'lucide-react';

const typeConfig = {
  manual_credit: { icon: ArrowUpCircle, label: 'Credit', variant: 'success' },
  earn: { icon: Zap, label: 'Earned', variant: 'success' },
  manual_debit: { icon: ArrowDownCircle, label: 'Debit', variant: 'danger' },
  redeem: { icon: Gift, label: 'Redeemed', variant: 'warning' },
};

export default function AdminDashboard() {
  const { profile } = useAuth();
  const orgId = profile?.org_id;

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats', orgId],
    queryFn: async () => {
      if (!orgId) return null;

      // Parallel queries for speed
      const [usersRes, programsRes, txRes, redemptionsRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('role', 'recipient'),
        supabase.from('reward_programs').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('is_active', true),
        supabase.from('transactions').select('points, type, user_id').in('type', ['manual_credit', 'earn']),
        supabase.from('redemptions').select('id', { count: 'exact', head: true }),
      ]);

      const totalPointsIssued = (txRes.data || []).reduce((sum, t) => sum + (t.points || 0), 0);

      return {
        totalUsers: usersRes.count || 0,
        activePrograms: programsRes.count || 0,
        totalPointsIssued,
        totalRedemptions: redemptionsRes.count || 0,
      };
    },
    enabled: !!orgId,
  });

  // Fetch recent transactions
  const { data: recentTx, isLoading: txLoading } = useQuery({
    queryKey: ['admin-recent-tx', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select('*, users(name, email)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <LayoutDashboard className="w-7 h-7 text-[var(--color-primary-500)]" />
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Overview of your rewards program.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      {statsLoading ? (
        <LoadingSpinner className="py-8" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Team Members"
            value={stats?.totalUsers?.toLocaleString() ?? '0'}
            icon={Users}
            description="Active recipients"
          />
          <StatCard
            title="Active Programs"
            value={stats?.activePrograms?.toLocaleString() ?? '0'}
            icon={Trophy}
            description="Reward programs running"
          />
          <StatCard
            title="Points Issued"
            value={stats?.totalPointsIssued?.toLocaleString() ?? '0'}
            icon={Zap}
            description="Total across all programs"
          />
          <StatCard
            title="Redemptions"
            value={stats?.totalRedemptions?.toLocaleString() ?? '0'}
            icon={Gift}
            description="Rewards redeemed"
          />
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Recent Activity</h2>

        {txLoading ? (
          <LoadingSpinner className="py-8" />
        ) : !recentTx || recentTx.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-[var(--border-primary)] bg-[var(--bg-elevated)] text-center">
            <p className="text-sm text-[var(--text-tertiary)]">No transactions yet. Credit some points to get started!</p>
          </div>
        ) : (
          <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-primary)] divide-y divide-[var(--border-secondary)] shadow-sm overflow-hidden">
            {recentTx.map((tx) => {
              const config = typeConfig[tx.type] || typeConfig.earn;
              const Icon = config.icon;

              return (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--bg-tertiary)] transition-colors">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${
                    config.variant === 'success' ? 'bg-[var(--color-secondary-50)] text-[var(--color-secondary-600)] dark:bg-emerald-900/30 dark:text-emerald-400' :
                    config.variant === 'danger' ? 'bg-[var(--color-danger-50)] text-[var(--color-danger-600)] dark:bg-rose-900/30 dark:text-rose-400' :
                    'bg-[var(--color-warning-50)] text-[var(--color-warning-600)] dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)]">
                      <span className="font-medium">{tx.users?.name || 'Unknown'}</span>
                      {' '}
                      <span className="text-[var(--text-tertiary)]">
                        {tx.reason || config.label}
                      </span>
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold ${
                      tx.points > 0 ? 'text-[var(--color-secondary-600)]' : 'text-[var(--color-danger-600)]'
                    }`}>
                      {tx.points > 0 ? '+' : ''}{tx.points?.toLocaleString()} pts
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">{formatDate(tx.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
