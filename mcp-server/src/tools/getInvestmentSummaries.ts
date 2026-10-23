// MCP tool: get_investment_summaries (read-only).
//
// Returns a per-channel event-sourced summary (balance, invested capital,
// return) for the authenticated user, optionally filtered by channel and
// pension flag. Unlike the list tools this is an AGGREGATE view, so it takes no
// `limit` - the summary always reflects every selected channel.
//
// Requirement notes:
//   - 1.3 / annotations: read-only, so `readOnlyHint: true`.
//   - 12.1 / 12.2: zod filter schema with optional channelId/isPension (no
//     limit field).
//   - 1.2: delegates to the investment service, which composes the channel,
//     deposit, and value-update reads with the shared event-sourcing engine.
//   - 15.5: result is JSON text content; zero matching channels yields a
//     successful empty array, never an error.

import { z } from 'zod';
import type { ToolDescriptor } from './types.js';
import { getInvestmentSummaries } from '../services/investments.js';

const inputSchema = z.object({
  channelId: z.string().optional(),
  isPension: z.boolean().optional(),
});

export const getInvestmentSummariesTool: ToolDescriptor<typeof inputSchema> = {
  name: 'get_investment_summaries',
  description:
    'Summarize the authenticated user\'s investment channels into balance, invested capital, and return, optionally filtered by channel and pension flag.',
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    const summaries = await getInvestmentSummaries(ctx.client, args);

    return {
      content: [{ type: 'text', text: JSON.stringify(summaries, null, 2) }],
    };
  },
};
