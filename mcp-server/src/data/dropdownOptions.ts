// Data-access layer: dropdown options reader.
//
// Thin, pure translation of a filter object into a Supabase query. There is NO
// business logic here beyond mapping filters to query clauses.
//
// ============================================================================
// RLS ISOLATION INVARIANT (requirement 12.11)
// ----------------------------------------------------------------------------
// This reader intentionally applies NO `.eq('user_id', ...)` filter. Row-level
// security on the `user_dropdown_options` table scopes every row to the
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
import type { DropdownOption } from '@financial-manager/shared';

export interface DropdownOptionFilters {
  category?: string;
}

/**
 * Fetch user-managed dropdown options for the authenticated user, applying the
 * given filters as Supabase query clauses: `category` equality, order by
 * `value` ascending.
 */
export async function fetchDropdownOptions(
  client: SupabaseClient,
  f: DropdownOptionFilters = {},
): Promise<DropdownOption[]> {
  let q = client.from('user_dropdown_options').select('*');
  if (f.category) q = q.eq('category', f.category);
  q = q.order('value', { ascending: true });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DropdownOption[];
}
