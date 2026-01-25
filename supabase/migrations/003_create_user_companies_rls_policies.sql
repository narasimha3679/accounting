-- Migration 003: Create RLS policies for user_companies table
-- These policies control who can view, insert, update, and delete company memberships

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view own company memberships" ON user_companies;
DROP POLICY IF EXISTS "Owners can view company memberships" ON user_companies;
DROP POLICY IF EXISTS "Owners can add company members" ON user_companies;
DROP POLICY IF EXISTS "Owners can update company memberships" ON user_companies;
DROP POLICY IF EXISTS "Owners can remove company members" ON user_companies;

-- Policy 1: Users can view their own company memberships
CREATE POLICY "Users can view own company memberships"
    ON user_companies FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM profiles 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Policy 2: Owners can view all memberships for their companies
CREATE POLICY "Owners can view company memberships"
    ON user_companies FOR SELECT
    USING (
        company_id IN (
            SELECT uc.company_id FROM user_companies uc
            JOIN profiles p ON uc.user_id = p.id
            WHERE p.auth_user_id = auth.uid()
            AND uc.role = 'owner'
            AND uc.invite_status = 'accepted'
        )
    );

-- Policy 3: Only owners can insert new memberships
CREATE POLICY "Owners can add company members"
    ON user_companies FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT uc.company_id FROM user_companies uc
            JOIN profiles p ON uc.user_id = p.id
            WHERE p.auth_user_id = auth.uid()
            AND uc.role = 'owner'
            AND uc.invite_status = 'accepted'
        )
    );

-- Policy 4: Only owners can update memberships
CREATE POLICY "Owners can update company memberships"
    ON user_companies FOR UPDATE
    USING (
        company_id IN (
            SELECT uc.company_id FROM user_companies uc
            JOIN profiles p ON uc.user_id = p.id
            WHERE p.auth_user_id = auth.uid()
            AND uc.role = 'owner'
            AND uc.invite_status = 'accepted'
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT uc.company_id FROM user_companies uc
            JOIN profiles p ON uc.user_id = p.id
            WHERE p.auth_user_id = auth.uid()
            AND uc.role = 'owner'
            AND uc.invite_status = 'accepted'
        )
    );

-- Policy 5: Only owners can delete memberships (with restrictions)
-- Note: The check to prevent deleting the last owner is handled in application code
-- as RLS policies cannot easily check this condition
CREATE POLICY "Owners can remove company members"
    ON user_companies FOR DELETE
    USING (
        company_id IN (
            SELECT uc.company_id FROM user_companies uc
            JOIN profiles p ON uc.user_id = p.id
            WHERE p.auth_user_id = auth.uid()
            AND uc.role = 'owner'
            AND uc.invite_status = 'accepted'
        )
    );

-- RLS policies for pending_shareholder_invites
DROP POLICY IF EXISTS "Owners can view pending invitations" ON pending_shareholder_invites;
DROP POLICY IF EXISTS "Owners can create pending invitations" ON pending_shareholder_invites;
DROP POLICY IF EXISTS "Users can view their own pending invitations" ON pending_shareholder_invites;
DROP POLICY IF EXISTS "Users can claim their pending invitations" ON pending_shareholder_invites;

-- Policy: Owners can view pending invitations for their companies
CREATE POLICY "Owners can view pending invitations"
    ON pending_shareholder_invites FOR SELECT
    USING (
        company_id IN (
            SELECT uc.company_id FROM user_companies uc
            JOIN profiles p ON uc.user_id = p.id
            WHERE p.auth_user_id = auth.uid()
            AND uc.role = 'owner'
            AND uc.invite_status = 'accepted'
        )
    );

-- Policy: Owners can create pending invitations
CREATE POLICY "Owners can create pending invitations"
    ON pending_shareholder_invites FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT uc.company_id FROM user_companies uc
            JOIN profiles p ON uc.user_id = p.id
            WHERE p.auth_user_id = auth.uid()
            AND uc.role = 'owner'
            AND uc.invite_status = 'accepted'
        )
    );

-- Policy: Users can view their own pending invitations (by email)
CREATE POLICY "Users can view their own pending invitations"
    ON pending_shareholder_invites FOR SELECT
    USING (
        email IN (
            SELECT email FROM profiles
            WHERE auth_user_id = auth.uid()
        )
    );

-- Policy: Users can update (claim) their own pending invitations
CREATE POLICY "Users can claim their pending invitations"
    ON pending_shareholder_invites FOR UPDATE
    USING (
        email IN (
            SELECT email FROM profiles
            WHERE auth_user_id = auth.uid()
        )
        AND claimed_at IS NULL
        AND expires_at > now()
    )
    WITH CHECK (
        email IN (
            SELECT email FROM profiles
            WHERE auth_user_id = auth.uid()
        )
    );
