// Runtime registry integrity guard.
//
// `index.ts` iterates `toolRegistry` exactly once at boot and registers each
// descriptor with the SDK. For that single pass to be safe, the registry must
// satisfy a few invariants that the TypeScript type system cannot enforce on a
// `ToolDescriptor<any>[]` array:
//
//   - every descriptor carries the required fields (name, description,
//     inputSchema, annotations, handler);
//   - tool names are UNIQUE (duplicate names would double-register / shadow a
//     tool with the SDK) - requirement 13.2;
//   - v1 ships read-only tools, so every descriptor must set
//     `annotations.readOnlyHint === true` - requirement 13.3.
//
// `validateRegistry` throws a descriptive Error on the first violation, so a
// malformed registry fails fast at boot rather than silently mis-registering.
// It is intentionally minimal and side-effect free - it does not mutate the
// registry or touch the SDK, it only asserts the invariants and returns.

import type { ToolDescriptor } from './types.js';

/**
 * Assert the tool registry's integrity invariants. Throws an Error naming the
 * first problem found (missing field, duplicate name, or non-read-only tool).
 * Returns the validated registry unchanged on success so it can be used inline.
 *
 * @param registry the array of tool descriptors to validate
 */
export function validateRegistry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registry: ToolDescriptor<any>[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): ToolDescriptor<any>[] {
  const seen = new Set<string>();

  for (let i = 0; i < registry.length; i++) {
    const d = registry[i];

    if (!d || typeof d !== 'object') {
      throw new Error(`Invalid tool registry: entry at index ${i} is not an object.`);
    }

    // Required string fields.
    if (typeof d.name !== 'string' || d.name.length === 0) {
      throw new Error(
        `Invalid tool registry: entry at index ${i} is missing a non-empty "name".`,
      );
    }
    if (typeof d.description !== 'string' || d.description.length === 0) {
      throw new Error(
        `Invalid tool registry: tool "${d.name}" is missing a non-empty "description".`,
      );
    }

    // inputSchema must be a zod object exposing a `.shape` (index.ts hands
    // `.shape` to the SDK).
    if (
      !d.inputSchema ||
      typeof d.inputSchema !== 'object' ||
      typeof (d.inputSchema as { shape?: unknown }).shape !== 'object'
    ) {
      throw new Error(
        `Invalid tool registry: tool "${d.name}" is missing a valid zod object "inputSchema".`,
      );
    }

    // annotations with an explicit readOnlyHint === true (v1 is read-only).
    if (!d.annotations || typeof d.annotations !== 'object') {
      throw new Error(
        `Invalid tool registry: tool "${d.name}" is missing "annotations".`,
      );
    }
    if (d.annotations.readOnlyHint !== true) {
      throw new Error(
        `Invalid tool registry: tool "${d.name}" must set annotations.readOnlyHint === true (v1 is read-only).`,
      );
    }

    // handler must be a function.
    if (typeof d.handler !== 'function') {
      throw new Error(
        `Invalid tool registry: tool "${d.name}" is missing a "handler" function.`,
      );
    }

    // Unique names.
    if (seen.has(d.name)) {
      throw new Error(
        `Invalid tool registry: duplicate tool name "${d.name}".`,
      );
    }
    seen.add(d.name);
  }

  return registry;
}
