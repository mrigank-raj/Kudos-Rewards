import ProgramCard from '@/components/programs/ProgramCard';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import Button from '@/components/shared/Button';
import { Trophy, Plus } from 'lucide-react';

export default function ProgramList({ programs, isLoading, onEdit, onToggle, onCreate }) {
  if (isLoading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  // Edge-Case 3.8: Empty program list — encouraging empty state
  if (!programs || programs.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No programs yet"
        description="Create your first reward program to start recognizing and motivating your team."
        action={
          <Button variant="primary" icon={Plus} onClick={onCreate}>
            Create Program
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {programs.map((program) => (
        <ProgramCard
          key={program.id}
          program={program}
          onEdit={onEdit}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
