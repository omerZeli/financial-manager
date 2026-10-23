// Data-access layer: salaries reader.
//
// This module establishes the data-access layer pattern for the MCP server.
// Each reader is a thin, pure translation of a filter object into a Supabase
// query. There is NO business logic here beyond mapping filters to query
// clauses - aggregation and computation live in the service / shared layers.
//
// ============================================================================
// RLS ISOLATION INVARIANT (requirement 12.11)
// ----------------------------------------------------------------------------
// This reader intentionally applies NO `.eq('user_id', ...)` filter. Row-level
// security on the `salaries` table scopes every row to the authenticated user
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
import type { Salary } from '@financial-manager/shared';

export interface SalaryFilters {
  dateFrom?: string;
  dateTo?: string;
  employer?: string;
  limit?: number;
}

/**
 * Fetch salaries for the authenticated user, applying the given filters as
 * Supabase query clauses: `month` range (gte/lte), `employer` equality, order
 * by `month` descending, and an optional row limit.
 */
export async function fetchSalaries(
  client: SupabaseClient,
  f: SalaryFilters = {},
): Promise<Salary[]> {
  let q = client.from('salaries').select('*');
  if (f.dateFrom) q = q.gte('month', f.dateFrom);
  if (f.dateTo) q = q.lte('month', f.dateTo);
  if (f.employer) q = q.eq('employer', f.employer);
  q = q.order('month', { ascending: false });
  if (f.limit) q = q.limit(f.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Salary[];
}
