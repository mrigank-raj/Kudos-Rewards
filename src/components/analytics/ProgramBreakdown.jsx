import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from 'recharts';

const CHART_COLORS = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#14b8a6', // teal
];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-xl px-4 py-3 shadow-lg">
      <p className="text-sm font-medium text-[var(--text-primary)]">{d.name}</p>
      <p className="text-sm" style={{ color: d.payload.fill }}>
        {d.value?.toLocaleString()} points ({d.payload.percent}%)
      </p>
    </div>
  );
}

export default function ProgramBreakdown({ data, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-primary)] p-5 shadow-sm">
        <div className="h-4 w-44 bg-[var(--bg-tertiary)] rounded mb-4 animate-pulse" />
        <div className="h-[280px] bg-[var(--bg-tertiary)] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-primary)] p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Program Breakdown</h3>
        <div className="h-[280px] flex items-center justify-center">
          <p className="text-sm text-[var(--text-tertiary)] text-center max-w-xs">
            No program data yet. Link transactions to programs to see the breakdown.
          </p>
        </div>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.total_points, 0);
  const chartData = data.map((d, i) => ({
    name: d.name,
    value: d.total_points,
    percent: total > 0 ? Math.round((d.total_points / total) * 100) : 0,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-primary)] p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Program Breakdown</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            animationDuration={1000}
          >
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
