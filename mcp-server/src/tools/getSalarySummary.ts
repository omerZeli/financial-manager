// MCP tool: get_salary_summary (read-only).
//
// Returns portfolio-level salary totals plus a per-month aggregation for the
// authenticated user, optionally filtered by month range and employer. Unlike
// list_salaries this is an AGGREGATE view, so it takes no `limit` - the
// summary always reflects the full filtered range.
//
// Requirement notes:
//   - 1.4 / annotations: read-only, so `readOnlyHint: true`.
//   - 12.1 / 12.2: zod filter schema with optional dateFrom/dateTo/employer
//     (no limit field).
//   - 12.12: an inverted date range is rejected as an isError result (not a
//     throw) via the shared validateDateRange helper.
//   - 11.4 / 1.2: delegates to the salary service, which composes the data
//     read with the shared pure aggregations.
//   - 15.4 / 15.5: result is JSON text content; zero matching rows yields a
//     successful ZEROED summary structure (totals all 0, byMonth []), never an
//     error.

import { z } from 'zod';
import type { ToolDescriptor } from './types.js';
import { validateDateRange } from './dateRange.js';
import { getSalarySummary } from '../services/salary.js';

const inputSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  employer: z.string().optional(),
});

export const getSalarySummaryTool: ToolDescriptor<typeof inputSchema> = {
  name: 'get_salary_summary',
  description:
    'Summarize the authenticated user\'s salaries into totals, deductions, averages, and a per-month breakdown.',
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    const rangeError = validateDateRange(args.dateFrom, args.dateTo);
    if (rangeError) return rangeError;

    const summary = await getSalarySummary(ctx.client, args);

    return {
      content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
    };
  },
};
