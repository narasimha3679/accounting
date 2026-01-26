-- Migration: Create dividend_tax_constants table
-- Stores dividend gross-up rates and tax credits by year/province

CREATE TABLE IF NOT EXISTS dividend_tax_constants (
    id BIGSERIAL PRIMARY KEY,
    tax_year INTEGER NOT NULL,
    province TEXT NOT NULL, -- 'federal', 'ON', 'BC', etc.
    dividend_type TEXT NOT NULL CHECK (dividend_type IN ('eligible', 'non_eligible')),
    gross_up_rate NUMERIC NOT NULL,
    federal_tax_credit_rate NUMERIC NOT NULL,
    provincial_tax_credit_rate NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tax_year, province, dividend_type)
);

-- Create index for common queries
CREATE INDEX idx_dividend_tax_constants_year_province 
ON dividend_tax_constants(tax_year, province);

-- Enable RLS
ALTER TABLE dividend_tax_constants ENABLE ROW LEVEL SECURITY;

-- Allow public read access (tax constants are not company-specific)
CREATE POLICY "Allow public read access to dividend_tax_constants"
ON dividend_tax_constants FOR SELECT
TO authenticated
USING (true);

-- Seed data for 2025
INSERT INTO dividend_tax_constants (tax_year, province, dividend_type, gross_up_rate, federal_tax_credit_rate, provincial_tax_credit_rate) VALUES
-- Federal rates (provincial_tax_credit_rate is NULL for federal)
(2025, 'federal', 'eligible', 0.38, 0.150198, NULL),
(2025, 'federal', 'non_eligible', 0.15, 0.090301, NULL),
-- Ontario rates
(2025, 'ON', 'eligible', 0.38, 0.150198, 0.10),
(2025, 'ON', 'non_eligible', 0.15, 0.090301, 0.0287);

-- Seed data for 2026
INSERT INTO dividend_tax_constants (tax_year, province, dividend_type, gross_up_rate, federal_tax_credit_rate, provincial_tax_credit_rate) VALUES
-- Federal rates
(2026, 'federal', 'eligible', 0.38, 0.1502, NULL),
(2026, 'federal', 'non_eligible', 0.15, 0.0903, NULL),
-- Ontario rates
(2026, 'ON', 'eligible', 0.38, 0.1502, 0.10),
(2026, 'ON', 'non_eligible', 0.15, 0.0903, 0.0287);

COMMENT ON TABLE dividend_tax_constants IS 'Stores dividend gross-up rates and tax credits for Canadian tax calculations';
