---
inclusion: always
---

# Project Overview – Financial Manager

## Language & Direction
- The entire UI is in **Hebrew**.
- Layout direction is **RTL** (right-to-left).

## Purpose
A personal financial manager that lets the user record financial data through guided actions and view that data through various display components.

## Architecture – Three Main Pages

### 1. Actions Page (פעולות)
- Displays a list of available actions.
- Each action is a small form with predefined fields that the user fills in manually.
- On submission, the form data is saved to the supabase database in a consistent, structured format.
- Every action submission also creates an entry in the `action_logs` table with a **status** of either `open` or `closed`:
  - **closed**: The action is complete and requires no follow-up (e.g. recording a credit card expense).
  - **open**: The action requires follow-up (e.g. a payback that hasn't been received yet).

### 2. Data Page (נתונים)
- Displays a list of available supabase data components.
- Each data component visualizes the user's stored data in a specific, consistent way (tables, charts, summaries, etc.).

### 3. Tracking Page (מעקב)
- Displays all user actions from the `action_logs` table for tracking purposes.
- Divided into two sections: **open** (פתוחות) and **closed** (סגורות).
- Each section is sorted from newest to oldest.
- Clicking any action (open or closed) opens an edit form pre-filled with the original record data. The user can modify any field and save.
- On save, the referenced record is updated, the action_log summary is refreshed, and the status is recalculated based on the action's own open/close rules.

## Action Open/Close Rules
Each action type defines its own logic for when an action_log entry is `open` or `closed`. This is evaluated on both initial creation and on every edit from the tracking page.

When adding a new action type, you must define its open/close rule and apply it in both the action's submit handler and the tracking edit page's save handler.

## Chained Actions (פעולות משורשרות)
Some actions can automatically trigger the creation of another action based on specific user input. This is called a "chained action."

### How It Works
- Specific conditions in specific fields of specific actions will automatically open the next action's form for the user to fill in, after the parent action is submitted.
- The child action_log has a `triggered_by` column referencing the parent action_log's ID.
- Context (e.g. amount) is passed to the child action form via React Router state to pre-fill relevant fields.
- In the tracking page, parent and child actions appear as separate entries with independent open/close status.
- Each action's open/close status is evaluated independently based on its own rules.

### Implementation Notes
- The `action_logs` table has a `triggered_by` UUID column (nullable FK to `action_logs.id`).
- When navigating to a chained action form, pass `triggeredBy` (parent log ID) and any pre-fill values via React Router `location.state`.
- The child action's component reads `location.state` to pre-fill fields and attach `triggered_by` on its own action_log insert.
- Chained actions are triggered both on initial submission and on edits from the tracking page (e.g. toggling `requires_payback` on during edit will open the payback form if no chained payback already exists).

## Custom Dropdown Options
- All dropdowns in the project use **user-managed options** — there are no hardcoded/static option lists.
- Options are stored per-user in the `user_dropdown_options` table, categorized by a `category` string (e.g. `'payback_method'`, `'expense_category'`).
- The shared `CustomSelect` component (`components/common/CustomSelect.tsx`) supports adding and removing options inline, as well as searching/filtering.
- Use the `useDropdownOptions` hook (`hooks/useDropdownOptions.ts`) to fetch, add, and remove options for a given category.
- When adding a new dropdown field, create a new category string and wire it through the hook and `CustomSelect` with `onAddOption`/`onRemoveOption` props.

## Key Principles
- Actions produce data; Data components consume it.
- Every action writes to the DB in a well-defined schema so any data component can reliably read it.
- Keep the UI simple, clean, and accessible in Hebrew/RTL.
- The currency in this project is ILS.
- All dates displayed to the user must use the **DD/MM/YYYY** format. Date inputs should allow both manual text entry (DD/MM/YYYY) and a native date picker, and be stored in ISO format (YYYY-MM-DD) in the database. Use the shared `DateInput` component (`components/common/DateInput.tsx`) for all date fields.

## Database Migrations
- All Supabase migrations must be saved as `.sql` files in the `supabase/migrations/` folder.
- Each migration file should be named with a timestamp prefix followed by a descriptive snake_case name (e.g. `20260419120000_create_transactions_table.sql`).
- Migrations are applied in chronological order and must be idempotent where possible.
- Never modify an already-applied migration — create a new one instead.
- After creating a migration file, always apply it to the remote Supabase project using the `apply_migration` tool.
