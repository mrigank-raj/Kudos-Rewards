import { useState } from 'react';
import Badge from '@/components/shared/Badge';
import { Zap, Settings2, MoreVertical, Pencil, Power, PowerOff } from 'lucide-react';

export default function ProgramCard({ program, onEdit, onToggle }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const triggerLabel = program.trigger_type === 'rule' ? 'Rule-Based' : 'Manual';

  return (
    <div
      className={`
        relative bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-primary)] p-5
        shadow-sm hover:shadow-md transition-all duration-200
        ${!program.is_active ? 'opacity-70' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
            {program.name}
          </h3>
          {program.description && (
            <p className="mt-1 text-sm text-[var(--text-secondary)] line-clamp-2">
              {program.description}
            </p>
          )}
        </div>

        {/* Action menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Program actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-20 w-40 bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-xl shadow-lg py-1 animate-scale-in">
                <button
                  onClick={() => { setMenuOpen(false); onEdit(program); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onToggle(program); }}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors ${
                    program.is_active
                      ? 'text-[var(--color-danger-600)] hover:bg-[var(--color-danger-50)]'
                      : 'text-[var(--color-secondary-600)] hover:bg-[var(--color-secondary-50)]'
                  }`}
                >
                  {program.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                  {program.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <Badge variant={program.is_active ? 'success' : 'default'}>
          {program.is_active ? 'Active' : 'Inactive'}
        </Badge>
        <Badge variant="primary">
          <Settings2 className="w-3 h-3 mr-1" />
          {triggerLabel}
        </Badge>
      </div>

      {/* Points */}
      <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-[var(--border-secondary)]">
        <Zap className="w-4 h-4 text-[var(--color-warning-500)]" />
        <span className="text-lg font-bold text-[var(--text-primary)]">
          {program.points_value?.toLocaleString()}
        </span>
        <span className="text-sm text-[var(--text-tertiary)]">points</span>
      </div>
    </div>
  );
}
