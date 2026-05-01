---
inclusion: always
---

# Project Overview – Financial Manager

## Language & Direction
- The entire UI is in **Hebrew**.
- Layout direction is **RTL** (right-to-left).

## Purpose
A personal financial manager built with React + Supabase.

## Tech Stack
- **Frontend:** React + TypeScript + Vite
- **Backend:** Supabase (Auth + PostgreSQL)
- **Styling:** Plain CSS

## Current State
- Login and registration pages
- Auth context and protected routes
- A `profiles` table linked to `auth.users` (auto-created on signup)
- Placeholder home page (דשבורד)
- Salary section with table + charts pages, employer dropdown
- Expenses section with regular and fixed expense types, paybacks (to me / by me), FAB type picker, inflation logic, and charts
- Investments section with channels, deposits, value updates, FAB type picker, and charts

## Authentication
- Supabase Auth with email/password
- `AuthProvider` context (`src/contexts/AuthContext.tsx`) wraps the app and exposes `user`, `session`, `profile`, `loading`, `signOut`
- `ProtectedRoute` (`src/components/ProtectedRoute.tsx`) redirects unauthenticated users to `/login`
- `GuestRoute` (inline in `App.tsx`) redirects authenticated users to `/`
- On signup, a DB trigger auto-creates a row in `profiles` with `id`, `email`, and `display_name`

### Login Page (`/login` — `src/pages/LoginPage.tsx`)
- Fields: email (dir="ltr"), password (dir="ltr")
- Submit calls `supabase.auth.signInWithPassword`, navigates to `/` on success
- Error displayed in `.auth-error` banner
- Link to register page at the bottom

### Register Page (`/register` — `src/pages/RegisterPage.tsx`)
- Fields: display name, email (dir="ltr"), password (dir="ltr", minLength=6)
- Submit calls `supabase.auth.signUp` with `display_name` in user metadata
- Error displayed in `.auth-error` banner
- Link to login page at the bottom

### Auth Styles (`src/pages/Auth.css`)
- `.auth-container` — centered full-viewport flex container with `var(--bg-subtle)` background
- `.auth-form` — max-width 420px card with border, radius, shadow, gap 16px, padding 40px
- `.auth-form h1` — 26px centered heading
- `.auth-form label` — 13px bold, `var(--text-h)` color
- `.auth-form input` — 12px/14px padding, border with focus ring using `var(--accent)`
- `.auth-form button[type="submit"]` — accent-colored, 15px bold, hover/active/disabled states
- `.auth-error` — red-tinted banner for error messages
- `.auth-link` — centered link text with accent-colored anchor
- `.auth-loading` — centered full-viewport loading text

## UI Theme & Global Styles

### CSS Variables (`src/index.css`)
- `--text: #64748b` — body text color
- `--text-h: #0f172a` — heading/strong text color
- `--bg: #ffffff` — card/surface background
- `--bg-subtle: #f8fafc` — page background
- `--border: #e2e8f0` — standard border
- `--border-light: #f1f5f9` — light border
- `--accent: #2563eb` — primary accent (blue)
- `--accent-hover: #1d4ed8` — accent hover state
- `--accent-bg: rgba(37, 99, 235, 0.06)` — accent tint background
- `--accent-border: rgba(37, 99, 235, 0.2)` — accent border
- `--success: #059669` / `--success-bg: #ecfdf5` — success states
- `--error: #dc2626` / `--error-bg: #fef2f2` — error states
- `--shadow-sm`, `--shadow`, `--shadow-md`, `--shadow-lg` — elevation levels
- `--radius: 12px`, `--radius-sm: 8px`, `--radius-lg: 16px` — border radii
- `--sans` / `--heading`: Inter font family
- `--mono`: JetBrains Mono

### Global Resets
- `direction: rtl` on `:root`
- `box-sizing: border-box` on `*`
- Number input spinners hidden
- `#root` is full-width flex column, min-height 100svh
- `body` margin 0
- `h1` 32px, `h2` 22px, `h3` 17px — all weight 600, `var(--text-h)`, negative letter-spacing
- `::selection` uses accent colors

### HTML (`index.html`)
- `<html lang="he" dir="rtl">`
- Google Fonts: Inter (400, 500, 600, 700)
- Favicon: `/favicon.svg`

### App Layout (`src/components/common/AppLayout.tsx` + `.css`)
- Sticky top nav bar (56px height) with border-bottom
- Nav links: each is a `NavLink` with icon SVG + Hebrew label, active state uses accent colors
- User section: greeting based on time of day + display name, sign-out button
- `<Outlet />` renders child routes in `<main className="app-content">`

## Page Structure

The app has three main financial sections, each accessible from the top nav: **משכורת** (Salary), **הוצאות** (Expenses), and **השקעות** (Investments).

Each section contains two sub-pages, toggled via a tab-style switcher within the page:

1. **טבלה (Data Table)** — Displays all records for that section in a table. Includes an "add" button (icon) that opens a form/modal to create a new entry with fields relevant to the section's financial subject.
2. **גרפים (Charts)** — Visualizes the section's data with charts and summaries for analysis.

### Routing
- `/salary` → Salary section (default tab: table)
- `/salary/charts` → Salary charts
- `/expenses` → Expenses section (default tab: table)
- `/expenses/charts` → Expenses charts
- `/investments` → Investments section (default tab: table)
- `/investments/charts` → Investments charts

### Shared Patterns
- Each section follows the same two-tab layout (table + charts).
- The data table page includes an add-item floating action button that opens a form with fields specific to that section.
- Data is managed via a dedicated React Context per section (see Data Caching Pattern).
- Charts pages consume the same context to visualize the cached data.

### Salary Section

#### Salaries (`salaries` table)
- Fields: `month`, `employer`, `bruto`, `neto`
- Context: `SalaryContext` (`src/contexts/SalaryContext.tsx`)
- Dropdown employer: `employer`
- The table shows columns: month, employer, bruto, neto.
- When the user has exactly one employer option, it is auto-selected as the default in the add form.

### Expenses Section

The expenses section supports two types of expenses, managed via a **FAB type picker** and **sub-tabs**.

#### FAB Type Picker
- Clicking the + FAB does **not** open a form directly. Instead it opens a small popup menu with options for each expense type.
- Each option opens its own dedicated form modal.
- This pattern should be reused for any section that supports multiple entry types.

#### Regular Expenses (`expenses` table)
- Fields: `name`, `category`, `amount`, `date`, `salary_id` (nullable FK to salaries)
- Context: `ExpensesContext` (`src/contexts/ExpensesContext.tsx`)
- Dropdown category: `expense_category`

#### Fixed Expenses (`fixed_expenses` table)
- Fields: `name`, `category`, `amount`, `start_date`, `end_date` (nullable), `salary_employer` (nullable text — employer name for salary deduction)
- Context: `FixedExpensesContext` (`src/contexts/FixedExpensesContext.tsx`)
- Dropdown category: `fixed_expense_category`
- The add form has a **toggle switch** ("יש תאריך סיום?") that conditionally shows the end date field.
- The fixed expenses table has an **edit button** (pencil icon) per row that opens an edit modal with a single end date field.
- The context exposes `updateFixedExpense` for editing.
- Deleting a fixed expense hard-deletes the DB row and all its inflated expenses disappear.

#### Inflation Logic
- Fixed expenses are **inflated** into virtual regular-expense rows — one per month from `start_date` to `min(end_date, today)`.
- The inflated rows are computed client-side via `useMemo` in `FixedExpensesContext` and exposed as `inflatedExpenses`.
- Inflated entries use a synthetic ID format `{fixedExpenseId}_{YYYY-MM-DD}` to distinguish them from real expenses.
- In the "כל ההוצאות" (all expenses) tab, real and inflated expenses are merged and sorted by date. Inflated rows look identical to regular ones but have **no delete button** (to delete them, remove the source fixed expense from the "הוצאות קבועות" tab).
- The charts page also includes inflated expenses so totals and breakdowns reflect the full picture.

#### Paybacks (`paybacks` table)
- Two directions: `by_me` (I paid someone back) and `to_me` (someone paid me back).
- Fields: `direction`, `name` (by_me only), `category` (by_me only), `amount`, `date`, `person`, `expense_id` (to_me only — references a regular expense), `fixed_expense_id` (to_me only — references a fixed expense).
- Context: `PaybacksContext` (`src/contexts/PaybacksContext.tsx`)
- Dropdown person: `payback_person` (shared between both directions)
- The add form has a **direction toggle** ("שילמתי לאחר" / "שילמו לי") that conditionally shows different fields.
- **to_me expense dropdown**: Shows regular expenses that are **not fully paid back** (displaying the remaining unpaid amount), plus fixed expenses as single non-inflated entries. Options use a `expense:{id}` / `fixed:{id}` value prefix to distinguish the two types.
- **by_me** paybacks appear as virtual expense rows in "כל ההוצאות" with a badge "החזר ל[person]".
- **to_me** paybacks linked to a **regular expense** reduce the displayed amount of that expense in the all-expenses table.
- **to_me** paybacks linked to a **fixed expense** reduce the amount of the **last inflated expense on or before the payback date** in the all-expenses table.
- The charts page also accounts for paybacks: by_me adds to totals, to_me reduces original expense amounts (including fixed expense inflated rows).

#### Sub-Tabs
- The expenses table page has four sub-tabs: **"כל ההוצאות"** (all expenses — real + inflated + by_me paybacks, with to_me reductions), **"הוצאות רגילות"** (only the original regular expenses, no paybacks or inflation), **"הוצאות קבועות"** (fixed expense definitions), and **"העברות"** (payback records).
- The fixed expenses tab shows the raw fixed expense records with columns: name, category, amount, start date, end date.
- The paybacks tab shows all payback records with columns: direction (badge), details, amount, date, person.

### Investments Section

The investments section tracks investment channels, deposits, withdrawals, and value updates. It uses the **FAB type picker** pattern with three actions and an **Event Sourcing / Checkpoint** architecture for computing balances and returns.

#### Event Sourcing Architecture (`src/lib/computeChannelSummary.ts`)
- All deposits, withdrawals, and value updates are treated as **immutable events** in an event ledger.
- There is **no chronological input restriction** — users can add retroactive events at any past date.
- Channel summaries (balance, invested capital, return) are computed **on-the-fly** by replaying all events sorted chronologically:
  - **Deposit** → adds to running balance and invested capital.
  - **Withdrawal** (`is_withdrawal = true`) → subtracts from running balance and invested capital.
  - **Value Update** → acts as a **checkpoint** that hard-overrides the running balance. The delta between the running balance before the checkpoint and the new value is accumulated as profit/loss.
- On same-date events, deposits/withdrawals are processed before value updates so checkpoints capture the balance after that day's cash flows.
- Both the table page (`channelSummaries`) and charts page (`summaries`, `returnOverTime`) use `computeChannelSummary` for all calculations.
- **Cash channels** (`investment_path === CASH_PATH_LABEL`): For channels whose path is `'מזומן/עו"ש'`, value updates represent the total balance directly. Deposit/withdrawal records are ignored. The value IS the deposits amount, so return is always 0. The `computeChannelSummary` function accepts an `isCash` flag to enable this behavior.

#### FAB Type Picker
- Clicking the + FAB opens a popup menu with three options: create channel, deposit, withdrawal.
- Each option opens its own dedicated form modal.
- The "update value" action is accessible via the pencil icon on each channel row in the channels summary tab.

#### Investment Channels (`investment_channels` table)
- Fields: `name`, `company`, `investment_path`, `is_pension` (boolean)
- Context: `InvestmentChannelsContext` (`src/contexts/InvestmentChannelsContext.tsx`)
- Dropdown company: `investment_company`
- The `investment_path` dropdown has a **hardcoded pinned option** `'מזומן/עו"ש'` (exported as `CASH_PATH_LABEL` from `computeChannelSummary.ts`). This option is always present and cannot be deleted by the user.
- The add form has a **toggle switch** ("אפיק פנסיוני?") for the pension flag.

#### Investment Deposits (`investment_deposits` table)
- Fields: `channel_id` (FK to investment_channels), `amount`, `date`, `depositor`, `salary_id` (nullable FK to salaries), `is_withdrawal` (boolean, default false)
- Context: `InvestmentDepositsContext` (`src/contexts/InvestmentDepositsContext.tsx`)
- The add form uses a `ReadOnlySelect` to pick from existing channels.
- Withdrawals are stored in the same table with `is_withdrawal = true`, `depositor = 'אני'`, and no salary link.

#### Investment Withdrawals
- Withdrawals are recorded as deposit rows with `is_withdrawal = true`.
- The withdrawal form has three fields: channel (ReadOnlySelect), amount, and date. No depositor field (always "אני").
- On submit, only a single deposit record with `is_withdrawal = true` is created. The recalculation engine handles the balance impact automatically — no separate value update is needed.
- In the deposits tab, withdrawals show a red "משיכה" badge and a negative amount.
- In channel summaries and charts, withdrawals are subtracted from total deposits.
- The context exposes `addWithdrawal` for creating withdrawal records.

#### Investment Value Updates (`investment_value_updates` table)
- Fields: `channel_id` (FK to investment_channels), `value`, `date`
- Context: `InvestmentValuesContext` (`src/contexts/InvestmentValuesContext.tsx`)
- The add form uses a native `<select>` to pick from existing channels.

#### Sub-Tabs
- The investments table page has three sub-tabs: **"אפיקי השקעה"** (channels summary), **"הפקדות"** (deposits list), and **"עדכוני ערך"** (value updates list).
- The channels tab shows a computed summary per channel: name, company, total deposits (net of withdrawals), current value, last update date, absolute return, return percentage — all computed via the event sourcing engine.
- The deposits tab shows all deposit and withdrawal records with columns: channel name, type (הפקדה/משיכה), amount, depositor, date.
- The value updates tab shows all value update records with columns: channel name, value, date. Each row has an **edit button** (pencil icon) that opens an edit modal with value and date fields, and a **delete button** (trash icon) with confirmation dialog.
- The context exposes `updateValueUpdate` for editing value updates.

#### Charts Page
- Summary cards: total deposited, total current value, total return (absolute + percentage).
- Horizontal bar chart: current value per channel.
- Horizontal bar chart: return percentage per channel (green for positive, red for negative).
- Return over time line chart uses the event sourcing engine to compute return % at each sampled date.

### Expense Types

Expense types allow users to group expense categories into named types for use in charts and analysis.

#### Expense Types (`expense_types` table)
- Fields: `type_name` (text, unique per user), `categories` (text array of category names)
- Context: `ExpenseTypesContext` (`src/contexts/ExpenseTypesContext.tsx`)
- The type name uses a `CustomSelect` with dropdown category `expense_type`.
- Categories are selected via a `MultiSelect` component (`components/common/MultiSelect.tsx`) that shows all expense categories (regular + fixed).
- When an existing type is selected, its categories are loaded for editing.
- The form is accessible from the expenses page FAB type picker under "סוגי הוצאות".
- Removing a type option from the `CustomSelect` also deletes the corresponding `expense_types` DB row.

## Key Principles
- **This file is the single source of truth for project-wide decisions.** Whenever a change is made that affects the overall architecture, data model, shared patterns, or conventions of the project, this file must be updated automatically to reflect it.
- Keep the UI simple, clean, and accessible in Hebrew/RTL.
- The currency in this project is ILS.
- All dates displayed to the user must use the **DD/MM/YYYY** format and be stored in ISO format (YYYY-MM-DD) in the database.
- In UI text, use a regular hyphen (`-`) as a separator, not an em dash (`—`).
- All text input placeholders must use the format **"הכנס [שם השדה]"** (e.g. `"הכנס שם הוצאה"`). Do not include examples in placeholders.

## Monthly Time-Series Chart Display Limit
- All charts that display data over time by month (bruto vs neto, expenses by month, total return by month) are limited to showing the **last 18 months** when the data range exceeds 18 months.
- This is a **display-only** limit — it does not affect summary cards, data cards, category breakdowns, or any other non-time-series charts on the same page. Those continue to use the full filtered data range.
- Implementation: a `chartFiltered` / `chartByMonth` variable is derived from the full filtered data via `slice(-18)` and used only for rendering the time-series bar/line chart.

## Database Migrations
- All Supabase migrations must be saved as `.sql` files in the `supabase/migrations/` folder.
- Each migration file should be named with a timestamp prefix followed by a descriptive snake_case name (e.g. `20260419120000_create_transactions_table.sql`).
- Migrations are applied in chronological order and must be idempotent where possible.
- Never modify an already-applied migration — create a new one instead.
- After creating a migration file, always apply it to the remote Supabase project using the `apply_migration` tool.

## Data Caching Pattern
- Each data entity that is listed/created/deleted across multiple pages must have its own **React Context** in `src/contexts/` (e.g. `IncomeSourcesContext`).
- The context fetches data from Supabase **once** (tracked by a `fetched` flag) and caches it in state. Navigating between pages does not re-fetch.
- The context exposes mutation helpers (`addSource`, `deleteSource`, etc.) that update both Supabase and the local cache, so pages stay in sync without extra requests.
- The provider is placed inside the protected route layout in `App.tsx` so it lives for the entire authenticated session.
- Pages should **never** fetch entity lists directly — always consume the context.

## Number Input Formatting
- All numeric input fields use the shared `NumberInput` component (`components/common/NumberInput.tsx`).
- The component uses `type="text"` with `inputMode="decimal"` and formats the displayed value with **commas every 3 digits** as the user types (e.g. `1,234,567.89`).
- The underlying state stores the **raw numeric string** (no commas), so `Number()` conversion on submit works as before.
- Props: `value` (raw string), `onChange` (receives raw string), `placeholder`, `required`.
- When adding a new numeric field to any form, always use `<NumberInput>` instead of `<input type="number">`.

## Salary Deduction Toggle
- The add forms for **regular expenses**, **fixed expenses**, and **investment deposits** include a toggle switch ("נוכה מהמשכורת?") that asks whether the item was deducted from a salary.
- **Regular expenses & investment deposits**: When the toggle is enabled, a `ReadOnlySelect` dropdown appears showing the user's salaries from the **last 6 months**, formatted as `"חודש שנה - מעסיק"`. The selected salary ID is stored in the `salary_id` column (nullable FK to `salaries`, `ON DELETE SET NULL`). If there is exactly **one salary** in the **previous month** relative to the expense/deposit date, it is **auto-selected**.
- **Fixed expenses**: Since fixed expenses recur monthly, linking to a single salary doesn't make sense. Instead, when the toggle is enabled, a `ReadOnlySelect` dropdown shows the user's **unique employer names** (derived from all salaries). The selected employer is stored in the `salary_employer` column (nullable text). Each inflated monthly expense is implicitly linked to that employer's previous-month salary. If there is only **one employer**, it is **auto-selected**.
- The submit button is disabled when the toggle is on but no salary/employer is selected.
- When adding a new form that needs salary deduction, follow this same pattern: toggle → conditional ReadOnlySelect → auto-select on single match.

## Delete Confirmation
- Every delete button in every table page shows a **confirmation dialog** before actually deleting.
- The shared `ConfirmDialog` component (`components/common/ConfirmDialog.tsx` + `.css`) renders a centered overlay with the message "האם אתה בטוח שברצונך למחוק?" and two buttons: "מחק" (confirm) and "ביטול" (cancel).
- `ConfirmDialog` accepts an optional `details` prop (`string[]`). When provided, it renders a scrollable list of items that will be cascade-deleted alongside the main record. This gives the user full visibility before confirming.
- Each table page tracks a `pendingDeleteId` state (and `pendingDeleteType` when the page has multiple entity types). Clicking the trash icon sets the pending ID; the actual context delete function is only called on confirm.
- When adding a new table with delete functionality, always use `ConfirmDialog` instead of deleting directly on click.

## Cascade Deletes
- When a parent entity is deleted, all child entities that reference it must also be deleted — both in the database (via `ON DELETE CASCADE` foreign keys) and in the client-side context caches.
- **Expense → Paybacks**: Deleting a regular expense cascades to delete all "to_me" paybacks linked to it. The DB FK `paybacks.expense_id` uses `ON DELETE CASCADE`. The page calls `removeByExpenseId` on the PaybacksContext to clean the local cache.
- **Fixed Expense → Paybacks**: Deleting a fixed expense cascades to delete all "to_me" paybacks linked to it. The DB FK `paybacks.fixed_expense_id` uses `ON DELETE CASCADE`. The page calls `removeByFixedExpenseId` on the PaybacksContext to clean the local cache.
- **Investment Channel → Deposits + Value Updates**: Deleting a channel cascades to delete all its deposits and value updates. The DB FKs on `investment_deposits.channel_id` and `investment_value_updates.channel_id` use `ON DELETE CASCADE`. The page calls `removeByChannelId` on both `InvestmentDepositsContext` and `InvestmentValuesContext` to clean the local caches.
- Each child context exposes a `removeBy[Parent]Id` helper that filters out orphaned records from the local state without making a Supabase call (the DB cascade already handled it).
- When adding a new parent-child relationship, always add `ON DELETE CASCADE` to the FK and a corresponding `removeBy...` cache cleanup helper in the child context.

## Custom Dropdown Options
- All dropdowns in the project use **user-managed options** — there are no hardcoded/static option lists (with one exception below).
- Options are stored per-user in the `user_dropdown_options` table, categorized by a `category` string (e.g. `'credit_card_company'`).
- The shared `CustomSelect` component (`components/common/CustomSelect.tsx`) supports adding and removing options inline, as well as searching/filtering.
- Use the `useDropdownOptions` hook (`hooks/useDropdownOptions.ts`) to fetch, add, and remove options for a given category.
- When adding a new dropdown field, create a new category string and wire it through the hook and `CustomSelect` with `onAddOption`/`onRemoveOption` props.
- **Exception — investment_path**: The `investment_path` dropdown includes a hardcoded pinned option `'מזומן/עו"ש'` via the `pinnedOptions` prop. This option is always available and cannot be deleted. It identifies cash/checking-account channels that use special computation logic (see Cash channels in Event Sourcing Architecture).

## Dropdown Option Sorting
- All select/dropdown options across the app are **sorted by their associated total monetary value**, descending (highest first).
- Each page computes a `useMemo`-based sorted copy of the options array before passing it to the select component. The `useDropdownOptions` hook itself still stores options alphabetically — sorting by money is done at the page level where financial data is available.
- Sorting rules per dropdown:
  - **employer** (Salary page): total neto salary per employer.
  - **expense_category** (Expenses page): total expense amount (regular + inflated) per category.
  - **fixed_expense_category** (Expenses page): total fixed expense amount (including inflated) per category.
  - **payback_person** (Expenses page): total payback amount per person.
  - **expense_type** (Expenses page + charts): total expense amount across the type's categories.
  - **expense name suggestions** (AutocompleteInput): total expense amount per name.
  - **allCategoryLabels** (MultiSelect in expense type form): total expense amount (regular + inflated) per category.
  - **investment_company** (Investments page): total current value per company.
  - **investment_path** (Investments page): total current value per path.
  - **investment_depositor** (Investments page): total deposited (non-withdrawal) per depositor.
  - **investment channel** (ReadOnlySelect in deposit/withdrawal forms): total deposits per channel.
  - **salary** (ReadOnlySelect in salary deduction toggles): neto amount.
  - **employer** (ReadOnlySelect in fixed expense salary deduction): total neto per employer.
  - **Charts filter dropdowns** (FilterMultiSelect): same monetary logic as their table-page counterparts.
- **Exception:** The payback "to_me" expense dropdown (`paybackExpenseOptions`) is sorted by **date descending** (most recent first), not by remaining amount, since users typically look for recent expenses to link paybacks to.
- When adding a new dropdown, always sort its options by the relevant monetary total at the page level.
