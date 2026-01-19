# Quick Reference Guide

## Overview

This is a quick reference for the multi-owner business support implementation roadmap.

## Phase Summary

| Phase | Focus | Duration | Files |
|-------|-------|----------|-------|
| Phase 1 | Database Schema & RLS | 2-3 days | `phase-1-database-schema/` |
| Phase 2 | Authentication & Context | 2-3 days | `phase-2-authentication/` |
| Phase 3 | Permission System | 2-3 days | `phase-3-permissions/` |
| Phase 4 | API & Edge Functions | 3-4 days | `phase-4-api-edge-functions/` |
| Phase 5 | Frontend Features | 4-5 days | `phase-5-frontend/` |
| Phase 6 | Migration & Testing | 2-3 days | `phase-6-migration/` |

## Key Changes Summary

### Database
- ✅ Create `user_companies` table (many-to-many)
- ✅ Add `permissions` JSONB column
- ✅ Update all RLS policies
- ✅ Create helper functions

### Authentication
- ✅ Support multiple companies per user
- ✅ Company switching functionality
- ✅ Company selector component
- ✅ Update AuthContext

### Permissions
- ✅ Manager permission system
- ✅ Permission checking utilities
- ✅ Permission-based UI rendering
- ✅ Manager permission management UI

### API
- ✅ Update all methods for company context
- ✅ New company member management APIs
- ✅ Permission checks in Edge Functions

### Frontend
- ✅ Company member management UI
- ✅ Employee paystub feature
- ✅ Permission-based navigation
- ✅ Enhanced employee dashboard

## Critical Files to Modify

### Database
- `user_companies` table (new)
- All RLS policies (update)
- Helper functions (new)

### Frontend
- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/components/Layout.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/permissions.ts` (new)
- `frontend/src/hooks/usePermissions.ts` (new)
- `frontend/src/components/CompanySelector.tsx` (new)
- `frontend/src/pages/Settings.tsx`
- `frontend/src/pages/EmployeeDashboard.tsx`

### Edge Functions
- All existing functions (update)
- `invite-company-member` (new)
- `remove-company-member` (new)
- `update-manager-permissions` (new)
- `generate-paystub` (new)

## Common Tasks

### Adding a New Permission

1. Add to `ManagerPermissions` interface
2. Add to permission checking utilities
3. Add to permission labels/descriptions
4. Update RLS policies if needed
5. Update UI to check permission

### Adding a New Edge Function

1. Create function file
2. Verify company membership
3. Check permissions
4. Implement business logic
5. Deploy function
6. Add API method in frontend
7. Test thoroughly

### Testing RLS Policies

```sql
-- Test as specific user
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid';

-- Test query
SELECT * FROM employees;
```

## Migration Checklist

- [ ] Backup database
- [ ] Test on staging
- [ ] Run migrations in order
- [ ] Verify data migration
- [ ] Test RLS policies
- [ ] Deploy application
- [ ] Monitor for issues

## Rollback Steps

1. Disable new RLS policies
2. Revert application code
3. Use `profiles.company_id` (if kept)
4. Document issues

## Support Resources

- **Database Schema**: `phase-1-database-schema/README.md`
- **RLS Policies**: `phase-1-database-schema/rls-policies.md`
- **Migrations**: `phase-1-database-schema/migrations.md`
- **Edge Functions**: `phase-4-api-edge-functions/edge-functions.md`
- **Employee Features**: `phase-5-frontend/employee-features.md`

## Questions?

Refer to the detailed README in each phase folder for comprehensive documentation.
