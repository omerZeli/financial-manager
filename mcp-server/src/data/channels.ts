// Data-access layer: investment channels reader.
//
// Thin, pure translation of a filter object into a Supabase query. There is NO
// business logic here beyond mapping filters to query clauses - event-sourcing
// summaries live in the service / shared layers.
//
// ============================================================================
// RLS ISOLATION INVARIANT (requirement 12.11)
// ----------------------------------------------------------------------------
// This reader intentionally applies NO `.eq('user_id', ...)` filter. Row-level
// security on the `investment_channels` table scopes every row to the
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
import type { InvestmentChannel } from '@financial-manager/shared';

export interface ChannelFilters {
  company?: string;
  isPension?: boolean;
  limit?: number;
}

/**
 * Fetch investment channels for the authenticated user, applying the given
 * filters as Supabase query clauses: `company` equality, `is_pension` equality,
 * order by `name` ascending, and an optional row limit.
 */
export async function fetchChannels(
  client: SupabaseClient,
  f: ChannelFilters = {},
): Promise<InvestmentChannel[]> {
  let q = client.from('investment_channels').select('*');
  if (f.company) q = q.eq('company', f.company);
  if (f.isPension !== undefined) q = q.eq('is_pension', f.isPension);
  q = q.order('name', { ascending: true });
  if (f.limit) q = q.limit(f.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as InvestmentChannel[];
}
