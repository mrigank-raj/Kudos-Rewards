import { useState } from 'react';
import { Trophy, Plus, Search } from 'lucide-react';
import Button from '@/components/shared/Button';
import Modal from '@/components/shared/Modal';
import ProgramList from '@/components/programs/ProgramList';
import ProgramForm from '@/components/programs/ProgramForm';
import { usePrograms, useCreateProgram, useUpdateProgram, useToggleProgram } from '@/hooks/usePrograms';
import { useToast } from '@/context/ToastContext';

export default function ProgramsPage() {
  const { data: programs, isLoading } = usePrograms();
  const createProgram = useCreateProgram();
  const updateProgram = useUpdateProgram();
  const toggleProgram = useToggleProgram();
  const toast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Filter programs
  const filtered = (programs || []).filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && p.is_active) ||
      (filterStatus === 'inactive' && !p.is_active);
    return matchSearch && matchStatus;
  });

  const handleCreate = async (data) => {
    await createProgram.mutateAsync(data);
  };

  const handleUpdate = async (data) => {
    await updateProgram.mutateAsync(data);
  };

  const handleEdit = (program) => {
    setEditingProgram(program);
    setShowForm(true);
  };

  const handleToggle = (program) => {
    setConfirmToggle(program);
  };

  const confirmToggleAction = async () => {
    if (!confirmToggle) return;
    try {
      await toggleProgram.mutateAsync({
        id: confirmToggle.id,
        is_active: !confirmToggle.is_active,
      });
      toast.success(
        confirmToggle.is_active
          ? `"${confirmToggle.name}" has been deactivated.`
          : `"${confirmToggle.name}" has been reactivated.`
      );
    } catch (err) {
      toast.error(err.message || 'Failed to update program status.');
    }
    setConfirmToggle(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingProgram(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Trophy className="w-7 h-7 text-[var(--color-primary-500)]" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Reward Programs</h1>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => { setEditingProgram(null); setShowForm(true); }}>
          Create Program
        </Button>
      </div>

      {/* Filters */}
      {programs && programs.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search programs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent text-sm"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'active', 'inactive'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  filterStatus === status
                    ? 'bg-[var(--color-primary-600)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Program List */}
      <ProgramList
        programs={filtered}
        isLoading={isLoading}
        onEdit={handleEdit}
        onToggle={handleToggle}
        onCreate={() => { setEditingProgram(null); setShowForm(true); }}
      />

      {/* Create / Edit Modal */}
      {showForm && (
        <ProgramForm
          isOpen={showForm}
          onClose={handleCloseForm}
          program={editingProgram}
          onSubmit={editingProgram ? handleUpdate : handleCreate}
          isLoading={createProgram.isPending || updateProgram.isPending}
        />
      )}

      {/* Confirm Deactivate/Activate Modal */}
      <Modal
        isOpen={!!confirmToggle}
        onClose={() => setConfirmToggle(null)}
        title={confirmToggle?.is_active ? 'Deactivate Program?' : 'Reactivate Program?'}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            {confirmToggle?.is_active
              ? `Are you sure you want to deactivate "${confirmToggle?.name}"? It will no longer be available for point crediting. Existing transactions will be preserved.`
              : `Re-enable "${confirmToggle?.name}" for point crediting?`}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setConfirmToggle(null)}>Cancel</Button>
            <Button
              variant={confirmToggle?.is_active ? 'danger' : 'success'}
              onClick={confirmToggleAction}
              loading={toggleProgram.isPending}
            >
              {confirmToggle?.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
