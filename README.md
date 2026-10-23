<div align="center">

# 💰 Financial Manager

**A personal financial management app — built with React, TypeScript & Supabase**

Hebrew UI · RTL Layout · Real-time Data

---

[Features](#-features) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [Project Structure](#-project-structure) · [Database](#-database-schema) · [MCP Server](#-mcp-server)

</div>

## ✨ Features

<table>
<tr>
<td width="50%">

**📊 Salary Tracking**
Record monthly salaries by employer with bruto/neto breakdown and trend charts

</td>
<td width="50%">

**💸 Expense Management**
Track regular and fixed (recurring) expenses with category groupings and inflation logic

</td>
</tr>
<tr>
<td width="50%">

**🔄 Paybacks**
Log money owed to/from others, linked to specific expenses with automatic amount reduction

</td>
<td width="50%">

**📈 Investments**
Manage channels, deposits, withdrawals & value updates with event-sourcing balance computation

</td>
</tr>
<tr>
<td width="50%">

**🎨 Charts & Analysis**
Visualize financial data with bar charts, line charts, and Sankey diagrams — clickable bars navigate to filtered table views

</td>
<td width="50%">

**⚙️ Custom Dropdowns**
User-managed option lists for categories, employers, companies — sorted by monetary value

</td>
</tr>
<tr>
<td width="50%">

**🤖 MCP Server**
A local, read-only MCP server exposes your financial data to AI agents through 13 query tools

</td>
<td width="50%">

**📦 Shared Package**
Framework-agnostic types and pure computation functions shared by the client and the MCP server

</td>
</tr>
</table>

## 🛠 Tech Stack

| Layer | Technology |
|:------|:-----------|
| **Monorepo** | npm workspaces (`client` · `shared` · `mcp-server`) |
| **Frontend** | React 19 · TypeScript 6 · Vite 8 |
| **Backend** | Supabase (Auth + PostgreSQL) |
| **Routing** | React Router v7 |
| **Styling** | Plain CSS with custom properties |
| **Shared Logic** | `@financial-manager/shared` — framework-agnostic types + pure functions |
| **MCP Server** | `@modelcontextprotocol/sdk` · stdio transport · read-only |
| **Testing** | Vitest · fast-check (property-based) |
| **Language** | Hebrew (RTL) |

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- A **Supabase** project

### Installation

This repository is an **npm workspaces monorepo** with three members: `client`, `shared`, and `mcp-server`. A single install from the root wires up every workspace.

```bash
# Clone the repository
git clone <repo-url>
cd financial-manager

# Install all workspace dependencies from the root
npm install

# Set up the client environment variables
cp client/.env.example client/.env
```

Edit `client/.env` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Database Setup

Apply all migrations from `supabase/migrations/` to your Supabase project. They are timestamped and should be applied in chronological order. The MCP server is read-only and introduces no schema changes.

### Development

```bash
npm run dev -w client
```

The app will be available at **http://localhost:5173**

### Available Scripts

Run workspace scripts from the root with `-w <workspace>`:

| Command | Description |
|:--------|:------------|
| `npm run dev -w client` | Start the Vite dev server |
| `npm run build -w client` | Type-check & build the client for production |
| `npm run preview -w client` | Preview the production build |
| `npm run lint -w client` | Run ESLint on the client |
| `npm test -w shared` | Run the shared package test suite |
| `npm run build -w shared` | Build the shared package |
| `npm run build -w mcp-server` | Build the MCP server |
| `npm test -w mcp-server` | Run the MCP server test suite |
| `npm start -w mcp-server` | Start the MCP server over stdio |

## 📁 Project Structure

An npm workspaces monorepo with three members — `client`, `shared`, and `mcp-server`:

```
financial-manager/
├── package.json             # Root workspaces manifest (client · shared · mcp-server)
│
├── client/                  # React + Vite frontend (Hebrew / RTL UI)
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/      # Shared UI (layout, inputs, charts, dialogs)
│   │   │   └── forms/       # Add/edit form modals
│   │   ├── contexts/        # React Contexts for data caching & mutations
│   │   ├── hooks/           # Custom hooks (dropdown options, table controls)
│   │   ├── lib/             # Utilities (Supabase client, re-exports from shared)
│   │   ├── pages/           # Route pages (auth, salary, expenses, investments)
│   │   ├── App.tsx          # Router & layout setup
│   │   └── main.tsx         # Entry point
│   ├── public/              # Static assets (favicon, icons SVG, PWA manifest)
│   └── index.html           # HTML shell (lang="he", dir="rtl")
│
├── shared/                  # @financial-manager/shared — framework-agnostic package
│   └── src/
│       ├── types.ts         # Row types (Salary, Expense, Payback, …)
│       ├── dateUtils.ts     # Timezone-safe date helpers
│       ├── salary.ts        # Salary aggregations & totals
│       ├── expenses.ts      # Fixed-expense inflation, all-expenses + payback logic
│       ├── investments.ts   # Event-sourcing engine (channel summaries, returns)
│       └── index.ts         # Barrel re-exporting all types + functions
│
├── mcp-server/              # Local, read-only, stdio MCP server
│   └── src/
│       ├── config.ts        # Env/.env config with aliases & fail-fast validation
│       ├── auth/            # Supabase sign-in session (anon key only)
│       ├── data/            # Read-only data-access layer (SELECT queries, RLS-scoped)
│       ├── services/        # Compose data readers with shared computations
│       ├── tools/           # One module per MCP tool + registry
│       └── index.ts         # Boot: config → session → register tools → stdio
│
└── supabase/
    ├── migrations/          # SQL migration files (25 migrations)
    └── config.toml          # Supabase CLI config
```

## 🗄 Database Schema

```
┌──────────────────────┐       ┌──────────────────────────┐
│      profiles        │       │        salaries           │
│──────────────────────│       │──────────────────────────│
│ id (FK → auth.users) │       │ month · employer          │
│ email · display_name │       │ bruto · neto              │
└──────────────────────┘       └────────────┬─────────────┘
                                            │ salary_id (nullable)
┌──────────────────────┐       ┌────────────▼─────────────┐
│   fixed_expenses     │       │        expenses           │
│──────────────────────│       │──────────────────────────│
│ name · category      │◄──┐   │ name · category · amount  │
│ amount · start/end   │   │   │ date · salary_id          │
│ salary_employer      │   │   └────────────┬─────────────┘
└───────────┬──────────┘   │                │
            │              │   ┌────────────▼─────────────┐
            │              └───│        paybacks           │
            └──────────────────│──────────────────────────│
                               │ direction · amount · date │
                               │ person · expense_id       │
                               │ fixed_expense_id          │
                               └──────────────────────────┘

┌──────────────────────┐       ┌──────────────────────────┐
│ investment_channels  │       │   investment_deposits     │
│──────────────────────│       │──────────────────────────│
│ name · company       │◄──────│ channel_id · amount       │
│ investment_path      │   ┌───│ date · depositor          │
│ is_pension           │   │   │ is_withdrawal · salary_id │
└──────────────────────┘   │   └──────────────────────────┘
         ▲                 │
         │                 │   ┌──────────────────────────┐
         └─────────────────┴───│ investment_value_updates  │
                               │──────────────────────────│
                               │ channel_id · value · date │
                               └──────────────────────────┘

┌──────────────────────┐       ┌──────────────────────────┐
│    expense_types     │       │  user_dropdown_options    │
│──────────────────────│       │──────────────────────────│
│ type_name            │       │ category · value          │
│ categories (text[])  │       │ (per-user option lists)   │
└──────────────────────┘       └──────────────────────────┘
```

## 🤖 MCP Server

The `mcp-server/` workspace is a **local, read-only, stdio-based** [Model Context Protocol](https://modelcontextprotocol.io) server. It signs in as a single Supabase user (anon key only — never the service-role key), serves that one user, and relies on Supabase Row Level Security for data isolation. Every tool performs `SELECT` queries only — it never inserts, updates, or deletes, and it introduces no schema change (the migration count is unchanged).

stdout carries only the MCP protocol stream; all logs and errors go to stderr. Configuration is read from the environment or a git-ignored `mcp-server/.env` file (see [`mcp-server/README.md`](./mcp-server/README.md) for the full variable list and startup details).

### Read-only tool catalog (13 tools)

| Tool | Purpose |
|:-----|:--------|
| `list_salaries` | List salary records (month range, employer, limit) |
| `get_salary_summary` | Aggregated salary totals, deductions & averages |
| `list_expenses` | List regular expenses |
| `list_fixed_expenses` | List fixed (recurring) expense definitions |
| `list_paybacks` | List payback records (by_me / to_me) |
| `list_all_expenses` | Merged real + inflated + by_me rows with payback reductions |
| `get_expense_summary` | Aggregated expense totals & breakdowns |
| `list_investment_channels` | List investment channels |
| `list_investment_deposits` | List deposits & withdrawals |
| `list_investment_value_updates` | List value-update checkpoints |
| `get_investment_summaries` | Per-channel balance, invested capital & return |
| `get_investment_return_over_time` | Return % over time across a date range |
| `list_dropdown_options` | List user-managed dropdown option lists |

## 🏗 Architecture Highlights

> **Data Caching** — Each entity has a dedicated React Context that fetches once and caches in memory. Mutations update both Supabase and local state simultaneously.

> **Event Sourcing** — Investment balances and returns are computed by replaying deposit/withdrawal/value-update events chronologically. No stored balances.

> **Fixed Expense Inflation** — Recurring expenses are expanded into virtual monthly rows client-side via `useMemo`, using synthetic IDs.

> **Cascade Deletes** — Parent deletions cascade to children both in the DB (`ON DELETE CASCADE`) and in client-side context caches via `removeBy*Id` helpers.

> **Timezone Safety** — All date formatting uses a shared `formatLocalDate` helper to avoid UTC shift issues with `toISOString()`.

> **Chart Navigation** — Clicking any bar chart navigates to the table page with filters pre-applied to match the clicked data point.

> **Shared Computation Layer** — Types and pure business logic (date helpers, salary/expense/investment math) live in `@financial-manager/shared`. The client re-exports from it so numbers stay identical, and the MCP server consumes the same functions — one source of truth for every calculation.

> **Read-Only MCP Server** — A local stdio MCP server exposes 13 query tools over the same shared computations, letting an AI agent inspect the data without any write access.

---

<div align="center">

**Built for personal finance clarity**

</div>
