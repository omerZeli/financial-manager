// Data-access layer: regular expenses reader.
//
// Thin, pure translation of a filter object into a Supabase query. There is NO
// business logic here beyond mapping filters to query clauses - aggregation and
// computation live in the service / shared layers.
//
// ============================================================================
// RLS ISOLATION INVARIANT (requirement 12.11)
// ----------------------------------------------------------------------------
// This reader intentionally applies NO `.eq('user_id', ...)` filter. Row-level
// security on the `expenses` table scopes every row to the authenticated user
// via the policy `auth.uid() = user_id`. Because the client passed in here is
// the anon-key, user-authenticated client created in auth/session.ts, the
// database returns only the signed-in user's rows automatically.
//
// NEVER add a `user_id` filter here, and NEVER introduce or reference a
// service-role client in this layer. A service-role client bypasses RLS and
// would break the per-user isolation guarantee. Isolation is enforced by the
// database, not by client-side filtering.
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Expense } from '@financial-manager/shared';

export interface ExpenseFilters {
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  limit?: number;
}

/**
 * Fetch regular expenses for the authenticated user, applying the given filters
 * as Supabase query clauses: `date` range (gte/lte), `category` equality, order
 * by `date` descending, and an optional row limit.
 */
export async function fetchExpenses(
  client: SupabaseClient,
  f: ExpenseFilters = {},
): Promise<Expense[]> {
  let q = client.from('expenses').select('*');
  if (f.dateFrom) q = q.gte('date', f.dateFrom);
  if (f.dateTo) q = q.lte('date', f.dateTo);
  if (f.category) q = q.eq('category', f.category);
  q = q.order('date', { ascending: false });
  if (f.limit) q = q.limit(f.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Expense[];
}
