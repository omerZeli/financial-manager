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
- Data entry flow with income sources management
- An `income_sources` table (`id`, `user_id`, `name`, `type`)

## Data Entry Flow
The "הזנת נתונים" (Data Entry) page serves as a hub that links to sub-pages in a sequential flow. Each step is a clickable item leading to its own page.

### Current Steps
1. **מקורות הכנסה (Income Sources)** — `/entry/income-sources`
   - Lists all income sources for the user.
   - "הוספת מקור" button navigates to `/entry/income-sources/new`.
   - **Create Income Source** page (`/entry/income-sources/new`): fields are source name (text) and type (שכיר/עצמאי toggle). On submit, redirects back to the list.

### Adding New Steps
- New steps in the flow should be added as links in `DataEntryPage.tsx` and as nested routes under `/entry/...` in `App.tsx`.

## Authentication
- Supabase Auth with email/password
- `AuthProvider` context wraps the app and exposes `user`, `session`, `loading`, `signOut`
- `ProtectedRoute` redirects unauthenticated users to `/login`
- `GuestRoute` redirects authenticated users to `/`
- On signup, a trigger auto-creates a row in `profiles` with `id`, `email`, and `display_name`

## Key Principles
- Keep the UI simple, clean, and accessible in Hebrew/RTL.
- The currency in this project is ILS.
- All dates displayed to the user must use the **DD/MM/YYYY** format and be stored in ISO format (YYYY-MM-DD) in the database.
- All text input placeholders must use the format **"הכנס [שם השדה]"** (e.g. `"הכנס שם הוצאה"`). Do not include examples in placeholders.

## Database Migrations
- All Supabase migrations must be saved as `.sql` files in the `supabase/migrations/` folder.
- Each migration file should be named with a timestamp prefix followed by a descriptive snake_case name (e.g. `20260419120000_create_transactions_table.sql`).
- Migrations are applied in chronological order and must be idempotent where possible.
- Never modify an already-applied migration — create a new one instead.
- After creating a migration file, always apply it to the remote Supabase project using the `apply_migration` tool.
