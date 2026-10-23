// Data-access layer: fixed expenses reader.
//
// Thin, pure translation of a filter object into a Supabase query. There is NO
// business logic here beyond mapping filters to query clauses - inflation and
// computation live in the service / shared layers.
//
// ============================================================================
// RLS ISOLATION INVARIANT (requirement 12.11)
// ----------------------------------------------------------------------------
// This reader intentionally applies NO `.eq('user_id', ...)` filter. Row-level
// security on the `fixed_expenses` table scopes every row to the authenticated
// user via the policy `auth.uid() = user_id`. Because the client passed in here
// is the anon-key, user-authenticated client created in auth/session.ts, the
// database returns only the signed-in user's rows automatically.
//
// NEVER add a `user_id` filter here, and NEVER introduce or reference a
// service-role client in this layer. A service-role client bypasses RLS and
// would break the per-user isolation guarantee. Isolation is enforced by the
// database, not by client-side filtering.
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { FixedExpense } from '@financial-manager/shared';

export interface FixedExpenseFilters {
  category?: string;
  /**
   * Keep only fixed expenses active on this date: `start_date <= activeOn` and
   * (`end_date >= activeOn` or `end_date` is null, i.e. still open-ended).
   */
  activeOn?: string;
  limit?: number;
}

/**
 * Fetch fixed expenses for the authenticated user, applying the given filters
 * as Supabase query clauses: `category` equality, `activeOn` active-window
 * check, order by `start_date` descending, and an optional row limit.
 */
export async function fetchFixedExpenses(
  client: SupabaseClient,
  f: FixedExpenseFilters = {},
): Promise<FixedExpense[]> {
  let q = client.from('fixed_expenses').select('*');
  if (f.category) q = q.eq('category', f.category);
  if (f.activeOn) {
    q = q.lte('start_date', f.activeOn);
    q = q.or(`end_date.gte.${f.activeOn},end_date.is.null`);
  }
  q = q.order('start_date', { ascending: false });
  if (f.limit) q = q.limit(f.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as FixedExpense[];
}
