export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-[var(--bg-elevated)] border border-dashed border-[var(--border-primary)] rounded-2xl ${className}`}
    >
      {Icon && (
        <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">
          <Icon className="w-8 h-8" />
        </div>
      )}
      <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
        {title}
      </h3>
      {description && (
        <p className="max-w-sm mb-6 text-sm text-[var(--text-secondary)]">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
