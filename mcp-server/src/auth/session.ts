// Auth session: owns the authenticated, RLS-scoped Supabase client.
//
// Security invariants (requirements 9.1-9.9, 15.2):
//   - The client is created with the ANON KEY ONLY. The service-role key is
//     never used or referenced here, so all reads stay subject to RLS and are
//     scoped to the signed-in user (9.1, 9.8).
//   - signInWithPassword is called exactly once on boot (9.2).
//   - The session lives in memory only. persistSession is disabled so no
//     tokens are written to disk (9.5); autoRefreshToken keeps the in-memory
//     session alive transparently via supabase-js (9.6, 9.7).
//   - Credentials, access tokens, and refresh tokens are never included in
//     thrown error messages or logs (9.3, 9.4, 9.9, 15.2).

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Config } from '../config.js';

export interface Session {
  /** The authenticated, RLS-scoped Supabase client (anon key, user session). */
  getClient(): SupabaseClient;
}

/**
 * Create an authenticated session by signing in once with the configured
 * user credentials. The returned session exposes the authenticated client.
 *
 * Throws a credential-free error if credentials are missing or auth fails.
 */
export async function createSession(config: Config): Promise<Session> {
  // Defensive guard: config.ts fail-fasts on absent values, but we re-check
  // here so this module never attempts a sign-in without credentials.
  // The message intentionally omits the credential values (9.3).
  if (!config.userEmail || !config.userPassword) {
    throw new Error('Authentication credentials are not configured.');
  }

  // Anon key only - never the service-role key (9.1, 9.8).
  const client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      // Keep the session in memory only; do not write tokens to disk (9.5).
      persistSession: false,
      // Rely on supabase-js to transparently refresh the token (9.6, 9.7).
      autoRefreshToken: true,
    },
  });

  const { error } = await client.auth.signInWithPassword({
    email: config.userEmail,
    password: config.userPassword,
  });

  if (error) {
    // Log to stderr only, and never include credentials or tokens (9.4, 9.9, 15.2).
    console.error('MCP server authentication failed.');
    throw new Error('Authentication failed.');
  }

  // Hold the authenticated session in memory and expose the same client
  // instance used to sign in. Auto-refresh keeps it valid transparently.
  return {
    getClient: () => client,
  };
}
