import { describe, expect, it } from 'vitest'
import {
  aggregateSalariesByMonth,
  computeSalaryTotals,
  inflateFixedExpense,
  computeAllExpenses,
  computeExpenseSummary,
  computeInvestmentSummaries,
  computeInvestmentTotals,
  computeReturnOverTime,
} from '../index'
import type {
  Salary,
  Expense,
  FixedExpense,
  Payback,
  InvestmentChannel,
  InvestmentDeposit,
  InvestmentValueUpdate,
  AllExpenseRow,
  MonthlySalary,
  SalaryTotals,
  ChannelSummaryWithMeta,
  InvestmentTotals,
  ReturnPoint,
  ExpenseSummary,
} from '../index'

/**
 * Property 1: Extraction parity (Validates: Requirements 3.5, 3.7, 3.8)
 *
 * The pure functions in `@financial-manager/shared` were extracted VERBATIM
 * from the client. This suite locks in that, for a fixed representative input,
 * each shared function produces exactly the output the client produced before
 * extraction.
 *
 * The EXPECTED-OUTPUT fixtures below are hand-authored literals (the recorded
 * "pre-refactor client output"), NOT the result of calling the function and
 * comparing to itself. They act as committed regression snapshots: any future
 * change that alters a shared function's results fails this suite loudly.
 *
 * Deep equality via `toEqual` reports the exact differing path/field on a
 * mismatch (see the deliberate-mismatch demonstration at the bottom).
 */

// ---------------------------------------------------------------------------
// Salary domain
// ---------------------------------------------------------------------------

const salaryInput: Salary[] = [
  { id: 's1', user_id: 'u1', month: '2024-01', employer: 'מעסיק א', bruto: 10000, neto: 7000, created_at: '2024-01-01T00:00:00Z' },
  { id: 's2', user_id: 'u1', month: '2024-01', employer: 'מעסיק ב', bruto: 5000, neto: 4000, created_at: '2024-01-02T00:00:00Z' },
  { id: 's3', user_id: 'u1', month: '2024-02', employer: 'מעסיק א', bruto: 12000, neto: 8500, created_at: '2024-02-01T00:00:00Z' },
]

// Recorded pre-refactor output: two employers in 2024-01 summed, months ASC.
const salaryByMonthFixture: MonthlySalary[] = [
  { month: '2024-01', bruto: 15000, neto: 11000 },
  { month: '2024-02', bruto: 12000, neto: 8500 },
]

// Recorded pre-refactor output: totals, deductions (bruto-neto), averages / 2 months.
const salaryTotalsFixture: SalaryTotals = {
  totalBruto: 27000,
  totalNeto: 19500,
  totalDeductions: 7500,
  monthCount: 2,
  avgBruto: 13500,
  avgNeto: 9750,
  avgDeductions: 3750,
}

describe('extraction parity - salary', () => {
  it('aggregateSalariesByMonth matches the recorded fixture', () => {
    expect(aggregateSalariesByMonth(salaryInput)).toEqual(salaryByMonthFixture)
  })

  it('computeSalaryTotals matches the recorded fixture', () => {
    expect(computeSalaryTotals(salaryInput)).toEqual(salaryTotalsFixture)
  })
})

// ---------------------------------------------------------------------------
// Expenses domain
// ---------------------------------------------------------------------------

// A single fixed expense, inflated with an explicit "today" so the row set is
// deterministic (does not depend on the real clock).
const fixedExpense: FixedExpense = {
  id: 'fe1',
  user_id: 'u1',
  name: 'שכירות',
  category: 'דיור',
  amount: 500,
  start_date: '2024-01-15',
  end_date: null,
  salary_employer: null,
  created_at: '2024-01-15T00:00:00Z',
}

// Recorded pre-refactor output: one row per month from 2024-01-15 through the
// 2024-03-20 limit (day 15 clamped, synthetic {id}_{YYYY-MM-DD} ids).
const inflateFixture: Expense[] = [
  { id: 'fe1_2024-01-15', user_id: 'u1', name: 'שכירות', category: 'דיור', amount: 500, date: '2024-01-15', salary_id: null, created_at: '2024-01-15T00:00:00Z' },
  { id: 'fe1_2024-02-15', user_id: 'u1', name: 'שכירות', category: 'דיור', amount: 500, date: '2024-02-15', salary_id: null, created_at: '2024-01-15T00:00:00Z' },
  { id: 'fe1_2024-03-15', user_id: 'u1', name: 'שכירות', category: 'דיור', amount: 500, date: '2024-03-15', salary_id: null, created_at: '2024-01-15T00:00:00Z' },
]

const inflatedExpenses = inflateFixedExpense(fixedExpense, '2024-03-20')

// A regular expense reduced by a to_me payback.
const regularExpense: Expense = {
  id: 'e1',
  user_id: 'u1',
  name: 'מכולת',
  category: 'מזון',
  amount: 1000,
  date: '2024-02-10',
  salary_id: null,
  created_at: '2024-02-10T00:00:00Z',
}

const toMePayback: Payback = {
  id: 'pb1',
  user_id: 'u1',
  direction: 'to_me',
  name: null,
  category: null,
  amount: 300,
  date: '2024-02-15',
  person: 'דני',
  expense_id: 'e1',
  fixed_expense_id: null,
  payback_id: null,
  created_at: '2024-02-15T00:00:00Z',
}

const allExpensesInput = {
  expenses: [regularExpense],
  inflatedExpenses: inflateFixture,
  paybacks: [toMePayback],
  fixedExpenses: [fixedExpense],
  salaries: [] as Salary[],
}

// Recorded pre-refactor output: merged + sorted date DESC, regular reduced by
// the 300 to_me payback, inflated rows annotated _fixed, no by_me rows.
const allExpensesFixture: AllExpenseRow[] = [
  {
    id: 'fe1_2024-03-15', user_id: 'u1', name: 'שכירות', category: 'דיור', amount: 500, date: '2024-03-15', salary_id: null, created_at: '2024-01-15T00:00:00Z',
    _originalAmount: undefined, _returnedAmount: undefined, _paybackPerson: undefined, _fixed: true, _salaryDeducted: false, _effectiveSalaryId: null, _salaryDeductedFixed: false,
  },
  {
    id: 'fe1_2024-02-15', user_id: 'u1', name: 'שכירות', category: 'דיור', amount: 500, date: '2024-02-15', salary_id: null, created_at: '2024-01-15T00:00:00Z',
    _originalAmount: undefined, _returnedAmount: undefined, _paybackPerson: undefined, _fixed: true, _salaryDeducted: false, _effectiveSalaryId: null, _salaryDeductedFixed: false,
  },
  {
    id: 'e1', user_id: 'u1', name: 'מכולת', category: 'מזון', amount: 700, date: '2024-02-10', salary_id: null, created_at: '2024-02-10T00:00:00Z',
    _originalAmount: 1000, _returnedAmount: 300, _paybackPerson: undefined, _fixed: false, _salaryDeducted: false, _effectiveSalaryId: null, _salaryDeductedFixed: false,
  },
  {
    id: 'fe1_2024-01-15', user_id: 'u1', name: 'שכירות', category: 'דיור', amount: 500, date: '2024-01-15', salary_id: null, created_at: '2024-01-15T00:00:00Z',
    _originalAmount: undefined, _returnedAmount: undefined, _paybackPerson: undefined, _fixed: true, _salaryDeducted: false, _effectiveSalaryId: null, _salaryDeductedFixed: false,
  },
]

// Recorded pre-refactor output: totals over the four all-expenses rows (own
// dates, no salary attribution), categories sorted by total DESC, months ASC.
const expenseSummaryFixture: ExpenseSummary = {
  total: 2200,
  byCategory: [
    { category: 'דיור', total: 1500 },
    { category: 'מזון', total: 700 },
  ],
  byMonth: [
    { month: '2024-01', total: 500 },
    { month: '2024-02', total: 1200 },
    { month: '2024-03', total: 500 },
  ],
  fixedTotal: 1500,
  nonFixedTotal: 700,
}

describe('extraction parity - expenses', () => {
  it('inflateFixedExpense matches the recorded fixture', () => {
    expect(inflatedExpenses).toEqual(inflateFixture)
  })

  it('computeAllExpenses matches the recorded fixture', () => {
    expect(computeAllExpenses(allExpensesInput)).toEqual(allExpensesFixture)
  })

  it('computeExpenseSummary matches the recorded fixture', () => {
    const allExpenses = computeAllExpenses(allExpensesInput)
    expect(computeExpenseSummary({ allExpenses, salaries: [] })).toEqual(expenseSummaryFixture)
  })
})

// ---------------------------------------------------------------------------
// Investments domain
// ---------------------------------------------------------------------------

const channel: InvestmentChannel = {
  id: 'c1',
  user_id: 'u1',
  name: 'קרן השתלמות',
  company: 'אלטשולר',
  investment_path: 'מניות',
  is_pension: false,
  created_at: '2024-01-01T00:00:00Z',
}

const deposits: InvestmentDeposit[] = [
  { id: 'd1', user_id: 'u1', channel_id: 'c1', amount: 1000, date: '2024-01-10', depositor: 'אני', salary_id: null, is_withdrawal: false, created_at: '2024-01-10T00:00:00Z' },
]

const valueUpdates: InvestmentValueUpdate[] = [
  { id: 'v1', user_id: 'u1', channel_id: 'c1', value: 1200, date: '2024-02-01', created_at: '2024-02-01T00:00:00Z' },
]

const investmentInput = { channels: [channel], deposits, valueUpdates }

// Recorded pre-refactor output: 1000 invested, checkpoint to 1200 → 200 profit
// (20% return), channel row merged with the summary + isCash flag.
const summariesFixture: ChannelSummaryWithMeta[] = [
  {
    id: 'c1', user_id: 'u1', name: 'קרן השתלמות', company: 'אלטשולר', investment_path: 'מניות', is_pension: false, created_at: '2024-01-01T00:00:00Z',
    totalDeposits: 1000,
    currentValue: 1200,
    lastUpdated: '2024-02-01',
    returnAbsolute: 200,
    returnPercent: 0.2,
    isCash: false,
  },
]

const totalsFixture: InvestmentTotals = {
  totalDeposited: 1000,
  totalCurrentValue: 1200,
  totalReturn: 200,
  totalReturnPercent: 0.2,
}

// Recorded pre-refactor output with EXPLICIT sampleDates for determinism:
// at 2024-01-15 only the deposit exists (0% return); at 2024-02-15 the
// checkpoint has landed (20% return).
const returnOverTimeFixture: ReturnPoint[] = [
  { date: '2024-01-15', returnPct: 0 },
  { date: '2024-02-15', returnPct: 20 },
]

describe('extraction parity - investments', () => {
  it('computeInvestmentSummaries matches the recorded fixture', () => {
    expect(computeInvestmentSummaries(investmentInput)).toEqual(summariesFixture)
  })

  it('computeInvestmentTotals matches the recorded fixture', () => {
    const summaries = computeInvestmentSummaries(investmentInput)
    expect(computeInvestmentTotals(summaries, deposits)).toEqual(totalsFixture)
  })

  it('computeReturnOverTime (explicit sampleDates) matches the recorded fixture', () => {
    const points = computeReturnOverTime({
      ...investmentInput,
      sampleDates: ['2024-01-15', '2024-02-15'],
    })
    expect(points).toEqual(returnOverTimeFixture)
  })
})

// ---------------------------------------------------------------------------
// Mismatch detection demonstration (Requirement 3.8)
// ---------------------------------------------------------------------------

describe('extraction parity - mismatch detection', () => {
  // Proves a mismatch FAILS the suite and that Vitest surfaces the differing
  // field. We deliberately corrupt ONE field of the salary-totals fixture and
  // assert the real output does NOT deep-equal it. `expect(...).toEqual(...)`
  // on a real failure prints a diff naming the differing path (e.g.
  // `- totalNeto: 19500` vs `+ totalNeto: 999999`), satisfying the
  // "reports the differing field" requirement. This test stays self-contained
  // so the suite still passes.
  it('detects a single corrupted field and would report it in the diff', () => {
    const corruptedFixture: SalaryTotals = {
      ...salaryTotalsFixture,
      totalNeto: 999999, // intentionally wrong
    }
    const actual = computeSalaryTotals(salaryInput)

    // The real output must differ from the corrupted fixture (mismatch detected).
    expect(actual).not.toEqual(corruptedFixture)

    // And comparing against the corrupted fixture via toEqual throws — this is
    // exactly the failure path that, in a real regression, prints the differing
    // field (totalNeto) in Vitest's diff output.
    expect(() => expect(actual).toEqual(corruptedFixture)).toThrow()
  })
})
