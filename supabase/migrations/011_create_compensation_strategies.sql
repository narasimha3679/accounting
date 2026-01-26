-- Migration: Create compensation_strategies table
-- Stores annual compensation plans for business owners
-- This enables proactive tax optimization by tracking planned vs actual compensation

CREATE TABLE IF NOT EXISTS compensation_strategies (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    owner_id BIGINT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    fiscal_year INTEGER NOT NULL,
    
    -- Goal Type: 'net_cash', 'maximize_rrsp', 'maximize_cpp', 'minimize_tax'
    goal_type TEXT NOT NULL DEFAULT 'minimize_tax' 
        CHECK (goal_type IN ('net_cash', 'maximize_rrsp', 'maximize_cpp', 'minimize_tax')),
    
    -- If goal_type = 'net_cash', this is the target amount
    target_net_cash NUMERIC(12,2),
    
    -- The calculated optimal mix
    planned_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    planned_eligible_dividends NUMERIC(12,2) NOT NULL DEFAULT 0,
    planned_non_eligible_dividends NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Projected outcomes (for reference)
    projected_net_cash NUMERIC(12,2),
    projected_total_tax NUMERIC(12,2),
    projected_rrsp_room NUMERIC(12,2),
    projected_cpp_contributions NUMERIC(12,2),
    projected_effective_tax_rate NUMERIC(5,2),
    
    -- Input parameters used for calculation (for audit/recalculation)
    corporate_net_income NUMERIC(12,2),
    rdtoh_balance NUMERIC(12,2),
    other_personal_income NUMERIC(12,2),
    province TEXT DEFAULT 'ON',
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active' 
        CHECK (status IN ('active', 'completed', 'abandoned')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_company_owner_year UNIQUE (company_id, owner_id, fiscal_year)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_compensation_strategies_lookup 
ON compensation_strategies(company_id, owner_id, fiscal_year, status);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_compensation_strategies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS compensation_strategies_updated_at ON compensation_strategies;
CREATE TRIGGER compensation_strategies_updated_at
    BEFORE UPDATE ON compensation_strategies
    FOR EACH ROW
    EXECUTE FUNCTION update_compensation_strategies_updated_at();

-- Enable RLS
ALTER TABLE compensation_strategies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view strategies in their companies"
ON compensation_strategies FOR SELECT
USING (
    user_has_company_access(company_id)
    AND (
        user_company_role(company_id) IN ('owner', 'accountant', 'viewer')
        OR owner_id IN (
            SELECT id FROM profiles WHERE auth_user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can insert own strategies"
ON compensation_strategies FOR INSERT
WITH CHECK (
    owner_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    AND user_has_company_access(company_id)
);

CREATE POLICY "Users can update own strategies"
ON compensation_strategies FOR UPDATE
USING (
    owner_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    AND user_has_company_access(company_id)
)
WITH CHECK (
    owner_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    AND user_has_company_access(company_id)
);

-- Comments
COMMENT ON TABLE compensation_strategies IS 'Stores annual compensation strategies for business owners. Enables proactive tax optimization by tracking planned vs actual compensation throughout the fiscal year.';
COMMENT ON COLUMN compensation_strategies.goal_type IS 'The optimization goal: net_cash (target amount), maximize_rrsp, maximize_cpp, or minimize_tax';
COMMENT ON COLUMN compensation_strategies.target_net_cash IS 'Target net cash amount when goal_type is net_cash';
COMMENT ON COLUMN compensation_strategies.planned_salary IS 'Planned salary amount for the fiscal year';
COMMENT ON COLUMN compensation_strategies.planned_eligible_dividends IS 'Planned eligible dividend amount for the fiscal year';
COMMENT ON COLUMN compensation_strategies.planned_non_eligible_dividends IS 'Planned non-eligible dividend amount for the fiscal year';
