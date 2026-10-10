// Entry point for the Financial Manager MCP server.
//
// Boot algorithm (requirements 1.1, 1.3, 1.5, 13.x, 14.x):
//   1. loadConfig()        - resolve + validate config; throw => stderr + exit 1
//   2. createSession()     - sign in once (anon key, RLS-scoped); throw => stderr + exit 1
//   3. new McpServer(...)  - construct the server
//   4. build ToolContext   - { client, server }, both non-null
//   5. register every tool - iterate toolRegistry EXACTLY ONCE
//   6. connect stdio        - server.connect(new StdioServerTransport())
//   7. log readiness        - STDERR ONLY
//
// STDOUT DISCIPLINE (14.1, 14.2, 14.3): stdout is reserved exclusively for MCP
// protocol frames carried by the stdio transport. Nothing in boot writes to
// stdout - every diagnostic goes to stderr via console.error. There is no
// console.log anywhere in this module.

import { pathToFileURL } from 'node:url';
import { loadConfig } from './config.js';
import { createSession } from './auth/session.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { toolRegistry } from './tools/registry.js';
import type { ToolContext } from './tools/types.js';

export async function main(): Promise<void> {
  // 1. Config - fail fast with a credential-free message on stderr, exit 1.
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  // 2. Auth session - sign in once. On failure, log to stderr and exit 1.
  //    session.ts guarantees no credentials/tokens leak into the message.
  let session;
  try {
    session = await createSession(config);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  // 3. Construct the MCP server.
  const server = new McpServer({ name: 'financial-manager', version: '1.0.0' });

  // 4. Build the tool context. Both fields are non-null (13.1-13.4).
  const ctx: ToolContext = { client: session.getClient(), server };

  // 5. Register every tool exactly once. The registry is the single source of
  //    truth. The SDK's registerTool expects inputSchema as a ZodRawShape, so
  //    we pass the descriptor's zod object `.shape`.
  //
  //    The registry is `ToolDescriptor<any>[]` (it holds descriptors with
  //    differing concrete zod schemas; see tools/registry.ts), so each
  //    `tool.handler` is typed with an `any` first argument. We annotate the
  //    callback's `args` explicitly to satisfy strict mode's no-implicit-any;
  //    the SDK parses/validates args against the schema before this callback
  //    runs, and the handler re-narrows them, so this annotation is type-only.
  for (const tool of toolRegistry) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema.shape,
        annotations: tool.annotations,
      },
      (args: Record<string, unknown>) => tool.handler(args, ctx),
    );
  }

  // 6. Connect over stdio - stdout now belongs to the MCP protocol.
  await server.connect(new StdioServerTransport());

  // 7. Readiness - STDERR ONLY (never stdout).
  console.error('financial-manager MCP server ready');
}

// Auto-run guard: boot only when this module is executed as the entrypoint
// (e.g. `node dist/index.js`), NOT when it is imported (e.g. by tests). This
// keeps the runtime behavior identical - running the built file still boots -
// while letting tests import `main` without triggering a real boot.
//
// ESM has no `require.main === module`; the equivalent is comparing this
// module's URL against the URL of the invoked script (process.argv[1]).
const isDirectRun =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1] as string).href;

if (isDirectRun) {
  // Any boot/transport failure that escapes main() exits non-zero (1.5, 13.5).
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
