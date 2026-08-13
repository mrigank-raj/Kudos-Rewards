export default function StatCard({ title, value, icon: Icon, trend, trendValue, description }) {
  const isPositive = trend === 'up';
  const isNegative = trend === 'down';

  return (
    <div className="bg-[var(--bg-elevated)] p-6 rounded-2xl border border-[var(--border-primary)] shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">{title}</h3>
        {Icon && (
          <div className="p-2 bg-[var(--bg-tertiary)] rounded-lg text-[var(--color-primary-500)]">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-[var(--text-primary)]">{value}</span>
        {trend && (
          <span
            className={`text-sm font-medium ${
              isPositive ? 'text-[var(--color-secondary-600)]' : ''
            } ${isNegative ? 'text-[var(--color-danger-600)]' : ''} ${
              !isPositive && !isNegative ? 'text-[var(--text-tertiary)]' : ''
            }`}
          >
            {isPositive ? '+' : ''}{trendValue}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-2 text-sm text-[var(--text-tertiary)]">{description}</p>
      )}
    </div>
  );
}
