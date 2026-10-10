// esbuild bundler for the Financial Manager MCP server.
//
// Produces a single, standalone file at dist/index.js that contains:
//   - the server source (src/index.ts and its local modules)
//   - every external dependency (MCP SDK, Supabase, dotenv, zod)
//   - the local @financial-manager/shared workspace, resolved from its
//     TypeScript source via the "source" export condition
//
// End-users can run `node dist/index.js` with no `npm install` and without
// the rest of the monorepo. Nothing is marked external.
//
// Output format is ESM because src/index.ts relies on `import.meta.url` to
// detect direct execution, which has no clean CommonJS equivalent.

import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: 'dist/index.js',
  // Resolve @financial-manager/shared to its ./src/index.ts via its "source"
  // export condition, so the bundle does not depend on shared/dist.
  conditions: ['source'],
  // Nothing external: everything resolves into the bundle.
  external: [],
  // Keep readable output; flip to true for a smaller distributable.
  minify: false,
  sourcemap: false,
  banner: {
    // ESM output: recreate CJS globals some deps expect at runtime.
    js: "import { createRequire as __createRequire } from 'node:module';\nconst require = __createRequire(import.meta.url);",
  },
});
