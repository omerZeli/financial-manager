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
- Fields: `name`, `category`, `amount`, `date`
- Context: `ExpensesContext` (`src/contexts/ExpensesContext.tsx`)
- Dropdown category: `expense_category`

#### Fixed Expenses (`fixed_expenses` table)
- Fields: `name`, `category`, `amount`, `start_date`, `end_date` (nullable)
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
- Fields: `direction`, `name` (by_me only), `category` (by_me only), `amount`, `date`, `person`, `expense_id` (to_me only — references the original expense).
- Context: `PaybacksContext` (`src/contexts/PaybacksContext.tsx`)
- Dropdown person: `payback_person` (shared between both directions)
- The add form has a **direction toggle** ("שילמתי לאחר" / "שילמו לי") that conditionally shows different fields.
- **by_me** paybacks appear as virtual expense rows in "כל ההוצאות" with a badge "החזר ל[person]".
- **to_me** paybacks reduce the displayed amount of the original expense. A return icon hint shows the original vs returned amounts on hover.
- The charts page also accounts for paybacks: by_me adds to totals, to_me reduces original expense amounts.

#### Sub-Tabs
- The expenses table page has four sub-tabs: **"כל ההוצאות"** (all expenses — real + inflated + by_me paybacks, with to_me reductions), **"הוצאות רגילות"** (only the original regular expenses, no paybacks or inflation), **"הוצאות קבועות"** (fixed expense definitions), and **"העברות"** (payback records).
- The fixed expenses tab shows the raw fixed expense records with columns: name, category, amount, start date, end date.
- The paybacks tab shows all payback records with columns: direction (badge), details, amount, date, person.

### Investments Section

The investments section tracks investment channels, deposits, and value updates. It uses the **FAB type picker** pattern with three actions.

#### FAB Type Picker
- Clicking the + FAB opens a popup menu with three options: create channel, deposit, update value.
- Each option opens its own dedicated form modal.

#### Investment Channels (`investment_channels` table)
- Fields: `name`, `company`, `investment_path`, `is_pension` (boolean)
- Context: `InvestmentChannelsContext` (`src/contexts/InvestmentChannelsContext.tsx`)
- Dropdown company: `investment_company`
- The add form has a **toggle switch** ("אפיק פנסיוני?") for the pension flag.

#### Investment Deposits (`investment_deposits` table)
- Fields: `channel_id` (FK to investment_channels), `amount`, `date`
- Context: `InvestmentDepositsContext` (`src/contexts/InvestmentDepositsContext.tsx`)
- The add form uses a native `<select>` to pick from existing channels.

#### Investment Value Updates (`investment_value_updates` table)
- Fields: `channel_id` (FK to investment_channels), `value`, `date`
- Context: `InvestmentValuesContext` (`src/contexts/InvestmentValuesContext.tsx`)
- The add form uses a native `<select>` to pick from existing channels.

#### Sub-Tabs
- The investments table page has three sub-tabs: **"אפיקי השקעה"** (channels summary), **"הפקדות"** (deposits list), and **"עדכוני ערך"** (value updates list).
- The channels tab shows a computed summary per channel: name, company, total deposits, current value (latest value update), last update date, absolute return, return percentage.
- The deposits tab shows all deposit records with columns: channel name, amount, date.
- The value updates tab shows all value update records with columns: channel name, value, date. Each row has an **edit button** (pencil icon) that opens an edit modal with value and date fields, and a **delete button** (trash icon) with confirmation dialog.
- The context exposes `updateValueUpdate` for editing value updates.

#### Charts Page
- Summary cards: total deposited, total current value, total return (absolute + percentage).
- Horizontal bar chart: current value per channel.
- Horizontal bar chart: return percentage per channel (green for positive, red for negative).

## Key Principles
- **This file is the single source of truth for project-wide decisions.** Whenever a change is made that affects the overall architecture, data model, shared patterns, or conventions of the project, this file must be updated automatically to reflect it.
- Keep the UI simple, clean, and accessible in Hebrew/RTL.
- The currency in this project is ILS.
- All dates displayed to the user must use the **DD/MM/YYYY** format and be stored in ISO format (YYYY-MM-DD) in the database.
- In UI text, use a regular hyphen (`-`) as a separator, not an em dash (`—`).
- All text input placeholders must use the format **"הכנס [שם השדה]"** (e.g. `"הכנס שם הוצאה"`). Do not include examples in placeholders.

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

## Delete Confirmation
- Every delete button in every table page shows a **confirmation dialog** before actually deleting.
- The shared `ConfirmDialog` component (`components/common/ConfirmDialog.tsx` + `.css`) renders a centered overlay with the message "האם אתה בטוח שברצונך למחוק?" and two buttons: "מחק" (confirm) and "ביטול" (cancel).
- `ConfirmDialog` accepts an optional `details` prop (`string[]`). When provided, it renders a scrollable list of items that will be cascade-deleted alongside the main record. This gives the user full visibility before confirming.
- Each table page tracks a `pendingDeleteId` state (and `pendingDeleteType` when the page has multiple entity types). Clicking the trash icon sets the pending ID; the actual context delete function is only called on confirm.
- When adding a new table with delete functionality, always use `ConfirmDialog` instead of deleting directly on click.

## Cascade Deletes
- When a parent entity is deleted, all child entities that reference it must also be deleted — both in the database (via `ON DELETE CASCADE` foreign keys) and in the client-side context caches.
- **Expense → Paybacks**: Deleting a regular expense cascades to delete all "to_me" paybacks linked to it. The DB FK `paybacks.expense_id` uses `ON DELETE CASCADE`. The page calls `removeByExpenseId` on the PaybacksContext to clean the local cache.
- **Investment Channel → Deposits + Value Updates**: Deleting a channel cascades to delete all its deposits and value updates. The DB FKs on `investment_deposits.channel_id` and `investment_value_updates.channel_id` use `ON DELETE CASCADE`. The page calls `removeByChannelId` on both `InvestmentDepositsContext` and `InvestmentValuesContext` to clean the local caches.
- Each child context exposes a `removeBy[Parent]Id` helper that filters out orphaned records from the local state without making a Supabase call (the DB cascade already handled it).
- When adding a new parent-child relationship, always add `ON DELETE CASCADE` to the FK and a corresponding `removeBy...` cache cleanup helper in the child context.

## Custom Dropdown Options
- All dropdowns in the project use **user-managed options** — there are no hardcoded/static option lists.
- Options are stored per-user in the `user_dropdown_options` table, categorized by a `category` string (e.g. `'credit_card_company'`).
- The shared `CustomSelect` component (`components/common/CustomSelect.tsx`) supports adding and removing options inline, as well as searching/filtering.
- Use the `useDropdownOptions` hook (`hooks/useDropdownOptions.ts`) to fetch, add, and remove options for a given category.
- When adding a new dropdown field, create a new category string and wire it through the hook and `CustomSelect` with `onAddOption`/`onRemoveOption` props.
