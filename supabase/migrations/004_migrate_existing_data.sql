-- Migration 004: Migrate existing data from profiles.company_id to user_companies
-- This migration preserves existing data while transitioning to the new structure

-- Step 1: Migrate existing profiles.company_id to user_companies
-- Only migrate if user_companies entry doesn't already exist
INSERT INTO user_companies (user_id, company_id, role, is_primary, invite_status, created_at, updated_at)
SELECT 
    id as user_id,
    company_id,
    CASE 
        WHEN role = 'admin' THEN 'owner'
        WHEN role = 'owner' THEN 'owner'
        WHEN role = 'accountant' THEN 'accountant'
        WHEN role = 'viewer' THEN 'viewer'
        ELSE 'viewer'  -- Default fallback
    END as role,
    true as is_primary,
    'accepted' as invite_status,
    created_at,
    updated_at
FROM profiles
WHERE company_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM user_companies uc 
        WHERE uc.user_id = profiles.id 
        AND uc.company_id = profiles.company_id
    );

-- Step 2: Verify migration
DO $$
DECLARE
    profile_count INTEGER;
    user_company_count INTEGER;
    migrated_count INTEGER;
BEGIN
    -- Count profiles with company_id
    SELECT COUNT(*) INTO profile_count 
    FROM profiles 
    WHERE company_id IS NOT NULL;
    
    -- Count total user_companies entries
    SELECT COUNT(*) INTO user_company_count 
    FROM user_companies;
    
    -- Count migrated entries (where is_primary = true and invite_status = 'accepted')
    SELECT COUNT(*) INTO migrated_count
    FROM user_companies
    WHERE is_primary = true 
    AND invite_status = 'accepted';
    
    -- Log results
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '  Profiles with company_id: %', profile_count;
    RAISE NOTICE '  Total user_companies entries: %', user_company_count;
    RAISE NOTICE '  Migrated entries (primary, accepted): %', migrated_count;
    
    -- Warn if counts don't match (but don't fail - there might be legitimate reasons)
    IF profile_count > migrated_count THEN
        RAISE WARNING 'Some profiles were not migrated. This may be expected if user_companies entries already existed.';
    END IF;
    
    IF profile_count = 0 AND user_company_count > 0 THEN
        RAISE NOTICE 'No profiles to migrate, but user_companies table already has data. This is fine.';
    END IF;
END $$;

-- Step 3: Make profiles.company_id nullable for backward compatibility
-- This allows the old code to continue working during transition
DO $$
BEGIN
    -- Check if column exists and is NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'company_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE profiles ALTER COLUMN company_id DROP NOT NULL;
        RAISE NOTICE 'Made profiles.company_id nullable for backward compatibility';
    ELSE
        RAISE NOTICE 'profiles.company_id is already nullable or does not exist';
    END IF;
    
    -- Add deprecation comment
    COMMENT ON COLUMN profiles.company_id IS 'DEPRECATED: Use user_companies table instead. This column is kept for backward compatibility during migration and will be removed in a future version.';
END $$;
