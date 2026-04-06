# Cursor Rules for Corporate Accounting Project

## Architecture (source of truth)

- **Frontend**: React 18 + TypeScript + Vite (`frontend/`). Uses a **supabase-shaped HTTP client** (`frontend/src/lib/goSupabase.ts` + `frontend/src/lib/supabaseClient.ts`) that talks to the **Go API** only. There is **no** browser access to Postgres and **no** Supabase client in production code paths.
- **API**: Go service in `api/` — Chi router, `pgx` pool, JWT auth, generic `/v1/data/*` for table CRUD with server-side authorization, domain routes under `/api/*`, `/v1/auth/*`, `/v1/storage/*` (Backblaze B2 via S3-compatible API when configured).
- **Database**: PostgreSQL (e.g. Coolify-managed). Schema changes are applied with **golang-migrate** migrations in `api/migrations/`. Initial load from Supabase is a **one-time** `pg_dump` / restore; ongoing changes are migrations in-repo.
- **Files**: Backblaze B2 (S3 API). Presigned upload/download/delete via `/v1/storage/*` when `B2_*` env vars are set.
- **Hosting**: Coolify for UI + API + managed Postgres (TLS and secrets in Coolify).

See `docs/ARCHITECTURE.md` for request flow, env vars, and where authorization lives.

## Database work (agents and humans)

- **Do not** assume Supabase MCP or hosted Supabase for this project’s runtime.
- For **local or hosted Postgres** you manage: use `psql`, Coolify SQL, or your migration workflow (`api/migrations/` + `RUN_MIGRATIONS`).
- **`docs/migrations/SUPABASE_TO_COOLIFY.md`** — dump/restore checklist from Supabase.
- **`docs/RLS_AUTHORIZATION_MAP.md`** — mapping former RLS ideas to Go checks (living document).

## Frontend ↔ API

- Base URL: `VITE_API_URL` or `VITE_BACKEND_URL` (default `http://localhost:8080`).
- Auth tokens: `ca_access_token` / `ca_refresh_token` in `localStorage`.
- **Nested PostgREST selects** (e.g. `company:companies(*)`) are **not** implemented by the generic Go data layer. Prefer `/v1/auth/me`, dedicated `/api/*` handlers, or flat queries + follow-up requests until embeds are added.

## Auth and SQL golden rules (for agents)

- **Primary auth ownership**: auth stays in the Go API (`api/`), not a frontend SDK.
- **Use proven libs first**:
  - Keep JWT on `github.com/golang-jwt/jwt/v5`.
  - Keep password hashing on `golang.org/x/crypto/bcrypt`.
  - Keep DB access on `pgx` + `pgxpool`.
  - Keep schema evolution on `golang-migrate` with SQL files in `api/migrations/`.
- **Do not adopt `better-auth` for backend runtime** in this repo. It is TypeScript-oriented and does not match our Go service architecture.
- **Do not make `gorm` the default** for core data/auth paths. Our default is explicit SQL with `pgx`, and `sqlc` for typed query generation.
- **`gorm` exception policy**: only use `gorm` in isolated modules when there is a clear, documented benefit and no risk to authorization correctness or query performance.
- **Mandatory auth robustness controls** for all auth changes:
  - Refresh token rotation with server-side session state and reuse detection.
  - Revocation support (logout, password change, admin/session invalidation).
  - Strict JWT validation (`iss`, `aud`, `exp`, `nbf`, token type, clock skew window).
  - Rate limiting and brute-force protections on auth endpoints.
  - Audit events for login, refresh, logout, password change, lockout, and revocation.
- **Mandatory SQL robustness controls**:
  - Use parameterized SQL only; never interpolate untrusted values into SQL.
  - Keep dynamic query surfaces allowlisted (tables/columns/operators).
  - Reject invalid filter/order/column inputs explicitly; do not silently ignore invalid predicates.
  - Prefer transactions for multi-step writes that must be atomic.
  - Keep authorization checks in server-side Go code and align with `docs/RLS_AUTHORIZATION_MAP.md`.

- Full implementation guidance is in `docs/AUTH_SQL_AGENT_PLAYBOOK.md`.

## Code style

- TypeScript for all new frontend code; follow `frontend/DESIGN_SYSTEM.md` for UI (semantic Tailwind tokens, shared components).
- Go: keep handlers thin; authorization and SQL in internal packages (`internal/data`, `internal/middleware`, etc.).

## Design system (UI)

**CRITICAL: Always follow `frontend/DESIGN_SYSTEM.md`.**

- Use semantic colors (`bg-background`, `text-foreground`, `bg-card`, …), not arbitrary grays/blues.
- Use components from `src/components/ui/` (`Button`, `Card`, `StatCard`, …).
- Support light and dark mode; use `.input` from `frontend/src/index.css` for inputs.
