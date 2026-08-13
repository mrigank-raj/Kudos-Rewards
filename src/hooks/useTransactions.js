import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/hooks/useAuth';

/**
 * Fetch the current user's transactions, with optional type filter.
 */
export function useTransactions(filter = 'all') {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-transactions', user?.id, filter],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('transactions')
        .select('*, reward_programs(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filter === 'earned') {
        query = query.in('type', ['manual_credit', 'earn']);
      } else if (filter === 'redeemed') {
        query = query.eq('type', 'redeem');
      } else if (filter === 'debited') {
        query = query.eq('type', 'manual_debit');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}
