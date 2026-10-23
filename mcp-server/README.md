# Financial Manager MCP Server

A **local, read-only, stdio-based** [Model Context Protocol](https://modelcontextprotocol.io) server that exposes a single user's Financial Manager data (salaries, expenses, investments) to an AI agent.

- **Read-only:** every tool performs SELECT queries only - it never inserts, updates, or deletes data.
- **Single user:** one running process serves exactly one authenticated user. Per-user data isolation is enforced by Supabase Row Level Security (RLS).
- **Local stdio:** the server communicates over stdio (stdin/stdout) and is launched by an MCP client. stdout carries only the MCP protocol stream; all logs go to stderr.

## Configuration

The server reads its configuration from the environment. Values can be provided in two ways:

1. **Environment variables** - injected directly by your MCP client config or shell.
2. **A git-ignored `mcp-server/.env` file** - loaded automatically at startup. Values already present in the environment are not overridden. If the file is absent, startup continues without it.

Copy [`.env.example`](./.env.example) to `.env` and fill in real values, or set the variables in your environment. The repository is public, so **no real URL, anon key, or credentials are ever committed** - `.env` is git-ignored and `.env.example` holds placeholders only.

### Required configuration variables

| Variable | Alias | Description |
| --- | --- | --- |
| `SUPABASE_URL` | - | Supabase project URL. |
| `SUPABASE_ANON_KEY` | - | Supabase anon (public) key. The server uses the anon key only, never the service-role key. |
| `SUPABASE_USER_EMAIL` | `FINANCIAL_MANAGER_EMAIL` | User email for `signInWithPassword`. If both the primary name and the alias are set, `SUPABASE_USER_EMAIL` wins. |
| `SUPABASE_USER_PASSWORD` | `FINANCIAL_MANAGER_PASSWORD` | User password for `signInWithPassword`. If both the primary name and the alias are set, `SUPABASE_USER_PASSWORD` wins. |

Each value is required. A value that is unset, empty, or whitespace-only is treated as absent, and startup fails fast with an error that names the accepted variable name(s) - never the value itself.

## Install

From the repository root (this is an npm workspaces monorepo):

```bash
npm install
```

## Build

```bash
npm run build -w mcp-server
```

## Start

```bash
npm start -w mcp-server
```

This runs the compiled server (`node ./dist/index.js`) over stdio. The server is normally launched by an MCP client rather than run by hand; point your client at the `npm start -w mcp-server` command (or the built `mcp-server/dist/index.js` entry) with the configuration variables above provided in its environment.
