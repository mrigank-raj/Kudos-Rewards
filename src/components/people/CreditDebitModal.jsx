import { useState } from 'react';
import Button from '@/components/shared/Button';
import Modal from '@/components/shared/Modal';
import { usePrograms } from '@/hooks/usePrograms';
import { useToast } from '@/context/ToastContext';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

export default function CreditDebitModal({ isOpen, onClose, user, onCredit, onDebit, isLoading }) {
  const { data: programs } = usePrograms();
  const toast = useToast();

  const [mode, setMode] = useState('credit');
  const [form, setForm] = useState({ points: '', reason: '', programId: '' });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    }
  };

  const validate = () => {
    const errs = {};
    const points = Number(form.points);

    if (!form.points || points <= 0) {
      errs.points = 'Points must be greater than 0.'; // Edge-Case 2.1, 2.2
    }
    if (!form.reason.trim()) {
      errs.reason = 'Reason is required.'; // Edge-Case 2.9
    }
    if (mode === 'debit' && user && points > user.points_balance) {
      errs.points = `Insufficient balance. ${user.name} only has ${user.points_balance} points.`; // Edge-Case 2.3
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      userId: user.id,
      points: Number(form.points),
      reason: form.reason.trim(),
      ...(mode === 'credit' && form.programId ? { programId: form.programId } : {}),
    };

    try {
      if (mode === 'credit') {
        await onCredit(payload);
        toast.success(`${form.points} points credited to ${user.name}!`);
      } else {
        await onDebit(payload);
        toast.success(`${form.points} points debited from ${user.name}.`);
      }
      onClose();
    } catch (err) {
      toast.error(err.message || `Failed to ${mode} points.`);
    }
  };

  const activePrograms = (programs || []).filter((p) => p.is_active);

  const inputClass =
    'w-full px-3 py-2.5 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent transition-all text-sm';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${mode === 'credit' ? 'Credit' : 'Debit'} Points`} size="md">
      <div className="space-y-5">
        {/* User info */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)]">
          <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-medium text-[var(--text-primary)]">{user?.name}</p>
            <p className="text-xs text-[var(--text-tertiary)]">
              Current balance: <strong>{user?.points_balance?.toLocaleString() ?? 0} pts</strong>
            </p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('credit')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === 'credit'
                ? 'bg-[var(--color-secondary-600)] text-white shadow-sm'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" />
            Credit
          </button>
          <button
            type="button"
            onClick={() => setMode('debit')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === 'debit'
                ? 'bg-[var(--color-danger-600)] text-white shadow-sm'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            Debit
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Points */}
          <div>
            <label htmlFor="cd-points" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Points
            </label>
            <input
              id="cd-points" name="points" type="number" min="1"
              value={form.points} onChange={handleChange}
              placeholder="e.g. 100"
              className={`${inputClass} ${errors.points ? 'border-[var(--color-danger-500)]' : ''}`}
            />
            {errors.points && <p className="mt-1 text-xs text-[var(--color-danger-500)]">{errors.points}</p>}
          </div>

          {/* Reason */}
          <div>
            <label htmlFor="cd-reason" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Reason <span className="text-[var(--color-danger-500)]">*</span>
            </label>
            <textarea
              id="cd-reason" name="reason"
              value={form.reason} onChange={handleChange}
              placeholder="Why is this point adjustment being made?"
              rows={2}
              className={`${inputClass} resize-none ${errors.reason ? 'border-[var(--color-danger-500)]' : ''}`}
            />
            {errors.reason && <p className="mt-1 text-xs text-[var(--color-danger-500)]">{errors.reason}</p>}
          </div>

          {/* Program link (credit only) */}
          {mode === 'credit' && activePrograms.length > 0 && (
            <div>
              <label htmlFor="cd-program" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Link to Program <span className="text-[var(--text-tertiary)]">(optional)</span>
              </label>
              <select
                id="cd-program" name="programId"
                value={form.programId} onChange={handleChange}
                className={`${inputClass} appearance-none cursor-pointer`}
              >
                <option value="">No program</option>
                {activePrograms.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.points_value} pts)</option>
                ))}
              </select>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              variant={mode === 'credit' ? 'success' : 'danger'}
              loading={isLoading}
            >
              {mode === 'credit' ? 'Credit Points' : 'Debit Points'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
