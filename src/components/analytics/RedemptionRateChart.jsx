import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-xl px-4 py-3 shadow-lg">
      <p className="text-xs font-medium text-[var(--text-tertiary)] mb-1">{label}</p>
      <p className="text-sm font-semibold" style={{ color: '#8b5cf6' }}>
        {payload[0]?.value?.toFixed(1)}% redemption rate
      </p>
    </div>
  );
}

export default function RedemptionRateChart({ data, isLoading }) {
  if (isLoading) {
    return <ChartSkeleton />;
  }

  if (!data || data.length === 0) {
    return <ChartEmpty />;
  }

  // Derive redemption rate per month
  const rateData = data.map((d) => ({
    label: new Date(d.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    rate: d.issued > 0 ? Math.min((d.redeemed / d.issued) * 100, 150) : 0, // Edge-Case 5.4: cap display at 150%
  }));

  return (
    <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-primary)] p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
        Redemption Rate Trend
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={rateData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }}
            tickFormatter={(v) => `${v}%`}
            domain={[0, 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={100} stroke="var(--border-primary)" strokeDasharray="4 4" label="" />
          <Line
            type="monotone" dataKey="rate" name="Rate"
            stroke="#8b5cf6" strokeWidth={2.5}
            dot={{ fill: '#8b5cf6', r: 4 }}
            activeDot={{ r: 6, fill: '#8b5cf6' }}
            animationDuration={1200}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-primary)] p-5 shadow-sm">
      <div className="h-4 w-44 bg-[var(--bg-tertiary)] rounded mb-4 animate-pulse" />
      <div className="h-[280px] bg-[var(--bg-tertiary)] rounded-xl animate-pulse" />
    </div>
  );
}

function ChartEmpty() {
  return (
    <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-primary)] p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
        Redemption Rate Trend
      </h3>
      <div className="h-[280px] flex items-center justify-center">
        <p className="text-sm text-[var(--text-tertiary)] text-center max-w-xs">
          Not enough data to show a trend yet.
        </p>
      </div>
    </div>
  );
}
