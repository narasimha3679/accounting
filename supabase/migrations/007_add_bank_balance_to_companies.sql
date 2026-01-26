-- Add current_bank_balance and last_balance_update to companies table

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS current_bank_balance DECIMAL(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS last_balance_update TIMESTAMPTZ;

COMMENT ON COLUMN companies.current_bank_balance IS 'The manually updated or synced bank balance for the company.';
COMMENT ON COLUMN companies.last_balance_update IS 'When the bank balance was last updated.';
