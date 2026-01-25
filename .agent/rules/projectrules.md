---
trigger: always_on
---

# Cursor Rules for Corporate Accounting Project

## Database Management

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

- Frontend: React 18 + TypeScript + Vite
- Primary Backend: Supabase (PostgreSQL, Auth, Storage, RLS)
  - **Most operations**: Direct Supabase client calls from frontend (RLS handles security)
  - **Read operations**: Direct Supabase queries with RLS policies
  - **Write operations**: Direct Supabase mutations with RLS policies
- Node.js/Express API server: **ONLY for operations that would require Edge Functions**
  - **Use Node.js backend ONLY when**: Server-side logic needed (email sending, complex processing, external API calls)
  - **Examples**: Email invitations, PDF generation, OCR processing, external integrations
  - **Do NOT use Node.js backend for**: Simple CRUD operations (use Supabase directly)
  - Backend URL configured via `VITE_BACKEND_URL` environment variable
- Database schema is managed via Supabase MCP, not local files

## Code Style

- Use TypeScript for all new code
- Follow React best practices (hooks, functional components)
- Use TanStack Query for data fetching
- Supabase client is configured in `frontend/src/lib/supabaseClient.ts`

## Design System & UI Guidelines

**CRITICAL: Always follow the design system defined in `frontend/DESIGN_SYSTEM.md`**

### Core Principles
- **Use semantic colors**: Always use semantic color variables (e.g., `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`) instead of hardcoded hex values or arbitrary Tailwind colors
- **Component-based**: Use pre-built UI components from `src/components/ui/`:
  - `Button` - Use instead of `<button>` with custom classes
  - `Card` - Use for content containers
  - `StatCard` - Use for displaying metrics
- **Dark mode support**: All components must work in both light and dark modes using Tailwind's `dark:` modifier
- **Standard spacing**: Use standard Tailwind spacing (e.g., `p-4`, `p-6`, `gap-4`) instead of custom utility classes

### Color Usage Rules
- ✅ **DO**: Use `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-primary`, `text-primary-foreground`, `bg-destructive`, `text-destructive-foreground`, etc.
- ❌ **DON'T**: Use hardcoded colors like `bg-gray-50`, `text-gray-600`, `bg-blue-500`, `text-red-700`, etc. (unless absolutely necessary for data visualization)

### Input Fields
- Use the `.input` class defined in `frontend/src/index.css` for all input fields
- Labels should use `text-foreground` for primary labels and `text-muted-foreground` for secondary text

### Typography
- Headings: Use `text-3xl font-bold tracking-tight` for H1, `text-2xl font-semibold tracking-tight` for H2, `text-xl font-semibold tracking-tight` for H3
- Body text: Use `text-foreground` for primary content, `text-muted-foreground` for secondary content

### Before Creating New Components
1. Check if a similar component exists in `src/components/ui/`
2. Review `frontend/DESIGN_SYSTEM.md` for patterns and examples
3. Ensure all colors use semantic variables
4. Test in both light and dark modes
5. Ensure focus states are properly implemented (`focus-visible:ring-2 focus-visible:ring-ring`)
