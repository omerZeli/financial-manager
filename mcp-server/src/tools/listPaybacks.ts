// MCP tool: list_paybacks (read-only).
//
// Returns the authenticated user's raw payback rows, optionally filtered by
// direction (by_me / to_me), person, and a date range, capped by a row limit.
// This is the plain list tool - it calls the data reader directly (no service
// composition needed) and serializes the rows as pretty-printed JSON text
// content.
//
// Requirement notes:
//   - 1.3 / annotations: read-only, so `readOnlyHint: true`.
//   - 12.1 / 12.2 / 12.7: zod filter schema with optional direction (enum
//     by_me/to_me), person, dateFrom/dateTo, and an integer limit bounded to
//     1..1000.
//   - limit defaults to 100 when omitted (applied in-handler).
//   - 12.12: an inverted date range is rejected as an isError result (not a
//     throw) via the shared validateDateRange helper.
//   - 15.3 / 15.5: results are JSON text content; zero matching rows is a
//     SUCCESS result holding an empty JSON array, never an error.

import { z } from 'zod';
import type { ToolDescriptor } from './types.js';
import { validateDateRange } from './dateRange.js';
import { fetchPaybacks } from '../data/paybacks.js';

const DEFAULT_LIMIT = 100;

const inputSchema = z.object({
  direction: z.enum(['by_me', 'to_me']).optional(),
  person: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.number().int().min(1).max(1000).optional(),
});

export const listPaybacksTool: ToolDescriptor<typeof inputSchema> = {
  name: 'list_paybacks',
  description:
    'List the authenticated user\'s payback records, optionally filtered by direction, person, and date range.',
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    const rangeError = validateDateRange(args.dateFrom, args.dateTo);
    if (rangeError) return rangeError;

    const rows = await fetchPaybacks(ctx.client, {
      ...args,
      limit: args.limit ?? DEFAULT_LIMIT,
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }],
    };
  },
};
