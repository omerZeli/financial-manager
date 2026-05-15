<div align="center">

# 💰 Financial Manager

**A personal financial management app — built with React, TypeScript & Supabase**

Hebrew UI · RTL Layout · Real-time Data

---

[Features](#-features) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [Project Structure](#-project-structure) · [Database](#-database-schema)

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
Visualize financial data with bar charts, line charts, and Sankey diagrams

</td>
<td width="50%">

**⚙️ Custom Dropdowns**
User-managed option lists for categories, employers, companies — sorted by monetary value

</td>
</tr>
</table>

## 🛠 Tech Stack

| Layer | Technology |
|:------|:-----------|
| **Frontend** | React 19 · TypeScript · Vite 8 |
| **Backend** | Supabase (Auth + PostgreSQL) |
| **Routing** | React Router v7 |
| **Styling** | Plain CSS with custom properties |
| **Language** | Hebrew (RTL) |

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- A **Supabase** project

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd financial-manager

# Install dependencies
cd client
npm install

# Set up environment variables
cp .env.example .env
```

Edit `client/.env` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Database Setup

Apply all migrations from `supabase/migrations/` to your Supabase project. They are timestamped and should be applied in chronological order.

### Development

```bash
npm run dev
```

The app will be available at **http://localhost:5173**

### Available Scripts

| Command | Description |
|:--------|:------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check & build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

## 📁 Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── common/          # Shared UI (layout, inputs, charts, dialogs)
│   │   └── forms/           # Add/edit form modals
│   ├── contexts/            # React Contexts for data caching & mutations
│   ├── hooks/               # Custom hooks (dropdown options, table controls)
│   ├── lib/                 # Utilities (Supabase client, dates, computations)
│   ├── pages/               # Route pages (auth, salary, expenses, investments)
│   ├── App.tsx              # Router & layout setup
│   └── main.tsx             # Entry point
├── public/                  # Static assets (favicon, icons SVG)
└── index.html               # HTML shell (lang="he", dir="rtl")

supabase/
├── migrations/              # SQL migration files (20 migrations)
└── config.toml              # Supabase CLI config
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

## 🏗 Architecture Highlights

> **Data Caching** — Each entity has a dedicated React Context that fetches once and caches in memory. Mutations update both Supabase and local state simultaneously.

> **Event Sourcing** — Investment balances and returns are computed by replaying deposit/withdrawal/value-update events chronologically. No stored balances.

> **Fixed Expense Inflation** — Recurring expenses are expanded into virtual monthly rows client-side via `useMemo`, using synthetic IDs.

> **Cascade Deletes** — Parent deletions cascade to children both in the DB (`ON DELETE CASCADE`) and in client-side context caches via `removeBy*Id` helpers.

> **Timezone Safety** — All date formatting uses a shared `formatLocalDate` helper to avoid UTC shift issues in `toISOString()`.

---

<div align="center">

**Built with ❤️ for personal finance clarity**

</div>
