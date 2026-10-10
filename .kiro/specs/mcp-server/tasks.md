# Implementation Plan: MCP Server for Financial Manager (Read-Only v1)

## Overview

This plan converts the design into incremental TypeScript coding steps. It begins by standing up the npm workspaces monorepo and an empty `shared/` package behind a regression gate (client build must keep passing), then migrates types and extracts pure business logic into `shared/` in behavior-preserving slices (each slice re-exported from the client so numbers never change), and finally scaffolds the `mcp-server/` package end-to-end: config, auth session, data-access + service + modular tool registry, one vertical-slice read tool, the remaining read tools, and documentation. Each extraction and tool is validated with Vitest unit/property tests tied to the design's correctness properties (P1–P8). No database migrations are required — the server is strictly read-only and introduces no schema change.

The implementation language is **TypeScript** (the design specifies concrete TS; the Pascal blocks are algorithm specifications for those TS functions).

## Tasks

- [x] 1. Set up npm workspaces monorepo and empty shared package
  - Create a root `package.json` declaring `"workspaces": ["client", "shared", "mcp-server"]` and `"private": true`; move the existing client into `client/` is already done (client is the existing workspace member).
  - Create `shared/package.json` with name `@financial-manager/shared`, `"type": "module"`, `main`/`types`/`exports` pointing at the build output and `src/index.ts`, and a `build` + `test` script.
  - Add `shared/tsconfig.json` (strict, no DOM lib, ES modules) and `shared/src/index.ts` as an empty barrel.
  - Add Vitest to `shared/` with one trivial passing test to prove the harness runs.
  - Regression gate: `npm run build -w client` still succeeds and `npm test -w shared` runs the trivial test green.
  - _Requirements: 2.1, 2.2_

  - [x] 1.1 Write the trivial shared smoke test
    - Add `shared/src/__tests__/smoke.test.ts` asserting a constant, confirming Vitest + TS config resolve.
    - _Requirements: 2.1_

- [x] 2. Move shared row types into shared/src/types.ts
  - Create `shared/src/types.ts` with the exact interfaces from the design: `Salary`, `Expense`, `FixedExpense`, `Payback`, `InvestmentChannel`, `InvestmentDeposit`, `InvestmentValueUpdate`, `ExpenseType`, `DropdownOption` (names and fields unchanged).
  - Re-export all types from the `shared/src/index.ts` barrel.
  - Update each client context (`SalaryContext`, `ExpensesContext`, `FixedExpensesContext`, `PaybacksContext`, `InvestmentChannelsContext`, `InvestmentDepositsContext`, `InvestmentValuesContext`, `ExpenseTypesContext`) to import its row type from `@financial-manager/shared` instead of declaring it locally.
  - Verify `npm run build -w client` still passes with zero TypeScript / module-resolution errors.
  - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [x] 3. Extract date and investment logic into shared
  - [x] 3.1 Extract dateUtils into shared/src/dateUtils.ts
    - Port `formatLocalDate`, `todayStr`, and `getEffectiveDate` verbatim from the client `dateUtils`; re-export from the barrel; make the client `dateUtils` re-export from `@financial-manager/shared`.
    - _Requirements: 3.1_

  - [x] 3.2 Extract the investment engine into shared/src/investments.ts
    - Port `computeChannelSummary`, `ChannelSummary`, and `CASH_PATH_LABEL` verbatim; add `computeInvestmentSummaries`, `computeInvestmentTotals`, and `computeReturnOverTime`; re-export from the barrel; make the client `computeChannelSummary.ts` re-export from `@financial-manager/shared`.
    - _Requirements: 3.2, 4.3, 5.1, 5.2, 5.3, 5.4, 5.7, 5.8, 8.5_

  - [x] 3.3 Write property test for cash-channel zero return
    - **Property 2: Cash channel zero return**
    - **Validates: Requirements 4.1, 4.2**
    - For any cash channel with ≥1 value update, assert `returnAbsolute === 0`, `returnPercent === 0`, `currentValue === latestByDate(vals).value`, `totalDeposits === currentValue`, and `lastUpdated === latest date`.

  - [x] 3.4 Write unit tests for cash-channel edge cases
    - Cash channel with no value updates returns a zeroed summary with `lastUpdated === null` (4.4); deposit/withdrawal rows are ignored for cash channels (4.3); last-updated equals latest value-update date (4.5).
    - _Requirements: 4.3, 4.4, 4.5_

  - [x] 3.5 Write property test for same-date event ordering
    - **Property 3: Same-date ordering**
    - **Validates: Requirements 5.5, 5.6**
    - Assert a same-date deposit then value-update equal to the post-deposit balance yields `returnAbsolute === 0`, and that same-type same-date events preserve input relative order.

  - [x] 3.6 Write unit tests for the event-sourcing engine math and dateUtils
    - Deposit adds to balance + invested capital (5.2); withdrawal subtracts from both (5.3); value-update accumulates delta then overrides balance (5.4); `returnPercent` guards `investedCapital <= 0` → 0 (5.7); last-updated = most recent event date (5.8); empty-events channel → zeroed summary with null date (5.9); `formatLocalDate`/`todayStr` are timezone-safe and `getEffectiveDate` resolves linked vs own date (3.1).
    - _Requirements: 3.1, 5.2, 5.3, 5.4, 5.7, 5.8, 5.9_

- [x] 4. Extract expense inflation and all-expenses/payback logic into shared
  - [x] 4.1 Extract inflateFixedExpense and computeAllExpenses into shared/src/expenses.ts
    - Port `inflateFixedExpense` (month generation, day clamping, synthetic `{fixedExpenseId}_{YYYY-MM-DD}` ids, end-date limit) and `computeAllExpenses` (merge + three-direction payback reduction + effective-date annotation + zero-amount filtering + date-DESC sort) verbatim; add `computeExpenseSummary`; re-export from the barrel.
    - _Requirements: 3.3, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 4.2 Refactor client to consume shared expense logic
    - Make `FixedExpensesContext` compute `inflatedExpenses` via `inflateFixedExpense` from `@financial-manager/shared`; refactor `ExpensesTablePage` and `ExpensesChartsPage` to call `computeAllExpenses` instead of the duplicated inline chain.
    - Verify `npm run build -w client` passes and the all-expenses table + charts render identical numbers.
    - _Requirements: 3.3, 3.6_

  - [x] 4.3 Write property test for inflation bounds
    - **Property 4: Inflation bounds**
    - **Validates: Requirements 6.1, 6.4, 6.5**
    - Assert every inflated row's date is in `[start_date, min(end_date, today)]`, exactly one row per calendar month, day clamped to month length (6.2), and start-after-limit yields zero rows (6.4).

  - [x] 4.4 Write property test for payback conservation
    - **Property 5: Payback conservation**
    - **Validates: Requirements 7.1, 7.2, 7.4**
    - Assert `to_me` linked to a regular expense reduces displayed amount by the payback sum clamped to 0 (7.1); `to_me` linked to a fixed expense reduces the last inflated row on/before the payback date cumulatively (7.2); `to_me` linked to a `by_me` payback reduces that `by_me` row by the sum clamped to 0 (7.4).

  - [x] 4.5 Write unit tests for all-expenses edge cases
    - `to_me`→fixed with no inflated row on/before the date leaves amounts unchanged and excludes the payback (7.3); `by_me` virtual rows excluded when adjusted amount is 0 (7.5); merged real + inflated + `by_me` rows sorted date DESC with created_at DESC tiebreak (7.6).
    - _Requirements: 7.3, 7.5, 7.6_

- [x] 5. Extract salary and investment-charts aggregations into shared
  - [x] 5.1 Extract salary aggregations into shared/src/salary.ts
    - Port `aggregateSalariesByMonth` (sum multiple employers per YYYY-MM, sorted ASC, no duplicate months) and `computeSalaryTotals` (totals, deductions, month count, averages, zero-month guard) verbatim; re-export from the barrel.
    - _Requirements: 3.4, 8.1, 8.2, 8.3, 8.4_

  - [x] 5.2 Refactor client charts pages to consume shared aggregations
    - Refactor `SalaryChartsPage` to use `aggregateSalariesByMonth` + `computeSalaryTotals`, and `InvestmentsChartsPage` to use `computeInvestmentSummaries` + `computeInvestmentTotals` + `computeReturnOverTime` from `@financial-manager/shared`.
    - Verify `npm run build -w client` passes and both charts pages render identical numbers.
    - _Requirements: 3.4, 3.6_

  - [x] 5.3 Write property/fixture test for extraction parity across all domains
    - **Property 1: Extraction parity**
    - **Validates: Requirements 3.5, 3.7, 3.8**
    - Record pre-refactor client outputs as fixtures for at least one investments, one expenses, and one salary case; assert shared output is deep-equal to each snapshot and that a mismatch fails the suite reporting the fixture + differing field.

  - [x] 5.4 Write unit tests for salary aggregation
    - Multiple employers in one month summed into one aggregation (8.1); months sorted ASC with no duplicates (8.2); totals/deductions/averages computed correctly (8.3); zero-month guard avoids division and returns zeros (8.4).
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 6. Checkpoint - shared extraction complete
  - Ensure all tests pass, ask the user if questions arise. Confirm `npm test -w shared` is green and `npm run build -w client` still succeeds before building the server.

- [x] 7. Scaffold mcp-server config and auth session
  - [x] 7.1 Create the mcp-server package skeleton
    - Add `mcp-server/package.json` (`"type": "module"`, depends on `@modelcontextprotocol/sdk`, `@supabase/supabase-js`, `zod`, `dotenv`, workspace `@financial-manager/shared`; dev `vitest`), `mcp-server/tsconfig.json`, a `build` script, and `mcp-server/.gitignore` ignoring `.env`.
    - _Requirements: 2.1, 2.4, 10.9_

  - [x] 7.2 Implement config.ts with alias resolution and fail-fast validation
    - Implement `loadConfig(env?)` resolving `SUPABASE_URL`, `SUPABASE_ANON_KEY`, email from `SUPABASE_USER_EMAIL` → `FINANCIAL_MANAGER_EMAIL`, password from `SUPABASE_USER_PASSWORD` → `FINANCIAL_MANAGER_PASSWORD`; load a git-ignored `.env` via dotenv without overriding existing env; treat unset/empty/whitespace as absent; throw naming accepted variable name(s); no hardcoded defaults.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 15.1_

  - [x] 7.3 Implement auth/session.ts
    - Implement `createSession(config)`: create a Supabase client with the anon key only, `signInWithPassword` once, hold session in memory (no disk writes), rely on auto token refresh, expose `getClient()`; throw a credential-free error on missing credentials or auth failure; never reference the service-role key.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 15.2_

  - [x] 7.4 Write property test for config aliases and fail-fast
    - **Property 7: Config aliases + fail-fast**
    - **Validates: Requirements 10.2, 10.3, 10.6**
    - With mocked env (no real credentials): both-set prefers the primary name for email and password (10.2, 10.3); each missing required value throws naming all accepted names (10.6); whitespace-only treated as absent (10.5).

  - [x] 7.5 Write unit tests for config dotenv behavior
    - `.env` present loads values without overriding already-set env (10.4); `.env` absent does not fail (10.4); no hardcoded URL/anon-key/credential defaults are returned (10.7).
    - _Requirements: 10.4, 10.7_

- [ ] 8. Build data-access, service, and modular tool registry with first vertical slice
  - [~] 8.1 Implement the data-access layer pattern with the salaries reader
    - Create `data/salaries.ts` with `fetchSalaries(client, filters)` applying `month` range, employer, order, and limit clauses; include the RLS isolation invariant comment (no `user_id` filter, no service-role client); return `shared/` `Salary[]`.
    - _Requirements: 11.1, 11.2, 11.3, 12.4, 12.11_

  - [~] 8.2 Define the tool descriptor types, registry, and server wiring
    - Define `ToolContext` (`client`, `server`, both non-null) and `ToolDescriptor` (`name`, `description`, `inputSchema` zod, `annotations`, `handler`); create `tools/registry.ts` as the descriptor array; implement `index.ts` boot: `loadConfig` → `createSession` → construct `McpServer` → iterate the registry once registering each tool with `readOnlyHint: true` → connect `StdioServerTransport`; log readiness to stderr only; exit non-zero on config/auth/transport failure.
    - _Requirements: 1.1, 1.3, 1.5, 13.1, 13.2, 13.3, 13.4, 13.5, 14.1, 14.2, 14.3_

  - [~] 8.3 Implement the salary service and the first two tools end-to-end
    - Add `services/salary.ts` composing `fetchSalaries` with `aggregateSalariesByMonth` + `computeSalaryTotals`; implement `list_salaries` and `get_salary_summary` tool modules (zod filter schemas, date-range `from>to` rejection, limit 1–1000 default 100, empty-result success), register them, and shape results as JSON text content.
    - _Requirements: 1.2, 1.4, 11.4, 12.1, 12.2, 12.3, 12.4, 12.12, 15.3, 15.4, 15.5, 15.6_

  - [ ]* 8.4 Write unit tests for the salary service, schemas, and registry
    - Service shaping against mocked data-access; zod schema accepts valid and rejects invalid args naming the failing field (12.3, 15.3); `from>to` date range rejected (12.12); registry iterated once with registered count equal to entry count and duplicate/missing-field entries rejected (13.2, 13.3); zero rows → successful empty structure (15.5).
    - _Requirements: 12.3, 12.12, 13.2, 13.3, 15.3, 15.5_

  - [ ]* 8.5 Write property test for stdout purity
    - **Property 8: stdout purity**
    - **Validates: Requirements 14.1, 14.2, 14.3**
    - Boot the server and invoke a tool against mocked session/data; assert stdout contains only MCP protocol frames while all logs/errors go to stderr.

- [~] 9. Checkpoint - first tool slice working
  - Ensure all tests pass, ask the user if questions arise. Confirm `npm run build -w mcp-server` succeeds and the registry wiring is exercised.

- [ ] 10. Implement remaining data readers and services
  - [~] 10.1 Implement the remaining entity data readers
    - Add `fetchExpenses`, `fetchFixedExpenses`, `fetchPaybacks`, `fetchChannels`, `fetchDeposits`, `fetchValueUpdates`, `fetchDropdownOptions` following the salaries pattern, each applying its design-specified filters as Supabase query clauses and repeating the RLS isolation invariant comment.
    - _Requirements: 11.1, 11.2, 11.3, 12.5, 12.6, 12.7, 12.8, 12.9, 12.11_

  - [~] 10.2 Implement the expense and investment services
    - Add `services/expenses.ts` (`computeAllExpenses` wiring deposits/inflation/paybacks/salaries; `computeExpenseSummary`) and `services/investments.ts` (`computeInvestmentSummaries`, `computeReturnOverTime` with `dateFrom`/`dateTo` returning all points in range), each composing the data readers with `@financial-manager/shared` computations.
    - _Requirements: 1.2, 11.4, 12.10_

  - [ ]* 10.3 Write unit tests for the expense and investment services
    - Service composition and filter pass-through against mocked data-access; `get_investment_return_over_time` returns all computed points within the requested range (12.10); zero-row cases return successful empty structures (15.5).
    - _Requirements: 12.10, 15.5_

- [ ] 11. Implement the remaining 11 read tools as registry modules
  - [~] 11.1 Implement the expense-domain tools
    - `list_expenses`, `list_fixed_expenses`, `list_paybacks`, `list_all_expenses`, `get_expense_summary` — each its own module with zod filter schema (date-range `from>to` rejection, limit 1–1000 default 100 where applicable, direction/person/category/activeOn filters per design), `readOnlyHint: true`, service/data call, JSON text shaping; add all to the registry.
    - _Requirements: 1.2, 1.3, 12.1, 12.2, 12.3, 12.5, 12.6, 12.7, 12.11, 12.12, 15.3, 15.5_

  - [~] 11.2 Implement the investment-domain and dropdown tools
    - `list_investment_channels`, `list_investment_deposits`, `list_investment_value_updates`, `get_investment_summaries`, `get_investment_return_over_time`, `list_dropdown_options` — each its own module with zod filter schema (channel/depositor/withdrawal/pension/category/date-range filters per design, limit 1–1000 default 100 where applicable), `readOnlyHint: true`, service/data call, JSON text shaping; add all to the registry.
    - _Requirements: 1.2, 1.3, 12.1, 12.2, 12.3, 12.8, 12.9, 12.10, 12.11, 12.12, 15.3, 15.5_

  - [ ]* 11.3 Write schema and shaping tests for all remaining tools
    - For each tool: valid-args parse, invalid-args rejection naming the failing field (12.3, 15.3), `from>to` rejection where date ranges apply (12.12), and zero-row success structure (15.5); confirm every registered tool has `readOnlyHint: true` and the registry count equals the 13-entry catalog (1.3, 13.2).
    - _Requirements: 1.3, 12.3, 12.12, 13.2, 15.3, 15.5_

- [ ] 12. Documentation, example config, and final verification
  - [~] 12.1 Write mcp-server docs and tracked example env
    - Create `mcp-server/README.md` documenting every required config variable (with aliases), install command(s), and start command(s); create tracked `mcp-server/.env.example` listing every consumed variable with non-sensitive placeholders only; ensure the README variable set matches the `.env.example` set.
    - _Requirements: 16.1, 16.2, 16.3_

  - [~] 12.2 Update the root README and run final verification
    - Update the root `README.md` to reflect the monorepo structure, the new `shared/` and `mcp-server/` packages, the read-only MCP tool catalog, and the unchanged migration count (no new migration); run final verification: `npm test -w shared` green, `npm run build -w client` succeeds, `npm run build -w mcp-server` succeeds.
    - _Requirements: 16.4, 3.6, 3.7_

- [~] 13. Final checkpoint - ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP, but each maps directly to a design correctness property or acceptance criterion.
- Each task references specific requirement clauses (not just user stories) for traceability.
- Property tests validate the design's eight correctness properties: P1 (extraction parity, 5.3), P2 (cash zero return, 3.3), P3 (same-date ordering, 3.5), P4 (inflation bounds, 4.3), P5 (payback conservation, 4.4), P7 (config aliases/fail-fast, 7.4), P8 (stdout purity, 8.5). P6 (RLS isolation) is enforced by the database and documented via the data-layer invariant comment (tasks 8.1 / 10.1) and asserted only in manual E2E, so it has no automated sub-task.
- No database migration is needed: the server is read-only and introduces no schema change.
- Extractions (tasks 2–5) are behavior-preserving — the client re-imports from `shared/` and must render identical numbers, gated by `npm run build -w client`.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["3.1", "3.2"] },
    { "id": 2, "tasks": ["3.3", "3.4", "3.5", "3.6", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4", "4.5", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "5.4", "7.1", "7.2", "7.3"] },
    { "id": 5, "tasks": ["7.4", "7.5", "8.1", "8.2"] },
    { "id": 6, "tasks": ["8.3", "10.1"] },
    { "id": 7, "tasks": ["8.4", "8.5", "10.2"] },
    { "id": 8, "tasks": ["10.3", "11.1", "11.2"] },
    { "id": 9, "tasks": ["11.3", "12.1"] },
    { "id": 10, "tasks": ["12.2"] }
  ]
}
```
