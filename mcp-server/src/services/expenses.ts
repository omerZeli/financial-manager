// Service layer: all-expenses composition and expense summary.
//
// The service layer sits between the data-access readers (data/*.ts) and the
// tool modules (tools/*.ts). Its job is to COMPOSE raw data reads with the pure
// computations extracted into `@financial-manager/shared`, returning a shaped
// result the tool can serialize directly.
//
// Both functions here combine FOUR to FIVE readers (regular expenses, fixed
// expenses, paybacks, salaries) with the shared inflation + merge + reduction
// pipeline, so centralizing the composition keeps every tool handler a thin
// adapter and makes the logic trivially unit-testable in isolation.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  inflateFixedExpense,
  computeAllExpenses,
  computeExpenseSummary,
  type AllExpenseRow,
  type ExpenseSummary,
} from '@financial-manager/shared';
import { fetchExpenses } from '../data/expenses.js';
import { fetchFixedExpenses } from '../data/fixedExpenses.js';
import { fetchPaybacks } from '../data/paybacks.js';
import { fetchSalaries } from '../data/salaries.js';

/**
 * Filters accepted by the all-expenses list. Mirrors the `list_all_expenses`
 * tool catalog entry (dateFrom, dateTo, category, limit). The limit caps the
 * number of merged rows returned after sorting, not the raw reads.
 */
export interface AllExpensesFilters {
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  limit?: number;
}

/**
 * Fetch the (RLS-scoped) regular expenses, fixed expenses, paybacks and
 * salaries, inflate the fixed expenses into virtual monthly rows, and merge
 * everything into a single payback-adjusted all-expenses list.
 *
 * Composition only - all logic lives in the shared pure functions:
 *   - `inflateFixedExpense` -> one virtual row per month per fixed expense
 *   - `computeAllExpenses`  -> merge + three-direction payback reduction +
 *                              effective-date/fixed/salary annotation + sort
 *
 * The raw entity reads are intentionally UNFILTERED by date/category so the
 * shared merge + payback-reduction pipeline sees the full picture (a payback
 * can reference an out-of-range expense). The `dateFrom`/`dateTo`/`category`
 * filters are therefore applied here, on the computed rows, and `limit` caps
 * the final sorted result.
 *
 * Zero matching rows is a valid, non-error outcome: `computeAllExpenses`
 * returns `[]` and the filtering below leaves it empty.
 */
export async function getAllExpenses(
  client: SupabaseClient,
  filters: AllExpensesFilters = {},
): Promise<AllExpenseRow[]> {
  const [expenses, fixedExpenses, paybacks, salaries] = await Promise.all([
    fetchExpenses(client),
    fetchFixedExpenses(client),
    fetchPaybacks(client),
    fetchSalaries(client),
  ]);

  const inflatedExpenses = fixedExpenses.flatMap(fe => inflateFixedExpense(fe));

  let rows = computeAllExpenses({
    expenses,
    inflatedExpenses,
    paybacks,
    fixedExpenses,
    salaries,
  });

  if (filters.category) rows = rows.filter(r => r.category === filters.category);
  if (filters.dateFrom) rows = rows.filter(r => r.date >= filters.dateFrom!);
  if (filters.dateTo) rows = rows.filter(r => r.date <= filters.dateTo!);
  if (filters.limit) rows = rows.slice(0, filters.limit);

  return rows;
}

/**
 * Filters accepted by the expense summary. Mirrors the `get_expense_summary`
 * tool catalog entry (dateFrom, dateTo, category) - a summary always
 * aggregates the full filtered range rather than a capped page of rows.
 */
export interface ExpenseSummaryFilters {
  dateFrom?: string;
  dateTo?: string;
  category?: string;
}

/**
 * Build the full all-expenses list, then summarize it over the requested range.
 *
 * Composition only - `computeExpenseSummary` applies effective-date attribution
 * (salary-linked rows roll into their salary month; salary-deducted inflated
 * rows roll into the previous month) before range filtering and monthly/category
 * bucketing. The category filter is passed through as a one-element allow-list.
 *
 * Zero matching rows is a valid, non-error outcome: `computeExpenseSummary`
 * returns a zeroed summary with empty breakdowns.
 */
export async function getExpenseSummary(
  client: SupabaseClient,
  filters: ExpenseSummaryFilters = {},
): Promise<ExpenseSummary> {
  const [expenses, fixedExpenses, paybacks, salaries] = await Promise.all([
    fetchExpenses(client),
    fetchFixedExpenses(client),
    fetchPaybacks(client),
    fetchSalaries(client),
  ]);

  const inflatedExpenses = fixedExpenses.flatMap(fe => inflateFixedExpense(fe));

  const allExpenses = computeAllExpenses({
    expenses,
    inflatedExpenses,
    paybacks,
    fixedExpenses,
    salaries,
  });

  return computeExpenseSummary({
    allExpenses,
    salaries,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    categories: filters.category ? [filters.category] : undefined,
  });
}
