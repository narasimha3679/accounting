# Phase 1: Database Schema

## Overview

This phase creates all the database tables needed for the payroll system. These tables will store payroll configuration, pay runs, tax calculations, benefits, and year-to-date tracking.

## Prerequisites

- Existing `companies` table
- Existing `employees` table (with SIN, payrate, payrate_type)
- Existing `time_entries` table (for hours worked)
- Supabase MCP access for migrations

## New Tables

### 1. `payroll_settings`

Company-level payroll configuration.

```sql
CREATE TABLE payroll_settings (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Pay frequency
    pay_frequency TEXT NOT NULL DEFAULT 'biweekly' 
        CHECK (pay_frequency IN ('weekly', 'biweekly', 'semi_monthly', 'monthly')),
    
    -- Province for tax calculations
    province TEXT NOT NULL DEFAULT 'ON'
        CHECK (province IN ('ON', 'BC', 'AB', 'SK', 'MB', 'QC', 'NB', 'NS', 'PE', 'NL', 'YT', 'NT', 'NU')),
    
    -- Overtime settings
    overtime_enabled BOOLEAN NOT NULL DEFAULT true,
    overtime_threshold_weekly NUMERIC(5,2) NOT NULL DEFAULT 44.00,
    overtime_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.50,
    
    -- Vacation settings
    vacation_tracking_enabled BOOLEAN NOT NULL DEFAULT true,
    vacation_rate_under_5_years NUMERIC(4,3) NOT NULL DEFAULT 0.040,  -- 4%
    vacation_rate_5_plus_years NUMERIC(4,3) NOT NULL DEFAULT 0.060,   -- 6%
    vacation_accrual_method TEXT NOT NULL DEFAULT 'per_pay'
        CHECK (vacation_accrual_method IN ('per_pay', 'anniversary', 'calendar_year')),
    
    -- CRA remittance schedule
    remitter_type TEXT NOT NULL DEFAULT 'regular'
        CHECK (remitter_type IN ('quarterly', 'regular', 'threshold1', 'threshold2')),
    
    -- Defaults
    default_work_hours_per_day NUMERIC(4,2) NOT NULL DEFAULT 8.00,
    default_work_days_per_week INTEGER NOT NULL DEFAULT 5,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    
    UNIQUE(company_id)
);

-- Index for company lookup
CREATE INDEX idx_payroll_settings_company_id ON payroll_settings(company_id);

-- RLS
ALTER TABLE payroll_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view payroll settings"
    ON payroll_settings FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'accountant')
        )
    );

CREATE POLICY "Admin users can manage payroll settings"
    ON payroll_settings FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'admin'
        )
    );
```

### 2. `tax_rates`

Federal and provincial tax brackets. Updated yearly.

```sql
CREATE TABLE tax_rates (
    id BIGSERIAL PRIMARY KEY,
    tax_year INTEGER NOT NULL,
    jurisdiction TEXT NOT NULL,  -- 'federal' or province code ('ON', 'BC', etc.)
    bracket_number INTEGER NOT NULL,
    min_income NUMERIC(12,2) NOT NULL,
    max_income NUMERIC(12,2),  -- NULL for highest bracket
    rate NUMERIC(6,5) NOT NULL,  -- e.g., 0.14000 for 14%
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    
    UNIQUE(tax_year, jurisdiction, bracket_number)
);

-- Index for lookups
CREATE INDEX idx_tax_rates_year_jurisdiction ON tax_rates(tax_year, jurisdiction);

-- No RLS needed - public read-only data
-- Insert via migration, not user input
```

### 3. `tax_constants`

Annual tax constants (CPP, EI maximums, exemptions, etc.)

```sql
CREATE TABLE tax_constants (
    id BIGSERIAL PRIMARY KEY,
    tax_year INTEGER NOT NULL,
    
    -- CPP
    cpp_rate NUMERIC(6,5) NOT NULL,              -- 0.0595
    cpp_employer_rate NUMERIC(6,5) NOT NULL,     -- 0.0595
    cpp_basic_exemption NUMERIC(10,2) NOT NULL,  -- 3500.00
    cpp_ympe NUMERIC(12,2) NOT NULL,             -- 74600.00
    cpp_max_contribution NUMERIC(10,2) NOT NULL, -- Calculated
    
    -- CPP2
    cpp2_rate NUMERIC(6,5) NOT NULL,             -- 0.04
    cpp2_yampe NUMERIC(12,2) NOT NULL,           -- 85000.00
    cpp2_max_contribution NUMERIC(10,2) NOT NULL,
    
    -- EI
    ei_employee_rate NUMERIC(6,5) NOT NULL,      -- 0.0163
    ei_employer_multiplier NUMERIC(4,2) NOT NULL, -- 1.4
    ei_max_insurable NUMERIC(12,2) NOT NULL,     -- 68900.00
    ei_max_premium NUMERIC(10,2) NOT NULL,       -- Calculated
    
    -- Federal
    federal_basic_personal_amount NUMERIC(10,2) NOT NULL,
    federal_employment_amount NUMERIC(10,2) NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    
    UNIQUE(tax_year)
);

-- Index
CREATE INDEX idx_tax_constants_year ON tax_constants(tax_year);
```

### 4. `provincial_tax_constants`

Province-specific tax constants.

```sql
CREATE TABLE provincial_tax_constants (
    id BIGSERIAL PRIMARY KEY,
    tax_year INTEGER NOT NULL,
    province TEXT NOT NULL,
    
    basic_personal_amount NUMERIC(10,2) NOT NULL,
    
    -- Ontario-specific surtax
    surtax_threshold_1 NUMERIC(10,2),  -- 5554 for ON
    surtax_rate_1 NUMERIC(6,5),         -- 0.20 (20%)
    surtax_threshold_2 NUMERIC(10,2),  -- 7108 for ON
    surtax_rate_2 NUMERIC(6,5),         -- 0.36 (additional 36%)
    
    -- Health premium (Ontario)
    health_premium_enabled BOOLEAN NOT NULL DEFAULT false,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    
    UNIQUE(tax_year, province)
);

CREATE INDEX idx_provincial_tax_constants ON provincial_tax_constants(tax_year, province);
```

### 5. `benefit_types`

Company-defined benefit and deduction types.

```sql
CREATE TABLE benefit_types (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    
    -- Type classification
    category TEXT NOT NULL 
        CHECK (category IN ('taxable_benefit', 'pre_tax_deduction', 'post_tax_deduction')),
    
    -- Calculation method
    calculation_type TEXT NOT NULL
        CHECK (calculation_type IN ('fixed', 'percentage', 'hourly')),
    
    -- Default values (can be overridden per employee)
    default_amount NUMERIC(10,2),           -- For fixed amounts
    default_percentage NUMERIC(6,4),        -- For percentage (0.05 = 5%)
    default_hourly_rate NUMERIC(10,2),      -- For hourly benefits
    
    -- Limits
    annual_maximum NUMERIC(12,2),           -- Max per year
    
    -- Reporting
    t4_box TEXT,                            -- Which T4 box this appears in
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    
    UNIQUE(company_id, name)
);

CREATE INDEX idx_benefit_types_company ON benefit_types(company_id);

-- RLS
ALTER TABLE benefit_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view benefit types"
    ON benefit_types FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'accountant')
        )
    );

CREATE POLICY "Admin users can manage benefit types"
    ON benefit_types FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role = 'admin'
        )
    );
```

### 6. `employee_benefits`

Benefits assigned to specific employees.

```sql
CREATE TABLE employee_benefits (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    benefit_type_id BIGINT NOT NULL REFERENCES benefit_types(id) ON DELETE CASCADE,
    
    -- Override defaults if needed
    amount NUMERIC(10,2),
    percentage NUMERIC(6,4),
    hourly_rate NUMERIC(10,2),
    
    effective_date DATE NOT NULL,
    end_date DATE,  -- NULL if ongoing
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_employee_benefits_employee ON employee_benefits(employee_id);
CREATE INDEX idx_employee_benefits_type ON employee_benefits(benefit_type_id);

-- RLS
ALTER TABLE employee_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view employee benefits"
    ON employee_benefits FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM employees 
            WHERE company_id IN (
                SELECT company_id FROM profiles 
                WHERE auth_user_id = auth.uid() 
                AND role IN ('admin', 'accountant')
            )
        )
    );

CREATE POLICY "Employees can view own benefits"
    ON employee_benefits FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM employees 
            WHERE auth_user_id = auth.uid()
        )
    );
```

### 7. `employee_tax_credits`

Employee TD1 claim amounts.

```sql
CREATE TABLE employee_tax_credits (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    tax_year INTEGER NOT NULL,
    
    -- Federal TD1
    federal_basic_personal NUMERIC(10,2) NOT NULL,
    federal_additional_claims NUMERIC(10,2) NOT NULL DEFAULT 0,
    federal_total_claim NUMERIC(10,2) NOT NULL,
    
    -- Provincial TD1
    provincial_basic_personal NUMERIC(10,2) NOT NULL,
    provincial_additional_claims NUMERIC(10,2) NOT NULL DEFAULT 0,
    provincial_total_claim NUMERIC(10,2) NOT NULL,
    
    -- Special situations
    claim_tax_exempt BOOLEAN NOT NULL DEFAULT false,  -- TD1 Line 13
    additional_tax_per_pay NUMERIC(10,2) NOT NULL DEFAULT 0,  -- Extra withholding
    
    effective_date DATE NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    
    UNIQUE(employee_id, tax_year)
);

CREATE INDEX idx_employee_tax_credits_employee_year ON employee_tax_credits(employee_id, tax_year);

-- RLS
ALTER TABLE employee_tax_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view tax credits"
    ON employee_tax_credits FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM employees 
            WHERE company_id IN (
                SELECT company_id FROM profiles 
                WHERE auth_user_id = auth.uid() 
                AND role IN ('admin', 'accountant')
            )
        )
    );

CREATE POLICY "Employees can view own tax credits"
    ON employee_tax_credits FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM employees 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Employees can update own tax credits"
    ON employee_tax_credits FOR UPDATE
    USING (
        employee_id IN (
            SELECT id FROM employees 
            WHERE auth_user_id = auth.uid()
        )
    );
```

### 8. `pay_runs`

Payroll batches.

```sql
CREATE TABLE pay_runs (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Pay period
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    pay_date DATE NOT NULL,
    
    -- Status workflow
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_approval', 'approved', 'finalized', 'void')),
    
    -- Totals (calculated)
    total_gross NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_cpp NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_cpp2 NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_ei NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_federal_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_provincial_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_other_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_net NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Employer costs
    total_employer_cpp NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_employer_ei NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_employer_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Audit trail
    created_by BIGINT REFERENCES profiles(id),
    approved_by BIGINT REFERENCES profiles(id),
    approved_at TIMESTAMPTZ,
    finalized_at TIMESTAMPTZ,
    voided_at TIMESTAMPTZ,
    void_reason TEXT,
    
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_pay_runs_company ON pay_runs(company_id);
CREATE INDEX idx_pay_runs_status ON pay_runs(status);
CREATE INDEX idx_pay_runs_pay_date ON pay_runs(pay_date);

-- RLS
ALTER TABLE pay_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view pay runs"
    ON pay_runs FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'accountant')
        )
    );

CREATE POLICY "Accountants can manage pay runs"
    ON pay_runs FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'accountant')
        )
    );
```

### 9. `pay_run_items`

Individual employee payments within a pay run.

```sql
CREATE TABLE pay_run_items (
    id BIGSERIAL PRIMARY KEY,
    pay_run_id BIGINT NOT NULL REFERENCES pay_runs(id) ON DELETE CASCADE,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    
    -- Hours
    regular_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
    overtime_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
    vacation_hours_used NUMERIC(6,2) NOT NULL DEFAULT 0,
    sick_hours_used NUMERIC(6,2) NOT NULL DEFAULT 0,
    statutory_holiday_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
    
    -- Rates (captured at time of pay run)
    hourly_rate NUMERIC(10,2),
    overtime_rate NUMERIC(10,2),
    
    -- Earnings breakdown
    regular_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
    overtime_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
    vacation_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
    statutory_holiday_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
    other_earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
    taxable_benefits NUMERIC(12,2) NOT NULL DEFAULT 0,
    gross_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Deductions
    cpp_employee NUMERIC(10,2) NOT NULL DEFAULT 0,
    cpp2_employee NUMERIC(10,2) NOT NULL DEFAULT 0,
    ei_employee NUMERIC(10,2) NOT NULL DEFAULT 0,
    federal_tax NUMERIC(10,2) NOT NULL DEFAULT 0,
    provincial_tax NUMERIC(10,2) NOT NULL DEFAULT 0,
    pre_tax_deductions NUMERIC(10,2) NOT NULL DEFAULT 0,
    post_tax_deductions NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Net
    net_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Employer costs
    cpp_employer NUMERIC(10,2) NOT NULL DEFAULT 0,
    ei_employer NUMERIC(10,2) NOT NULL DEFAULT 0,
    employer_total_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Vacation accrual
    vacation_accrued NUMERIC(10,2) NOT NULL DEFAULT 0,
    vacation_rate_used NUMERIC(5,3),  -- Rate at time of calculation
    
    -- YTD snapshot (for reference)
    ytd_gross_before NUMERIC(12,2),
    ytd_cpp_before NUMERIC(10,2),
    ytd_ei_before NUMERIC(10,2),
    
    -- Calculation notes
    calculation_notes JSONB,  -- Store any special calculation details
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    
    UNIQUE(pay_run_id, employee_id)
);

CREATE INDEX idx_pay_run_items_pay_run ON pay_run_items(pay_run_id);
CREATE INDEX idx_pay_run_items_employee ON pay_run_items(employee_id);

-- RLS
ALTER TABLE pay_run_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view pay run items"
    ON pay_run_items FOR SELECT
    USING (
        pay_run_id IN (
            SELECT id FROM pay_runs 
            WHERE company_id IN (
                SELECT company_id FROM profiles 
                WHERE auth_user_id = auth.uid() 
                AND role IN ('admin', 'accountant')
            )
        )
    );

CREATE POLICY "Employees can view own pay run items"
    ON pay_run_items FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM employees 
            WHERE auth_user_id = auth.uid()
        )
    );
```

### 10. `pay_run_item_deductions`

Line-item breakdown of deductions (benefits, garnishments, etc.)

```sql
CREATE TABLE pay_run_item_deductions (
    id BIGSERIAL PRIMARY KEY,
    pay_run_item_id BIGINT NOT NULL REFERENCES pay_run_items(id) ON DELETE CASCADE,
    benefit_type_id BIGINT REFERENCES benefit_types(id),
    
    -- Description (for non-benefit deductions like garnishments)
    description TEXT NOT NULL,
    category TEXT NOT NULL 
        CHECK (category IN ('taxable_benefit', 'pre_tax_deduction', 'post_tax_deduction', 'statutory')),
    
    amount NUMERIC(10,2) NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_pay_run_item_deductions_item ON pay_run_item_deductions(pay_run_item_id);

-- RLS inherits from pay_run_items
ALTER TABLE pay_run_item_deductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access via pay_run_items"
    ON pay_run_item_deductions FOR SELECT
    USING (
        pay_run_item_id IN (
            SELECT id FROM pay_run_items 
            WHERE pay_run_id IN (
                SELECT id FROM pay_runs 
                WHERE company_id IN (
                    SELECT company_id FROM profiles 
                    WHERE auth_user_id = auth.uid()
                )
            )
        )
    );
```

### 11. `employee_ytd`

Year-to-date accumulations.

```sql
CREATE TABLE employee_ytd (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    tax_year INTEGER NOT NULL,
    
    -- Earnings
    gross_earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
    pensionable_earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
    insurable_earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
    taxable_earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Deductions
    cpp_contributions NUMERIC(10,2) NOT NULL DEFAULT 0,
    cpp2_contributions NUMERIC(10,2) NOT NULL DEFAULT 0,
    ei_premiums NUMERIC(10,2) NOT NULL DEFAULT 0,
    federal_tax_withheld NUMERIC(12,2) NOT NULL DEFAULT 0,
    provincial_tax_withheld NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Benefits
    taxable_benefits NUMERIC(12,2) NOT NULL DEFAULT 0,
    rrsp_contributions NUMERIC(12,2) NOT NULL DEFAULT 0,
    union_dues NUMERIC(10,2) NOT NULL DEFAULT 0,
    charitable_donations NUMERIC(10,2) NOT NULL DEFAULT 0,
    
    -- Vacation
    vacation_earned NUMERIC(10,2) NOT NULL DEFAULT 0,
    vacation_used NUMERIC(10,2) NOT NULL DEFAULT 0,
    vacation_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
    
    -- Employer portions (for remittance tracking)
    employer_cpp NUMERIC(10,2) NOT NULL DEFAULT 0,
    employer_ei NUMERIC(10,2) NOT NULL DEFAULT 0,
    
    -- Flags
    cpp_maxed_out BOOLEAN NOT NULL DEFAULT false,
    cpp2_maxed_out BOOLEAN NOT NULL DEFAULT false,
    ei_maxed_out BOOLEAN NOT NULL DEFAULT false,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    
    UNIQUE(employee_id, tax_year)
);

CREATE INDEX idx_employee_ytd_employee_year ON employee_ytd(employee_id, tax_year);

-- RLS
ALTER TABLE employee_ytd ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view YTD"
    ON employee_ytd FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM employees 
            WHERE company_id IN (
                SELECT company_id FROM profiles 
                WHERE auth_user_id = auth.uid() 
                AND role IN ('admin', 'accountant')
            )
        )
    );

CREATE POLICY "Employees can view own YTD"
    ON employee_ytd FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM employees 
            WHERE auth_user_id = auth.uid()
        )
    );
```

### 12. `t4_slips`

Generated T4 data.

```sql
CREATE TABLE t4_slips (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    tax_year INTEGER NOT NULL,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'generated', 'amended', 'filed')),
    
    -- Employee info (captured at generation)
    employee_name TEXT NOT NULL,
    employee_sin TEXT NOT NULL,
    employee_address TEXT,
    
    -- Employer info (captured at generation)
    employer_name TEXT NOT NULL,
    employer_bn TEXT NOT NULL,
    employer_address TEXT,
    
    -- T4 Boxes
    box_14_employment_income NUMERIC(12,2) NOT NULL DEFAULT 0,
    box_16_cpp_contributions NUMERIC(10,2) NOT NULL DEFAULT 0,
    box_16a_cpp2_contributions NUMERIC(10,2) NOT NULL DEFAULT 0,
    box_18_ei_premiums NUMERIC(10,2) NOT NULL DEFAULT 0,
    box_22_income_tax_deducted NUMERIC(12,2) NOT NULL DEFAULT 0,
    box_24_ei_insurable_earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
    box_26_cpp_pensionable_earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
    box_44_union_dues NUMERIC(10,2) NOT NULL DEFAULT 0,
    box_46_charitable_donations NUMERIC(10,2) NOT NULL DEFAULT 0,
    box_50_rpp_contributions NUMERIC(10,2) NOT NULL DEFAULT 0,
    box_52_pension_adjustment NUMERIC(10,2) NOT NULL DEFAULT 0,
    
    -- Other info boxes
    other_info JSONB,  -- For boxes 28, 30, 32, etc.
    
    -- Generation metadata
    generated_at TIMESTAMPTZ,
    generated_by BIGINT REFERENCES profiles(id),
    amended_at TIMESTAMPTZ,
    filed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    
    UNIQUE(company_id, employee_id, tax_year)
);

CREATE INDEX idx_t4_slips_company_year ON t4_slips(company_id, tax_year);
CREATE INDEX idx_t4_slips_employee ON t4_slips(employee_id);

-- RLS
ALTER TABLE t4_slips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view T4s"
    ON t4_slips FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'accountant')
        )
    );

CREATE POLICY "Employees can view own T4s"
    ON t4_slips FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM employees 
            WHERE auth_user_id = auth.uid()
        )
    );
```

### 13. `roe_records`

Record of Employment data.

```sql
CREATE TABLE roe_records (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id BIGINT NOT NULL REFERENCES employees(id),
    
    -- Status
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'generated', 'submitted')),
    
    -- ROE info
    roe_serial_number TEXT,  -- If submitted electronically
    
    -- Block 10: First day worked
    first_day_worked DATE NOT NULL,
    
    -- Block 11: Last day for which paid
    last_day_paid DATE NOT NULL,
    
    -- Block 12: Final pay period ending date
    final_pay_period_end DATE NOT NULL,
    
    -- Block 15: Total insurable hours
    total_insurable_hours NUMERIC(8,2) NOT NULL,
    
    -- Block 15A: Total insurable earnings
    total_insurable_earnings NUMERIC(12,2) NOT NULL,
    
    -- Block 16: Reason for issuing ROE
    reason_code TEXT NOT NULL,  -- A, B, C, D, E, etc.
    
    -- Block 17: Insurable earnings by pay period (last 27 periods)
    pay_period_earnings JSONB NOT NULL,  -- Array of {period_end, earnings}
    
    -- Block 18: Vacation pay
    vacation_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Block 19: Other monies
    other_monies JSONB,  -- Array of {type, amount}
    
    -- Comments
    comments TEXT,
    
    -- Generation metadata
    generated_at TIMESTAMPTZ,
    generated_by BIGINT REFERENCES profiles(id),
    submitted_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_roe_records_company ON roe_records(company_id);
CREATE INDEX idx_roe_records_employee ON roe_records(employee_id);

-- RLS
ALTER TABLE roe_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can manage ROEs"
    ON roe_records FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'accountant')
        )
    );
```

### 14. `remittance_periods`

CRA remittance tracking.

```sql
CREATE TABLE remittance_periods (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    
    -- Amounts owed
    cpp_employee NUMERIC(12,2) NOT NULL DEFAULT 0,
    cpp_employer NUMERIC(12,2) NOT NULL DEFAULT 0,
    cpp2_employee NUMERIC(12,2) NOT NULL DEFAULT 0,
    ei_employee NUMERIC(12,2) NOT NULL DEFAULT 0,
    ei_employer NUMERIC(12,2) NOT NULL DEFAULT 0,
    income_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_owing NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Payment tracking
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'overdue')),
    paid_amount NUMERIC(12,2),
    paid_date DATE,
    confirmation_number TEXT,
    
    notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    
    UNIQUE(company_id, period_start, period_end)
);

CREATE INDEX idx_remittance_periods_company ON remittance_periods(company_id);
CREATE INDEX idx_remittance_periods_due_date ON remittance_periods(due_date);

-- RLS
ALTER TABLE remittance_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can manage remittances"
    ON remittance_periods FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'accountant')
        )
    );
```

## Employee Table Updates

Add province field to employees table:

```sql
ALTER TABLE employees 
ADD COLUMN province TEXT NOT NULL DEFAULT 'ON'
    CHECK (province IN ('ON', 'BC', 'AB', 'SK', 'MB', 'QC', 'NB', 'NS', 'PE', 'NL', 'YT', 'NT', 'NU'));
```

## Seed Data

### 2026 Tax Rates

See `seed-data.md` for the full INSERT statements for:
- Federal tax brackets
- Ontario tax brackets
- Tax constants (CPP, EI, etc.)
- Ontario provincial constants

## Migration Order

1. Create `tax_rates` table
2. Create `tax_constants` table
3. Create `provincial_tax_constants` table
4. Create `payroll_settings` table
5. Create `benefit_types` table
6. Create `employee_benefits` table
7. Create `employee_tax_credits` table
8. Create `pay_runs` table
9. Create `pay_run_items` table
10. Create `pay_run_item_deductions` table
11. Create `employee_ytd` table
12. Create `t4_slips` table
13. Create `roe_records` table
14. Create `remittance_periods` table
15. Update `employees` table
16. Seed tax rate data

## Verification

After migration, verify:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'payroll_settings', 'tax_rates', 'tax_constants', 
    'provincial_tax_constants', 'benefit_types', 'employee_benefits',
    'employee_tax_credits', 'pay_runs', 'pay_run_items',
    'pay_run_item_deductions', 'employee_ytd', 't4_slips',
    'roe_records', 'remittance_periods'
);

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN (
    'payroll_settings', 'benefit_types', 'employee_benefits',
    'employee_tax_credits', 'pay_runs', 'pay_run_items',
    'employee_ytd', 't4_slips', 'roe_records', 'remittance_periods'
);

-- Check 2026 tax data exists
SELECT COUNT(*) FROM tax_rates WHERE tax_year = 2026;
SELECT * FROM tax_constants WHERE tax_year = 2026;
```

## Next Phase

After database schema is complete, proceed to **Phase 2: Company Settings & Configuration** to build the UI for managing payroll settings.
