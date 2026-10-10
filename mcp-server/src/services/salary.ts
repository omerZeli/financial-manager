// Service layer: salary summary composition.
//
// The service layer sits between the data-access readers (data/*.ts) and the
// tool modules (tools/*.ts). Its job is to COMPOSE a raw data read with the
// pure computations extracted into `@financial-manager/shared`, returning a
// shaped result the tool can serialize directly.
//
// Plain `list_salaries` needs no service wrapper - it calls `fetchSalaries`
// directly. The summary, however, combines a fetch with two shared pure
// functions, so that composition is centralized here (keeping the tool handler
// a thin adapter and making this logic trivially unit-testable in isolation).

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  aggregateSalariesByMonth,
  computeSalaryTotals,
  type MonthlySalary,
  type SalaryTotals,
} from '@financial-manager/shared';
import { fetchSalaries } from '../data/salaries.js';

/**
 * Filters accepted by the salary summary. Mirrors the data-access
 * `SalaryFilters` minus `limit` - a summary always aggregates the full
 * filtered range rather than a capped page of rows.
 */
export interface SalarySummaryFilters {
  dateFrom?: string;
  dateTo?: string;
  employer?: string;
}

/**
 * Fetch the (RLS-scoped) salaries matching `filters` and return both the
 * portfolio totals and the per-month aggregation.
 *
 * Composition only - all arithmetic lives in the shared pure functions:
 *   - `computeSalaryTotals`  -> totals / deductions / month count / averages
 *   - `aggregateSalariesByMonth` -> one entry per YYYY-MM, summed across employers
 *
 * Zero matching rows is a valid, non-error outcome: `computeSalaryTotals`
 * returns a zeroed `SalaryTotals` and `aggregateSalariesByMonth` returns `[]`.
 */
export async function getSalarySummary(
  client: SupabaseClient,
  filters: SalarySummaryFilters = {},
): Promise<{ totals: SalaryTotals; byMonth: MonthlySalary[] }> {
  const rows = await fetchSalaries(client, filters);
  return {
    totals: computeSalaryTotals(rows),
    byMonth: aggregateSalariesByMonth(rows),
  };
}
