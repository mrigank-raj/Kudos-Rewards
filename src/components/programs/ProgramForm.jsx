import { useState } from 'react';
import Button from '@/components/shared/Button';
import Modal from '@/components/shared/Modal';
import { useToast } from '@/context/ToastContext';

export default function ProgramForm({ isOpen, onClose, program, onSubmit, isLoading }) {
  const isEditing = !!program;
  const toast = useToast();

  const [form, setForm] = useState({
    name: program?.name || '',
    description: program?.description || '',
    trigger_type: program?.trigger_type || 'manual',
    rule_metric: program?.rule_metric || '',
    rule_threshold: program?.rule_threshold || '',
    points_value: program?.points_value || '',
  });
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
    if (!form.name.trim()) errs.name = 'Program name is required.';
    if (!form.points_value || Number(form.points_value) <= 0) {
      errs.points_value = 'Points value must be greater than 0.'; // Edge-Case 3.1
    }
    if (form.trigger_type === 'rule') {
      if (!form.rule_metric.trim()) errs.rule_metric = 'Metric is required for rule-based programs.'; // Edge-Case 3.2
      if (!form.rule_threshold || Number(form.rule_threshold) <= 0) errs.rule_threshold = 'Threshold must be greater than 0.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSubmit({
        ...(isEditing ? { id: program.id } : {}),
        name: form.name.trim(),
        description: form.description.trim(),
        trigger_type: form.trigger_type,
        rule_metric: form.trigger_type === 'rule' ? form.rule_metric.trim() : null,
        rule_threshold: form.trigger_type === 'rule' ? Number(form.rule_threshold) : null,
        points_value: Number(form.points_value),
      });
      toast.success(isEditing ? 'Program updated successfully!' : 'Program created successfully!');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save program.');
    }
  };

  const inputClass =
    'w-full px-3 py-2.5 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent transition-all text-sm';
  const errorInputClass = 'border-[var(--color-danger-500)] focus:ring-[var(--color-danger-500)]';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Program' : 'Create Program'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="prog-name" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Program Name
          </label>
          <input
            id="prog-name" name="name" value={form.name} onChange={handleChange}
            placeholder="e.g. Spot Bonus, Sales Star"
            className={`${inputClass} ${errors.name ? errorInputClass : ''}`}
          />
          {errors.name && <p className="mt-1 text-xs text-[var(--color-danger-500)]">{errors.name}</p>}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="prog-desc" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Description <span className="text-[var(--text-tertiary)]">(optional)</span>
          </label>
          <textarea
            id="prog-desc" name="description" value={form.description} onChange={handleChange}
            placeholder="Describe when and why this program awards points..."
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Trigger Type */}
        <div>
          <label htmlFor="prog-trigger" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Trigger Type
          </label>
          <select
            id="prog-trigger" name="trigger_type" value={form.trigger_type} onChange={handleChange}
            className={`${inputClass} appearance-none cursor-pointer`}
          >
            <option value="manual">Manual — admin awards points manually</option>
            <option value="rule">Rule-Based — triggered by a metric threshold</option>
          </select>
        </div>

        {/* Rule fields (conditional) */}
        {form.trigger_type === 'rule' && (
          <div className="grid grid-cols-2 gap-4 animate-slide-up">
            <div>
              <label htmlFor="prog-metric" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Metric Name
              </label>
              <input
                id="prog-metric" name="rule_metric" value={form.rule_metric} onChange={handleChange}
                placeholder="e.g. sales_count"
                className={`${inputClass} ${errors.rule_metric ? errorInputClass : ''}`}
              />
              {errors.rule_metric && <p className="mt-1 text-xs text-[var(--color-danger-500)]">{errors.rule_metric}</p>}
            </div>
            <div>
              <label htmlFor="prog-threshold" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Threshold
              </label>
              <input
                id="prog-threshold" name="rule_threshold" type="number" min="1"
                value={form.rule_threshold} onChange={handleChange}
                placeholder="e.g. 50"
                className={`${inputClass} ${errors.rule_threshold ? errorInputClass : ''}`}
              />
              {errors.rule_threshold && <p className="mt-1 text-xs text-[var(--color-danger-500)]">{errors.rule_threshold}</p>}
            </div>
          </div>
        )}

        {/* Points Value */}
        <div>
          <label htmlFor="prog-points" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Points Value
          </label>
          <input
            id="prog-points" name="points_value" type="number" min="1"
            value={form.points_value} onChange={handleChange}
            placeholder="e.g. 500"
            className={`${inputClass} ${errors.points_value ? errorInputClass : ''}`}
          />
          {errors.points_value && <p className="mt-1 text-xs text-[var(--color-danger-500)]">{errors.points_value}</p>}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-primary)]">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={isLoading}>
            {isEditing ? 'Save Changes' : 'Create Program'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
