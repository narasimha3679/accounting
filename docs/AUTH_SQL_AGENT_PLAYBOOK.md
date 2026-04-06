# Auth + SQL Agent Playbook

This is the implementation playbook for agents working on authentication, authorization, and SQL in this repo.

## 1) Default stack (use this unless an ADR says otherwise)

- Auth runtime: Go API in `api/`
- JWT: `github.com/golang-jwt/jwt/v5`
- Password hashing: `golang.org/x/crypto/bcrypt`
- DB access: `github.com/jackc/pgx/v5` + `pgxpool`
- Typed query generation: `sqlc` for domain queries
- Migrations: `golang-migrate` with SQL files under `api/migrations/`

Not default:

- `better-auth` (TypeScript-first runtime; not aligned to Go backend)
- `gorm` for auth/core domain paths

## 2) Auth hardening checklist (required)

When touching auth, implement or preserve all items:

1. **Token model**
   - Access token: short TTL.
   - Refresh token: rotation on each use.
   - Include and validate `iss`, `aud`, `exp`, `nbf`, `iat`, `jti`, and token type.
2. **Session state**
   - Persist refresh/session state in Postgres.
   - Store refresh token identifiers securely (hash-at-rest for raw token material).
   - Track token family and parent-child lineage for rotation.
3. **Reuse detection**
   - Detect replay/reuse of rotated refresh tokens.
   - Revoke the whole token family/session on reuse.
4. **Revocation**
   - Support logout (single session).
   - Support global logout/password-change revocation.
   - Support admin-forced revocation.
5. **Abuse resistance**
   - Rate limit `/v1/auth/login`, `/v1/auth/register`, `/v1/auth/refresh`.
   - Add lockout/backoff policy for repeated failures.
6. **Auditability**
   - Emit audit events for login success/failure, refresh, logout, password change, lockout, and revocation.
7. **Frontend contract**
   - Keep token names `ca_access_token` and `ca_refresh_token` unless migration is explicitly planned.
   - Ensure refresh flow is actually wired in client logic when introducing short access TTLs.

## 3) SQL and query checklist (required)

1. **Use `sqlc` for domain SQL**
   - Add `.sql` query files under `api/` query package paths.
   - Generate typed methods and call them from service/repository layers.
2. **Use parameterized SQL only**
   - Never concatenate user-provided values into SQL literals.
3. **Dynamic SQL safety**
   - For generic endpoints (`/v1/data/*`), keep strict allowlists for tables/columns/operators.
   - Reject invalid filters/order/columns with clear client errors.
   - Do not silently drop invalid predicates.
4. **Transactions**
   - Use explicit transactions for multi-step writes that must be atomic.
5. **Authorization**
   - Enforce authz server-side in Go.
   - Keep behavior aligned with `docs/RLS_AUTHORIZATION_MAP.md`.

## 4) Implementation sequence for major auth upgrades

1. Add migrations for session tables and indexes.
2. Add `sqlc` queries for session create/rotate/revoke/reuse-detection.
3. Update auth service methods (`login`, `refresh`, `logout`, `update-password`) to use session persistence.
4. Add middleware validation for stricter JWT claims.
5. Add rate limits and lockout.
6. Add audit logging.
7. Update frontend refresh behavior and regression test token expiry flows.

## 5) Testing and verification gates

Minimum checks before shipping auth/SQL changes:

- Unit tests for auth service rotation/reuse/revocation behavior.
- Integration tests for login -> refresh -> revoke -> denied refresh.
- Negative tests for invalid claims (`iss`, `aud`, type, expired, reused).
- Authorization regression tests for `/v1/data/*` scoping behavior.
- Migration up/down test on a disposable Postgres database.

## 6) GORM exception policy

`gorm` is allowed only if all are true:

- The module is not in auth/session/authorization-critical paths.
- Query semantics remain explicit and test-covered.
- Performance and generated SQL are reviewed.
- A short design note (or ADR for major use) explains why `sqlc + pgx` is insufficient there.
