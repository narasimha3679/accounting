# Database Migrations for Multi-Owner Feature

This directory contains SQL migration scripts for implementing the multi-owner company feature.

## Migration Order

Run these migrations in order:

1. **001_create_user_companies.sql** - Creates the `user_companies` table and `pending_shareholder_invites` table
2. **002_create_rls_helper_functions.sql** - Creates helper functions for RLS policies
3. **003_create_user_companies_rls_policies.sql** - Creates RLS policies for `user_companies` and `pending_shareholder_invites`
4. **004_migrate_existing_data.sql** - Migrates existing data from `profiles.company_id` to `user_companies`
5. **005_update_rls_policies_for_all_tables.sql** - Updates RLS policies for all company-scoped tables

## How to Run Migrations

### Using Supabase CLI

```bash
# Apply all migrations
supabase db push

# Or apply specific migration
supabase migration up 001_create_user_companies
```

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste each migration file content
4. Run them in order

### Using psql

```bash
psql -h your-db-host -U postgres -d postgres -f 001_create_user_companies.sql
psql -h your-db-host -U postgres -d postgres -f 002_create_rls_helper_functions.sql
# ... etc
```

## Verification

After running migrations, verify with:

```sql
-- Check user_companies table exists
SELECT * FROM user_companies LIMIT 1;

-- Verify data migration
SELECT 
    (SELECT COUNT(*) FROM profiles WHERE company_id IS NOT NULL) as profiles_with_company,
    (SELECT COUNT(*) FROM user_companies WHERE is_primary = true AND invite_status = 'accepted') as migrated_memberships;

-- Check helper functions exist
SELECT proname FROM pg_proc WHERE proname IN ('user_has_company_access', 'user_has_permission', 'user_company_role');

-- Test helper functions (replace 1 with actual company_id)
SELECT user_has_company_access(1);
SELECT user_has_permission(1, 'can_manage_employees');
SELECT user_company_role(1);

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('user_companies', 'employees', 'invoices', 'expenses', 'clients', 'companies')
ORDER BY tablename, policyname;
```

## Rollback

If you need to rollback:

1. **Disable RLS on user_companies**:
   ```sql
   ALTER TABLE user_companies DISABLE ROW LEVEL SECURITY;
   ```

2. **Drop new policies** (see individual migration files for policy names)

3. **Drop helper functions**:
   ```sql
   DROP FUNCTION IF EXISTS user_has_company_access(BIGINT);
   DROP FUNCTION IF EXISTS user_has_permission(BIGINT, TEXT);
   DROP FUNCTION IF EXISTS user_company_role(BIGINT);
   ```

4. **Revert to old RLS policies** (restore from backup)

5. **Optionally drop tables**:
   ```sql
   DROP TABLE IF EXISTS pending_shareholder_invites CASCADE;
   DROP TABLE IF EXISTS user_companies CASCADE;
   ```

## Notes

- Migrations are idempotent where possible (using `IF NOT EXISTS`, `DROP IF EXISTS`)
- The `profiles.company_id` column is kept for backward compatibility
- All migrations include verification steps
- RLS policies use helper functions for better performance

## Troubleshooting

### Error: "relation user_companies does not exist"
- Make sure migration 001 ran successfully
- Check that you're connected to the correct database

### Error: "function user_has_company_access does not exist"
- Make sure migration 002 ran successfully
- Verify function was created: `\df user_has_company_access` in psql

### Error: "permission denied for table user_companies"
- Check that RLS policies are correctly set up
- Verify you're authenticated: `SELECT auth.uid();`

### Migration verification fails
- Check if there are existing `user_companies` entries that weren't migrated
- Verify `profiles.company_id` data is correct
- Check for NULL values or invalid data
