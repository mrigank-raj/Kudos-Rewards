import { BarChart3, Zap, Gift, TrendingUp, Trophy } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import PointsIssuedVsRedeemed from '@/components/analytics/PointsIssuedVsRedeemed';
import RedemptionRateChart from '@/components/analytics/RedemptionRateChart';
import TopRecipientsTable from '@/components/analytics/TopRecipientsTable';
import ProgramBreakdown from '@/components/analytics/ProgramBreakdown';
import {
  usePointsSummary,
  useTopRecipients,
  useProgramBreakdown,
  useAnalyticsStats,
} from '@/hooks/useAnalytics';
import { usePrograms } from '@/hooks/usePrograms';

export default function AnalyticsPage() {
  const { data: summary, isLoading: summaryLoading } = usePointsSummary();
  const { data: topRecipients, isLoading: recipientsLoading } = useTopRecipients();
  const { data: breakdown, isLoading: breakdownLoading } = useProgramBreakdown();
  const { data: programs } = usePrograms();
  const { totalIssued, totalRedeemed, redemptionRate } = useAnalyticsStats();

  const activePrograms = (programs || []).filter((p) => p.is_active).length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="w-7 h-7 text-[var(--color-primary-500)]" />
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Analytics</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Insights into your rewards program performance.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Issued"
          value={totalIssued.toLocaleString()}
          icon={Zap}
          description="Points awarded"
        />
        <StatCard
          title="Total Redeemed"
          value={totalRedeemed.toLocaleString()}
          icon={Gift}
          description="Points redeemed"
        />
        <StatCard
          title="Redemption Rate"
          value={`${redemptionRate}%`}
          icon={TrendingUp}
          description="Engagement metric"
        />
        <StatCard
          title="Active Programs"
          value={activePrograms.toString()}
          icon={Trophy}
          description="Currently running"
        />
      </div>

      {/* Charts — 2x2 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PointsIssuedVsRedeemed data={summary} isLoading={summaryLoading} />
        <RedemptionRateChart data={summary} isLoading={summaryLoading} />
        <TopRecipientsTable data={topRecipients} isLoading={recipientsLoading} />
        <ProgramBreakdown data={breakdown} isLoading={breakdownLoading} />
      </div>
    </div>
  );
}
