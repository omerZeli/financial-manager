// MCP tool: list_fixed_expenses (read-only).
//
// Returns the authenticated user's raw fixed-expense definition rows,
// optionally filtered by category and by an "active on" date (keeping only
// fixed expenses whose window covers that date). This is the plain list tool -
// it calls the data reader directly (no service composition needed) and
// serializes the rows as pretty-printed JSON text content.
//
// Requirement notes:
//   - 1.3 / annotations: read-only, so `readOnlyHint: true`.
//   - 12.1 / 12.2 / 12.6: zod filter schema with optional category/activeOn and
//     an integer limit bounded to 1..1000.
//   - limit defaults to 100 when omitted (applied in-handler).
//   - 12.12: this tool exposes no date RANGE (activeOn is a single point, not a
//     from/to pair), so there is nothing for validateDateRange to reject.
//   - 15.3 / 15.5: results are JSON text content; zero matching rows is a
//     SUCCESS result holding an empty JSON array, never an error.

import { z } from 'zod';
import type { ToolDescriptor } from './types.js';
import { fetchFixedExpenses } from '../data/fixedExpenses.js';

const DEFAULT_LIMIT = 100;

const inputSchema = z.object({
  category: z.string().optional(),
  activeOn: z.string().optional(),
  limit: z.number().int().min(1).max(1000).optional(),
});

export const listFixedExpensesTool: ToolDescriptor<typeof inputSchema> = {
  name: 'list_fixed_expenses',
  description:
    'List the authenticated user\'s fixed expense definitions, optionally filtered by category and by a date the expense must be active on.',
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    const rows = await fetchFixedExpenses(ctx.client, {
      ...args,
      limit: args.limit ?? DEFAULT_LIMIT,
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }],
    };
  },
};
