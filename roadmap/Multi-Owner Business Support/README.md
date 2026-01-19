# Multi-Owner Business Support - Implementation Roadmap

## Overview

This roadmap outlines the comprehensive changes needed to transform the application from a single-owner model to a multi-owner business support system with configurable manager permissions and enhanced employee self-service features.

## Current State

- **Single company per user**: Each user (profile) has one `company_id`
- **Roles**: `admin`, `accountant`, `viewer`, `employee`
- **Access Control**: Role-based, company-scoped via RLS policies
- **Employee Features**: Basic employee dashboard, time management (partially implemented)

## Target State

- **Multiple companies per user**: Users can belong to multiple companies with different roles
- **Enhanced Roles**: `owner`, `manager`, `accountant`, `viewer`, `employee`
- **Granular Permissions**: Managers have configurable permissions (e.g., `can_schedule_employees`, `can_approve_timesheets`)
- **Company Switching**: Users can switch between companies they belong to
- **Employee Self-Service**: View hours, download paystubs, view schedule, input timesheets

## Implementation Phases

### Phase 1: Database Schema & RLS Policies
**Duration**: 2-3 days  
**Risk**: Medium (database changes require careful migration)

- Create `user_companies` junction table
- Update RLS policies to use new structure
- Add manager permissions system
- Migration scripts for existing data

**See**: `phase-1-database-schema/`

### Phase 2: Authentication & Company Context
**Duration**: 2-3 days  
**Risk**: Medium (core auth changes)

- Refactor AuthContext for multi-company support
- Implement company switching
- Create CompanySelector component
- Update user state management

**See**: `phase-2-authentication/`

### Phase 3: Permission System
**Duration**: 2-3 days  
**Risk**: Low-Medium (new feature, well-defined)

- Define permission structure
- Implement permission checking utilities
- Create manager permission management UI
- Update navigation/routing based on permissions

**See**: `phase-3-permissions/`

### Phase 4: API & Edge Functions
**Duration**: 3-4 days  
**Risk**: Medium (backend security critical)

- Update all API methods for company context
- Refactor edge functions for multi-company
- Add permission checks to edge functions
- Create new APIs for company member management

**See**: `phase-4-api-edge-functions/`

### Phase 5: Frontend Features
**Duration**: 4-5 days  
**Risk**: Low (UI changes)

- Company member management UI
- Permission-based feature visibility
- Employee paystub generation/download
- Enhanced employee dashboard
- Settings page updates

**See**: `phase-5-frontend/`

### Phase 6: Migration & Testing
**Duration**: 2-3 days  
**Risk**: High (data migration)

- Data migration scripts
- Testing strategy
- Rollback procedures
- Production deployment plan

**See**: `phase-6-migration/`

## Total Estimated Timeline

**Total Duration**: 15-21 days (3-4 weeks)  
**Team Size**: 1-2 developers

## Dependencies

```
Phase 1 → Phase 2 → Phase 3
         ↓
      Phase 4
         ↓
      Phase 5
         ↓
      Phase 6
```

## Risk Assessment

| Phase | Risk Level | Mitigation |
|-------|-----------|------------|
| Phase 1 | Medium | Thorough testing of RLS policies, backup before migration |
| Phase 2 | Medium | Incremental refactoring, maintain backward compatibility during transition |
| Phase 3 | Low-Medium | Well-defined permission model, comprehensive testing |
| Phase 4 | Medium | Security review, extensive edge function testing |
| Phase 5 | Low | UI/UX testing, gradual feature rollout |
| Phase 6 | High | Staged migration, rollback plan, data validation |

## Success Criteria

- [ ] Users can belong to multiple companies
- [ ] Users can switch between companies seamlessly
- [ ] Managers have configurable permissions
- [ ] RLS policies correctly enforce multi-company access
- [ ] All existing features work with new structure
- [ ] Employees can access all self-service features
- [ ] No data loss during migration
- [ ] Performance remains acceptable

## Notes

- Maintain backward compatibility during transition where possible
- All database changes should be reversible
- Comprehensive testing required before production deployment
- Consider feature flags for gradual rollout
