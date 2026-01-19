# RLS Policy Updates for Multi-Company Support

This document details all Row-Level Security (RLS) policy updates needed for each table to support multi-owner businesses.

## General Pattern

All policies need to:
1. Check `user_companies` instead of `profiles.company_id`
2. Support permission-based access for managers
3. Maintain employee access to their own data

## Helper Function Pattern

We'll use helper functions to simplify policies:

```sql
-- Check company access
user_has_company_access(company_id)

-- Check specific permission
user_has_permission(company_id, 'permission_name')

-- Get user role
user_company_role(company_id)
```

## Table-by-Table Updates

### 1. Employees Table

**Current Policy** (to be replaced):
```sql
-- OLD: Uses profiles.company_id
CREATE POLICY "Company users can view employees"
    ON employees FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'accountant')
        )
    );
```

**New Policies**:
```sql
-- Drop old policies
DROP POLICY IF EXISTS "Company users can view employees" ON employees;
DROP POLICY IF EXISTS "Company users can create employees" ON employees;
DROP POLICY IF EXISTS "Company users can update employees" ON employees;
DROP POLICY IF EXISTS "Company users can delete employees" ON employees;

-- New: Users can view employees in their companies
CREATE POLICY "Users can view employees in their companies"
    ON employees FOR SELECT
    USING (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant', 'viewer')
            OR user_has_permission(company_id, 'can_manage_employees')
        )
    );

-- New: Owners/managers with permission can create employees
CREATE POLICY "Authorized users can create employees"
    ON employees FOR INSERT
    WITH CHECK (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant')
            OR user_has_permission(company_id, 'can_manage_employees')
        )
    );

-- New: Owners/managers with permission can update employees
CREATE POLICY "Authorized users can update employees"
    ON employees FOR UPDATE
    USING (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant')
            OR user_has_permission(company_id, 'can_manage_employees')
        )
    );

-- New: Only owners/accountants can delete employees
CREATE POLICY "Owners and accountants can delete employees"
    ON employees FOR DELETE
    USING (
        user_has_company_access(company_id)
        AND user_company_role(company_id) IN ('owner', 'accountant')
    );

-- Keep existing: Employees can view their own record
-- (No change needed)
```

### 2. Time Entries Table

**New Policies**:
```sql
-- View: Users with access can view time entries
CREATE POLICY "Users can view time entries in their companies"
    ON time_entries FOR SELECT
    USING (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant', 'viewer')
            OR user_has_permission(company_id, 'can_schedule_employees')
            OR user_has_permission(company_id, 'can_approve_timesheets')
            OR employee_id IN (
                SELECT id FROM employees 
                WHERE auth_user_id = auth.uid()
            )
        )
    );

-- Insert: Owners/managers with permission can create
CREATE POLICY "Authorized users can create time entries"
    ON time_entries FOR INSERT
    WITH CHECK (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant')
            OR user_has_permission(company_id, 'can_schedule_employees')
            OR employee_id IN (
                SELECT id FROM employees 
                WHERE auth_user_id = auth.uid()
            )
        )
    );

-- Update: Owners/managers with permission or employee (own entries)
CREATE POLICY "Authorized users can update time entries"
    ON time_entries FOR UPDATE
    USING (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant')
            OR user_has_permission(company_id, 'can_schedule_employees')
            OR (
                employee_id IN (
                    SELECT id FROM employees 
                    WHERE auth_user_id = auth.uid()
                )
                AND status = 'draft'
            )
        )
    );

-- Delete: Owners/managers with permission or employee (own draft entries)
CREATE POLICY "Authorized users can delete time entries"
    ON time_entries FOR DELETE
    USING (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant')
            OR user_has_permission(company_id, 'can_schedule_employees')
            OR (
                employee_id IN (
                    SELECT id FROM employees 
                    WHERE auth_user_id = auth.uid()
                )
                AND status = 'draft'
            )
        )
    );
```

### 3. Salaries Table

**New Policies**:
```sql
-- View: Company users or employee (own salaries)
CREATE POLICY "Users can view salaries in their companies"
    ON salaries FOR SELECT
    USING (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant', 'viewer')
            OR employee_id IN (
                SELECT id FROM employees 
                WHERE auth_user_id = auth.uid()
            )
        )
    );

-- Insert/Update/Delete: Only owners and accountants
CREATE POLICY "Owners and accountants can manage salaries"
    ON salaries FOR ALL
    USING (
        user_has_company_access(company_id)
        AND user_company_role(company_id) IN ('owner', 'accountant')
    )
    WITH CHECK (
        user_has_company_access(company_id)
        AND user_company_role(company_id) IN ('owner', 'accountant')
    );
```

### 4. Invoices Table

**New Policies**:
```sql
-- View
CREATE POLICY "Users can view invoices in their companies"
    ON invoices FOR SELECT
    USING (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant', 'viewer')
            OR user_has_permission(company_id, 'can_manage_invoices')
        )
    );

-- Insert/Update/Delete
CREATE POLICY "Authorized users can manage invoices"
    ON invoices FOR ALL
    USING (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant')
            OR user_has_permission(company_id, 'can_manage_invoices')
        )
    )
    WITH CHECK (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant')
            OR user_has_permission(company_id, 'can_manage_invoices')
        )
    );
```

### 5. Expenses Table

**New Policies**:
```sql
-- View
CREATE POLICY "Users can view expenses in their companies"
    ON expenses FOR SELECT
    USING (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant', 'viewer')
            OR user_has_permission(company_id, 'can_manage_expenses')
        )
    );

-- Insert/Update/Delete
CREATE POLICY "Authorized users can manage expenses"
    ON expenses FOR ALL
    USING (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant')
            OR user_has_permission(company_id, 'can_manage_expenses')
        )
    )
    WITH CHECK (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant')
            OR user_has_permission(company_id, 'can_manage_expenses')
        )
    );
```

### 6. Clients Table

**New Policies**:
```sql
-- View
CREATE POLICY "Users can view clients in their companies"
    ON clients FOR SELECT
    USING (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant', 'viewer')
            OR user_has_permission(company_id, 'can_manage_clients')
        )
    );

-- Insert/Update/Delete
CREATE POLICY "Authorized users can manage clients"
    ON clients FOR ALL
    USING (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant')
            OR user_has_permission(company_id, 'can_manage_clients')
        )
    )
    WITH CHECK (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant')
            OR user_has_permission(company_id, 'can_manage_clients')
        )
    );
```

### 7. Companies Table

**New Policies**:
```sql
-- View: Users can view companies they belong to
CREATE POLICY "Users can view their companies"
    ON companies FOR SELECT
    USING (
        id IN (
            SELECT company_id FROM user_companies uc
            JOIN profiles p ON uc.user_id = p.id
            WHERE p.auth_user_id = auth.uid()
        )
    );

-- Update: Only owners
CREATE POLICY "Owners can update their companies"
    ON companies FOR UPDATE
    USING (
        id IN (
            SELECT company_id FROM user_companies uc
            JOIN profiles p ON uc.user_id = p.id
            WHERE p.auth_user_id = auth.uid()
            AND uc.role = 'owner'
        )
    )
    WITH CHECK (
        id IN (
            SELECT company_id FROM user_companies uc
            JOIN profiles p ON uc.user_id = p.id
            WHERE p.auth_user_id = auth.uid()
            AND uc.role = 'owner'
        )
    );

-- Insert: Anyone can create (for onboarding)
-- Delete: Prevented (or only with special admin role)
```

### 8. Other Tables

Apply the same pattern to:
- `dividends`
- `income_entries`
- `hst_payments`
- `tax_returns`
- `capital_assets`
- `owner_payments`
- `investments`
- `investment_income`
- `investment_sales`
- `employee_schedules` (if exists)

**Pattern for each**:
1. View: Company users with appropriate role/permission
2. Insert/Update/Delete: Owners/accountants or managers with permission

## Testing RLS Policies

### Test Script

```sql
-- Test as owner
SET ROLE authenticated;
SET request.jwt.claim.sub = 'owner-user-uuid';

-- Should see all companies they own
SELECT * FROM companies;

-- Test as manager
SET request.jwt.claim.sub = 'manager-user-uuid';

-- Should only see companies they're assigned to
SELECT * FROM companies;

-- Should only see employees if has permission
SELECT * FROM employees WHERE company_id = 1;

-- Test as employee
SET request.jwt.claim.sub = 'employee-user-uuid';

-- Should only see own record
SELECT * FROM employees;
```

## Performance Considerations

1. **Indexes**: Ensure indexes on `user_companies(user_id, company_id)` and `user_companies(company_id, role)`
2. **Function Security**: Helper functions use `SECURITY DEFINER` for performance
3. **Policy Complexity**: Keep policies simple; complex logic in functions
4. **Query Planning**: Use `EXPLAIN ANALYZE` to verify policy performance

## Migration Order

1. Create helper functions first
2. Update policies one table at a time
3. Test each table's policies before moving to next
4. Keep old policies disabled (not dropped) until verified
