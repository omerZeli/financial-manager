// MCP tool: list_investment_deposits (read-only).
//
// Returns the authenticated user's raw investment deposit/withdrawal rows,
// optionally filtered by channel, depositor, withdrawal flag, and a date range,
// capped by a row limit. This is the plain list tool - it calls the data reader
// directly (no service composition needed) and serializes the rows as
// pretty-printed JSON text content.
//
// Requirement notes:
//   - 1.3 / annotations: read-only, so `readOnlyHint: true`.
//   - 12.1 / 12.2 / 12.8: zod filter schema with optional channelId/depositor/
//     isWithdrawal/dateFrom/dateTo and an integer limit bounded to 1..1000.
//   - 12.12: an inverted date range is rejected as an isError result (not a
//     throw) via the shared validateDateRange helper.
//   - 15.5 / 15.6: when `limit` is omitted it DEFAULTS to 100 (applied
//     in-handler); zero matching rows is a SUCCESS result holding an empty JSON
//     array, never an error.

import { z } from 'zod';
import type { ToolDescriptor } from './types.js';
import { validateDateRange } from './dateRange.js';
import { fetchDeposits } from '../data/deposits.js';

const DEFAULT_LIMIT = 100;

const inputSchema = z.object({
  channelId: z.string().optional(),
  depositor: z.string().optional(),
  isWithdrawal: z.boolean().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.number().int().min(1).max(1000).optional(),
});

export const listInvestmentDepositsTool: ToolDescriptor<typeof inputSchema> = {
  name: 'list_investment_deposits',
  description:
    'List the authenticated user\'s investment deposits and withdrawals, optionally filtered by channel, depositor, withdrawal flag, and date range.',
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    const rangeError = validateDateRange(args.dateFrom, args.dateTo);
    if (rangeError) return rangeError;

    const rows = await fetchDeposits(ctx.client, {
      ...args,
      limit: args.limit ?? DEFAULT_LIMIT,
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }],
    };
  },
};
