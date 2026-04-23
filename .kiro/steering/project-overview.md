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

## Custom Dropdown Options
- All dropdowns in the project use **user-managed options** — there are no hardcoded/static option lists.
- Options are stored per-user in the `user_dropdown_options` table, categorized by a `category` string (e.g. `'credit_card_company'`).
- The shared `CustomSelect` component (`components/common/CustomSelect.tsx`) supports adding and removing options inline, as well as searching/filtering.
- Use the `useDropdownOptions` hook (`hooks/useDropdownOptions.ts`) to fetch, add, and remove options for a given category.
- When adding a new dropdown field, create a new category string and wire it through the hook and `CustomSelect` with `onAddOption`/`onRemoveOption` props.
