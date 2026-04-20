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
