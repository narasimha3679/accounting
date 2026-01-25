-- Migration 006: Fix infinite recursion in user_companies RLS policies
-- The issue: Policies were querying user_companies to check permissions, causing infinite recursion
-- Solution: Use SECURITY DEFINER helper functions or restructure policies to avoid recursion

-- ============================================================================
-- PART 1: Drop all problematic policies on user_companies
-- ============================================================================
DROP POLICY IF EXISTS "Owners can view company memberships" ON user_companies;
DROP POLICY IF EXISTS "Owners can view all company memberships" ON user_companies;
DROP POLICY IF EXISTS "Owners can add company members" ON user_companies;
DROP POLICY IF EXISTS "Owners can update company memberships" ON user_companies;
DROP POLICY IF EXISTS "Owners can remove company members" ON user_companies;

-- ============================================================================
-- PART 2: Create SECURITY DEFINER helper function to bypass RLS
-- ============================================================================
CREATE OR REPLACE FUNCTION user_is_owner_of_company(p_company_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_companies uc
        JOIN profiles p ON uc.user_id = p.id
        WHERE p.auth_user_id = auth.uid()
        AND uc.company_id = p_company_id
        AND uc.role = 'owner'
        AND uc.invite_status = 'accepted'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- PART 3: Recreate user_companies policies using helper function
-- ============================================================================

-- Policy: Owners can view all memberships for their companies
CREATE POLICY "Owners can view company memberships"
    ON user_companies FOR SELECT
    USING (
        user_is_owner_of_company(company_id)
    );

-- Policy: Only owners can insert new memberships
CREATE POLICY "Owners can add company members"
    ON user_companies FOR INSERT
    WITH CHECK (
        user_is_owner_of_company(company_id)
    );

-- Policy: Only owners can update memberships
CREATE POLICY "Owners can update company memberships"
    ON user_companies FOR UPDATE
    USING (
        user_is_owner_of_company(company_id)
    )
    WITH CHECK (
        user_is_owner_of_company(company_id)
    );

-- Policy: Only owners can delete memberships
CREATE POLICY "Owners can remove company members"
    ON user_companies FOR DELETE
    USING (
        user_is_owner_of_company(company_id)
    );

-- ============================================================================
-- PART 4: Fix pending_shareholder_invites policies
-- ============================================================================
DROP POLICY IF EXISTS "Owners can view pending invitations" ON pending_shareholder_invites;
DROP POLICY IF EXISTS "Owners can view pending invites" ON pending_shareholder_invites;
DROP POLICY IF EXISTS "Owners can create pending invitations" ON pending_shareholder_invites;

CREATE POLICY "Owners can view pending invitations"
    ON pending_shareholder_invites FOR SELECT
    USING (
        user_is_owner_of_company(company_id)
    );

CREATE POLICY "Owners can create pending invitations"
    ON pending_shareholder_invites FOR INSERT
    WITH CHECK (
        user_is_owner_of_company(company_id)
    );

-- ============================================================================
-- PART 5: Fix companies table policies (also referenced user_companies directly)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their companies" ON companies;
DROP POLICY IF EXISTS "Owners can update their companies" ON companies;

-- Users can view companies they have access to (via helper function or legacy profile.company_id)
CREATE POLICY "Users can view their companies"
    ON companies FOR SELECT
    USING (
        user_has_company_access(id)
        OR id IN (
            SELECT company_id FROM profiles
            WHERE auth_user_id = auth.uid() AND company_id IS NOT NULL
        )
    );

-- Owners can update their companies
CREATE POLICY "Owners can update their companies"
    ON companies FOR UPDATE
    USING (
        user_is_owner_of_company(id)
        OR id IN (
            SELECT company_id FROM profiles
            WHERE auth_user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    )
    WITH CHECK (
        user_is_owner_of_company(id)
        OR id IN (
            SELECT company_id FROM profiles
            WHERE auth_user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );
