# ADR: In-App Auth and SQL Library Strategy

## Status

Accepted

## Date

2026-04-05

## Context

The project architecture is a Go API (`api/`) with React frontend and PostgreSQL. We need robust authentication and SQL handling while prioritizing mature libraries over custom code.

Current constraints:

- Runtime backend is Go, not Node/TypeScript.
- Authorization is enforced server-side in Go (`/v1/data/*` and domain handlers).
- PostgreSQL is the source of truth with SQL migrations in `api/migrations/`.

## Decision

1. Keep authentication owned by the Go API (in-app auth), with hardened controls.
2. Use `sqlc + pgx + pgxpool + golang-migrate` as the default SQL stack.
3. Do not adopt `better-auth` as backend runtime for this codebase.
4. Do not use `gorm` as the default data layer for core auth/domain paths.

## Rationale

### Why not `better-auth` (as primary backend auth)?

- `better-auth` is TypeScript-focused and does not naturally map to a Go backend runtime.
- Adopting it would introduce a second backend runtime for identity-critical flows, adding operational and security complexity.
- We can achieve robust auth controls directly in Go with established libraries and explicit server-side policy.

### Why not `gorm` as default?

- Core authorization logic depends on explicit SQL constraints and predictable query behavior.
- `pgx + sqlc` provides stronger compile-time query safety for authored SQL and avoids hidden ORM behavior in critical paths.
- Explicit SQL aligns with current architecture and performance/tenancy requirements.

## Required controls for robust auth

- Refresh token rotation with token-family tracking in Postgres.
- Reuse detection and immediate family/session revocation.
- Session revocation on logout/password change/admin invalidation.
- Strict JWT claim validation (`iss`, `aud`, `exp`, `nbf`, type, skew window).
- Rate limits and lockout/brute-force protections on auth endpoints.
- Security audit events for auth lifecycle actions.

## SQL standards

- Parameterized SQL only.
- Dynamic SQL only behind strict allowlists and identifier/operator validation.
- Invalid query inputs are rejected with explicit errors.
- Transactions for atomic multi-step writes.

## Consequences

Positive:

- Maintains one backend runtime and a clear security boundary.
- Improves robustness while staying aligned with existing architecture.
- Enables incremental hardening with low ambiguity for agents.

Trade-offs:

- Some flows remain more verbose than ORM-style code.
- Requires discipline in query authoring and sqlc generation.

## Exception policy

- `gorm` may be used in isolated, non-critical modules only when:
  - the module is not part of auth/session/authorization-critical paths,
  - the benefit is documented in PR/ADR notes,
  - and authorization semantics remain explicit and test-covered.
