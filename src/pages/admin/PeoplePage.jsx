import { useState } from 'react';
import { Users, Search } from 'lucide-react';
import PeopleTable from '@/components/people/PeopleTable';
import CreditDebitModal from '@/components/people/CreditDebitModal';
import UserHistory from '@/components/people/UserHistory';
import { usePeople, useCreditPoints, useDebitPoints } from '@/hooks/usePeople';

export default function PeoplePage() {
  const { data: people, isLoading } = usePeople();
  const creditPoints = useCreditPoints();
  const debitPoints = useDebitPoints();

  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showCreditDebit, setShowCreditDebit] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Filter by search
  const filtered = (people || []).filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleCredit = (user) => {
    setSelectedUser(user);
    setShowCreditDebit(true);
  };

  const handleDebit = (user) => {
    setSelectedUser(user);
    setShowCreditDebit(true);
  };

  const handleViewHistory = (user) => {
    setSelectedUser(user);
    setShowHistory(true);
  };

  const handleCreditSubmit = async (payload) => {
    await creditPoints.mutateAsync(payload);
  };

  const handleDebitSubmit = async (payload) => {
    await debitPoints.mutateAsync(payload);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-[var(--color-primary-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">People</h1>
            {people && (
              <p className="text-sm text-[var(--text-tertiary)]">{people.length} team member{people.length !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      {people && people.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent text-sm"
          />
        </div>
      )}

      {/* Table */}
      <PeopleTable
        people={filtered}
        isLoading={isLoading}
        onCredit={handleCredit}
        onDebit={handleDebit}
        onViewHistory={handleViewHistory}
      />

      {/* Credit/Debit Modal */}
      {showCreditDebit && selectedUser && (
        <CreditDebitModal
          isOpen={showCreditDebit}
          onClose={() => { setShowCreditDebit(false); setSelectedUser(null); }}
          user={selectedUser}
          onCredit={handleCreditSubmit}
          onDebit={handleDebitSubmit}
          isLoading={creditPoints.isPending || debitPoints.isPending}
        />
      )}

      {/* History Modal */}
      {showHistory && selectedUser && (
        <UserHistory
          isOpen={showHistory}
          onClose={() => { setShowHistory(false); setSelectedUser(null); }}
          user={selectedUser}
        />
      )}
    </div>
  );
}
