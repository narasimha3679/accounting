# Corporate Accounting Project Rules

## Database Management

- **Supabase Project ID**: `lxuvaxqkmwwoabyfokjd`

This project uses **Supabase MCP** for all database operations and reference. When working with the database:

- **Always use Supabase MCP tools** instead of local SQL files:
  - `mcp_supabase_list_tables` - View database schema
  - `mcp_supabase_apply_migration` - Apply schema changes
  - `mcp_supabase_execute_sql` - Execute queries
  - `mcp_supabase_get_advisors` - Check security/performance issues
  - `mcp_supabase_search_docs` - Search Supabase documentation
  - `mcp_supabase_list_migrations` - View migration history

- **Do not create or reference local SQL files** - all schema information is managed through the Supabase MCP connection.

- When making database changes:
  1. Use `mcp_supabase_apply_migration` for DDL operations (CREATE, ALTER, DROP)
  2. Use `mcp_supabase_execute_sql` for data queries and DML operations
  3. Always check for security advisories after schema changes: `mcp_supabase_get_advisors type=security`

## Project Structure

- **Frontend**: React 18 + TypeScript + Vite
- **Primary Backend**: Supabase (PostgreSQL, Auth, Storage, RLS)
  - **Most operations**: Direct Supabase client calls from frontend (RLS handles security)
  - **Read operations**: Direct Supabase queries with RLS policies
  - **Write operations**: Direct Supabase mutations with RLS policies
- **Secondary Backend**: Node.js/Express API server
  - **ONLY for operations that would require Edge Functions** (email sending, complex processing, external API calls)
  - **Do NOT use Node.js backend for**: Simple CRUD operations (use Supabase directly)
  - Backend URL configured via `VITE_BACKEND_URL` environment variable

## Code Style

- Use TypeScript for all code
- Follow React best practices (hooks, functional components)
- Use TanStack Query for data fetching
- Supabase client is configured in `frontend/src/lib/supabaseClient.ts`
