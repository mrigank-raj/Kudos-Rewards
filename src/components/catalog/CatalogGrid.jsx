import CatalogCard from '@/components/catalog/CatalogCard';
import EmptyState from '@/components/shared/EmptyState';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Gift } from 'lucide-react';

export default function CatalogGrid({ items, isLoading, userBalance, onRedeem }) {
  if (isLoading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  // Edge-Case 4.6: empty catalog
  if (!items || items.length === 0) {
    return (
      <EmptyState
        icon={Gift}
        title="No rewards available"
        description="Check back later — your admin is curating awesome rewards for you!"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {items.map((item) => (
        <CatalogCard
          key={item.id}
          item={item}
          userBalance={userBalance}
          onRedeem={onRedeem}
        />
      ))}
    </div>
  );
}
