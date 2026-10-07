# Implementation Plan — MCP Server for Financial Manager (Read-Only v1)

## Problem Statement

Build a local MCP server, packaged as a new top-level `mcp-server/` Node/TypeScript
module in this repo, that lets an AI agent query a single user's financial data
(salaries, expenses, investments) from the Financial Manager Supabase backend. v1 is
strictly read-only, but the architecture must be modular so create/update tools (with a
confirmation gate) can be added later without restructuring. Per-user data isolation is
enforced by the existing Supabase RLS policies — the server authenticates as the user and
never bypasses RLS.

## Requirements

- **Auth:** user configures credentials via env vars read by the MCP server. On boot the
  server calls `signInWithPassword`, holds the session in memory, and auto-refreshes. The
  AI model never sees credentials.
- **Transport:** local stdio server, launched by the AI client, one instance per user.
- **Scope:** read-only in v1. Expose entity-list tools AND computed/summary tools that
  reuse the project's existing calculations (investment event-sourcing summaries +
  return-over-time, expense inflation + payback-adjusted totals, salary bruto/neto
  aggregation). No re-implementation of business logic.
- **Filters:** each tool accepts structured optional filters mirroring the web UI (date
  ranges, category, employer, channel, limit).
- **Isolation:** enforced entirely by RLS via the user's JWT. The server must never use the
  service-role key.
- **Sharing strategy:** extract the project's pure business logic out of the React `.tsx`
  files into a new `shared/` workspace package consumed by both `client/` and
  `mcp-server/`. SDK: official `@modelcontextprotocol/sdk` over stdio with `zod` input
  schemas.

## Config / Credentials Decision (IMPORTANT — public repo)

- This repo is **PUBLIC**. Do NOT commit the production Supabase URL or anon key into
  `config.ts` or any git-tracked file. No hardcoded production defaults anywhere in tracked
  source.
- All four config values come from the environment only:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - email: `SUPABASE_USER_EMAIL` with `FINANCIAL_MANAGER_EMAIL` as an accepted alias
  - password: `SUPABASE_USER_PASSWORD` with `FINANCIAL_MANAGER_PASSWORD` as an accepted alias
- The server loads a local, git-ignored `.env` from the `mcp-server/` directory on boot
  (dotenv-style) so values can live there for local dev; MCP client configs can also inject
  them directly as process env.
- Fail-fast validation requires all four values at runtime; a missing value exits with a
  clear message naming the accepted variable name(s).
- Add `mcp-server/.gitignore` ignoring `.env` and any local config file. A tracked
  `mcp-server/.env.example` documents every variable with placeholder values.
- The "non-technical user supplies only email + password" experience is a
  distribution/packaging concern (shipped/installed `.env` or client config provides URL +
  anon key) — NOT committed defaults.
- Never use the service-role key. The local `client/.env` may be read for local testing
  only; those exact credentials must never be written into any tracked file.

## Background (grounded in the codebase)

- The client (`client/`) is React + Vite talking directly to Supabase via
  `@supabase/supabase-js` using `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (see
  `client/src/lib/supabase.ts`, `client/.env.example`).
- Every data table (`salaries`, `expenses`, `fixed_expenses`, `paybacks`,
  `investment_channels`, `investment_deposits`, `investment_value_updates`,
  `expense_types`, `user_dropdown_options`) has `user_id` with RLS policies enforcing
  `auth.uid() = user_id` for all operations, `WITH CHECK` on updates, and FK-ownership
  triggers (`check_fk_owner`). Strong, verified isolation foundation.
- Portable logic already isolated in `client/src/lib/`: `computeChannelSummary.ts`
  (investment event-sourcing engine + `CASH_PATH_LABEL`) and `dateUtils.ts`
  (`formatLocalDate`, `todayStr`, `getEffectiveDate`).
- Entangled logic to extract: fixed-expense inflation (`inflateFixed` in
  `FixedExpensesContext.tsx`) and the all-expenses merge + payback-reduction +
  effective-date attribution logic, duplicated between `ExpensesTablePage.tsx` and
  `ExpensesChartsPage.tsx` (the `toMeByExpense`/`toMeByFixed`/`toMeByPayback`/
  `byMeExpenses`/`allExpensesRaw` chain).
- Return-over-time and salary aggregation logic live in `InvestmentsChartsPage.tsx` and
  `SalaryChartsPage.tsx` (confirm exact algorithms during the relevant tasks).
- Row data types (`Expense`, `FixedExpense`, `Payback`, `InvestmentDeposit`,
  `InvestmentValueUpdate`, etc.) are declared inside context `.tsx` files and must move to
  `shared/`.
- No test framework yet; set up Vitest (standard for Vite/TS) in the `shared/` package.

## Proposed Solution

Introduce npm workspaces at the repo root with three members: `client/`, `shared/`,
`mcp-server/`.

1. `shared/` holds framework-agnostic types + pure computation functions (no React, no
   Supabase client, no DOM). Single source of truth for business logic.
2. `client/` refactored to import types and computations from `shared/`. Existing build
   (`tsc -b && vite build`) and runtime behavior must stay identical — regression gate.
3. `mcp-server/` authenticates as the user, fetches rows via a thin Supabase data-access
   layer (RLS does isolation), feeds them through `shared/` computations, exposes
   everything through a modular tool registry over stdio.

```
┌─────────────────────────────────────────────────────────┐
│          financial-manager repo (npm workspaces)          │
│                                                           │
│   shared/      types + pure computations + tests          │
│   client/      React app  ── imports ──▶ shared/          │
│   mcp-server/  stdio MCP server ── imports ──▶ shared/    │
└─────────────────────────────────────────────────────────┘
        │                                   │
        │ user JWT                          │ signInWithPassword, user JWT
        ▼                                   ▼
   ┌─────────────────────────────────────────────┐
   │        Supabase  (RLS per user)              │
   └─────────────────────────────────────────────┘
        ▲
        │ stdio, tool calls
   ┌────────────────────┐
   │ AI Agent / MCP client │
   └────────────────────┘
```

MCP server internals layered so writes drop in later cleanly:

- `auth/session.ts` — sign-in + token refresh, exposes an authenticated Supabase client.
- `data/` — one read function per entity, returning `shared/` types.
- `services/` — compute functions combining `data/` + `shared/` logic.
- `tools/` — each tool a self-contained module exporting
  `{ name, description, inputSchema (zod), annotations: { readOnlyHint: true }, handler }`.
  Central registry array registers them. Write tools (future) add
  `annotations.destructiveHint` + elicitation-based confirmation; registry/server need no
  changes. v1 handler signature already passes a server/elicitation-capable context so
  adding confirmation later needs no refactor.

### Confirmation gate for future writes (design accommodation only, not built in v1)

Write tools will set `readOnlyHint:false` / `destructiveHint:true` annotations (so clients
auto-prompt) and call a `requestConfirmation(summary)` helper that uses MCP **elicitation**
to ask the user yes/no before executing, with the client's own approval prompt as the
backstop. The v1 registry/handler signature will already pass the server context needed for
elicitation so adding this later requires no refactor.

---

## Task Breakdown

### Task 1: Set up npm workspaces and an empty `shared/` package

**Objective:** Establish the monorepo structure without changing behavior. Root
`package.json` declaring workspaces `["client", "shared", "mcp-server"]`. Create `shared/`
with its own `package.json` (name `@financial-manager/shared`, `type: module`),
`tsconfig.json`, `src/index.ts` barrel, Vitest devDependency + `test` script. Placeholder
exports.

**Guidance:** `client/` untouched functionally. `npm install` at root links the workspace.
`mcp-server/` contents not created yet (empty/minimal placeholder fine).

**Test:** One trivial Vitest test in `shared/`; confirm `npm test -w shared` runs. Confirm
`npm run build -w client` still succeeds.

**Demo:** `npm test -w shared` passes and `npm run build -w client` succeeds, showing
workspace wired up and client build unaffected.

### Task 2: Move shared data types into `shared/`

**Objective:** Extract row-shape interfaces (`Salary`, `Expense`, `FixedExpense`,
`Payback`, `InvestmentChannel`, `InvestmentDeposit`, `InvestmentValueUpdate`,
`ExpenseType`, dropdown option) from client context `.tsx` files into
`shared/src/types.ts`, exported from barrel. Re-export/import from original context files
so existing client imports keep working.

**Guidance:** Pure type-only move. Keep names identical. Update context files to import
from `@financial-manager/shared`.

**Test:** Type-check via client build as the gate.

**Demo:** `npm run build -w client` succeeds; types now live in `shared/` and contexts
import them.

### Task 3: Extract pure date + investment logic into `shared/` and refactor client to consume it

**Objective:** Move `dateUtils.ts` (`formatLocalDate`, `todayStr`, `getEffectiveDate`) and
`computeChannelSummary.ts` (engine + `ChannelSummary` + `CASH_PATH_LABEL`) into
`shared/src/`. Update `client/src/lib/*` to re-export from `shared` (keeping existing import
paths valid) or update client imports directly.

**Guidance:** Already pure — low-risk relocation. Preserve exact behavior including
same-date event ordering and cash-channel handling.

**Test:** Vitest unit tests in `shared/` for `computeChannelSummary`
(deposit/withdrawal/value-update checkpoint math, cash-channel branch, empty case) and
`dateUtils` (timezone-safe formatting, effective date with/without salary link).

**Demo:** `npm test -w shared` passes investment engine + date utils tests;
`npm run build -w client` succeeds.

### Task 4: Extract expense inflation + all-expenses/payback computation into `shared/` and refactor both client pages

**Objective:** Create `shared/src/expenses.ts` with pure functions:
`inflateFixedExpense(fe, today)` (ported from `inflateFixed`), and
`computeAllExpenses({ expenses, inflatedExpenses, paybacks, fixedExpenses, salaries })`
returning the merged, payback-adjusted, effective-date-annotated list currently duplicated
in `ExpensesTablePage.tsx` and `ExpensesChartsPage.tsx`. Refactor `FixedExpensesContext.tsx`,
`ExpensesTablePage.tsx`, `ExpensesChartsPage.tsx` to call these shared functions, removing
duplicated inline logic.

**Guidance:** Highest-risk refactor. Preserve exact semantics: `to_me` reductions on
regular expenses, fixed-expense reduction applied to last inflated entry on/before payback
date, `by_me` paybacks as virtual rows reduced by linked `to_me`, synthetic ID formats,
zero-amount filtering, salary effective-date attribution. Keep UI-specific fields
(`_paybackPerson`, `_originalAmount`) as a thin adapter on top of the shared result so the
shared function stays UI-agnostic. Fallback if exact parity can't be preserved cleanly for a
specific piece: port into shared without touching the client for that piece.

**Test:** Vitest tests in `shared/` covering inflation month generation (day clamping,
end-date limits), payback reductions in all three directions, effective-date shifts.

**Demo:** `npm test -w shared` passes new expense tests; `npm run dev -w client` shows
expenses table "all expenses" tab and charts render identical numbers;
`npm run build -w client` succeeds.

### Task 5: Extract salary and investment-charts aggregations into `shared/`

**Objective:** Read `SalaryChartsPage.tsx` and `InvestmentsChartsPage.tsx`, extract pure
aggregation logic (salary bruto/neto by month and totals; investment totals and
`returnOverTime` sampling built on `computeChannelSummary`) into `shared/src/salary.ts` and
`shared/src/investments.ts`. Refactor both pages to consume shared functions.

**Guidance:** Confirm exact return-over-time sampling algorithm from the page before
extracting (uses event-sourcing engine at sampled dates). Preserve the 18-month
display-limit behavior at the page level (display concern — keep in page, not shared).

**Test:** Vitest tests for salary monthly aggregation and investment totals/return-over-time
at known sample dates.

**Demo:** `npm test -w shared` passes; salary and investment charts render identical values
in `npm run dev -w client`; client build succeeds.

### Task 6: Scaffold the `mcp-server/` package with authenticated Supabase session

**Objective:** Create `mcp-server/` with `package.json` (deps:
`@modelcontextprotocol/sdk`, `@supabase/supabase-js`, `zod`, `@financial-manager/shared`,
dotenv), `tsconfig.json`, build script. Implement `src/config.ts` reading all four values
from env with email/password aliases
(`SUPABASE_USER_EMAIL`/`FINANCIAL_MANAGER_EMAIL`,
`SUPABASE_USER_PASSWORD`/`FINANCIAL_MANAGER_PASSWORD`), loading a git-ignored local `.env`
via dotenv, and fail-fast-validating all four with clear per-variable messages naming
accepted names. NO hardcoded URL/anon key defaults in source. Implement `src/auth/session.ts`
(Supabase client with anon key, `signInWithPassword`, `getClient()`, in-memory session,
rely on supabase-js auto-refresh). Add `src/index.ts` entry that boots, signs in, logs
readiness to **stderr only** (stdout reserved for MCP protocol). Add `mcp-server/.gitignore`
ignoring `.env` and local config.

**Guidance:** Never read or expose a service-role key. Log auth errors to stderr without
printing credentials. In-memory session, no disk writes.

**Test:** Config parsing tests (Vitest/node) with mocked env: email+password+url+anon all
present; env overrides; alias variables for email/password; missing-variable error path per
required variable. No real credentials in tests.

**Demo:** With env vars set, server authenticates and prints a readiness line to stderr.
With a missing var, exits with a clear error.

### Task 7: Build the data-access + service layer and the modular tool registry with one end-to-end read tool

**Objective:** Implement `src/data/` fetchers (start with `fetchSalaries`), `src/services/`
(start with a salary summary using `shared/` salary aggregation), and the tool framework:
`ToolDescriptor` type (`name`, `description`, `inputSchema: zod`, `annotations`, `handler`),
`registry.ts` array, server wiring registering every descriptor with the MCP SDK over
stdio. Implement first real tool `list_salaries` (optional date-range/employer/limit
filters) end to end, plus `get_salary_summary`.

**Guidance:** Mark tools `annotations.readOnlyHint:true`. Return structured JSON text
content. Pass a server/elicitation-capable context into handlers now (unused by reads) so
future write tools can request confirmation without a signature change. Enforce nothing
about ownership in code — RLS scopes to user; add a comment documenting that invariant.

**Test:** Unit-test service layer against mocked data-access (filter logic, summary math).
Validate schema parsing of filter args.

**Demo:** Connect an MCP client (or SDK inspector) over stdio; call `list_salaries` and
`get_salary_summary`; user's real salary rows and computed totals come back, scoped to that
user.

### Task 8: Implement the remaining read tools across all entities and computed summaries

**Objective:** Add full read tool set as individual registry modules: `list_expenses`,
`list_fixed_expenses`, `list_paybacks`, `list_all_expenses` (via `shared`
`computeAllExpenses`), `get_expense_summary` (inflation + payback-adjusted totals, category
breakdown), `list_investment_channels`, `list_investment_deposits`,
`list_investment_value_updates`, `get_investment_summaries` (via `computeChannelSummary`),
`get_investment_return_over_time`, `list_dropdown_options`. Each with structured filters
mirroring the UI (date ranges, category, channel, employer, pension, limit).

**Guidance:** Reuse `shared/` for every computation — no business logic in handlers beyond
filter application and shaping. Each tool in its own file registered through the central
registry so future write tools slot in identically.

**Test:** Service-layer unit tests for each computed tool (expense summary, channel
summaries, return-over-time) against mocked data; schema tests for filter inputs.

**Demo:** Over stdio, call computed tools; numbers match the web UI for the same user
(investment summaries equal channels tab, all-expenses totals equal expenses charts). Agent
can answer questions like "what did I spend on groceries last 3 months" and "what's my
portfolio return".

### Task 9: Documentation, example client config, and final verification

**Objective:** Add `mcp-server/README.md` documenting env vars, build/run, stdio launch
command, example MCP client config block. Add tracked `mcp-server/.env.example` listing all
four variables with placeholder values. Update root `README.md` per project rules (new
`mcp-server/` and `shared/` packages, workspace structure, tech stack, feature list, note
that writes are not yet supported). Document the modular tool-registry pattern and the
planned write-confirmation (annotations + elicitation) approach for the next phase.

**Guidance:** Keep `README.md` in sync (project rule). No real credentials anywhere. README
primary path: supply email + password; document URL + anon key provided via installed
`.env` or client config (not committed), plus local-dev override instructions. Note the
RLS-based isolation guarantee explicitly in the server README. Example MCP client config
references variables without real values.

**Test:** Full verification pass: `npm test -w shared` (all green),
`npm run build -w client` (succeeds, no behavior change), `npm run build -w mcp-server`
(succeeds). Manual end-to-end: launch server from an MCP client using documented config,
exercise a few tools. Clean up temp files.

**Demo:** A fresh reader follows the server README to configure their MCP client, launches
the server, and has the agent answer read-only questions about their own financial data —
isolation enforced by Supabase RLS.

---

## Notes on Risk / Intent

- Tasks 4 and 5 refactor working client code; the guarantee is behavioral parity, enforced
  by the existing client build plus new `shared/` unit tests. If any extraction can't
  preserve exact semantics cleanly, fall back to porting that specific piece into shared
  without touching the client.
- v1 ships zero write capability; the confirmation-gate work (annotations + elicitation) is
  only accommodated in the design, not implemented.
- Public repo: never commit production Supabase URL/anon key or any real credentials to
  tracked files. Local `client/.env` may be read for local testing only.
