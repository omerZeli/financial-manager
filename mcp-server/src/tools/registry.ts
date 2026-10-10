// Single registration source for every MCP tool.
//
// Each tool module defines a ToolDescriptor and is listed in this array.
// `index.ts` iterates `toolRegistry` exactly once at boot and registers each
// descriptor with the SDK. Adding a tool to the server means adding its
// descriptor here - nothing else wires tools in.
//
// The salary tools (list_salaries, get_salary_summary) land first; the
// remaining read tools are added in task 11.
//
// The array is typed as `ToolDescriptor<any>[]` deliberately. Each descriptor
// is a `ToolDescriptor<typeof thatTool'sSchema>` with a DIFFERENT concrete zod
// object type, and because the schema type parameter appears in the handler's
// argument (a contravariant position), the generic is invariant - a specific
// `ToolDescriptor<SpecificSchema>` is not assignable to the defaulted
// `ToolDescriptor<ZodObject<ZodRawShape>>`. `<any>` is the standard way to hold
// a heterogeneous collection of such descriptors. Each individual tool module
// keeps its precise `ToolDescriptor<typeof inputSchema>` typing, so args are
// still fully typed where handlers are defined; only this aggregating array is
// erased. The boot loop in index.ts reads `.name`, `.description`,
// `.inputSchema.shape`, `.annotations`, and `.handler`, all of which remain
// available.

import type { ToolDescriptor } from './types.js';
import { listSalariesTool } from './listSalaries.js';
import { getSalarySummaryTool } from './getSalarySummary.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toolRegistry: ToolDescriptor<any>[] = [
  listSalariesTool,
  getSalarySummaryTool,
];
