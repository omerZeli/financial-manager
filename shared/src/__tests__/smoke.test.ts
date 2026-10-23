import { describe, expect, it } from 'vitest';

// Trivial smoke test proving the Vitest + TypeScript config resolve for the
// @financial-manager/shared package.
const ANSWER = 42;

describe('shared smoke test', () => {
  it('runs the harness and resolves TS config', () => {
    expect(ANSWER).toBe(42);
  });
});
