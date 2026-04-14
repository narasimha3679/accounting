# Supabase to Go Cutover Verification Checklist

Use this checklist to record production cutover evidence.

## 1) Pre-cutover readiness

- [ ] `api` deploy is healthy (`/healthz`, `/ready` return 200).
- [ ] `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL(S)` configured in Coolify.
- [ ] `RUN_MIGRATIONS=true` confirmed for deployment.
- [ ] `RESEND_API_KEY` and `RESEND_FROM_EMAIL` configured (forgot-password flow).
- [ ] Optional integrations configured as intended: B2, VAPID, GEMINI.

## 2) One-time database migration proof

- [ ] Supabase dump created (`scripts/pg-dump-supabase.sh`).
- [ ] Restore executed to target Postgres (`pg_restore --no-owner --dbname="$DATABASE_URL" backup.dump`).
- [ ] Post-restore schema ownership and permissions verified.
- [ ] In-repo migrations applied cleanly from `api/migrations/`.
- [ ] Spot-check row counts for critical tables (`profiles`, `companies`, `expenses`, `invoices`, `employees`).

## 3) Object storage migration proof

- [ ] Supabase object keys exported from the source bucket.
- [ ] Objects copied to Backblaze B2 bucket.
- [ ] `expense_files.storage_path` values remain valid under B2 key structure.
- [ ] Upload/download/delete smoke-tested via `/v1/storage/*`.

## 4) Auth and security validation

- [ ] Login + refresh rotation works (`/v1/auth/login` -> `/v1/auth/refresh`).
- [ ] Reused/rotated refresh token is rejected.
- [ ] Logout revokes active sessions.
- [ ] Password reset request and reset completion flow works end-to-end.
- [ ] Auth audit rows appear in `auth_audit_events` with IP and user-agent.
- [ ] Rate-limit lockout behavior works across API replicas (shared DB-backed state).

## 5) Feature parity and controlled de-scope validation

- [ ] Core CRUD pages work through `/v1/data/*`.
- [ ] Company membership flows (invite preview/accept) work.
- [ ] Push test endpoint works when VAPID is configured.
- [ ] OCR feature flag is `false` and UI surfaces a disabled state.
- [ ] Bank statement feature flag is `false` and UI surfaces a disabled state.

## 6) Post-cutover sign-off

- [ ] Frontend points to Go API (`VITE_API_URL` set to `api.cashual.org`).
- [ ] No production runtime calls go directly to Supabase APIs.
- [ ] Incident rollback procedure documented and tested.
- [ ] Cutover date, owner, and sign-off recorded:
  - Date:
  - Owner:
  - Notes:
