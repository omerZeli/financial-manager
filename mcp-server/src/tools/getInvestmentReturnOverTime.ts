// MCP tool: get_investment_return_over_time (read-only).
//
// Returns the authenticated user's portfolio return percentage at each
// month-end checkpoint, optionally filtered by channel and pension flag and
// trimmed to a date range. Unlike the list tools this is an AGGREGATE series,
// so it takes no `limit` - it returns every computed point within the requested
// range.
//
// Requirement notes:
//   - 1.3 / annotations: read-only, so `readOnlyHint: true`.
//   - 12.1 / 12.2 / 12.10: zod filter schema with optional channelId/isPension/
//     dateFrom/dateTo (no limit field); the service returns all points in range.
//   - 12.12: an inverted date range is rejected as an isError result (not a
//     throw) via the shared validateDateRange helper.
//   - 1.2: delegates to the investment service, which composes the channel,
//     deposit, and value-update reads with the shared event-sourcing engine.
//   - 15.5: result is JSON text content; zero matching channels/events yields a
//     successful empty array, never an error.

import { z } from 'zod';
import type { ToolDescriptor } from './types.js';
import { validateDateRange } from './dateRange.js';
import { getReturnOverTime } from '../services/investments.js';

const inputSchema = z.object({
  channelId: z.string().optional(),
  isPension: z.boolean().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const getInvestmentReturnOverTimeTool: ToolDescriptor<typeof inputSchema> = {
  name: 'get_investment_return_over_time',
  description:
    'Compute the authenticated user\'s investment return percentage at each month-end checkpoint, optionally filtered by channel, pension flag, and date range.',
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    const rangeError = validateDateRange(args.dateFrom, args.dateTo);
    if (rangeError) return rangeError;

    const points = await getReturnOverTime(ctx.client, args);

    return {
      content: [{ type: 'text', text: JSON.stringify(points, null, 2) }],
    };
  },
};
