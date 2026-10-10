// MCP tool: get_expense_summary (read-only).
//
// Returns an aggregate summary of the authenticated user's expenses over the
// requested range: totals plus monthly and per-category breakdowns, computed
// from the merged all-expenses view (regular + inflated fixed + by_me
// paybacks, with payback reductions and effective-date attribution applied).
// Unlike list_all_expenses this is an AGGREGATE view, so it takes no `limit` -
// the summary always reflects the full filtered range.
//
// Requirement notes:
//   - 1.3 / annotations: read-only, so `readOnlyHint: true`.
//   - 12.1 / 12.2: zod filter schema with optional dateFrom/dateTo/category
//     (no limit field).
//   - 12.12: an inverted date range is rejected as an isError result (not a
//     throw) via the shared validateDateRange helper.
//   - 1.2 / 15.3 / 15.5: delegates to the expense service; result is JSON text
//     content; zero matching rows yields a successful ZEROED summary structure
//     (empty breakdowns), never an error.

import { z } from 'zod';
import type { ToolDescriptor } from './types.js';
import { validateDateRange } from './dateRange.js';
import { getExpenseSummary } from '../services/expenses.js';

const inputSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  category: z.string().optional(),
});

export const getExpenseSummaryTool: ToolDescriptor<typeof inputSchema> = {
  name: 'get_expense_summary',
  description:
    'Summarize the authenticated user\'s expenses into totals and monthly / per-category breakdowns, optionally filtered by date range and category.',
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    const rangeError = validateDateRange(args.dateFrom, args.dateTo);
    if (rangeError) return rangeError;

    const summary = await getExpenseSummary(ctx.client, args);

    return {
      content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
    };
  },
};
