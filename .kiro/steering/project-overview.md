---
inclusion: always
---

# Project Overview – Financial Manager

## Language & Direction
- The entire UI is in **Hebrew**.
- Layout direction is **RTL** (right-to-left).

## Purpose
A personal financial manager that lets the user record financial data through guided actions and view that data through various display components.

## Architecture – Two Main Pages

### 1. Actions Page (פעולות)
- Displays a list of available actions.
- Each action is a small form with predefined fields that the user fills in manually.
- On submission, the form data is saved to the supabase database in a consistent, structured format.

### 2. Data Page (נתונים)
- Displays a list of available supabase data components.
- Each data component visualizes the user's stored data in a specific, consistent way (tables, charts, summaries, etc.).

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
