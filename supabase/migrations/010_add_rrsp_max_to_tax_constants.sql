-- Migration: Add RRSP maximum contribution room to tax_constants table
-- RRSP room is calculated as 18% of earned income, capped at a yearly maximum

-- Add column to tax_constants table
ALTER TABLE tax_constants 
ADD COLUMN IF NOT EXISTS rrsp_max_contribution_room NUMERIC(10,2);

-- Create comment
COMMENT ON COLUMN tax_constants.rrsp_max_contribution_room IS 'Maximum RRSP contribution room for the tax year (18% of max pensionable earnings)';

-- Update existing records with 2025 and 2026 values
-- 2025: $31,560 (18% of $175,000)
-- 2026: $31,560 (18% of $175,000)
UPDATE tax_constants 
SET rrsp_max_contribution_room = 31560.00 
WHERE tax_year IN (2025, 2026) 
AND rrsp_max_contribution_room IS NULL;
