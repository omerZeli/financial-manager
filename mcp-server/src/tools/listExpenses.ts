// MCP tool: list_expenses (read-only).
//
// Returns the authenticated user's raw regular-expense rows, optionally
// filtered by a date range and category, capped by a row limit. This is the
// plain list tool - it calls the data reader directly (no service composition
// needed) and serializes the rows as pretty-printed JSON text content.
//
// Requirement notes:
//   - 1.3 / annotations: read-only, so `readOnlyHint: true`.
//   - 12.1 / 12.2 / 12.5: zod filter schema with optional dateFrom/dateTo/
//     category and an integer limit bounded to 1..1000.
//   - limit defaults to 100 when omitted (applied in-handler).
//   - 12.12: an inverted date range is rejected as an isError result (not a
//     throw) via the shared validateDateRange helper.
//   - 15.3 / 15.5: results are JSON text content; zero matching rows is a
//     SUCCESS result holding an empty JSON array, never an error.

import { z } from 'zod';
import type { ToolDescriptor } from './types.js';
import { validateDateRange } from './dateRange.js';
import { fetchExpenses } from '../data/expenses.js';

const DEFAULT_LIMIT = 100;

const inputSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().int().min(1).max(1000).optional(),
});

export const listExpensesTool: ToolDescriptor<typeof inputSchema> = {
  name: 'list_expenses',
  description:
    'List the authenticated user\'s regular expense records, optionally filtered by date range and category.',
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    const rangeError = validateDateRange(args.dateFrom, args.dateTo);
    if (rangeError) return rangeError;

    const rows = await fetchExpenses(ctx.client, {
      ...args,
      limit: args.limit ?? DEFAULT_LIMIT,
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }],
    };
  },
};
