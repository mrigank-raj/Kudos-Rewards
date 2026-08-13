import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

const COLORS = {
  issued: '#6366f1',   // indigo-500
  redeemed: '#f43f5e', // rose-500
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-xl px-4 py-3 shadow-lg">
      <p className="text-xs font-medium text-[var(--text-tertiary)] mb-2">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
          <span className="font-semibold">{entry.value?.toLocaleString()}</span>{' '}
          <span className="text-[var(--text-tertiary)]">{entry.name}</span>
        </p>
      ))}
    </div>
  );
}

export default function PointsIssuedVsRedeemed({ data, isLoading }) {
  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (!data || data.length === 0) {
    return <ChartEmpty message="No transaction data yet. Start issuing points to see trends." />;
  }

  // Format month labels
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
  }));

  return (
    <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-primary)] p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
        Points Issued vs Redeemed
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradIssued" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.issued} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.issued} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradRedeemed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.redeemed} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.redeemed} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} />
          <YAxis tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone" dataKey="issued" name="Issued"
            stroke={COLORS.issued} fill="url(#gradIssued)" strokeWidth={2}
            animationDuration={1000}
          />
          <Area
            type="monotone" dataKey="redeemed" name="Redeemed"
            stroke={COLORS.redeemed} fill="url(#gradRedeemed)" strokeWidth={2}
            animationDuration={1200}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-primary)] p-5 shadow-sm">
      <div className="h-4 w-48 bg-[var(--bg-tertiary)] rounded mb-4 animate-pulse" />
      <div className="h-[280px] bg-[var(--bg-tertiary)] rounded-xl animate-pulse" />
    </div>
  );
}

function ChartEmpty({ message }) {
  return (
    <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-primary)] p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
        Points Issued vs Redeemed
      </h3>
      <div className="h-[280px] flex items-center justify-center">
        <p className="text-sm text-[var(--text-tertiary)] text-center max-w-xs">{message}</p>
      </div>
    </div>
  );
}
