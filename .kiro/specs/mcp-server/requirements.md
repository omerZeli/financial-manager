# Requirements Document

## Introduction

This feature adds a local, read-only, stdio-based Model Context Protocol (MCP) server that exposes a single user's Financial Manager data (salaries, expenses, investments) to an AI agent. To avoid re-implementing business logic, the repository is restructured into an npm workspaces monorepo with three members: `shared/` (framework-agnostic types and pure computation functions), `client/` (the existing React + Vite app, refactored to import from `shared/` with zero behavior change), and `mcp-server/` (the Node/TypeScript stdio server).

The MCP server authenticates as the single user via Supabase `signInWithPassword` using environment-provided configuration, holds the resulting user JWT in memory, and relies entirely on existing Supabase Row Level Security (RLS) policies for per-user data isolation. It exposes 13 read-only tools backed by a modular tool registry so future write tools can be added with no restructuring. The repository is public, so no production URL, anon key, or credentials are ever committed.

This requirements document is derived from the approved design document and traces each requirement to the design's eight correctness properties where applicable.

## Glossary

- **MCP_Server**: The Node/TypeScript stdio-based Model Context Protocol server package (`mcp-server/`) that authenticates as the user and exposes read tools.
- **Shared_Package**: The `@financial-manager/shared` workspace package holding framework-agnostic row types and pure computation functions.
- **Client_App**: The existing React + Vite application in `client/`.
- **Config_Loader**: The `mcp-server/src/config.ts` component that reads and validates the four required configuration values from the environment.
- **Session_Manager**: The `mcp-server/src/auth/session.ts` component that creates the authenticated Supabase client and exposes `getClient()`.
- **Data_Access_Layer**: The `mcp-server/src/data/*` functions that read entity rows from Supabase and translate structured filters into query clauses.
- **Service_Layer**: The `mcp-server/src/services/*` functions that compose data-access reads with shared computations.
- **Tool_Registry**: The array of tool descriptors (`mcp-server/src/tools/registry.ts`) iterated at boot to register every tool.
- **Tool_Handler**: A tool descriptor's `handler` function that parses filters, invokes services or data access, and shapes the result.
- **RLS**: Supabase Row Level Security policies (`auth.uid() = user_id`) that scope every query to the authenticated user.
- **Event_Sourcing_Engine**: The `computeChannelSummary` function that replays deposit, withdrawal, and value-update events to compute investment balances and returns.
- **Cash_Channel**: An investment channel whose `investment_path` equals `CASH_PATH_LABEL`, for which value updates represent the balance directly and return is always zero.
- **Inflation_Function**: The `inflateFixedExpense` function that expands a fixed expense into one virtual monthly expense row.
- **Config_Value**: One of the four required configuration values: Supabase URL, Supabase anon key, user email, user password.
- **Protocol_Frame**: An MCP JSON-RPC message written to stdout as part of the protocol stream.

## Requirements

### Requirement 1: Read-only stdio MCP server exposing single-user financial data

**User Story:** As an AI agent, I want to query a single user's financial data over a local stdio MCP connection, so that I can answer questions about their salaries, expenses, and investments without any ability to modify data.

#### Acceptance Criteria

1. WHEN the MCP_Server starts, THE MCP_Server SHALL establish an MCP client connection over a stdio transport and complete the MCP initialization handshake before accepting any tool call.
2. THE MCP_Server SHALL expose only read-only operations, and each exposed operation SHALL perform SELECT queries against the Supabase backend and SHALL NOT perform any insert, update, or delete operation.
3. FOR ALL 13 tools exposed in version 1, THE MCP_Server SHALL set the tool's `readOnlyHint` annotation to the boolean value true.
4. WHILE a single process instance is running, THE MCP_Server SHALL serve financial data for exactly one authenticated user, and all data-access queries SHALL be scoped to that user's `user_id` as enforced by RLS.
5. IF the stdio transport connection cannot be established or the MCP initialization handshake fails at startup, THEN THE MCP_Server SHALL write an error message to stderr and SHALL exit with a non-zero status without accepting any tool call.

### Requirement 2: npm workspaces monorepo restructure

**User Story:** As a developer, I want the project organized as an npm workspaces monorepo with shared, client, and mcp-server members, so that business logic lives in one place and is reused across the browser app and the server.

#### Acceptance Criteria

1. THE repository SHALL be organized as an npm workspaces monorepo containing exactly the three workspace members `shared`, `client`, and `mcp-server`.
2. THE Shared_Package SHALL contain only TypeScript type declarations and pure functions, and SHALL NOT declare a runtime dependency on React, the DOM, or the Supabase client.
3. THE Client_App SHALL import its row types and pure computation functions from the `@financial-manager/shared` package specifier.
4. THE MCP_Server SHALL import its row types and pure computation functions from the `@financial-manager/shared` package specifier.
5. IF the Shared_Package source references React, the DOM, or the Supabase client, THEN the Shared_Package build SHALL fail with a non-zero exit code.

### Requirement 3: Behavior-preserving extraction of business logic into shared

**User Story:** As a developer, I want the extracted business logic to behave identically to the pre-refactor client code, so that the refactor introduces no regressions in displayed numbers.

#### Acceptance Criteria

1. THE Shared_Package SHALL provide the extracted functions `formatLocalDate`, `todayStr`, and `getEffectiveDate` from `dateUtils`.
2. THE Shared_Package SHALL provide the extracted investment functions `computeChannelSummary`, `computeInvestmentSummaries`, `computeInvestmentTotals`, and `computeReturnOverTime`.
3. THE Shared_Package SHALL provide the extracted expense functions `inflateFixedExpense`, `computeAllExpenses`, and `computeExpenseSummary`.
4. THE Shared_Package SHALL provide the extracted salary functions `aggregateSalariesByMonth` and `computeSalaryTotals`.
5. FOR ALL extraction fixtures, with at least one fixture covering each of the investments, expenses, and salary domains, computing a result with the Shared_Package functions SHALL produce output that is deep-equal (structural equality of every field and array element) to the recorded pre-refactor Client_App output snapshot for the same fixture input. (Validates: Property 1)
6. WHEN the client build command `npm run build -w client` is run after the extraction, THE build SHALL complete with a zero exit code and SHALL report no TypeScript compilation or module-resolution errors. (Validates: Property 1)
7. THE Shared_Package SHALL include a Vitest unit test for each extracted function listed in criteria 2, 3, and 4, and running the Shared_Package test suite SHALL complete with every test passing and a zero exit code.
8. IF any extraction fixture produces Shared_Package output that is not deep-equal to its recorded pre-refactor Client_App output snapshot, THEN the Shared_Package test suite SHALL fail with a non-zero exit code and SHALL report the mismatching fixture and the differing field. (Validates: Property 1)

### Requirement 4: Cash channel zero-return computation

**User Story:** As an AI agent, I want cash channels reported with a direct balance and zero return, so that checking-account style channels are summarized correctly.

#### Acceptance Criteria

1. WHERE a channel is a Cash_Channel with at least one value update, THE Event_Sourcing_Engine SHALL set the channel's current value to the value of the latest value update by date, breaking ties by the most recent creation timestamp. (Validates: Property 2)
2. WHERE a channel is a Cash_Channel with at least one value update, THE Event_Sourcing_Engine SHALL set the channel's total deposits equal to the current value and SHALL set both absolute return and return percent to zero. (Validates: Property 2)
3. WHERE a channel is a Cash_Channel, THE Event_Sourcing_Engine SHALL ignore deposit and withdrawal records when computing the channel's balance.
4. IF a Cash_Channel has no value updates, THEN THE Event_Sourcing_Engine SHALL return a zeroed summary whose total deposits, current value, absolute return, and return percent are all zero and whose last-updated date is null.
5. WHERE a channel is a Cash_Channel, THE Event_Sourcing_Engine SHALL set the channel's last-updated date to the date of the latest value update.

### Requirement 5: Event-sourcing summary computation and same-date ordering

**User Story:** As an AI agent, I want investment channel summaries computed by replaying events chronologically, so that balances and returns reflect the full event history correctly.

#### Acceptance Criteria

1. THE Event_Sourcing_Engine SHALL compute each non-cash channel's balance by replaying its deposit, withdrawal, and value-update events sorted ascending by date.
2. WHEN a deposit event is processed, THE Event_Sourcing_Engine SHALL add the deposit amount to both the running balance and the invested capital.
3. WHEN a withdrawal event is processed, THE Event_Sourcing_Engine SHALL subtract the withdrawal amount from both the running balance and the invested capital.
4. WHEN a value-update event is processed, THE Event_Sourcing_Engine SHALL accumulate the difference between the new value and the running balance as profit and then set the running balance to the new value.
5. WHEN sorting events that share the same date, THE Event_Sourcing_Engine SHALL order deposit and withdrawal events before value-update events and SHALL preserve the input relative order of events of the same type on that date. (Validates: Property 3)
6. WHEN a deposit and a value update occur on the same date with the value update equal to the post-deposit balance, THE Event_Sourcing_Engine SHALL report an absolute return of zero. (Validates: Property 3)
7. THE Event_Sourcing_Engine SHALL compute return percent as absolute return divided by invested capital, and WHERE invested capital is less than or equal to zero THE Event_Sourcing_Engine SHALL set return percent to zero.
8. THE Event_Sourcing_Engine SHALL set the channel's last-updated date to the date of the most recent processed event.
9. IF a channel has no events, THEN THE Event_Sourcing_Engine SHALL return a zeroed summary whose total deposits, current value, absolute return, and return percent are all zero and whose last-updated date is null.

### Requirement 6: Fixed-expense inflation bounds

**User Story:** As an AI agent, I want fixed expenses expanded into one virtual expense per month within the valid range, so that recurring expenses are represented consistently with the web app.

#### Acceptance Criteria

1. WHEN inflating a fixed expense whose start date is on or before the inflation limit, THE Inflation_Function SHALL generate exactly one virtual expense row for each calendar month from the start date's month through the inflation-limit month inclusive, where the inflation limit is the end date if the end date is non-null and earlier than today, and today otherwise. (Validates: Property 4)
2. THE Inflation_Function SHALL set each generated row's day to the minimum of the fixed expense's start-date day-of-month and the number of days in that generated row's own month. (Validates: Property 4)
3. THE Inflation_Function SHALL assign each generated row a synthetic identifier formatted as the fixed expense's identifier, followed by an underscore, followed by that row's date in `YYYY-MM-DD` form (`{fixedExpenseId}_{YYYY-MM-DD}`), and SHALL set each row's date field to the same `YYYY-MM-DD` value.
4. IF the fixed expense's start date is later than the inflation limit, THEN THE Inflation_Function SHALL produce zero virtual expense rows. (Validates: Property 4)
5. FOR ALL rows produced by the Inflation_Function, each row's date SHALL fall within the range from the start date through the inflation limit inclusive, with exactly one row per calendar month in that range. (Validates: Property 4)

### Requirement 7: Payback-adjusted all-expenses computation

**User Story:** As an AI agent, I want expense amounts adjusted for paybacks in all three directions, so that the reported totals match what the web app displays.

#### Acceptance Criteria

1. WHEN one or more `to_me` paybacks are linked to a regular expense, THE Service_Layer SHALL report that expense's displayed amount as the original amount minus the sum of all linked `to_me` payback amounts, clamped to a minimum of zero. (Validates: Property 5)
2. WHEN one or more `to_me` paybacks are linked to a fixed expense, THE Service_Layer SHALL reduce the amount of the last inflated expense dated on or before each payback's date by that payback amount, applying all linked paybacks cumulatively and clamping each adjusted inflated amount to a minimum of zero. (Validates: Property 5)
3. IF a `to_me` payback linked to a fixed expense has no inflated expense dated on or before the payback date, THEN THE Service_Layer SHALL leave all inflated amounts for that fixed expense unchanged and exclude that payback from the reduction. (Validates: Property 5)
4. WHEN one or more `to_me` paybacks are linked to a `by_me` payback, THE Service_Layer SHALL reduce that `by_me` payback's displayed amount by the sum of all linked `to_me` payback amounts, clamped to a minimum of zero. (Validates: Property 5)
5. THE Service_Layer SHALL represent each `by_me` payback as a virtual expense row whose amount is the `by_me` amount reduced per criterion 4, and SHALL exclude any such virtual row whose adjusted amount equals zero.
6. THE Service_Layer SHALL return the merged real, inflated, and `by_me` virtual rows sorted by date in descending order, breaking ties between rows with equal dates by descending creation timestamp.

### Requirement 8: Salary and investment aggregation

**User Story:** As an AI agent, I want salary and investment aggregations available as tools, so that I can report monthly totals and portfolio-level figures.

#### Acceptance Criteria

1. WHEN salaries span multiple employers in the same calendar month (identified by YYYY-MM), THE Shared_Package SHALL return a single monthly aggregation whose bruto equals the sum of all employer bruto amounts for that month and whose neto equals the sum of all employer neto amounts for that month.
2. THE Shared_Package SHALL return monthly salary aggregations sorted ascending by month in YYYY-MM order, with no duplicate month entries.
3. THE Shared_Package SHALL compute salary totals as total bruto (sum of all monthly bruto), total neto (sum of all monthly neto), total deductions (total bruto minus total neto), month count (count of distinct months), average bruto (total bruto divided by month count), and average neto (total neto divided by month count).
4. IF month count is zero, THEN THE Shared_Package SHALL return salary totals with total bruto, total neto, total deductions, average bruto, and average neto all equal to 0, and SHALL NOT perform a division by month count.
5. THE Shared_Package SHALL exclude Cash_Channels from total deposited and total return, SHALL include each Cash_Channel current value in total current value, and SHALL contribute 0 to total return for each Cash_Channel.

### Requirement 9: Single-user authentication with in-memory session

**User Story:** As a user, I want the server to authenticate as me using credentials from configuration, so that it can read my data without ever exposing those credentials to the AI model.

#### Acceptance Criteria

1. WHEN the MCP_Server boots, THE Session_Manager SHALL create a Supabase client using the anon key only.
2. WHEN the MCP_Server boots, THE Session_Manager SHALL authenticate exactly once via `signInWithPassword` using the configured email and password.
3. IF the configured email or password is missing or empty at boot, THEN THE Session_Manager SHALL abort startup and SHALL emit an error message indicating that authentication credentials are not configured, without exposing the credential values.
4. IF the `signInWithPassword` authentication attempt fails, THEN THE Session_Manager SHALL abort startup and SHALL emit an error message indicating that authentication failed, without exposing the credential values.
5. THE Session_Manager SHALL hold the authenticated session in memory only and SHALL NOT write the session, access token, or refresh token to disk or any persistent storage.
6. THE Session_Manager SHALL rely on the Supabase client's automatic token refresh to maintain the session.
7. IF automatic token refresh fails such that the session becomes invalid, THEN THE Session_Manager SHALL reject subsequent data operations and SHALL emit an error message indicating that the session is no longer valid, without exposing the credential values.
8. THE MCP_Server SHALL NOT use or reference the Supabase service-role key.
9. THE MCP_Server SHALL exclude user credentials, access tokens, and refresh tokens from all logs and all tool output returned to the AI model.

### Requirement 10: Environment-only configuration with aliases and fail-fast validation

**User Story:** As a user, I want all configuration provided through the environment with no committed secrets, so that the public repository stays free of credentials and misconfiguration is reported clearly.

#### Acceptance Criteria

1. THE Config_Loader SHALL resolve the Supabase URL from `SUPABASE_URL` and the Supabase anon key from `SUPABASE_ANON_KEY`.
2. THE Config_Loader SHALL resolve the user email from `SUPABASE_USER_EMAIL`, falling back to the alias `FINANCIAL_MANAGER_EMAIL`, and WHERE both are set THE Config_Loader SHALL use `SUPABASE_USER_EMAIL`. (Validates: Property 7)
3. THE Config_Loader SHALL resolve the user password from `SUPABASE_USER_PASSWORD`, falling back to the alias `FINANCIAL_MANAGER_PASSWORD`, and WHERE both are set THE Config_Loader SHALL use `SUPABASE_USER_PASSWORD`. (Validates: Property 7)
4. WHERE a git-ignored `mcp-server/.env` file is present, THE Config_Loader SHALL load its values into the environment without overriding variables already set in the environment, and WHERE it is absent, THE Config_Loader SHALL continue without failing.
5. THE Config_Loader SHALL treat a Config_Value that is unset, empty, or whitespace-only as absent.
6. IF a required Config_Value is absent, THEN THE Config_Loader SHALL throw an error naming the accepted variable name or names for that value. (Validates: Property 7)
7. THE Config_Loader SHALL contain no hardcoded URL, anon key, or credential default values.
8. THE repository SHALL track a `mcp-server/.env.example` file documenting the configuration variables with placeholder values only.
9. THE `mcp-server` package SHALL git-ignore the `.env` file.

### Requirement 11: Per-user data isolation enforced by RLS

**User Story:** As a user, I want data isolation enforced by the database, so that the server can never return another user's data through a code mistake.

#### Acceptance Criteria

1. FOR ALL Data_Access_Layer queries, THE query SHALL return only rows whose `user_id` matches the authenticated user, as enforced by RLS. (Validates: Property 6)
2. THE Data_Access_Layer SHALL NOT contain server-side authorization code that filters rows by user.
3. THE Data_Access_Layer SHALL document the RLS isolation invariant with a code comment at the data layer.
4. IF a Data_Access_Layer query is attempted while no authenticated session is active, THEN THE MCP_Server SHALL return a tool result marked as an error and SHALL NOT return any row data.

### Requirement 12: Read tools with structured filters

**User Story:** As an AI agent, I want a defined set of read tools with structured filters, so that I can retrieve exactly the financial data I need.

#### Acceptance Criteria

1. THE MCP_Server SHALL expose the tools `list_salaries`, `get_salary_summary`, `list_expenses`, `list_fixed_expenses`, `list_paybacks`, `list_all_expenses`, `get_expense_summary`, `list_investment_channels`, `list_investment_deposits`, `list_investment_value_updates`, `get_investment_summaries`, `get_investment_return_over_time`, and `list_dropdown_options`.
2. THE MCP_Server SHALL validate each tool's input arguments against that tool's declared schema before invoking the tool's handler.
3. IF a tool's input arguments fail schema validation, THEN THE MCP_Server SHALL return a tool result marked as an error that identifies the failing argument and SHALL NOT invoke the tool's handler.
4. WHEN `list_salaries` is called, THE MCP_Server SHALL support optional filters for date range on month (ISO YYYY-MM-DD bounds), employer, and limit (an integer from 1 to 1000, defaulting to 100 when omitted).
5. WHEN `list_expenses` is called, THE MCP_Server SHALL support optional filters for date range (ISO YYYY-MM-DD bounds), category, and limit (an integer from 1 to 1000, defaulting to 100 when omitted).
6. WHEN `list_fixed_expenses` is called, THE MCP_Server SHALL support optional filters for category, active-on date (ISO YYYY-MM-DD), and limit (an integer from 1 to 1000, defaulting to 100 when omitted).
7. WHEN `list_paybacks` is called, THE MCP_Server SHALL support optional filters for direction, person, date range (ISO YYYY-MM-DD bounds), and limit (an integer from 1 to 1000, defaulting to 100 when omitted).
8. WHEN `list_investment_deposits` is called, THE MCP_Server SHALL support optional filters for channel, depositor, withdrawal flag, date range (ISO YYYY-MM-DD bounds), and limit (an integer from 1 to 1000, defaulting to 100 when omitted).
9. WHEN `list_investment_value_updates` is called, THE MCP_Server SHALL support optional filters for channel, date range (ISO YYYY-MM-DD bounds), and limit (an integer from 1 to 1000, defaulting to 100 when omitted).
10. WHEN `get_investment_return_over_time` is called, THE MCP_Server SHALL support optional filters for channel, pension flag, and date range (ISO YYYY-MM-DD bounds) and SHALL return all computed return points within the requested range.
11. WHEN a tool applies a filter that the Supabase query can express, THE Data_Access_Layer SHALL apply that filter in the Supabase query to limit the returned payload.
12. IF a date-range filter is provided with a start date later than its end date, THEN THE MCP_Server SHALL return a tool result marked as an error and SHALL NOT invoke the tool's handler.

### Requirement 13: Modular tool-registry architecture with future write accommodation

**User Story:** As a developer, I want the tool architecture to be modular and already elicitation-capable, so that future write tools can be added without restructuring.

#### Acceptance Criteria

1. THE MCP_Server SHALL define each tool as a self-contained descriptor containing a non-empty unique name, a non-empty description, an input schema, annotations, and a handler reference, where every field is present and no field is null.
2. WHEN the MCP_Server completes boot, THE MCP_Server SHALL register every tool present in the Tool_Registry by iterating the registry exactly once, such that the count of registered tools equals the count of registry entries.
3. IF a Tool_Registry entry is missing any required descriptor field or declares a name that duplicates an already-registered tool, THEN THE MCP_Server SHALL reject that entry, exclude it from the registered tools, and surface an error indication identifying the offending entry.
4. WHEN the MCP_Server invokes any Tool_Handler, THE MCP_Server SHALL pass a tool context containing a reference to the authenticated client and a reference to the server instance, with both references non-null.
5. WHERE a future write tool is added as a new Tool_Registry entry conforming to the descriptor structure, THE MCP_Server SHALL register and invoke it using the existing registry iteration, handler signature, and server wiring with zero modification to those three mechanisms.

### Requirement 14: Logging discipline and stdout purity

**User Story:** As an AI agent, I want the stdout stream reserved for the MCP protocol, so that the connection is never corrupted by stray output.

#### Acceptance Criteria

1. FOR ALL tool calls and boot steps, THE MCP_Server SHALL write to stdout only MCP Protocol_Frames and no other bytes. (Validates: Property 8)
2. THE MCP_Server SHALL direct all informational, warning, error, and debug logging output to stderr. (Validates: Property 8)
3. IF an unhandled error or exception occurs during a tool call or a boot step, THEN THE MCP_Server SHALL write the diagnostic detail to stderr and SHALL NOT write it to stdout. (Validates: Property 8)

### Requirement 15: Error handling

**User Story:** As a user and AI agent, I want clear and safe error handling, so that failures are diagnosable without leaking secrets and the agent can recover where possible.

#### Acceptance Criteria

1. IF a required Config_Value is absent on boot, THEN THE MCP_Server SHALL log an error to stderr naming every accepted variable name for that Config_Value and SHALL exit with a non-zero status.
2. IF `signInWithPassword` fails on boot, THEN THE MCP_Server SHALL log to stderr an error indicating authentication failure that excludes the password, access token, and session token values, and SHALL exit with a non-zero status.
3. IF a tool's input arguments fail schema validation, THEN THE MCP_Server SHALL return a tool result marked as an error that identifies each failing field name and the reason it failed, and SHALL NOT execute the tool's query.
4. IF a Supabase query fails mid-session, THEN THE MCP_Server SHALL return a tool result marked as an error with a message that excludes connection strings, credentials, and session tokens, SHALL log the full error detail to stderr, and SHALL keep the session alive and able to accept subsequent tool calls.
5. WHEN a tool query matches zero rows, THE MCP_Server SHALL return a tool result marked as successful containing an empty collection structure.
6. IF a tool result error message would contain a Config_Value, credential, access token, or session token, THEN THE MCP_Server SHALL redact that value from the message before returning it.

### Requirement 16: Documentation

**User Story:** As a developer, I want documentation kept in sync with the server, so that others can configure and run it correctly.

#### Acceptance Criteria

1. THE `mcp-server/README.md` SHALL document every required configuration variable, the install command or commands, and the start command or commands for the MCP_Server.
2. THE tracked `mcp-server/.env.example` SHALL list every configuration variable consumed by the MCP_Server, each with a non-sensitive placeholder value, and SHALL NOT contain any real secret or credential.
3. THE set of configuration variables listed in `mcp-server/README.md` SHALL match the set listed in `mcp-server/.env.example`.
4. WHEN the MCP server feature changes the project's features, tech stack, structure, schema, architecture, or migration count, THE root `README.md` SHALL be updated within the same change set to reflect the change.
