# Phase 1: Database Schema & RLS Policies

## Overview

This phase establishes the foundation for multi-owner business support by creating the database schema changes and updating Row-Level Security (RLS) policies.

## Objectives

1. Create `user_companies` junction table for many-to-many user-company relationships
2. Add manager permissions system
3. Update all RLS policies to use new structure
4. Create migration scripts for existing data
5. Ensure backward compatibility during transition

## Database Changes

### 1. Create `user_companies` Table

This table replaces the single `company_id` in `profiles` with a many-to-many relationship.

**Migration**: `001_create_user_companies.sql`

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
```

### 2. Manager Permissions Structure

Permissions are stored as JSONB for flexibility. Example structure:

```json
{
  "can_schedule_employees": true,
  "can_approve_timesheets": true,
  "can_view_reports": false,
  "can_manage_expenses": true,
  "can_manage_invoices": false,
  "can_manage_clients": true,
  "can_manage_employees": false,
  "can_view_financials": false
}
```

### 3. Update `profiles` Table

**Option A: Keep for backward compatibility (Recommended for gradual migration)**

```sql
-- Make company_id nullable (keep for migration period)
ALTER TABLE profiles ALTER COLUMN company_id DROP NOT NULL;

-- Add comment indicating deprecation
COMMENT ON COLUMN profiles.company_id IS 'DEPRECATED: Use user_companies table instead. Will be removed in future version.';
```

**Option B: Remove immediately (Cleaner, but requires all changes at once)**

```sql
-- Remove company_id column
ALTER TABLE profiles DROP COLUMN company_id;
```

### 4. Data Migration

**Migration**: `002_migrate_existing_data.sql`

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
END $$;
```

## RLS Policy Updates

### Enable RLS on `user_companies`

```sql
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
```

### Policies for `user_companies`

```sql
-- Users can view their own company memberships
CREATE POLICY "Users can view own company memberships"
    ON user_companies FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Owners can view all memberships for their companies
CREATE POLICY "Owners can view company memberships"
    ON user_companies FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM user_companies uc
            JOIN profiles p ON uc.user_id = p.id
            WHERE p.auth_user_id = auth.uid()
            AND uc.role = 'owner'
        )
    );

-- Only owners can insert new memberships
CREATE POLICY "Owners can add company members"
    ON user_companies FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM user_companies uc
            JOIN profiles p ON uc.user_id = p.id
            WHERE p.auth_user_id = auth.uid()
            AND uc.role = 'owner'
        )
    );

-- Only owners can update memberships
CREATE POLICY "Owners can update company memberships"
    ON user_companies FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM user_companies uc
            JOIN profiles p ON uc.user_id = p.id
            WHERE p.auth_user_id = auth.uid()
            AND uc.role = 'owner'
        )
    );

-- Only owners can delete memberships (with restrictions)
CREATE POLICY "Owners can remove company members"
    ON user_companies FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM user_companies uc
            JOIN profiles p ON uc.user_id = p.id
            WHERE p.auth_user_id = auth.uid()
            AND uc.role = 'owner'
        )
        -- Prevent deleting the last owner
        AND NOT (
            role = 'owner' AND
            (SELECT COUNT(*) FROM user_companies 
             WHERE company_id = user_companies.company_id 
             AND role = 'owner') <= 1
        )
    );
```

## Updated RLS Policies for Other Tables

See `rls-policies.md` for detailed policy updates for:
- `employees`
- `time_entries`
- `salaries`
- `invoices`
- `expenses`
- `clients`
- And all other company-scoped tables

## Helper Functions

Create utility functions for common permission checks:

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

## Testing Checklist

- [ ] `user_companies` table created with correct structure
- [ ] Indexes created and verified
- [ ] Triggers working correctly
- [ ] Data migration completed successfully
- [ ] All RLS policies enabled and tested
- [ ] Helper functions work correctly
- [ ] Existing functionality still works (backward compatibility)
- [ ] Performance acceptable with new indexes

## Rollback Plan

If issues arise:

1. **Disable new RLS policies**:
   ```sql
   ALTER TABLE user_companies DISABLE ROW LEVEL SECURITY;
   ```

2. **Revert to using `profiles.company_id`** (if kept):
   - Update application code to use old structure
   - RLS policies will fall back to old checks

3. **Remove `user_companies` table** (if needed):
   ```sql
   DROP TABLE IF EXISTS user_companies CASCADE;
   ```

## Next Steps

After completing Phase 1:
1. Verify all database changes are working
2. Test RLS policies thoroughly
3. Proceed to Phase 2: Authentication & Company Context
