# Contracting Business Accounting Tool

A comprehensive accounting tool built with a React 18 frontend and Supabase (PostgreSQL + Auth + Storage) as the backend-as-a-service, designed specifically for incorporated contracting businesses in Canada.

## Features

- **Invoice Management**: Create, track, and manage invoices with automatic HST calculation
- **Expense Tracking**: Record business expenses with categories and receipt tracking
- **Tax Calculations**: Automatic calculation of small business tax and HST remittances
- **Dividend Tracking**: Track dividend distributions and adjust company equity
- **Financial Reports**: Generate P&L statements, HST reports, and retained earnings reports
- **Employee Management**: Manage employees, generate login credentials, and provide employee dashboards
- **User Authentication**: Supabase Auth with role-scoped access (admin, accountant, viewer, employee)
- **Modern UI**: Clean, responsive interface built with React, Tailwind CSS, and React Query

## Architecture

- **Frontend**: React 18 + TypeScript (Vite, React Router, TanStack Query, Tailwind)
- **Backend**: Supabase (PostgreSQL, Row-Level Security, Auth, Storage)
- **Edge Functions**: Supabase Edge Functions for secure admin operations (employee management)
- **Storage**: Supabase Storage bucket for receipt uploads
- **CI/CD**: Docker image for the static frontend (optional)

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase project (hosted or self-managed)
- Supabase CLI (optional, recommended for local migrations)

### 1. Install dependencies

```bash
git clone <your-repo>
cd corporate-accounting
npm run install-all
```

### 2. Configure environment variables

Create `frontend/.env` and add the Supabase credentials for your project:

```
VITE_SUPABASE_URL=<https://your-project.supabase.co>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_SUPABASE_STORAGE_BUCKET=expense-files
```

See [Environment Variables](#environment-variables) for the full list.

### 3. Provision Supabase

The database schema, Row-Level Security policies, and storage policies are managed through the Supabase MCP connection. Use Cursor's Supabase MCP tools to:

1. View the current database schema using `mcp_supabase_list_tables`
2. Apply migrations using `mcp_supabase_apply_migration` when needed
3. Check for security advisories using `mcp_supabase_get_advisors`
4. Review documentation using `mcp_supabase_search_docs`

> **Note**: This project uses Supabase MCP for database management. All schema and policy information is available through the MCP connection rather than local SQL files.

### 4. Start the frontend

```bash
npm run dev
# or
cd frontend && npm run dev
```

Visit http://localhost:5173 and sign up with Supabase Auth. All CRUD operations now talk directly to Supabase.

## Project Structure

```
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── contexts/         # Auth + global contexts
│   │   ├── lib/              # Supabase client + data helpers
│   │   ├── pages/            # Route-level components
│   │   └── main.tsx          # App bootstrap
│   └── package.json
├── docker-compose.yml        # Optional nginx-based hosting for the built frontend
├── env.production.example    # Sample env vars for containerized builds
└── package.json              # Convenience scripts for working with the frontend
```

> **Database Management**: This project uses Supabase MCP for database schema and policy management. Use Cursor's Supabase MCP tools to interact with the database schema, apply migrations, and access documentation.

## Supabase Data Model

The schema mirrors the original Go models and includes (non-exhaustive):

- `profiles`: user metadata keyed to `auth.users`
- `companies`, `clients`, `invoices`, `invoice_items`
- `expense_categories`, `expenses`, `expense_files`
- `dividends`, `income_entries`, `hst_payments`
- `tax_returns`, `capital_assets`, `depreciation_entries`
- `owner_payments`, `cca_classes`
- `employees`: employee records with auth user linkage

Each table enforces row-level access by `company_id` and user role, ensuring users only see the organizations they belong to.

## Employee Management

The system includes comprehensive employee management functionality. See [EMPLOYEE_MANAGEMENT.md](./EMPLOYEE_MANAGEMENT.md) for detailed documentation on:

- Employee management features
- Database schema and RLS policies
- Supabase Edge Functions setup and deployment
- API usage and examples
- Security considerations
- Setup and troubleshooting guide

## Available Scripts

- `npm run dev` – start the Vite dev server (via `frontend` project)
- `npm run build` – build the frontend for production
- `npm run preview` – preview the production build locally
- `npm run install-all` – install the frontend dependencies

## Environment Variables

Configure the following keys in `frontend/.env` (or via Docker build args):

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL (e.g., `https://xyz.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Public anon key for client-side access |
| `VITE_SUPABASE_STORAGE_BUCKET` | Bucket used for expense receipt uploads (default `expense-files`) |

If you run Supabase locally, also export the required credentials for the CLI (see Supabase docs).

For Docker-based deployments, copy `env.production.example` to `frontend/.env` (or `.env`) and populate the keys before running `docker-compose up --build`.

## Deployment

1. Ensure your Supabase project has the latest schema/policies applied.
2. Populate `frontend/.env` with your production Supabase keys.
3. Build the frontend:
   ```bash
   npm run build
   ```
4. Serve `frontend/dist` using your preferred static host or run:
   ```bash
   docker-compose up --build -d
   ```

## Security Considerations

- Supabase Row-Level Security is enabled on every table; keep policies up to date.
- Use service-role keys only on the server (never in the frontend).
- Rotate the anon key if it ever leaks.
- Enforce HTTPS for any public deployment of the frontend.

## Support

1. Verify Supabase connectivity with the CLI (`supabase status`).
2. Check browser console + network logs for Supabase errors.
3. Inspect Supabase project logs (Auth, Database, Storage).

## License

MIT License – see `LICENSE.md`.
