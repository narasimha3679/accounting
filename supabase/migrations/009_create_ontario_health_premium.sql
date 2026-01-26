-- Migration: Create ontario_health_premium table
-- Stores Ontario Health Premium tiers for personal tax calculations

CREATE TABLE IF NOT EXISTS ontario_health_premium (
    id BIGSERIAL PRIMARY KEY,
    tax_year INTEGER NOT NULL,
    min_income NUMERIC NOT NULL,
    max_income NUMERIC, -- NULL means no upper limit
    base_premium NUMERIC NOT NULL,
    rate_on_excess NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tax_year, min_income)
);

-- Create index for common queries
CREATE INDEX idx_ontario_health_premium_year 
ON ontario_health_premium(tax_year);

-- Enable RLS
ALTER TABLE ontario_health_premium ENABLE ROW LEVEL SECURITY;

-- Allow public read access (tax constants are not company-specific)
CREATE POLICY "Allow public read access to ontario_health_premium"
ON ontario_health_premium FOR SELECT
TO authenticated
USING (true);

-- Seed data for 2025 (same rates as 2024)
INSERT INTO ontario_health_premium (tax_year, min_income, max_income, base_premium, rate_on_excess) VALUES
(2025, 0, 20000, 0, 0),
(2025, 20001, 25000, 0, 0.06),
(2025, 25001, 36000, 300, 0.06),
(2025, 36001, 38500, 450, 0.25),
(2025, 38501, 48000, 600, 0.25),
(2025, 48001, 72000, 750, 0.25),
(2025, 72001, 200000, 900, 0.25),
(2025, 200001, NULL, 900, 0);

-- Seed data for 2026 (same rates, may be adjusted when CRA announces)
INSERT INTO ontario_health_premium (tax_year, min_income, max_income, base_premium, rate_on_excess) VALUES
(2026, 0, 20000, 0, 0),
(2026, 20001, 25000, 0, 0.06),
(2026, 25001, 36000, 300, 0.06),
(2026, 36001, 38500, 450, 0.25),
(2026, 38501, 48000, 600, 0.25),
(2026, 48001, 72000, 750, 0.25),
(2026, 72001, 200000, 900, 0.25),
(2026, 200001, NULL, 900, 0);

COMMENT ON TABLE ontario_health_premium IS 'Stores Ontario Health Premium tiers for personal tax calculations. Premium is: base_premium + (income - min_income) * rate_on_excess, capped at next tier.';
