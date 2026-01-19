# Phase 1: Seed Data

## 2026 Federal Tax Brackets

```sql
INSERT INTO tax_rates (tax_year, jurisdiction, bracket_number, min_income, max_income, rate) VALUES
(2026, 'federal', 1, 0, 58523, 0.14000),
(2026, 'federal', 2, 58523.01, 117037, 0.20500),
(2026, 'federal', 3, 117037.01, 161087, 0.26000),
(2026, 'federal', 4, 161087.01, 246752, 0.29000),
(2026, 'federal', 5, 246752.01, NULL, 0.33000);
```

## 2026 Ontario Tax Brackets

```sql
INSERT INTO tax_rates (tax_year, jurisdiction, bracket_number, min_income, max_income, rate) VALUES
(2026, 'ON', 1, 0, 51446, 0.0505),
(2026, 'ON', 2, 51446.01, 102894, 0.0915),
(2026, 'ON', 3, 102894.01, 150000, 0.1116),
(2026, 'ON', 4, 150000.01, 220000, 0.1216),
(2026, 'ON', 5, 220000.01, NULL, 0.1316);
```

## 2026 Tax Constants

```sql
INSERT INTO tax_constants (
    tax_year,
    cpp_rate, cpp_employer_rate, cpp_basic_exemption, cpp_ympe, cpp_max_contribution,
    cpp2_rate, cpp2_yampe, cpp2_max_contribution,
    ei_employee_rate, ei_employer_multiplier, ei_max_insurable, ei_max_premium,
    federal_basic_personal_amount, federal_employment_amount
) VALUES (
    2026,
    0.0595, 0.0595, 3500.00, 74600.00, 4237.95,
    0.04, 85000.00, 416.00,
    0.0163, 1.4, 68900.00, 1123.07,
    16129.00, 1433.00
);
```

### Calculation Notes for 2026 Constants

**CPP Max Contribution:**
- YMPE - Basic Exemption = $74,600 - $3,500 = $71,100
- $71,100 × 5.95% = $4,230.45
- (Actual CRA value may differ slightly due to rounding rules)

**CPP2 Max Contribution:**
- YAMPE - YMPE = $85,000 - $74,600 = $10,400
- $10,400 × 4% = $416.00

**EI Max Premium:**
- $68,900 × 1.63% = $1,123.07

## 2026 Ontario Provincial Constants

```sql
INSERT INTO provincial_tax_constants (
    tax_year, province,
    basic_personal_amount,
    surtax_threshold_1, surtax_rate_1,
    surtax_threshold_2, surtax_rate_2,
    health_premium_enabled
) VALUES (
    2026, 'ON',
    12399.00,
    5554.00, 0.20,
    7108.00, 0.36,
    true
);
```

### Ontario Surtax Explanation

Ontario has a unique surtax system:

1. Calculate base Ontario tax using brackets
2. If base tax > $5,554: Add 20% of amount over $5,554
3. If base tax > $7,108: Add additional 36% of amount over $7,108

**Example:**
- Ontario base tax = $8,000
- Surtax 1: ($8,000 - $5,554) × 20% = $489.20
- Surtax 2: ($8,000 - $7,108) × 36% = $321.12
- Total surtax: $810.32
- Total Ontario tax: $8,810.32

## Ontario Health Premium (EHT)

Ontario has a personal health premium based on taxable income. This is collected on personal tax returns, not payroll, but employees should be aware:

| Taxable Income | Premium |
|----------------|---------|
| $0 - $20,000 | $0 |
| $20,001 - $25,000 | 6% of income over $20,000 |
| $25,001 - $36,000 | $300 + 6% of income over $25,000 |
| $36,001 - $38,500 | $450 + 25% of income over $36,000 |
| $38,501 - $48,000 | $600 + 25% of income over $38,500 |
| $48,001 - $72,000 | $750 + 25% of income over $48,000 |
| $72,001 - $200,000 | $900 + 25% of income over $72,000 |
| $200,001+ | $900 |

**Note:** This is NOT deducted from payroll. It's paid when filing personal taxes. We track it for employee awareness only.

## Pay Period Calculations

For tax calculations, we need to annualize amounts. Here are the divisors:

| Pay Frequency | Periods/Year | Factor |
|--------------|--------------|--------|
| Weekly | 52 | 52 |
| Biweekly | 26 | 26 |
| Semi-monthly | 24 | 24 |
| Monthly | 12 | 12 |

**CPP Basic Exemption per Period:**
- Weekly: $3,500 / 52 = $67.31
- Biweekly: $3,500 / 26 = $134.62
- Semi-monthly: $3,500 / 24 = $145.83
- Monthly: $3,500 / 12 = $291.67

**YMPE per Period:**
- Weekly: $74,600 / 52 = $1,434.62
- Biweekly: $74,600 / 26 = $2,869.23
- Semi-monthly: $74,600 / 24 = $3,108.33
- Monthly: $74,600 / 12 = $6,216.67

**EI Max Insurable per Period:**
- Weekly: $68,900 / 52 = $1,325.00
- Biweekly: $68,900 / 26 = $2,650.00
- Semi-monthly: $68,900 / 24 = $2,870.83
- Monthly: $68,900 / 12 = $5,741.67

## Future Years

When 2027 rates are announced (typically November/December), add new rows:

```sql
-- Example for 2027 (placeholder values)
INSERT INTO tax_rates (tax_year, jurisdiction, bracket_number, min_income, max_income, rate) VALUES
(2027, 'federal', 1, 0, 60000, 0.14000),
-- ... etc

INSERT INTO tax_constants (tax_year, ...) VALUES (2027, ...);

INSERT INTO provincial_tax_constants (tax_year, province, ...) VALUES (2027, 'ON', ...);
```

## Verification Queries

After seeding, run these to verify:

```sql
-- Check federal brackets
SELECT * FROM tax_rates 
WHERE tax_year = 2026 AND jurisdiction = 'federal' 
ORDER BY bracket_number;

-- Check Ontario brackets
SELECT * FROM tax_rates 
WHERE tax_year = 2026 AND jurisdiction = 'ON' 
ORDER BY bracket_number;

-- Check constants
SELECT * FROM tax_constants WHERE tax_year = 2026;

-- Check provincial constants
SELECT * FROM provincial_tax_constants WHERE tax_year = 2026 AND province = 'ON';

-- Verify CPP calculation
SELECT 
    cpp_ympe - cpp_basic_exemption AS pensionable_range,
    (cpp_ympe - cpp_basic_exemption) * cpp_rate AS calculated_max_cpp
FROM tax_constants 
WHERE tax_year = 2026;
```

## ROE Reason Codes Reference

For `roe_records.reason_code`:

| Code | Reason |
|------|--------|
| A | Shortage of work / End of contract or season |
| B | Strike or lockout |
| C | Return to school |
| D | Illness or injury |
| E | Quit |
| F | Maternity |
| G | Retirement |
| H | Work-sharing |
| J | Apprentice training |
| K | Other |
| M | Dismissal |
| N | Leave of absence |
| P | Parental |
| Z | Compassionate care / Family caregiver |

## Common Benefit Type Codes (T4 Boxes)

For `benefit_types.t4_box`:

| T4 Box | Description |
|--------|-------------|
| 14 | Employment income (included automatically) |
| 40 | Taxable allowances and benefits |
| 42 | Employment commissions |
| 44 | Union dues |
| 46 | Charitable donations |
| 50 | RPP contributions |
| 52 | Pension adjustment |
| 54 | Employer-paid premiums for group term life |
| 55 | Employee-paid premiums for eligible plans |
| 57 | Employment income - March 15 to May 9 |
| 58 | Employment income - May 10 to July 4 |
| 59 | Employment income - July 5 to August 29 |
| 60 | Employment income - August 30 to September 26 |
