// Config resolution and fail-fast validation for the MCP server.
//
// Reads the four required config values from the environment, with alias
// support for the credential variables. Values may be injected directly as
// process environment variables (e.g. by an MCP client config) or placed in a
// git-ignored `mcp-server/.env` loaded via dotenv.
//
// Security: this repo is public. There are NO hardcoded URL / anon-key /
// credential defaults, and no config value (secret or otherwise) is ever
// included in an error message or logged.

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

export interface Config {
  supabaseUrl: string;
  supabaseAnonKey: string;
  userEmail: string;
  userPassword: string;
}

/**
 * Resolve the first accepted env variable whose value is present (non-empty
 * after trimming). Unset, empty-string, and whitespace-only values are all
 * treated as ABSENT. When no accepted name holds a value, throws an error that
 * names every accepted variable - never the value itself.
 */
function requireValue(env: NodeJS.ProcessEnv, names: readonly string[]): string {
  for (const name of names) {
    const raw = env[name];
    if (raw !== undefined) {
      const trimmed = raw.trim();
      if (trimmed !== '') return trimmed;
    }
  }
  throw new Error(`Missing required config. Set one of: ${names.join(' or ')}`);
}

/**
 * Load the git-ignored `mcp-server/.env` into process.env without overriding
 * variables already present in the environment. Missing `.env` is non-fatal.
 * dotenv does not override existing variables by default; we keep that
 * behavior explicit via `override: false`.
 */
function loadDotenvIfPresent(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  // Source files live in `mcp-server/src`; the compiled output lives in
  // `mcp-server/dist`. Either way the `.env` sits one directory up.
  const envPath = resolve(here, '..', '.env');
  // dotenv silently ignores a missing file (result.error is set but no throw).
  // quiet: true suppresses dotenv v17's startup banner, which it writes to
  // STDOUT - that would corrupt the MCP JSON-RPC stream (stdout purity, 14.x).
  loadDotenv({ path: envPath, override: false, quiet: true });
}

/**
 * Resolve and validate the four required config values.
 *
 * @param env Optional environment source. When provided (e.g. in tests), it is
 *   treated as the source of truth and dotenv is NOT loaded, so tests never
 *   touch the filesystem. When omitted, the git-ignored `.env` is loaded into
 *   `process.env` (without overriding existing values) and `process.env` is
 *   used as the source.
 * @throws Error naming the accepted variable name(s) when a required value is
 *   absent. No config value is ever included in the message.
 */
export function loadConfig(env?: NodeJS.ProcessEnv): Config {
  const source = env ?? (loadDotenvIfPresent(), process.env);

  const supabaseUrl = requireValue(source, ['SUPABASE_URL']);
  const supabaseAnonKey = requireValue(source, ['SUPABASE_ANON_KEY']);
  const userEmail = requireValue(source, ['SUPABASE_USER_EMAIL', 'FINANCIAL_MANAGER_EMAIL']);
  const userPassword = requireValue(source, ['SUPABASE_USER_PASSWORD', 'FINANCIAL_MANAGER_PASSWORD']);

  return { supabaseUrl, supabaseAnonKey, userEmail, userPassword };
}
