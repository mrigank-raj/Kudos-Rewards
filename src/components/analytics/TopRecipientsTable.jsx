import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Crown } from 'lucide-react';

export default function TopRecipientsTable({ data, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-primary)] p-5 shadow-sm">
        <div className="h-4 w-40 bg-[var(--bg-tertiary)] rounded mb-4 animate-pulse" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-[var(--bg-tertiary)] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-primary)] p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Top Recipients</h3>
        <div className="h-[280px] flex items-center justify-center">
          <p className="text-sm text-[var(--text-tertiary)] text-center">
            No recipients with earned points yet.
          </p>
        </div>
      </div>
    );
  }

  const maxPoints = data[0]?.total_points || 1;

  // Podium colors for top 3
  const rankColors = ['text-amber-500', 'text-slate-400', 'text-amber-700'];

  return (
    <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-primary)] p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Top Recipients</h3>

      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
        {data.map((person, i) => {
          const barWidth = (person.total_points / maxPoints) * 100;

          return (
            <div
              key={person.user_id || i}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              {/* Rank */}
              <span className={`w-6 text-center text-sm font-bold ${i < 3 ? rankColors[i] : 'text-[var(--text-tertiary)]'}`}>
                {i < 3 ? <Crown className="w-4 h-4 mx-auto" /> : i + 1}
              </span>

              {/* Avatar */}
              <div className="w-8 h-8 rounded-full gradient-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {person.name?.charAt(0)?.toUpperCase() || '?'}
              </div>

              {/* Name + bar */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {person.name}
                </p>
                <div className="mt-1 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>

              {/* Points */}
              <span className="text-sm font-semibold text-[var(--text-primary)] flex-shrink-0">
                {person.total_points?.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
