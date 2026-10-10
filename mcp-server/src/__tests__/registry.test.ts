import { describe, expect, it } from 'vitest';
import { toolRegistry } from '../tools/registry';
import { validateRegistry } from '../tools/validateRegistry';
import type { ToolDescriptor } from '../tools/types';

// Unit tests for the tool REGISTRY and its integrity guard (task 8.4).
//
// Validates:
//   - Requirement 13.2: the registry is a single registration source iterated
//     once; the number of REGISTERED tools equals the number of ENTRIES, which
//     requires every name to be unique (no duplicates would collapse the
//     registered count below the entry count).
//   - Requirement 13.3: every descriptor carries the required fields and sets
//     `annotations.readOnlyHint === true`; malformed entries (duplicate names,
//     missing fields, non-read-only) are REJECTED by `validateRegistry`.
//
// `toolRegistry` currently holds exactly two salary tools. The remaining read
// tools are added in task 11.
const EXPECTED_ENTRY_COUNT = 2;

describe('toolRegistry invariants (13.2, 13.3)', () => {
  it(`holds exactly ${EXPECTED_ENTRY_COUNT} descriptors`, () => {
    expect(toolRegistry).toHaveLength(EXPECTED_ENTRY_COUNT);
  });

  it('includes the two salary tools by name', () => {
    const names = toolRegistry.map((d) => d.name);
    expect(names).toContain('list_salaries');
    expect(names).toContain('get_salary_summary');
  });

  it('every tool name is unique -> registered count equals entry count (13.2)', () => {
    const names = toolRegistry.map((d) => d.name);
    const unique = new Set(names);
    expect(unique.size).toBe(toolRegistry.length);
  });

  it('every descriptor has the required fields (13.3)', () => {
    for (const d of toolRegistry) {
      expect(typeof d.name).toBe('string');
      expect(d.name.length).toBeGreaterThan(0);
      expect(typeof d.description).toBe('string');
      expect(d.description.length).toBeGreaterThan(0);
      // inputSchema is a zod object -> exposes `.shape`.
      expect(d.inputSchema).toBeTruthy();
      expect(typeof d.inputSchema.shape).toBe('object');
      expect(d.annotations).toBeTruthy();
      expect(typeof d.handler).toBe('function');
    }
  });

  it('every descriptor is read-only (readOnlyHint === true) (13.3)', () => {
    for (const d of toolRegistry) {
      expect(d.annotations.readOnlyHint).toBe(true);
    }
  });
});

describe('validateRegistry guard (13.2, 13.3)', () => {
  it('passes for the real registry and returns it unchanged', () => {
    expect(() => validateRegistry(toolRegistry)).not.toThrow();
    expect(validateRegistry(toolRegistry)).toBe(toolRegistry);
  });

  it('passes for a valid empty registry', () => {
    expect(() => validateRegistry([])).not.toThrow();
  });

  // A minimal well-formed descriptor factory for building malformed variants.
  // The inputSchema stub only needs a `.shape` object to satisfy the guard.
  function makeDescriptor(name: string): ToolDescriptor {
    return {
      name,
      description: `desc for ${name}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inputSchema: { shape: {} } as any,
      annotations: { readOnlyHint: true },
      handler: async () => ({ content: [{ type: 'text', text: '[]' }] }),
    };
  }

  it('throws on duplicate tool names (13.2)', () => {
    const dup = [makeDescriptor('list_salaries'), makeDescriptor('list_salaries')];
    expect(() => validateRegistry(dup)).toThrow(/duplicate tool name "list_salaries"/);
  });

  it('throws on a missing name field (13.3)', () => {
    const bad = makeDescriptor('ok');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (bad as any).name = '';
    expect(() => validateRegistry([bad])).toThrow(/missing a non-empty "name"/);
  });

  it('throws on a missing description field (13.3)', () => {
    const bad = makeDescriptor('tool_x');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (bad as any).description = '';
    expect(() => validateRegistry([bad])).toThrow(/missing a non-empty "description"/);
  });

  it('throws on a missing inputSchema (13.3)', () => {
    const bad = makeDescriptor('tool_y');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (bad as any).inputSchema = undefined;
    expect(() => validateRegistry([bad])).toThrow(/missing a valid zod object "inputSchema"/);
  });

  it('throws on a missing handler (13.3)', () => {
    const bad = makeDescriptor('tool_z');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (bad as any).handler = undefined;
    expect(() => validateRegistry([bad])).toThrow(/missing a "handler" function/);
  });

  it('throws on a non-read-only tool (readOnlyHint !== true) (13.3)', () => {
    const bad = makeDescriptor('tool_w');
    bad.annotations.readOnlyHint = false;
    expect(() => validateRegistry([bad])).toThrow(/readOnlyHint === true/);
  });
});
