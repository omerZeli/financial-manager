// MCP tool: list_all_expenses (read-only).
//
// Returns the authenticated user's merged "all expenses" view: real regular
// expenses + inflated fixed-expense rows + by_me payback rows, with all
// three-direction payback reductions applied. Optionally filtered by a date
// range and category, capped by a row limit.
//
// Unlike list_expenses this is a COMPOSED view, so it delegates to the
// `getAllExpenses` service (which fetches the four underlying entities and runs
// the shared inflation + merge + payback-reduction pipeline) rather than
// calling a single data reader.
//
// Requirement notes:
//   - 1.3 / annotations: read-only, so `readOnlyHint: true`.
//   - 12.1 / 12.2: zod filter schema with optional dateFrom/dateTo/category and
//     an integer limit bounded to 1..1000.
//   - limit defaults to 100 when omitted (applied in-handler).
//   - 12.12: an inverted date range is rejected as an isError result (not a
//     throw) via the shared validateDateRange helper.
//   - 1.2 / 15.3 / 15.5: delegates to the service; results are JSON text
//     content; zero matching rows is a SUCCESS result holding an empty JSON
//     array, never an error.

import { z } from 'zod';
import type { ToolDescriptor } from './types.js';
import { validateDateRange } from './dateRange.js';
import { getAllExpenses } from '../services/expenses.js';

const DEFAULT_LIMIT = 100;

const inputSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().int().min(1).max(1000).optional(),
});

export const listAllExpensesTool: ToolDescriptor<typeof inputSchema> = {
  name: 'list_all_expenses',
  description:
    'List the authenticated user\'s merged all-expenses view (regular + inflated fixed + by_me paybacks, with payback reductions applied), optionally filtered by date range and category.',
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    const rangeError = validateDateRange(args.dateFrom, args.dateTo);
    if (rangeError) return rangeError;

    const rows = await getAllExpenses(ctx.client, {
      ...args,
      limit: args.limit ?? DEFAULT_LIMIT,
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }],
    };
  },
};
