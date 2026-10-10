// Data-access layer: investment deposits reader (deposits + withdrawals).
//
// Thin, pure translation of a filter object into a Supabase query. There is NO
// business logic here beyond mapping filters to query clauses - balance and
// return computation live in the service / shared layers.
//
// ============================================================================
// RLS ISOLATION INVARIANT (requirement 12.11)
// ----------------------------------------------------------------------------
// This reader intentionally applies NO `.eq('user_id', ...)` filter. Row-level
// security on the `investment_deposits` table scopes every row to the
// authenticated user via the policy `auth.uid() = user_id`. Because the client
// passed in here is the anon-key, user-authenticated client created in
// auth/session.ts, the database returns only the signed-in user's rows
// automatically.
//
// NEVER add a `user_id` filter here, and NEVER introduce or reference a
// service-role client in this layer. A service-role client bypasses RLS and
// would break the per-user isolation guarantee. Isolation is enforced by the
// database, not by client-side filtering.
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { InvestmentDeposit } from '@financial-manager/shared';

export interface DepositFilters {
  channelId?: string;
  depositor?: string;
  isWithdrawal?: boolean;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

/**
 * Fetch investment deposits (and withdrawals) for the authenticated user,
 * applying the given filters as Supabase query clauses: `channel_id` equality,
 * `depositor` equality, `is_withdrawal` equality, `date` range (gte/lte), order
 * by `date` descending, and an optional row limit.
 */
export async function fetchDeposits(
  client: SupabaseClient,
  f: DepositFilters = {},
): Promise<InvestmentDeposit[]> {
  let q = client.from('investment_deposits').select('*');
  if (f.channelId) q = q.eq('channel_id', f.channelId);
  if (f.depositor) q = q.eq('depositor', f.depositor);
  if (f.isWithdrawal !== undefined) q = q.eq('is_withdrawal', f.isWithdrawal);
  if (f.dateFrom) q = q.gte('date', f.dateFrom);
  if (f.dateTo) q = q.lte('date', f.dateTo);
  q = q.order('date', { ascending: false });
  if (f.limit) q = q.limit(f.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as InvestmentDeposit[];
}
