# Phase 6: Migration & Testing

## Overview

This phase covers the data migration strategy, testing approach, rollback procedures, and production deployment plan.

## Objectives

1. Create and test data migration scripts
2. Develop comprehensive testing strategy
3. Document rollback procedures
4. Plan production deployment
5. Ensure zero data loss

## Migration Strategy

### Pre-Migration Checklist

- [ ] Backup production database
- [ ] Test migration on staging environment
- [ ] Verify all RLS policies work correctly
- [ ] Test application with migrated data
- [ ] Document any data inconsistencies
- [ ] Prepare rollback script

### Migration Steps

#### Step 1: Create `user_companies` Table

```sql
-- Run migration: 001_create_user_companies.sql
-- Verify table created successfully
SELECT * FROM user_companies LIMIT 1;
```

#### Step 2: Migrate Existing Data

```sql
-- Run migration: 002_migrate_existing_data.sql
-- Verify migration
SELECT 
    (SELECT COUNT(*) FROM profiles WHERE company_id IS NOT NULL) as profile_count,
    (SELECT COUNT(*) FROM user_companies) as membership_count;
-- These should match
```

#### Step 3: Update RLS Policies

```sql
-- Run migration: 003_update_rls_policies.sql
-- Test policies work correctly
-- Keep old policies disabled (not dropped) for rollback
```

#### Step 4: Deploy Application Updates

- Deploy frontend with new AuthContext
- Deploy updated Edge Functions
- Monitor for errors

#### Step 5: Verify Migration

```sql
-- Check data integrity
SELECT 
    p.id,
    p.email,
    p.company_id as old_company_id,
    uc.company_id as new_company_id,
    uc.role
FROM profiles p
LEFT JOIN user_companies uc ON uc.user_id = p.id AND uc.is_primary = true
WHERE p.company_id IS NOT NULL
AND (p.company_id != uc.company_id OR uc.company_id IS NULL);
-- Should return 0 rows
```

### Migration Script Template

**File**: `roadmap/phase-6-migration/migration-script.sql`

```sql
-- Migration: Multi-Owner Business Support
-- Date: [DATE]
-- Version: 1.0.0

BEGIN;

-- Step 1: Create user_companies table
-- (See phase-1-database-schema/README.md)

-- Step 2: Migrate data
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

-- Step 3: Verify migration
DO $$
DECLARE
    profile_count INTEGER;
    membership_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profile_count 
    FROM profiles 
    WHERE company_id IS NOT NULL;
    
    SELECT COUNT(*) INTO membership_count 
    FROM user_companies;
    
    IF profile_count != membership_count THEN
        RAISE EXCEPTION 'Migration verification failed: profile_count (%) != membership_count (%)', 
            profile_count, membership_count;
    END IF;
    
    RAISE NOTICE 'Migration verified: % profiles migrated to % memberships', 
        profile_count, membership_count;
END $$;

COMMIT;
```

## Testing Strategy

### Unit Tests

**File**: `roadmap/phase-6-migration/test-plan.md`

#### Database Tests

```sql
-- Test 1: User can access their companies
-- Expected: User sees all companies they belong to
SELECT * FROM companies 
WHERE id IN (
    SELECT company_id FROM user_companies uc
    JOIN profiles p ON uc.user_id = p.id
    WHERE p.auth_user_id = 'test-user-uuid'
);

-- Test 2: RLS policies work
-- Expected: User can only see data for their companies
SET ROLE authenticated;
SET request.jwt.claim.sub = 'test-user-uuid';
SELECT * FROM employees; -- Should only see employees from user's companies

-- Test 3: Permissions work
-- Expected: Manager with permission can perform action
SELECT user_has_permission(1, 'can_schedule_employees');
```

#### API Tests

```typescript
// Test company switching
test('user can switch companies', async () => {
    const user = await login('test@example.com', 'password');
    expect(user.companies.length).toBeGreaterThan(1);
    
    await switchCompany(user.companies[1].company_id);
    const updatedUser = await getCurrentUser();
    expect(updatedUser.currentCompanyId).toBe(user.companies[1].company_id);
});

// Test permissions
test('manager with permission can schedule employees', async () => {
    const user = await login('manager@example.com', 'password');
    await switchCompany(1);
    
    const hasPermission = hasPermission(user, 'can_schedule_employees');
    expect(hasPermission).toBe(true);
});
```

### Integration Tests

1. **End-to-End User Flow**
   - User logs in with multiple companies
   - User switches companies
   - User performs actions in each company
   - Permissions are enforced

2. **Edge Function Tests**
   - Verify company membership checks
   - Verify permission checks
   - Test error cases

3. **RLS Policy Tests**
   - Test each table's policies
   - Verify managers can only access permitted data
   - Verify employees can only see own data

### Performance Tests

1. **Query Performance**
   - Test queries with new `user_companies` joins
   - Verify indexes are used
   - Check query execution times

2. **Load Testing**
   - Test with multiple users
   - Test company switching under load
   - Monitor database connection pool

## Rollback Plan

### Rollback Procedure

**File**: `roadmap/phase-6-migration/rollback-plan.md`

#### If Issues Detected

1. **Immediate Rollback** (if critical issues)
   ```sql
   -- Disable new RLS policies
   ALTER TABLE user_companies DISABLE ROW LEVEL SECURITY;
   
   -- Revert to using profiles.company_id
   -- Update application code to use old structure
   ```

2. **Gradual Rollback** (if minor issues)
   - Keep new structure
   - Fix issues incrementally
   - Don't rollback unless necessary

#### Rollback Script

```sql
BEGIN;

-- Option 1: Keep user_companies, revert RLS
-- (Just update application code)

-- Option 2: Remove user_companies (if needed)
-- WARNING: This will lose multi-company data
-- DROP TABLE IF EXISTS user_companies CASCADE;

-- Restore old RLS policies
-- (Keep backup of old policies)

COMMIT;
```

### Rollback Checklist

- [ ] Identify issue severity
- [ ] Notify stakeholders
- [ ] Execute rollback if needed
- [ ] Verify application works with old structure
- [ ] Document issues for future fixes
- [ ] Plan re-migration after fixes

## Production Deployment Plan

### Pre-Deployment

1. **Staging Deployment**
   - Deploy to staging environment
   - Run full test suite
   - Perform user acceptance testing
   - Fix any issues found

2. **Backup Production**
   ```bash
   # Create database backup
   pg_dump -h [host] -U [user] -d [database] > backup_$(date +%Y%m%d).sql
   ```

3. **Communication**
   - Notify users of upcoming changes
   - Schedule maintenance window if needed
   - Prepare support documentation

### Deployment Steps

1. **Database Migration** (during maintenance window)
   ```bash
   # Run migrations in order
   psql -h [host] -U [user] -d [database] -f 001_create_user_companies.sql
   psql -h [host] -U [user] -d [database] -f 002_migrate_existing_data.sql
   psql -h [host] -U [user] -d [database] -f 003_update_rls_policies.sql
   ```

2. **Verify Migration**
   ```sql
   -- Run verification queries
   -- Check data integrity
   ```

3. **Deploy Application**
   - Deploy frontend
   - Deploy Edge Functions
   - Monitor for errors

4. **Post-Deployment Verification**
   - Test login flow
   - Test company switching
   - Test permissions
   - Monitor error logs
   - Check performance metrics

### Post-Deployment

1. **Monitoring**
   - Monitor error rates
   - Check database performance
   - Watch for RLS policy issues
   - Monitor user feedback

2. **Support**
   - Be available for user questions
   - Document common issues
   - Provide training if needed

3. **Cleanup** (after 1-2 weeks)
   - Remove old `profiles.company_id` column (if kept)
   - Remove old RLS policies
   - Update documentation

## Success Criteria

- [ ] All existing users migrated successfully
- [ ] No data loss
- [ ] All features work correctly
- [ ] Performance acceptable
- [ ] No security issues
- [ ] Users can access all their companies
- [ ] Permissions work correctly
- [ ] Employee features work

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Data loss | Comprehensive backups, verification scripts |
| Performance degradation | Performance testing, index optimization |
| Security issues | Security review, RLS policy testing |
| User confusion | Documentation, training, support |
| Rollback needed | Rollback plan ready, tested |

## Timeline

- **Pre-migration testing**: 2-3 days
- **Staging migration**: 1 day
- **Production migration**: 1 day (during maintenance window)
- **Post-deployment monitoring**: 1 week
- **Cleanup**: 1-2 weeks after deployment

## Notes

- Always test migrations on staging first
- Keep backups for at least 30 days
- Monitor closely for first week after deployment
- Be prepared to rollback if critical issues arise
