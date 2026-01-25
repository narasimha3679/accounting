-- Migration 001: Create user_companies table and supporting structures
-- This migration creates the user_companies junction table for multi-owner support

-- Create user_companies junction table
CREATE TABLE IF NOT EXISTS user_companies (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'accountant', 'viewer')),
    permissions JSONB DEFAULT '{}'::jsonb,
    is_primary BOOLEAN DEFAULT false,
    invite_status TEXT NOT NULL DEFAULT 'accepted' CHECK (invite_status IN ('pending', 'accepted', 'declined')),
    invite_token TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, company_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company_id ON user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_role ON user_companies(role);
CREATE INDEX IF NOT EXISTS idx_user_companies_primary ON user_companies(user_id, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_user_companies_invite_status ON user_companies(invite_status);
CREATE INDEX IF NOT EXISTS idx_user_companies_invite_token ON user_companies(invite_token) WHERE invite_token IS NOT NULL;

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_user_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS user_companies_updated_at ON user_companies;
CREATE TRIGGER user_companies_updated_at
    BEFORE UPDATE ON user_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_user_companies_updated_at();

-- Enable RLS
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;

-- Create pending_shareholder_invites table for users who don't exist yet
CREATE TABLE IF NOT EXISTS pending_shareholder_invites (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'accountant', 'viewer')),
    invite_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(company_id, email, invite_token)
);

-- Indexes for pending_shareholder_invites
CREATE INDEX IF NOT EXISTS idx_pending_invites_company_id ON pending_shareholder_invites(company_id);
CREATE INDEX IF NOT EXISTS idx_pending_invites_email ON pending_shareholder_invites(email);
CREATE INDEX IF NOT EXISTS idx_pending_invites_token ON pending_shareholder_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_pending_invites_expires ON pending_shareholder_invites(expires_at) WHERE claimed_at IS NULL;

-- Trigger function for pending_shareholder_invites updated_at
CREATE OR REPLACE FUNCTION update_pending_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for pending_shareholder_invites
DROP TRIGGER IF EXISTS pending_invites_updated_at ON pending_shareholder_invites;
CREATE TRIGGER pending_invites_updated_at
    BEFORE UPDATE ON pending_shareholder_invites
    FOR EACH ROW
    EXECUTE FUNCTION update_pending_invites_updated_at();

-- Enable RLS on pending_shareholder_invites
ALTER TABLE pending_shareholder_invites ENABLE ROW LEVEL SECURITY;

-- Add comment
COMMENT ON TABLE user_companies IS 'Junction table for many-to-many relationship between users and companies. Supports multi-owner businesses with role-based permissions.';
COMMENT ON TABLE pending_shareholder_invites IS 'Stores invitations for users who do not yet have an account. These are converted to user_companies entries when the user signs up.';
