// Data-access layer: investment value updates reader.
//
// Thin, pure translation of a filter object into a Supabase query. There is NO
// business logic here beyond mapping filters to query clauses - checkpoint
// replay logic lives in the service / shared layers.
//
// ============================================================================
// RLS ISOLATION INVARIANT (requirement 12.11)
// ----------------------------------------------------------------------------
// This reader intentionally applies NO `.eq('user_id', ...)` filter. Row-level
// security on the `investment_value_updates` table scopes every row to the
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
import type { InvestmentValueUpdate } from '@financial-manager/shared';

export interface ValueUpdateFilters {
  channelId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

/**
 * Fetch investment value updates for the authenticated user, applying the given
 * filters as Supabase query clauses: `channel_id` equality, `date` range
 * (gte/lte), order by `date` descending, and an optional row limit.
 */
export async function fetchValueUpdates(
  client: SupabaseClient,
  f: ValueUpdateFilters = {},
): Promise<InvestmentValueUpdate[]> {
  let q = client.from('investment_value_updates').select('*');
  if (f.channelId) q = q.eq('channel_id', f.channelId);
  if (f.dateFrom) q = q.gte('date', f.dateFrom);
  if (f.dateTo) q = q.lte('date', f.dateTo);
  q = q.order('date', { ascending: false });
  if (f.limit) q = q.limit(f.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as InvestmentValueUpdate[];
}
