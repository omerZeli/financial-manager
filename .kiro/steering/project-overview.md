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
- A `salaries` table (`id`, `user_id`, `income_source_id`, `month`, `gross`, `net`) with a unique constraint on `(income_source_id, month)`

## Data Entry Flow
The "הזנת נתונים" (Data Entry) page serves as a hub that links to sub-pages in a sequential flow. Each step is a clickable item leading to its own page.

### Current Steps
1. **מקורות הכנסה (Income Sources)** — `/entry/income-sources`
   - Lists all income sources for the user, each showing the most recent salary month if available.
   - Clicking a source navigates to the salary entry page for that source.
   - "הוספת מקור" button navigates to `/entry/income-sources/new`.
   - "הבא" button at the bottom (placeholder for future flow step).
   - **Create Income Source** page (`/entry/income-sources/new`): fields are source name (text) and type (שכיר/עצמאי toggle). On submit, redirects back to the list.
   - **Salary Entry** page (`/entry/income-sources/:sourceId/salary`): fields are month (month picker), gross, and net. On submit, redirects back to the income sources list.

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
