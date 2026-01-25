-- Migration 002: Create RLS helper functions
-- These functions simplify RLS policies and improve performance

-- Function: Check if user has access to a company
CREATE OR REPLACE FUNCTION user_has_company_access(p_company_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_companies uc
        JOIN profiles p ON uc.user_id = p.id
        WHERE p.auth_user_id = auth.uid()
        AND uc.company_id = p_company_id
        AND uc.invite_status = 'accepted'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function: Check if user has a specific permission
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
    AND uc.company_id = p_company_id
    AND uc.invite_status = 'accepted';
    
    -- If no membership found, return false
    IF v_role IS NULL THEN
        RETURN false;
    END IF;
    
    -- Owners have all permissions
    IF v_role = 'owner' THEN
        RETURN true;
    END IF;
    
    -- Accountants have financial permissions by default
    IF v_role = 'accountant' THEN
        IF p_permission IN ('can_manage_invoices', 'can_manage_expenses', 'can_view_financials', 'can_view_reports') THEN
            RETURN true;
        END IF;
    END IF;
    
    -- Check specific permission for managers
    IF v_role = 'manager' AND v_permissions IS NOT NULL THEN
        RETURN COALESCE((v_permissions->>p_permission)::boolean, false);
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function: Get user's role for a company
CREATE OR REPLACE FUNCTION user_company_role(p_company_id BIGINT)
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT uc.role INTO v_role
    FROM user_companies uc
    JOIN profiles p ON uc.user_id = p.id
    WHERE p.auth_user_id = auth.uid()
    AND uc.company_id = p_company_id
    AND uc.invite_status = 'accepted';
    
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Add comments
COMMENT ON FUNCTION user_has_company_access(BIGINT) IS 'Checks if the current authenticated user has access to the specified company';
COMMENT ON FUNCTION user_has_permission(BIGINT, TEXT) IS 'Checks if the current authenticated user has a specific permission for a company. Owners always return true.';
COMMENT ON FUNCTION user_company_role(BIGINT) IS 'Returns the current authenticated user''s role for the specified company';
