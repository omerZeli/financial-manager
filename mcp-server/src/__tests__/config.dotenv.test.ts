import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Unit tests for the dotenv-loading behavior of `loadConfig` (task 7.5).
//
// Validates:
//   - Requirement 10.4: a present `.env` loads values WITHOUT overriding
//     variables already set in the environment; an absent `.env` does not fail.
//   - Requirement 10.7: there are NO hardcoded URL / anon-key / credential
//     defaults - the returned config contains only values provided via env.
//
// Strategy: dotenv is imported by config.ts as `import { config as loadDotenv }
// from 'dotenv'`, so we mock the module. This keeps the test deterministic and
// off the filesystem: the mock lets us (a) assert that `loadConfig()` with no
// env arg invokes dotenv with `override: false` and the resolved `.env` path,
// and (b) faithfully emulate dotenv's `override:false` semantics so we can
// prove pre-set `process.env` values are never clobbered. All values are fake
// placeholders - never real credentials.

const CONFIG_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_USER_EMAIL',
  'FINANCIAL_MANAGER_EMAIL',
  'SUPABASE_USER_PASSWORD',
  'FINANCIAL_MANAGER_PASSWORD',
] as const

// A controllable stand-in for the contents of `mcp-server/.env`. Each test sets
// this to describe what the (mocked) .env file "contains", or leaves it empty
// to simulate an absent file.
let dotenvFileContents: Record<string, string> = {}

// Mock dotenv's `config` with the real `override:false` semantics: only inject
// keys that are not already present in `process.env`. Returns a dotenv-shaped
// result (`parsed` on success, `error` when the file is "absent").
const loadDotenvMock = vi.fn((opts?: { path?: string; override?: boolean }) => {
  const override = opts?.override ?? false
  const keys = Object.keys(dotenvFileContents)
  if (keys.length === 0) {
    // Emulate a missing file: dotenv sets `error` and injects nothing.
    return { error: new Error('ENOENT: no such file') }
  }
  const parsed: Record<string, string> = {}
  for (const [key, value] of Object.entries(dotenvFileContents)) {
    parsed[key] = value
    if (override || process.env[key] === undefined) {
      process.env[key] = value
    }
  }
  return { parsed }
})

vi.mock('dotenv', () => ({
  config: loadDotenvMock,
}))

// Import after the mock is registered so config.ts binds to the mocked module.
const { loadConfig } = await import('../config')

// Snapshot and restore process.env around every test so nothing leaks.
let savedEnv: Record<string, string | undefined>

beforeEach(() => {
  savedEnv = {}
  for (const key of CONFIG_KEYS) {
    savedEnv[key] = process.env[key]
    delete process.env[key]
  }
  dotenvFileContents = {}
  loadDotenvMock.mockClear()
})

afterEach(() => {
  for (const key of CONFIG_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key]
    else process.env[key] = savedEnv[key]
  }
})

describe('loadConfig dotenv behavior', () => {
  it('loads .env values without overriding already-set env (10.4)', () => {
    // Pre-set env values that should WIN over the .env file contents.
    process.env.SUPABASE_URL = 'https://preset.example.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'preset-anon-key'
    process.env.SUPABASE_USER_EMAIL = 'preset@example.com'
    process.env.SUPABASE_USER_PASSWORD = 'preset-password'

    // The .env file "contains" conflicting values plus one value not preset.
    dotenvFileContents = {
      SUPABASE_URL: 'https://dotenv.example.supabase.co',
      SUPABASE_ANON_KEY: 'dotenv-anon-key',
      SUPABASE_USER_EMAIL: 'dotenv@example.com',
      SUPABASE_USER_PASSWORD: 'dotenv-password',
    }

    const config = loadConfig()

    // dotenv was invoked exactly once with override:false and the resolved
    // `.env` path (one directory above the module).
    expect(loadDotenvMock).toHaveBeenCalledTimes(1)
    const callArg = loadDotenvMock.mock.calls[0]?.[0]
    expect(callArg?.override).toBe(false)
    expect(callArg?.path).toMatch(/[\\/]\.env$/)

    // Pre-set values win; the .env values do NOT override them.
    expect(config.supabaseUrl).toBe('https://preset.example.supabase.co')
    expect(config.supabaseAnonKey).toBe('preset-anon-key')
    expect(config.userEmail).toBe('preset@example.com')
    expect(config.userPassword).toBe('preset-password')
  })

  it('loads .env values for variables not already set (10.4)', () => {
    // Nothing preset: the .env file is the only source.
    dotenvFileContents = {
      SUPABASE_URL: 'https://dotenv.example.supabase.co',
      SUPABASE_ANON_KEY: 'dotenv-anon-key',
      SUPABASE_USER_EMAIL: 'dotenv@example.com',
      SUPABASE_USER_PASSWORD: 'dotenv-password',
    }

    const config = loadConfig()

    expect(config).toEqual({
      supabaseUrl: 'https://dotenv.example.supabase.co',
      supabaseAnonKey: 'dotenv-anon-key',
      userEmail: 'dotenv@example.com',
      userPassword: 'dotenv-password',
    })
  })

  it('does not fail when .env is absent but env is complete (10.4)', () => {
    // Absent .env (empty contents -> mock returns { error }).
    dotenvFileContents = {}
    process.env.SUPABASE_URL = 'https://env.example.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'env-anon-key'
    process.env.SUPABASE_USER_EMAIL = 'env@example.com'
    process.env.SUPABASE_USER_PASSWORD = 'env-password'

    let config: ReturnType<typeof loadConfig> | undefined
    expect(() => {
      config = loadConfig()
    }).not.toThrow()

    expect(loadDotenvMock).toHaveBeenCalledTimes(1)
    expect(config).toEqual({
      supabaseUrl: 'https://env.example.supabase.co',
      supabaseAnonKey: 'env-anon-key',
      userEmail: 'env@example.com',
      userPassword: 'env-password',
    })
  })

  it('does not consult dotenv when an explicit env arg is passed', () => {
    // When env is injected, dotenv must NOT be loaded (filesystem untouched).
    const config = loadConfig({
      SUPABASE_URL: 'https://arg.example.supabase.co',
      SUPABASE_ANON_KEY: 'arg-anon-key',
      SUPABASE_USER_EMAIL: 'arg@example.com',
      SUPABASE_USER_PASSWORD: 'arg-password',
    })

    expect(loadDotenvMock).not.toHaveBeenCalled()
    expect(config).toEqual({
      supabaseUrl: 'https://arg.example.supabase.co',
      supabaseAnonKey: 'arg-anon-key',
      userEmail: 'arg@example.com',
      userPassword: 'arg-password',
    })
  })
})

describe('loadConfig has no hardcoded defaults (10.7)', () => {
  it('throws on a fully empty env rather than returning any default', () => {
    // No defaults may rescue a completely empty environment.
    expect(() => loadConfig({})).toThrow()
    expect(loadDotenvMock).not.toHaveBeenCalled()
  })

  it('throws naming the accepted variable(s) for each missing value', () => {
    // Each required value, when the sole one missing, must throw - proving no
    // built-in default fills the gap.
    const complete = {
      SUPABASE_URL: 'https://x.example.supabase.co',
      SUPABASE_ANON_KEY: 'anon',
      SUPABASE_USER_EMAIL: 'user@example.com',
      SUPABASE_USER_PASSWORD: 'pw',
    }

    expect(() => loadConfig({ ...complete, SUPABASE_URL: undefined })).toThrow(
      /SUPABASE_URL/,
    )
    expect(() =>
      loadConfig({ ...complete, SUPABASE_ANON_KEY: undefined }),
    ).toThrow(/SUPABASE_ANON_KEY/)
    expect(() =>
      loadConfig({ ...complete, SUPABASE_USER_EMAIL: undefined }),
    ).toThrow(/SUPABASE_USER_EMAIL|FINANCIAL_MANAGER_EMAIL/)
    expect(() =>
      loadConfig({ ...complete, SUPABASE_USER_PASSWORD: undefined }),
    ).toThrow(/SUPABASE_USER_PASSWORD|FINANCIAL_MANAGER_PASSWORD/)
  })

  it('returns exactly the provided values with no injected defaults', () => {
    // The returned config fields equal the inputs exactly - nothing extra, no
    // default URL / anon-key / credential is ever substituted.
    const input = {
      SUPABASE_URL: 'https://only.example.supabase.co',
      SUPABASE_ANON_KEY: 'only-anon',
      SUPABASE_USER_EMAIL: 'only@example.com',
      SUPABASE_USER_PASSWORD: 'only-pw',
    }

    const config = loadConfig(input)

    expect(config).toEqual({
      supabaseUrl: input.SUPABASE_URL,
      supabaseAnonKey: input.SUPABASE_ANON_KEY,
      userEmail: input.SUPABASE_USER_EMAIL,
      userPassword: input.SUPABASE_USER_PASSWORD,
    })
    // No stray keys beyond the four documented config fields.
    expect(Object.keys(config).sort()).toEqual(
      ['supabaseAnonKey', 'supabaseUrl', 'userEmail', 'userPassword'].sort(),
    )
  })
})
