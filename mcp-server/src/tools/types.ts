// Tool descriptor contract shared by every MCP tool module.
//
// A ToolDescriptor is a self-contained, declarative definition of one MCP
// tool: its name, human-readable description, zod input schema, MCP
// annotations, and an async handler. `index.ts` iterates the registry
// (tools/registry.ts) and registers each descriptor with the SDK exactly
// once at boot.
//
// Security / design invariants:
//   - Both `client` and `server` on ToolContext are NON-NULL. The handler
//     always receives the authenticated, RLS-scoped Supabase client and the
//     live McpServer instance (requirements 13.1-13.4).
//   - v1 ships read-only tools, so every descriptor sets
//     `annotations.readOnlyHint: true`. `destructiveHint` exists for future
//     write tools only.
//   - `server` is carried now so future write tools can call elicitation
//     (ctx.server.elicitInput) without any refactor.

import type { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Everything a tool handler needs to do its work. Both fields are non-null:
 * the handler is only ever invoked after a successful auth session exists.
 */
export interface ToolContext {
  /** The authenticated, RLS-scoped Supabase client (anon key, user session). */
  client: SupabaseClient;
  /** The live MCP server; present now so future write tools can elicit input. */
  server: McpServer;
}

/**
 * The MCP tool result shape. `content` is a list of text blocks; `isError`
 * flags a handled, tool-level error (as opposed to a thrown exception).
 */
export type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

/**
 * A declarative definition of one MCP tool. The generic `I` binds the zod
 * input schema to the handler's parsed-args type.
 *
 * `inputSchema` is constrained to a zod OBJECT schema (not any zod type) so
 * that the SDK registration in `index.ts` can hand its `.shape` (a
 * `ZodRawShape`) straight to `server.registerTool`, which expects a raw shape
 * rather than a wrapped object. Every tool's input is a named-field object,
 * so this is the natural bound.
 */
export interface ToolDescriptor<
  I extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> {
  name: string;
  description: string;
  inputSchema: I;
  annotations: {
    readOnlyHint: boolean;
    destructiveHint?: boolean;
  };
  handler: (args: z.infer<I>, ctx: ToolContext) => Promise<ToolResult>;
}
