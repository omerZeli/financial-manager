// MCP tool: list_dropdown_options (read-only).
//
// Returns the authenticated user's user-managed dropdown options, optionally
// filtered by category. This is a plain list tool - it calls the data reader
// directly (no service composition needed) and serializes the rows as
// pretty-printed JSON text content.
//
// Requirement notes:
//   - 1.3 / annotations: read-only, so `readOnlyHint: true`.
//   - 12.1 / 12.2: zod filter schema with an optional category (no limit field -
//     dropdown option sets are small and bounded per category).
//   - 15.5: result is JSON text content; zero matching rows is a SUCCESS result
//     holding an empty JSON array, never an error.

import { z } from 'zod';
import type { ToolDescriptor } from './types.js';
import { fetchDropdownOptions } from '../data/dropdownOptions.js';

const inputSchema = z.object({
  category: z.string().optional(),
});

export const listDropdownOptionsTool: ToolDescriptor<typeof inputSchema> = {
  name: 'list_dropdown_options',
  description:
    'List the authenticated user\'s user-managed dropdown options, optionally filtered by category.',
  inputSchema,
  annotations: { readOnlyHint: true },
  handler: async (args, ctx) => {
    const rows = await fetchDropdownOptions(ctx.client, args);

    return {
      content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }],
    };
  },
};
