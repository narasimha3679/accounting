# Supabase → Coolify Postgres (one-time)

1. **Extensions**: Note Supabase extensions in use (`uuid-ossp`, `pgcrypto`, etc.) and enable the same on the target instance if required.
2. **Dump** (schema + data), from a machine with network access to Supabase:

   ```bash
   ./scripts/pg-dump-supabase.sh
   ```

   Or manually: `pg_dump "$SUPABASE_DB_URL" --no-owner --format=custom -f backup.dump`

3. **Restore** into Coolify Postgres:

   ```bash
   pg_restore --no-owner --dbname="$DATABASE_URL" backup.dump
   ```

4. **Auth / `auth` schema**: Replace dependencies on Supabase Auth: this app uses `app_users` + JWT. Ensure `profiles.auth_user_id` / `employees.auth_user_id` reference `app_users.id` (UUID). Migrate users with a controlled password reset or invite flow if UUIDs change.
5. **Ongoing schema**: After restore, **only** apply changes via `api/migrations/` (golang-migrate).

6. **Storage**: Copy objects from the Supabase bucket to B2; keep `expense_files.storage_path` keys compatible (same relative key under the new bucket).

## Baseline and migration-chain policy

- The Supabase dump/restore is treated as the **schema baseline** for existing production data.
- In-repo migrations begin at:
  - `000001_app_users` (Go-owned auth user table)
  - `000002_auth_sessions` (refresh rotation, revocation, audit)
- All new schema changes must be appended in `api/migrations/` with increasing sequence numbers.
- Legacy SQL in `supabase/migrations/` remains historical reference only and is not the runtime migration mechanism.
