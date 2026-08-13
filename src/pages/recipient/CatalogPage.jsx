import { useState, useCallback } from 'react';
import { Gift, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCatalog, useCatalogCategories } from '@/hooks/useCatalog';
import { useRedeemReward } from '@/hooks/useRedemptions';
import CatalogGrid from '@/components/catalog/CatalogGrid';
import RedeemModal from '@/components/catalog/RedeemModal';
import { supabase } from '@/config/supabase';

export default function CatalogPage() {
  const { profile, user } = useAuth();
  const { data: items, isLoading } = useCatalog();
  const categories = useCatalogCategories();
  const redeemReward = useRedeemReward();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState(null);

  // We track a local balance so it updates immediately after a redemption
  // without waiting for the full auth re-fetch.
  const [localBalance, setLocalBalance] = useState(null);
  const currentBalance = localBalance ?? profile?.points_balance ?? 0;

  // Filter items by search and category
  const filtered = (items || []).filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      activeCategory === 'All' || item.category === activeCategory;
    return matchSearch && matchCategory;
  });

  const handleRedeem = (item) => {
    // Edge-Case 4.3: 0 balance → buttons are already disabled in CatalogCard
    if (currentBalance < item.points_cost) return;
    setSelectedItem(item);
  };

  const handleConfirmRedeem = useCallback(
    async (payload) => {
      await redeemReward.mutateAsync(payload);

      // Optimistic local balance update
      setLocalBalance((prev) => {
        const base = prev ?? profile?.points_balance ?? 0;
        return base - payload.pointsCost;
      });

      // Also re-fetch the profile to ensure consistency
      if (user?.id) {
        const { data } = await supabase
          .from('users')
          .select('points_balance')
          .eq('id', user.id)
          .single();
        if (data) setLocalBalance(data.points_balance);
      }
    },
    [redeemReward, profile, user]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Gift className="w-7 h-7 text-[var(--color-primary-500)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Rewards Catalog</h1>
            <p className="text-sm text-[var(--text-tertiary)]">
              You have <strong className="text-[var(--text-primary)]">{currentBalance.toLocaleString()}</strong> points available
            </p>
          </div>
        </div>
      </div>

      {/* Search + Category filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search rewards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent text-sm"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                activeCategory === cat
                  ? 'bg-[var(--color-primary-600)] text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Grid */}
      <CatalogGrid
        items={filtered}
        isLoading={isLoading}
        userBalance={currentBalance}
        onRedeem={handleRedeem}
      />

      {/* Redeem Modal */}
      {selectedItem && (
        <RedeemModal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          item={selectedItem}
          userBalance={currentBalance}
          onConfirm={handleConfirmRedeem}
          isLoading={redeemReward.isPending}
        />
      )}
    </div>
  );
}
