// MCP tool: list_investment_channels (read-only).
//
// Returns the authenticated user's raw investment-channel rows, optionally
// filtered by company and pension flag, capped by a row limit. This is the
// plain list tool - it calls the data reader directly (no service composition
// needed) and serializes the rows as pretty-printed JSON text content.
//
// Requirement notes:
//   - 1.3 / annotations: read-only, so `readOnlyHint: true`.
//   - 12.1 / 12.2 / 12.8: zod filter schema with optional company/isPension and
//     an integer limit bounded to 1..1000.
//   - 15.5 / 15.6: when `limit` is omitted it DEFAULTS to 100 (applied
//     in-handler); zero matching rows is a SUCCESS result holding an empty JSON
//     array, never an error.

import { z } from 'zod';
import type { ToolDescriptor } from './types.js';
import { fetchChannels } from '../data/channels.js';

const DEFAULT_LIMIT = 100;

const inputSchema = z.object({
  company: z.string().optional(),
  isPension: z.boolean().optional(),
  limit: z.number().int().min(1).max(1000).optional(),
});

export const listInvestmentChannelsTool: ToolDescriptor<typeof inputSchema> = {
  name: 'list_investment_channels',
  description:
    'List the authenticated user\'s investment channels, optionally filtered by company and pension flag.',
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    const rows = await fetchChannels(ctx.client, {
      ...args,
      limit: args.limit ?? DEFAULT_LIMIT,
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }],
    };
  },
};
