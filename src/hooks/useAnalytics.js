import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/hooks/useAuth';

/**
 * Fetch monthly points summary (issued vs redeemed) for the admin's org.
 * Falls back to a client-side aggregation if the RPC isn't deployed yet.
 */
export function usePointsSummary() {
  const { profile } = useAuth();
  const orgId = profile?.org_id;

  return useQuery({
    queryKey: ['analytics-points-summary', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      // Try the RPC first
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_points_summary', {
        p_org_id: orgId,
      });

      if (!rpcError && rpcData) return rpcData;

      // Fallback: client-side aggregation from raw transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('points, type, created_at, users!inner(org_id)')
        .eq('users.org_id', orgId);

      if (txError) throw txError;

      // Group by month
      const months = {};
      (txData || []).forEach((tx) => {
        const d = new Date(tx.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!months[key]) months[key] = { month: key, issued: 0, redeemed: 0 };

        if (tx.type === 'manual_credit' || tx.type === 'earn') {
          months[key].issued += Math.abs(tx.points);
        } else if (tx.type === 'redeem') {
          months[key].redeemed += Math.abs(tx.points);
        }
      });

      return Object.values(months).sort((a, b) => a.month.localeCompare(b.month));
    },
    enabled: !!orgId,
  });
}

/**
 * Fetch top recipients by total points earned.
 */
export function useTopRecipients(limit = 10) {
  const { profile } = useAuth();
  const orgId = profile?.org_id;

  return useQuery({
    queryKey: ['analytics-top-recipients', orgId, limit],
    queryFn: async () => {
      if (!orgId) return [];

      // Try RPC first
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_top_recipients', {
        p_org_id: orgId,
        p_limit: limit,
      });

      if (!rpcError && rpcData) return rpcData;

      // Fallback: client-side
      const { data: txData, error } = await supabase
        .from('transactions')
        .select('points, type, user_id, users!inner(name, email, org_id)')
        .eq('users.org_id', orgId)
        .in('type', ['manual_credit', 'earn']);

      if (error) throw error;

      const byUser = {};
      (txData || []).forEach((tx) => {
        if (!byUser[tx.user_id]) {
          byUser[tx.user_id] = {
            user_id: tx.user_id,
            name: tx.users.name,
            email: tx.users.email,
            total_points: 0,
          };
        }
        byUser[tx.user_id].total_points += Math.abs(tx.points);
      });

      return Object.values(byUser)
        .sort((a, b) => b.total_points - a.total_points)
        .slice(0, limit);
    },
    enabled: !!orgId,
  });
}

/**
 * Fetch points breakdown by reward program.
 */
export function useProgramBreakdown() {
  const { profile } = useAuth();
  const orgId = profile?.org_id;

  return useQuery({
    queryKey: ['analytics-program-breakdown', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      // Try RPC first
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_program_breakdown', {
        p_org_id: orgId,
      });

      if (!rpcError && rpcData) return rpcData;

      // Fallback: client-side
      const { data: txData, error } = await supabase
        .from('transactions')
        .select('points, type, program_id, reward_programs!inner(name, org_id)')
        .eq('reward_programs.org_id', orgId)
        .in('type', ['manual_credit', 'earn'])
        .not('program_id', 'is', null);

      if (error) throw error;

      const byProgram = {};
      (txData || []).forEach((tx) => {
        const pid = tx.program_id;
        if (!byProgram[pid]) {
          byProgram[pid] = {
            program_id: pid,
            name: tx.reward_programs.name,
            total_points: 0,
          };
        }
        byProgram[pid].total_points += Math.abs(tx.points);
      });

      return Object.values(byProgram).sort((a, b) => b.total_points - a.total_points);
    },
    enabled: !!orgId,
  });
}

/**
 * Aggregate stats for the stat cards.
 */
export function useAnalyticsStats() {
  const { data: summary } = usePointsSummary();

  const totalIssued = (summary || []).reduce((s, m) => s + m.issued, 0);
  const totalRedeemed = (summary || []).reduce((s, m) => s + m.redeemed, 0);
  const redemptionRate = totalIssued > 0 ? Math.round((totalRedeemed / totalIssued) * 100) : 0;

  return { totalIssued, totalRedeemed, redemptionRate };
}
