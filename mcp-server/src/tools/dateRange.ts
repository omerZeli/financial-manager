// Shared date-range validation helper for tool handlers.
//
// zod validates each field in isolation (type, presence) before a handler
// runs, but it cannot easily express a CROSS-FIELD rule like "dateFrom must be
// <= dateTo". That semantic check (requirement 12.12) is therefore done inside
// each handler. This helper centralizes it so every date-filtered tool rejects
// an inverted range the same way, returning an isError ToolResult (never
// throwing - a bad range is a handled, tool-level error, not a crash).
//
// Dates are stored as ISO `YYYY-MM-DD` strings, which sort lexicographically
// in chronological order, so a plain string comparison is correct and needs no
// Date parsing.

import type { ToolResult } from './types.js';

/**
 * If both bounds are provided and `dateFrom > dateTo`, return an error
 * `ToolResult` naming the problem. Otherwise return `null` (range is valid or
 * at least one bound is absent).
 */
export function validateDateRange(
  dateFrom: string | undefined,
  dateTo: string | undefined,
): ToolResult | null {
  if (dateFrom && dateTo && dateFrom > dateTo) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Invalid date range: dateFrom must be <= dateTo (got dateFrom="${dateFrom}", dateTo="${dateTo}").`,
        },
      ],
    };
  }
  return null;
}
