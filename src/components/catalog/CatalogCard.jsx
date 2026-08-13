import { useState } from 'react';
import Badge from '@/components/shared/Badge';
import { Zap, ImageOff } from 'lucide-react';

export default function CatalogCard({ item, userBalance = 0, onRedeem }) {
  const [imgError, setImgError] = useState(false);

  const canAfford = userBalance >= item.points_cost;
  const pointsNeeded = item.points_cost - userBalance;

  return (
    <div className="group bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-primary)] overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-[var(--bg-tertiary)]">
        {item.image_url && !imgError ? (
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          // Edge-Case 4.5: placeholder on image load failure
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-10 h-10 text-[var(--text-tertiary)]" />
          </div>
        )}

        {/* Category badge */}
        {item.category && (
          <div className="absolute top-3 left-3">
            <Badge variant="primary">{item.category}</Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
            {item.name}
          </h3>
          {item.description && (
            <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>

        {/* Points cost */}
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-[var(--color-warning-500)]" />
          <span className="text-lg font-bold text-[var(--text-primary)]">
            {item.points_cost?.toLocaleString()}
          </span>
          <span className="text-sm text-[var(--text-tertiary)]">points</span>
        </div>

        {/* Redeem button */}
        <button
          onClick={() => canAfford && onRedeem(item)}
          disabled={!canAfford}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            canAfford
              ? 'bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)] active:scale-[0.98]'
              : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] cursor-not-allowed'
          }`}
          title={!canAfford ? `Need ${pointsNeeded.toLocaleString()} more points` : 'Redeem this reward'}
        >
          {canAfford ? (
            'Redeem'
          ) : (
            // Edge-Case 4.7: show points progress
            <span>Need {pointsNeeded.toLocaleString()} more pts</span>
          )}
        </button>
      </div>
    </div>
  );
}
