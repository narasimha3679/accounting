-- Migration: Add default_dividend_type to companies table
-- Sets default dividend type for small businesses (non_eligible by default)

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS default_dividend_type TEXT NOT NULL DEFAULT 'non_eligible'
CHECK (default_dividend_type IN ('eligible', 'non_eligible'));

-- Comment
COMMENT ON COLUMN companies.default_dividend_type IS 'Default dividend type for this company. Most small businesses use non_eligible dividends. Eligible dividends are typically from public corporations.';
