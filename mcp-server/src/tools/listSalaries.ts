// MCP tool: list_salaries (read-only).
//
// Returns the authenticated user's raw salary rows, optionally filtered by a
// month range and employer, capped by a row limit. This is the plain list
// tool - it calls the data reader directly (no service composition needed) and
// serializes the rows as pretty-printed JSON text content.
//
// Requirement notes:
//   - 1.4 / annotations: read-only, so `readOnlyHint: true`.
//   - 12.1 / 12.2 / 12.4: zod filter schema with optional dateFrom/dateTo/
//     employer and an integer limit bounded to 1..1000.
//   - 15.6: when `limit` is omitted it DEFAULTS to 100 (applied in-handler).
//   - 12.12: an inverted date range is rejected as an isError result (not a
//     throw) via the shared validateDateRange helper.
//   - 15.4 / 15.5: results are JSON text content; zero matching rows is a
//     SUCCESS result holding an empty JSON array, never an error.

import { z } from 'zod';
import type { ToolDescriptor } from './types.js';
import { validateDateRange } from './dateRange.js';
import { fetchSalaries } from '../data/salaries.js';

const DEFAULT_LIMIT = 100;

const inputSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  employer: z.string().optional(),
  limit: z.number().int().min(1).max(1000).optional(),
});

export const listSalariesTool: ToolDescriptor<typeof inputSchema> = {
  name: 'list_salaries',
  description:
    'List the authenticated user\'s salary records, optionally filtered by month range and employer.',
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    const rangeError = validateDateRange(args.dateFrom, args.dateTo);
    if (rangeError) return rangeError;

    const rows = await fetchSalaries(ctx.client, {
      ...args,
      limit: args.limit ?? DEFAULT_LIMIT,
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }],
    };
  },
};
