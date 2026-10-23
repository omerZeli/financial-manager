import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { loadConfig } from '../config';

// Property 7: Config aliases + fail-fast
// Validates: Requirements 10.2, 10.3, 10.6, 10.5
//
// `loadConfig(env)` resolves four required values from an injectable env
// object. When `env` is provided it is the single source of truth and the
// filesystem/dotenv is never touched, so every scenario below uses PLACEHOLDER
// values only - there are no real credentials anywhere in this file.
//
// Resolution rules under test:
//   - email:    SUPABASE_USER_EMAIL  with fallback alias FINANCIAL_MANAGER_EMAIL
//   - password: SUPABASE_USER_PASSWORD with fallback alias FINANCIAL_MANAGER_PASSWORD
//   - url:      SUPABASE_URL
//   - anon key: SUPABASE_ANON_KEY
//   - unset / empty-string / whitespace-only are all treated as ABSENT
//   - a missing required value throws naming ALL accepted names for that value

// Accepted env variable name(s) for each resolved config value.
const EMAIL_NAMES = ['SUPABASE_USER_EMAIL', 'FINANCIAL_MANAGER_EMAIL'] as const;
const PASSWORD_NAMES = ['SUPABASE_USER_PASSWORD', 'FINANCIAL_MANAGER_PASSWORD'] as const;
const URL_NAMES = ['SUPABASE_URL'] as const;
const ANON_NAMES = ['SUPABASE_ANON_KEY'] as const;

/**
 * A non-empty "present" value: at least one non-whitespace character so it is
 * never accidentally treated as absent. These are opaque placeholders, not
 * credentials.
 */
const presentArb = fc
  .string({ minLength: 1, maxLength: 24 })
  .map((s) => `v_${s}`);

/** Values that MUST be treated as absent: unset, empty, or whitespace-only. */
const whitespaceArb = fc
  .array(fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v'), {
    minLength: 1,
    maxLength: 6,
  })
  .map((parts) => parts.join(''));

const absentArb = fc.oneof(
  fc.constant(undefined), // unset
  fc.constant(''), // empty string
  whitespaceArb, // whitespace-only
);

/** Build a complete, valid env from four placeholder values. */
function fullEnv(
  email: string,
  password: string,
  url: string,
  anon: string,
): NodeJS.ProcessEnv {
  return {
    SUPABASE_USER_EMAIL: email,
    SUPABASE_USER_PASSWORD: password,
    SUPABASE_URL: url,
    SUPABASE_ANON_KEY: anon,
  };
}

describe('Property 7: config aliases + fail-fast (Requirements 10.2, 10.3, 10.5, 10.6)', () => {
  it('both set: primary name is preferred over the alias for email and password (10.2, 10.3)', () => {
    fc.assert(
      fc.property(
        presentArb, // primary email
        presentArb, // alias email
        presentArb, // primary password
        presentArb, // alias password
        presentArb, // url
        presentArb, // anon key
        (primaryEmail, aliasEmail, primaryPwd, aliasPwd, url, anon) => {
          const env: NodeJS.ProcessEnv = {
            SUPABASE_USER_EMAIL: primaryEmail,
            FINANCIAL_MANAGER_EMAIL: aliasEmail,
            SUPABASE_USER_PASSWORD: primaryPwd,
            FINANCIAL_MANAGER_PASSWORD: aliasPwd,
            SUPABASE_URL: url,
            SUPABASE_ANON_KEY: anon,
          };

          const config = loadConfig(env);

          // Primary wins over the alias (values are trimmed).
          expect(config.userEmail).toBe(primaryEmail.trim());
          expect(config.userPassword).toBe(primaryPwd.trim());
          expect(config.supabaseUrl).toBe(url.trim());
          expect(config.supabaseAnonKey).toBe(anon.trim());
        },
      ),
      { numRuns: 300 },
    );
  });

  it('primary absent: the alias value is used for email and password (10.2, 10.3)', () => {
    fc.assert(
      fc.property(
        absentArb, // primary email absent
        presentArb, // alias email present
        absentArb, // primary password absent
        presentArb, // alias password present
        presentArb, // url
        presentArb, // anon key
        (absentEmail, aliasEmail, absentPwd, aliasPwd, url, anon) => {
          const env: NodeJS.ProcessEnv = {
            FINANCIAL_MANAGER_EMAIL: aliasEmail,
            FINANCIAL_MANAGER_PASSWORD: aliasPwd,
            SUPABASE_URL: url,
            SUPABASE_ANON_KEY: anon,
          };
          // Only assign the primary names when the generated value is defined,
          // so `undefined` genuinely models an UNSET variable.
          if (absentEmail !== undefined) env.SUPABASE_USER_EMAIL = absentEmail;
          if (absentPwd !== undefined) env.SUPABASE_USER_PASSWORD = absentPwd;

          const config = loadConfig(env);

          expect(config.userEmail).toBe(aliasEmail.trim());
          expect(config.userPassword).toBe(aliasPwd.trim());
        },
      ),
      { numRuns: 300 },
    );
  });

  it('each missing required value throws naming all accepted names for that value (10.6)', () => {
    // Which config value to omit, and the accepted names that MUST appear in
    // the thrown message for that value.
    const missingTargetArb = fc.constantFrom(
      { kind: 'email' as const, names: EMAIL_NAMES },
      { kind: 'password' as const, names: PASSWORD_NAMES },
      { kind: 'url' as const, names: URL_NAMES },
      { kind: 'anon' as const, names: ANON_NAMES },
    );

    fc.assert(
      fc.property(
        missingTargetArb,
        presentArb,
        presentArb,
        presentArb,
        presentArb,
        (target, email, password, url, anon) => {
          const env = fullEnv(email, password, url, anon);

          // Remove every accepted name for the targeted value so it is absent
          // through all of its aliases.
          for (const name of target.names) delete env[name];

          let thrown: unknown;
          try {
            loadConfig(env);
          } catch (err) {
            thrown = err;
          }

          expect(thrown).toBeInstanceOf(Error);
          const message = (thrown as Error).message;

          // The message names every accepted variable for the missing value...
          for (const name of target.names) {
            expect(message).toContain(name);
          }
          // ...and never leaks any of the present placeholder values.
          for (const value of [email, password, url, anon]) {
            expect(message).not.toContain(value);
          }
        },
      ),
      { numRuns: 300 },
    );
  });

  it('whitespace-only is treated as absent: falls back to alias, else throws (10.5)', () => {
    // Email primary is whitespace-only. With a present alias -> alias is used.
    // Without an alias -> throws naming both accepted email names.
    fc.assert(
      fc.property(
        whitespaceArb, // whitespace-only primary email (absent)
        fc.option(presentArb, { nil: undefined }), // alias email: present or unset
        presentArb, // password
        presentArb, // url
        presentArb, // anon key
        (wsEmail, aliasEmail, password, url, anon) => {
          const env: NodeJS.ProcessEnv = {
            SUPABASE_USER_EMAIL: wsEmail,
            SUPABASE_USER_PASSWORD: password,
            SUPABASE_URL: url,
            SUPABASE_ANON_KEY: anon,
          };
          if (aliasEmail !== undefined) env.FINANCIAL_MANAGER_EMAIL = aliasEmail;

          if (aliasEmail !== undefined) {
            // Whitespace primary ignored, alias used.
            const config = loadConfig(env);
            expect(config.userEmail).toBe(aliasEmail.trim());
          } else {
            // No usable email anywhere -> throws naming both accepted names.
            let thrown: unknown;
            try {
              loadConfig(env);
            } catch (err) {
              thrown = err;
            }
            expect(thrown).toBeInstanceOf(Error);
            const message = (thrown as Error).message;
            for (const name of EMAIL_NAMES) expect(message).toContain(name);
          }
        },
      ),
      { numRuns: 300 },
    );
  });
});
