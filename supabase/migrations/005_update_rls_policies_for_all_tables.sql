-- Migration 005: Update RLS policies for all company-scoped tables
-- This migration updates existing RLS policies to use the new user_companies structure

-- ============================================================================
-- EMPLOYEES TABLE
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Company users can view employees" ON employees;
DROP POLICY IF EXISTS "Company users can create employees" ON employees;
DROP POLICY IF EXISTS "Company users can update employees" ON employees;
DROP POLICY IF EXISTS "Company users can delete employees" ON employees;

-- New policies for employees
CREATE POLICY "Users can view employees in their companies"
    ON employees FOR SELECT
    USING (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant', 'viewer')
            OR user_has_permission(company_id, 'can_manage_employees')
            OR id IN (
                SELECT id FROM employees 
                WHERE auth_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Authorized users can create employees"
    ON employees FOR INSERT
    WITH CHECK (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant')
            OR user_has_permission(company_id, 'can_manage_employees')
        )
    );

CREATE POLICY "Authorized users can update employees"
    ON employees FOR UPDATE
    USING (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant')
            OR user_has_permission(company_id, 'can_manage_employees')
            OR id IN (
                SELECT id FROM employees 
                WHERE auth_user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant')
            OR user_has_permission(company_id, 'can_manage_employees')
            OR id IN (
                SELECT id FROM employees 
                WHERE auth_user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Owners and accountants can delete employees"
    ON employees FOR DELETE
    USING (
        user_has_company_access(company_id)
        AND user_company_role(company_id) IN ('owner', 'accountant')
    );

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Company users can view invoices" ON invoices;
DROP POLICY IF EXISTS "Company users can create invoices" ON invoices;
DROP POLICY IF EXISTS "Company users can update invoices" ON invoices;
DROP POLICY IF EXISTS "Company users can delete invoices" ON invoices;

CREATE POLICY "Users can view invoices in their companies"
    ON invoices FOR SELECT
    USING (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant', 'viewer')
            OR user_has_permission(company_id, 'can_manage_invoices')
            OR user_has_permission(company_id, 'can_view_financials')
        )
    );

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

-- ============================================================================
-- EXPENSES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Company users can view expenses" ON expenses;
DROP POLICY IF EXISTS "Company users can create expenses" ON expenses;
DROP POLICY IF EXISTS "Company users can update expenses" ON expenses;
DROP POLICY IF EXISTS "Company users can delete expenses" ON expenses;

CREATE POLICY "Users can view expenses in their companies"
    ON expenses FOR SELECT
    USING (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant', 'viewer')
            OR user_has_permission(company_id, 'can_manage_expenses')
            OR user_has_permission(company_id, 'can_view_financials')
        )
    );

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

-- ============================================================================
-- CLIENTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Company users can view clients" ON clients;
DROP POLICY IF EXISTS "Company users can create clients" ON clients;
DROP POLICY IF EXISTS "Company users can update clients" ON clients;
DROP POLICY IF EXISTS "Company users can delete clients" ON clients;

CREATE POLICY "Users can view clients in their companies"
    ON clients FOR SELECT
    USING (
        user_has_company_access(company_id)
        AND (
            user_company_role(company_id) IN ('owner', 'accountant', 'viewer')
            OR user_has_permission(company_id, 'can_manage_clients')
        )
    );

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

-- ============================================================================
-- COMPANIES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their companies" ON companies;
DROP POLICY IF EXISTS "Owners can update their companies" ON companies;

CREATE POLICY "Users can view their companies"
    ON companies FOR SELECT
    USING (
        id IN (
            SELECT company_id FROM user_companies uc
            JOIN profiles p ON uc.user_id = p.id
            WHERE p.auth_user_id = auth.uid()
            AND uc.invite_status = 'accepted'
        )
    );

CREATE POLICY "Owners can update their companies"
    ON companies FOR UPDATE
    USING (
        id IN (
            SELECT company_id FROM user_companies uc
            JOIN profiles p ON uc.user_id = p.id
            WHERE p.auth_user_id = auth.uid()
            AND uc.role = 'owner'
            AND uc.invite_status = 'accepted'
        )
    )
    WITH CHECK (
        id IN (
            SELECT company_id FROM user_companies uc
            JOIN profiles p ON uc.user_id = p.id
            WHERE p.auth_user_id = auth.uid()
            AND uc.role = 'owner'
            AND uc.invite_status = 'accepted'
        )
    );

-- ============================================================================
-- TIME_ENTRIES TABLE (if exists)
-- ============================================================================

-- Only create policies if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_entries') THEN
        -- Drop old policies
        EXECUTE 'DROP POLICY IF EXISTS "Company users can view time entries" ON time_entries';
        EXECUTE 'DROP POLICY IF EXISTS "Company users can create time entries" ON time_entries';
        EXECUTE 'DROP POLICY IF EXISTS "Company users can update time entries" ON time_entries';
        EXECUTE 'DROP POLICY IF EXISTS "Company users can delete time entries" ON time_entries';
        
        -- Create new policies
        EXECUTE 'CREATE POLICY "Users can view time entries in their companies"
            ON time_entries FOR SELECT
            USING (
                user_has_company_access(company_id)
                AND (
                    user_company_role(company_id) IN (''owner'', ''accountant'', ''viewer'')
                    OR user_has_permission(company_id, ''can_schedule_employees'')
                    OR user_has_permission(company_id, ''can_approve_timesheets'')
                    OR employee_id IN (
                        SELECT id FROM employees 
                        WHERE auth_user_id = auth.uid()
                    )
                )
            )';
        
        EXECUTE 'CREATE POLICY "Authorized users can create time entries"
            ON time_entries FOR INSERT
            WITH CHECK (
                user_has_company_access(company_id)
                AND (
                    user_company_role(company_id) IN (''owner'', ''accountant'')
                    OR user_has_permission(company_id, ''can_schedule_employees'')
                    OR employee_id IN (
                        SELECT id FROM employees 
                        WHERE auth_user_id = auth.uid()
                    )
                )
            )';
        
        EXECUTE 'CREATE POLICY "Authorized users can update time entries"
            ON time_entries FOR UPDATE
            USING (
                user_has_company_access(company_id)
                AND (
                    user_company_role(company_id) IN (''owner'', ''accountant'')
                    OR user_has_permission(company_id, ''can_schedule_employees'')
                    OR (
                        employee_id IN (
                            SELECT id FROM employees 
                            WHERE auth_user_id = auth.uid()
                        )
                        AND status = ''draft''
                    )
                )
            )';
        
        EXECUTE 'CREATE POLICY "Authorized users can delete time entries"
            ON time_entries FOR DELETE
            USING (
                user_has_company_access(company_id)
                AND (
                    user_company_role(company_id) IN (''owner'', ''accountant'')
                    OR user_has_permission(company_id, ''can_schedule_employees'')
                    OR (
                        employee_id IN (
                            SELECT id FROM employees 
                            WHERE auth_user_id = auth.uid()
                        )
                        AND status = ''draft''
                    )
                )
            )';
    END IF;
END $$;

-- ============================================================================
-- SALARIES TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'salaries') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Company users can view salaries" ON salaries';
        EXECUTE 'DROP POLICY IF EXISTS "Company users can manage salaries" ON salaries';
        
        EXECUTE 'CREATE POLICY "Users can view salaries in their companies"
            ON salaries FOR SELECT
            USING (
                user_has_company_access(company_id)
                AND (
                    user_company_role(company_id) IN (''owner'', ''accountant'', ''viewer'')
                    OR employee_id IN (
                        SELECT id FROM employees 
                        WHERE auth_user_id = auth.uid()
                    )
                )
            )';
        
        EXECUTE 'CREATE POLICY "Owners and accountants can manage salaries"
            ON salaries FOR ALL
            USING (
                user_has_company_access(company_id)
                AND user_company_role(company_id) IN (''owner'', ''accountant'')
            )
            WITH CHECK (
                user_has_company_access(company_id)
                AND user_company_role(company_id) IN (''owner'', ''accountant'')
            )';
    END IF;
END $$;

-- ============================================================================
-- ADDITIONAL TABLES (Apply same pattern)
-- ============================================================================
-- Note: For other tables like dividends, income_entries, hst_payments, etc.
-- Apply the same pattern:
-- 1. View: user_has_company_access + role/permission check
-- 2. Insert/Update/Delete: user_has_company_access + owner/accountant or permission

-- Example for dividends (if table exists):
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dividends') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Company users can view dividends" ON dividends';
        EXECUTE 'DROP POLICY IF EXISTS "Company users can manage dividends" ON dividends';
        
        EXECUTE 'CREATE POLICY "Users can view dividends in their companies"
            ON dividends FOR SELECT
            USING (
                user_has_company_access(company_id)
                AND (
                    user_company_role(company_id) IN (''owner'', ''accountant'', ''viewer'')
                    OR user_has_permission(company_id, ''can_view_financials'')
                )
            )';
        
        EXECUTE 'CREATE POLICY "Owners and accountants can manage dividends"
            ON dividends FOR ALL
            USING (
                user_has_company_access(company_id)
                AND user_company_role(company_id) IN (''owner'', ''accountant'')
            )
            WITH CHECK (
                user_has_company_access(company_id)
                AND user_company_role(company_id) IN (''owner'', ''accountant'')
            )';
    END IF;
END $$;

-- Add similar blocks for other tables as needed:
-- income_entries, hst_payments, tax_returns, capital_assets, owner_payments, etc.
