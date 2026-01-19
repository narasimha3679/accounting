# Database Migrations

This document contains the SQL migration scripts for Phase 1.

## Migration 001: Create user_companies Table

**File**: `001_create_user_companies.sql`

```sql
-- Create user_companies junction table
CREATE TABLE user_companies (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'accountant', 'viewer')),
    permissions JSONB DEFAULT '{}'::jsonb,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, company_id)
);

-- Indexes for performance
CREATE INDEX idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX idx_user_companies_company_id ON user_companies(company_id);
CREATE INDEX idx_user_companies_role ON user_companies(role);
CREATE INDEX idx_user_companies_primary ON user_companies(user_id, is_primary) WHERE is_primary = true;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_companies_updated_at
    BEFORE UPDATE ON user_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_user_companies_updated_at();

-- Enable RLS
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
```

## Migration 002: Migrate Existing Data

**File**: `002_migrate_existing_data.sql`

```sql
-- Migrate existing profiles.company_id to user_companies
INSERT INTO user_companies (user_id, company_id, role, is_primary, created_at, updated_at)
SELECT 
    id as user_id,
    company_id,
    CASE 
        WHEN role = 'admin' THEN 'owner'
        ELSE role
    END as role,
    true as is_primary,
    created_at,
    updated_at
FROM profiles
WHERE company_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;

-- Verify migration
DO $$
DECLARE
    profile_count INTEGER;
    user_company_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profile_count FROM profiles WHERE company_id IS NOT NULL;
    SELECT COUNT(*) INTO user_company_count FROM user_companies;
    
    IF profile_count != user_company_count THEN
        RAISE EXCEPTION 'Migration verification failed: profile_count (%) != user_company_count (%)', 
            profile_count, user_company_count;
    END IF;
    
    RAISE NOTICE 'Migration verified: % profiles migrated to % memberships', 
        profile_count, user_company_count;
END $$;
```

## Migration 003: Update profiles Table

**File**: `003_update_profiles_table.sql`

```sql
-- Make company_id nullable (keep for backward compatibility)
ALTER TABLE profiles ALTER COLUMN company_id DROP NOT NULL;

-- Add comment indicating deprecation
COMMENT ON COLUMN profiles.company_id IS 'DEPRECATED: Use user_companies table instead. Will be removed in future version.';
```

## Migration 004: Create Helper Functions

**File**: `004_create_helper_functions.sql`

```sql
-- Check if user has access to company
CREATE OR REPLACE FUNCTION user_has_company_access(p_company_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_companies uc
        JOIN profiles p ON uc.user_id = p.id
        WHERE p.auth_user_id = auth.uid()
        AND uc.company_id = p_company_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
    p_company_id BIGINT,
    p_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_role TEXT;
    v_permissions JSONB;
BEGIN
    SELECT uc.role, uc.permissions INTO v_role, v_permissions
    FROM user_companies uc
    JOIN profiles p ON uc.user_id = p.id
    WHERE p.auth_user_id = auth.uid()
    AND uc.company_id = p_company_id;
    
    -- Owners have all permissions
    IF v_role = 'owner' THEN
        RETURN true;
    END IF;
    
    -- Check specific permission
    IF v_permissions IS NOT NULL THEN
        RETURN COALESCE((v_permissions->>p_permission)::boolean, false);
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's role for a company
CREATE OR REPLACE FUNCTION user_company_role(p_company_id BIGINT)
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT uc.role INTO v_role
    FROM user_companies uc
    JOIN profiles p ON uc.user_id = p.id
    WHERE p.auth_user_id = auth.uid()
    AND uc.company_id = p_company_id;
    
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Migration Order

Run migrations in this order:
1. `001_create_user_companies.sql`
2. `002_migrate_existing_data.sql`
3. `003_update_profiles_table.sql`
4. `004_create_helper_functions.sql`
5. Update RLS policies (see `rls-policies.md`)

## Verification Queries

After running migrations, verify with:

```sql
-- Check table exists
SELECT * FROM user_companies LIMIT 1;

-- Verify data migration
SELECT 
    (SELECT COUNT(*) FROM profiles WHERE company_id IS NOT NULL) as profiles_with_company,
    (SELECT COUNT(*) FROM user_companies) as memberships;

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'user_companies';

-- Test helper functions
SELECT user_has_company_access(1);
SELECT user_has_permission(1, 'can_schedule_employees');
SELECT user_company_role(1);
```
