import { describe, expect, it } from 'vitest'
import { inflateFixedExpense, computeAllExpenses, computeExpenseSummary } from '../expenses'
import type { AllExpenseRow } from '../expenses'
import type { Expense, FixedExpense, Payback, Salary } from '../index'

// Unit tests for the extracted expense logic. These assert the behavior-
// preserving math ported verbatim from the client (Requirements 3.3, 6.x, 7.x)
// plus the new computeExpenseSummary (effective-date attribution + bucketing).

function fixed(overrides: Partial<FixedExpense> & { id: string; amount: number; start_date: string }): FixedExpense {
  return {
    id: overrides.id,
    user_id: overrides.user_id ?? 'user-1',
    name: overrides.name ?? 'שכירות',
    category: overrides.category ?? 'דיור',
    amount: overrides.amount,
    start_date: overrides.start_date,
    end_date: overrides.end_date ?? null,
    salary_employer: overrides.salary_employer ?? null,
    created_at: overrides.created_at ?? `${overrides.start_date}T00:00:00Z`,
  }
}

function expense(overrides: Partial<Expense> & { id: string; amount: number; date: string }): Expense {
  return {
    id: overrides.id,
    user_id: overrides.user_id ?? 'user-1',
    name: overrides.name ?? 'קניות',
    category: overrides.category ?? 'מזון',
    amount: overrides.amount,
    date: overrides.date,
    salary_id: overrides.salary_id ?? null,
    created_at: overrides.created_at ?? `${overrides.date}T00:00:00Z`,
  }
}

function payback(overrides: Partial<Payback> & { id: string; direction: 'by_me' | 'to_me'; amount: number; date: string }): Payback {
  return {
    id: overrides.id,
    user_id: overrides.user_id ?? 'user-1',
    direction: overrides.direction,
    name: overrides.name ?? null,
    category: overrides.category ?? null,
    amount: overrides.amount,
    date: overrides.date,
    person: overrides.person ?? 'דני',
    expense_id: overrides.expense_id ?? null,
    fixed_expense_id: overrides.fixed_expense_id ?? null,
    payback_id: overrides.payback_id ?? null,
    created_at: overrides.created_at ?? `${overrides.date}T00:00:00Z`,
  }
}

function salary(overrides: Partial<Salary> & { id: string; month: string }): Salary {
  return {
    id: overrides.id,
    user_id: overrides.user_id ?? 'user-1',
    month: overrides.month,
    employer: overrides.employer ?? 'מעסיק',
    bruto: overrides.bruto ?? 10000,
    neto: overrides.neto ?? 8000,
    created_at: overrides.created_at ?? `${overrides.month}T00:00:00Z`,
  }
}

describe('inflateFixedExpense', () => {
  it('Req 6.1/6.5: generates one row per month from start to today limit inclusive', () => {
    const rows = inflateFixedExpense(fixed({ id: 'f1', amount: 100, start_date: '2024-01-15' }), '2024-04-20')
    expect(rows.map(r => r.date)).toEqual(['2024-01-15', '2024-02-15', '2024-03-15', '2024-04-15'])
  })

  it('Req 6.1: respects an end_date earlier than today as the limit', () => {
    const rows = inflateFixedExpense(
      fixed({ id: 'f1', amount: 100, start_date: '2024-01-10', end_date: '2024-03-01' }),
      '2024-12-31',
    )
    // Limit is 2024-03-01, so Jan & Feb rows (day 10) are in range, March row (03-10) is after.
    expect(rows.map(r => r.date)).toEqual(['2024-01-10', '2024-02-10'])
  })

  it('Req 6.2: clamps the day to the last day of shorter months', () => {
    const rows = inflateFixedExpense(fixed({ id: 'f1', amount: 100, start_date: '2024-01-31' }), '2024-04-30')
    // 2024 is a leap year → Feb has 29 days.
    expect(rows.map(r => r.date)).toEqual(['2024-01-31', '2024-02-29', '2024-03-31', '2024-04-30'])
  })

  it('Req 6.3: uses the synthetic id format {fixedExpenseId}_{YYYY-MM-DD}', () => {
    const rows = inflateFixedExpense(fixed({ id: 'abc', amount: 100, start_date: '2024-01-05' }), '2024-02-05')
    expect(rows[0].id).toBe('abc_2024-01-05')
    expect(rows[0].salary_id).toBeNull()
    expect(rows[1].id).toBe('abc_2024-02-05')
  })

  it('Req 6.4: produces zero rows when start is after the limit', () => {
    const rows = inflateFixedExpense(fixed({ id: 'f1', amount: 100, start_date: '2024-06-01' }), '2024-01-01')
    expect(rows).toEqual([])
  })
})

describe('computeAllExpenses', () => {
  const base = { fixedExpenses: [] as FixedExpense[], salaries: [] as Salary[] }

  it('Req 7.1: a to_me payback linked to a regular expense reduces its amount', () => {
    const result = computeAllExpenses({
      ...base,
      expenses: [expense({ id: 'e1', amount: 300, date: '2024-03-10' })],
      inflatedExpenses: [],
      paybacks: [payback({ id: 'p1', direction: 'to_me', amount: 100, date: '2024-03-15', expense_id: 'e1' })],
    })
    expect(result).toHaveLength(1)
    expect(result[0].amount).toBe(200)
    expect(result[0]._originalAmount).toBe(300)
    expect(result[0]._returnedAmount).toBe(100)
  })

  it('Req 7.2: a to_me payback linked to a fixed expense reduces the last inflated row on/before the date', () => {
    const inflated = inflateFixedExpense(fixed({ id: 'f1', amount: 100, start_date: '2024-01-10' }), '2024-03-10')
    const result = computeAllExpenses({
      ...base,
      expenses: [],
      inflatedExpenses: inflated,
      fixedExpenses: [fixed({ id: 'f1', amount: 100, start_date: '2024-01-10' })],
      paybacks: [payback({ id: 'p1', direction: 'to_me', amount: 40, date: '2024-02-20', fixed_expense_id: 'f1' })],
    })
    // The Feb row (02-10, last on/before 02-20) is reduced to 60.
    const feb = result.find(r => r.id === 'f1_2024-02-10')!
    expect(feb.amount).toBe(60)
    const jan = result.find(r => r.id === 'f1_2024-01-10')!
    expect(jan.amount).toBe(100)
  })

  it('Req 7.4/7.5: a by_me payback becomes a virtual row reduced by linked to_me paybacks', () => {
    const result = computeAllExpenses({
      ...base,
      expenses: [],
      inflatedExpenses: [],
      paybacks: [
        payback({ id: 'b1', direction: 'by_me', amount: 250, date: '2024-05-01', name: 'הלוואה', category: 'כללי', person: 'רון' }),
        payback({ id: 't1', direction: 'to_me', amount: 100, date: '2024-06-01', payback_id: 'b1' }),
      ],
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('payback_b1')
    expect(result[0].amount).toBe(150)
    expect(result[0]._paybackPerson).toBe('רון')
  })

  it('Req 7.5: a by_me row fully offset by to_me paybacks is excluded', () => {
    const result = computeAllExpenses({
      ...base,
      expenses: [],
      inflatedExpenses: [],
      paybacks: [
        payback({ id: 'b1', direction: 'by_me', amount: 100, date: '2024-05-01', person: 'רון' }),
        payback({ id: 't1', direction: 'to_me', amount: 100, date: '2024-06-01', payback_id: 'b1' }),
      ],
    })
    expect(result).toEqual([])
  })

  it('Req 7.6: merged rows are sorted by date descending', () => {
    const result = computeAllExpenses({
      ...base,
      expenses: [
        expense({ id: 'e1', amount: 10, date: '2024-01-01' }),
        expense({ id: 'e2', amount: 20, date: '2024-03-01' }),
        expense({ id: 'e3', amount: 30, date: '2024-02-01' }),
      ],
      inflatedExpenses: [],
      paybacks: [],
    })
    expect(result.map(r => r.date)).toEqual(['2024-03-01', '2024-02-01', '2024-01-01'])
  })
})

describe('computeExpenseSummary', () => {
  it('totals, category sort desc, month sort asc, fixed vs non-fixed split', () => {
    const all: AllExpenseRow[] = [
      { ...expense({ id: 'e1', amount: 100, date: '2024-02-10', category: 'מזון' }), _fixed: false },
      { ...expense({ id: 'e2', amount: 300, date: '2024-01-05', category: 'דיור' }), _fixed: false },
      { ...expense({ id: 'f1_2024-02-01', amount: 200, date: '2024-02-01', category: 'דיור' }), _fixed: true },
    ]
    const summary = computeExpenseSummary({ allExpenses: all, salaries: [] })

    expect(summary.total).toBe(600)
    expect(summary.fixedTotal).toBe(200)
    expect(summary.nonFixedTotal).toBe(400)
    expect(summary.byCategory).toEqual([
      { category: 'דיור', total: 500 },
      { category: 'מזון', total: 100 },
    ])
    expect(summary.byMonth).toEqual([
      { month: '2024-01', total: 300 },
      { month: '2024-02', total: 300 },
    ])
  })

  it('applies date-range filtering on the effective date', () => {
    const all: AllExpenseRow[] = [
      { ...expense({ id: 'e1', amount: 100, date: '2024-01-10' }), _fixed: false },
      { ...expense({ id: 'e2', amount: 200, date: '2024-05-10' }), _fixed: false },
    ]
    const summary = computeExpenseSummary({ allExpenses: all, salaries: [], dateFrom: '2024-04-01', dateTo: '2024-12-31' })
    expect(summary.total).toBe(200)
    expect(summary.byMonth).toEqual([{ month: '2024-05', total: 200 }])
  })

  it('attributes salary-linked rows to the salary month', () => {
    const sal = salary({ id: 's1', month: '2024-01-01' })
    const all: AllExpenseRow[] = [
      { ...expense({ id: 'e1', amount: 150, date: '2024-02-20', salary_id: 's1' }), _fixed: false, _effectiveSalaryId: 's1' },
    ]
    const summary = computeExpenseSummary({ allExpenses: all, salaries: [sal] })
    // Row dated Feb but linked to the January salary → bucketed in 2024-01.
    expect(summary.byMonth).toEqual([{ month: '2024-01', total: 150 }])
  })

  it('attributes salary-deducted inflated rows to the previous month', () => {
    const all: AllExpenseRow[] = [
      { ...expense({ id: 'f1_2024-03-01', amount: 500, date: '2024-03-01' }), _fixed: true, _salaryDeductedFixed: true },
    ]
    const summary = computeExpenseSummary({ allExpenses: all, salaries: [] })
    expect(summary.byMonth).toEqual([{ month: '2024-02', total: 500 }])
  })

  it('filters by category allow-list', () => {
    const all: AllExpenseRow[] = [
      { ...expense({ id: 'e1', amount: 100, date: '2024-01-10', category: 'מזון' }), _fixed: false },
      { ...expense({ id: 'e2', amount: 200, date: '2024-01-10', category: 'דיור' }), _fixed: false },
    ]
    const summary = computeExpenseSummary({ allExpenses: all, salaries: [], categories: ['דיור'] })
    expect(summary.total).toBe(200)
    expect(summary.byCategory).toEqual([{ category: 'דיור', total: 200 }])
  })
})

// --- Task 4.5: all-expenses edge cases (Requirements 7.3, 7.5, 7.6) ---------
// These cover the specific EDGE cases not already asserted above:
//   7.3  to_me -> fixed with NO inflated row on/before the payback date
//   7.5  by_me virtual row FULLY offset (adjusted amount 0) is excluded
//   7.6  equal-date ordering tiebreak behavior
//
// NOTE on 7.6 (parity/requirement discrepancy): Requirement 7.6 states ties
// between equal-date rows are broken "by descending creation timestamp".
// The shared computeAllExpenses sorts with `b.date.localeCompare(a.date)` only
// and does NOT apply an explicit created_at comparator. This was ported
// verbatim from the client (ExpensesTablePage merged.sort), which also had no
// created_at tiebreak. The real tie behavior is therefore the stable sort
// preserving INPUT order (merge order: regular, then inflated, then by_me;
// within each group the input array order). The 7.6 tests below assert that
// ACTUAL stable-sort behavior rather than the unimplemented created_at rule.
describe('computeAllExpenses - edge cases (7.3, 7.5, 7.6)', () => {
  const base = { fixedExpenses: [] as FixedExpense[], salaries: [] as Salary[] }

  it('Req 7.3: a to_me payback on a fixed expense with no inflated row on/before its date reduces nothing', () => {
    // Fixed expense starts 2024-03-10; a to_me payback dated 2024-01-05 is
    // BEFORE every inflated row, so there is no candidate on/before it.
    const fe = fixed({ id: 'f1', amount: 100, start_date: '2024-03-10' })
    const inflated = inflateFixedExpense(fe, '2024-05-10')
    const result = computeAllExpenses({
      ...base,
      expenses: [],
      inflatedExpenses: inflated,
      fixedExpenses: [fe],
      paybacks: [payback({ id: 'p1', direction: 'to_me', amount: 40, date: '2024-01-05', fixed_expense_id: 'f1' })],
    })
    // Every inflated row keeps its full amount; the payback reduced nothing.
    expect(result.map(r => r.amount)).toEqual([100, 100, 100])
    for (const r of result) {
      expect(r._originalAmount).toBeUndefined()
      expect(r._returnedAmount).toBeUndefined()
    }
    // Total is unchanged (3 rows * 100), proving the orphan payback is excluded
    // from the reduction entirely.
    expect(result.reduce((s, r) => s + r.amount, 0)).toBe(300)
  })

  it('Req 7.3: an orphan to_me fixed payback leaves earlier fixed rows untouched while a valid one still reduces', () => {
    // Two paybacks on the same fixed expense: one valid (has a row on/before
    // its date) and one orphan (dated before any inflated row). Only the valid
    // one reduces; the orphan is ignored.
    const fe = fixed({ id: 'f1', amount: 100, start_date: '2024-02-10' })
    const inflated = inflateFixedExpense(fe, '2024-04-10') // rows: 02-10, 03-10, 04-10
    const result = computeAllExpenses({
      ...base,
      expenses: [],
      inflatedExpenses: inflated,
      fixedExpenses: [fe],
      paybacks: [
        payback({ id: 'orphan', direction: 'to_me', amount: 25, date: '2024-01-01', fixed_expense_id: 'f1' }),
        payback({ id: 'valid', direction: 'to_me', amount: 30, date: '2024-03-15', fixed_expense_id: 'f1' }),
      ],
    })
    const mar = result.find(r => r.id === 'f1_2024-03-10')!
    const feb = result.find(r => r.id === 'f1_2024-02-10')!
    const apr = result.find(r => r.id === 'f1_2024-04-10')!
    expect(mar.amount).toBe(70) // 100 - 30 (valid payback hit the last row on/before 03-15)
    expect(feb.amount).toBe(100) // orphan payback (01-01) reduced nothing
    expect(apr.amount).toBe(100)
    // Total reduced only by the valid payback's 30.
    expect(result.reduce((s, r) => s + r.amount, 0)).toBe(270)
  })

  it('Req 7.5: a by_me virtual row fully offset to exactly 0 across multiple to_me paybacks is excluded', () => {
    // 100 by_me, offset by 60 + 40 = 100 across two to_me paybacks → amount 0.
    const result = computeAllExpenses({
      ...base,
      expenses: [expense({ id: 'e1', amount: 50, date: '2024-05-10' })],
      inflatedExpenses: [],
      paybacks: [
        payback({ id: 'b1', direction: 'by_me', amount: 100, date: '2024-05-01', name: 'הלוואה', category: 'כללי', person: 'רון' }),
        payback({ id: 't1', direction: 'to_me', amount: 60, date: '2024-05-05', payback_id: 'b1' }),
        payback({ id: 't2', direction: 'to_me', amount: 40, date: '2024-05-06', payback_id: 'b1' }),
      ],
    })
    // Only the unrelated regular expense survives; the fully-offset by_me row is gone.
    expect(result.map(r => r.id)).toEqual(['e1'])
    expect(result.find(r => r.id === 'payback_b1')).toBeUndefined()
  })

  it('Req 7.6: equal-date rows preserve stable input order (regular, then inflated, then by_me)', () => {
    // All rows share the date 2024-04-01 so the date comparator is a tie for
    // every pair. The stable sort must preserve the merge/input order:
    //   regular expenses first (in input order), then inflated, then by_me.
    const fe = fixed({ id: 'f1', amount: 70, start_date: '2024-04-01', end_date: '2024-04-01' })
    const inflated = inflateFixedExpense(fe, '2024-04-01') // single row: f1_2024-04-01
    const result = computeAllExpenses({
      ...base,
      expenses: [
        expense({ id: 'eA', amount: 10, date: '2024-04-01' }),
        expense({ id: 'eB', amount: 20, date: '2024-04-01' }),
      ],
      inflatedExpenses: inflated,
      fixedExpenses: [fe],
      paybacks: [payback({ id: 'b1', direction: 'by_me', amount: 90, date: '2024-04-01', name: 'ל', category: 'כ', person: 'רון' })],
    })
    expect(result.map(r => r.id)).toEqual(['eA', 'eB', 'f1_2024-04-01', 'payback_b1'])
  })

  it('Req 7.6: date DESC ordering dominates, with input order preserved only within an equal-date group', () => {
    // Mixed dates. Newest date first; within the equal-date group (03-01) the
    // two regular expenses keep their input order (e2 before e3).
    const result = computeAllExpenses({
      ...base,
      expenses: [
        expense({ id: 'e1', amount: 10, date: '2024-01-01' }),
        expense({ id: 'e2', amount: 20, date: '2024-03-01', created_at: '2024-03-01T09:00:00Z' }),
        expense({ id: 'e3', amount: 30, date: '2024-03-01', created_at: '2024-03-01T08:00:00Z' }),
        expense({ id: 'e4', amount: 40, date: '2024-02-01' }),
      ],
      inflatedExpenses: [],
      paybacks: [],
    })
    // DESC by date: 03-01 group (e2, e3 in input order), then 02-01 (e4), then 01-01 (e1).
    expect(result.map(r => r.id)).toEqual(['e2', 'e3', 'e4', 'e1'])
    // The dates themselves are DESC overall.
    expect(result.map(r => r.date)).toEqual(['2024-03-01', '2024-03-01', '2024-02-01', '2024-01-01'])
    // DISCREPANCY FLAG: by a true "created_at DESC" tiebreak (Req 7.6), e3
    // (08:00) would precede e2 (09:00). The implementation keeps INPUT order
    // (e2 before e3) because it sorts by date only. This test asserts the
    // actual implemented behavior.
  })
})
