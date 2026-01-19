# Payroll Management System - Quick Reference

## Key Tables (New)

| Table | Purpose |
|-------|---------|
| `payroll_settings` | Company payroll configuration |
| `tax_rates` | Federal and provincial tax brackets |
| `benefit_types` | Company-defined benefit/deduction types |
| `employee_benefits` | Benefits assigned to employees |
| `employee_tax_credits` | TD1 claim amounts per employee |
| `pay_runs` | Payroll batches (pay periods) |
| `pay_run_items` | Individual employee payments in a run |
| `pay_stub_deductions` | Line-item deductions on each stub |
| `employee_ytd` | Year-to-date accumulations |
| `t4_slips` | Generated T4 data |
| `roe_records` | Record of Employment data |
| `remittance_periods` | CRA remittance tracking |

## Key Interfaces (New)

```typescript
// Pay Run
interface PayRun {
  id: number;
  company_id: number;
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'finalized';
  total_gross: number;
  total_deductions: number;
  total_net: number;
  total_employer_cost: number;
  created_by: number;
  approved_by?: number;
  finalized_at?: string;
}

// Pay Run Item (one per employee per pay run)
interface PayRunItem {
  id: number;
  pay_run_id: number;
  employee_id: number;
  regular_hours: number;
  overtime_hours: number;
  regular_pay: number;
  overtime_pay: number;
  gross_pay: number;
  cpp_employee: number;
  cpp2_employee: number;
  ei_employee: number;
  federal_tax: number;
  provincial_tax: number;
  total_deductions: number;
  net_pay: number;
  cpp_employer: number;
  ei_employer: number;
  vacation_accrued: number;
}

// Employee YTD
interface EmployeeYTD {
  employee_id: number;
  tax_year: number;
  gross_earnings: number;
  cpp_contributions: number;
  cpp2_contributions: number;
  ei_premiums: number;
  federal_tax_withheld: number;
  provincial_tax_withheld: number;
  pensionable_earnings: number;
  insurable_earnings: number;
  vacation_earned: number;
  vacation_used: number;
}
```

## Tax Calculation Flow

```
1. Get employee's gross pay for period
   ├── Regular hours × rate
   ├── Overtime hours × rate × 1.5
   ├── Taxable benefits
   └── Other earnings

2. Calculate CPP
   ├── Check YTD pensionable earnings
   ├── If < YMPE: CPP = (gross - exemption) × 5.95%
   ├── If between YMPE and YAMPE: also CPP2 = amount × 4%
   └── If >= YAMPE: no more CPP/CPP2

3. Calculate EI
   ├── Check YTD insurable earnings
   ├── If < $68,900: EI = gross × 1.63%
   └── If >= $68,900: no more EI

4. Calculate Federal Tax
   ├── Annualize the pay period income
   ├── Apply federal brackets
   ├── Subtract federal tax credits (TD1)
   └── De-annualize back to pay period

5. Calculate Ontario Tax
   ├── Annualize the pay period income
   ├── Apply Ontario brackets
   ├── Apply Ontario surtax if applicable
   ├── Subtract provincial tax credits
   └── De-annualize back to pay period

6. Apply benefits/deductions
   ├── Pre-tax deductions (reduce taxable income)
   ├── Post-tax deductions (after all taxes)
   └── Taxable benefits (add to income before tax calc)

7. Net Pay = Gross - All Deductions
```

## Pay Stub Required Fields (CRA)

| Field | Box | Description |
|-------|-----|-------------|
| Employee Name | - | Full legal name |
| Employee Address | - | Current mailing address |
| SIN | - | Last 3 digits only on stub |
| Pay Period | - | Start and end dates |
| Pay Date | - | Date of payment |
| Regular Hours | - | Hours worked at regular rate |
| Overtime Hours | - | Hours worked at overtime rate |
| Regular Earnings | - | Regular hours × rate |
| Overtime Earnings | - | OT hours × rate × 1.5 |
| Gross Pay | - | Total before deductions |
| CPP Deduction | - | Current period CPP |
| CPP2 Deduction | - | Current period CPP2 (if applicable) |
| EI Deduction | - | Current period EI |
| Federal Tax | - | Current period federal tax |
| Provincial Tax | - | Current period provincial tax |
| Other Deductions | - | Benefits, RRSP, etc. |
| Net Pay | - | Amount deposited |
| YTD Gross | - | Year-to-date gross |
| YTD CPP | - | Year-to-date CPP |
| YTD EI | - | Year-to-date EI |
| YTD Tax | - | Year-to-date income tax |
| Vacation Accrued | - | Vacation hours/dollars accrued |
| Vacation Used | - | Vacation hours/dollars used |
| Vacation Balance | - | Current vacation balance |

## T4 Required Boxes (2026)

| Box | Description | Source |
|-----|-------------|--------|
| 14 | Employment Income | YTD gross_earnings |
| 16 | Employee's CPP Contributions | YTD cpp_contributions |
| 16A | Employee's CPP2 Contributions | YTD cpp2_contributions |
| 17 | Employee's QPP Contributions | N/A (Quebec only) |
| 18 | Employee's EI Premiums | YTD ei_premiums |
| 22 | Income Tax Deducted | YTD federal + provincial tax |
| 24 | EI Insurable Earnings | YTD insurable_earnings |
| 26 | CPP/QPP Pensionable Earnings | YTD pensionable_earnings |
| 44 | Union Dues | If applicable |
| 46 | Charitable Donations | If applicable |
| 50 | RPP Contributions | RRSP deductions |
| 52 | Pension Adjustment | If applicable |

## Ontario-Specific Rules

| Rule | Value | Notes |
|------|-------|-------|
| Minimum Wage | $17.20/hr | As of Oct 2025 |
| Overtime Threshold | 44 hrs/week | 1.5x rate after |
| Vacation Pay (< 5 years) | 4% | Minimum |
| Vacation Pay (≥ 5 years) | 6% | After 5 years service |
| Public Holiday Pay | Regular wages | For qualifying employees |
| Termination Notice | 1-8 weeks | Based on service length |
| Severance (5+ years) | 1 week per year | Max 26 weeks |

## API Endpoints (New)

```
# Pay Runs
GET    /api/pay-runs                    # List pay runs
POST   /api/pay-runs                    # Create draft pay run
GET    /api/pay-runs/:id                # Get pay run details
PUT    /api/pay-runs/:id                # Update draft pay run
POST   /api/pay-runs/:id/calculate      # Calculate all items
POST   /api/pay-runs/:id/submit         # Submit for approval
POST   /api/pay-runs/:id/approve        # Approve pay run
POST   /api/pay-runs/:id/finalize       # Finalize (lock)
DELETE /api/pay-runs/:id                # Delete draft only

# Pay Stubs
GET    /api/pay-stubs/:employee_id      # List employee's stubs
GET    /api/pay-stubs/:id/pdf           # Download PDF

# T4s
POST   /api/t4/generate/:year           # Generate T4s for year
GET    /api/t4/:employee_id/:year       # Get employee T4
GET    /api/t4/:id/pdf                  # Download T4 PDF

# Employee Self-Service
GET    /api/employee/pay-stubs          # My pay stubs
GET    /api/employee/ytd                # My YTD summary
GET    /api/employee/t4/:year           # My T4 for year
PUT    /api/employee/tax-credits        # Update TD1 info

# Reports
GET    /api/payroll/reports/summary     # Pay period summary
GET    /api/payroll/reports/remittances # CRA remittance summary
GET    /api/payroll/reports/journal     # Payroll journal entries
```

## File Locations (New)

```
frontend/src/
├── lib/
│   ├── payrollCalculations.ts    # Tax calculation engine
│   ├── payStubGenerator.ts       # PDF generation
│   └── t4Generator.ts            # T4 PDF generation
├── pages/
│   ├── PayRuns.tsx               # Pay run management
│   ├── PayRunDetail.tsx          # Single pay run view
│   └── PayrollSettings.tsx       # Company payroll config
├── components/
│   └── payroll/
│       ├── PayRunTable.tsx       # Pay run list
│       ├── PayRunItemRow.tsx     # Employee row in run
│       ├── PayStubPreview.tsx    # Pay stub preview
│       ├── TaxCalculationBreakdown.tsx
│       └── RemittanceSummary.tsx
```

## Common Formulas

```typescript
// CPP Calculation (per pay period)
const cppExemptionPerPeriod = 3500 / payPeriodsPerYear;
const pensionableEarnings = Math.min(grossPay, ympePerPeriod);
const cppContribution = Math.max(0, (pensionableEarnings - cppExemptionPerPeriod) * 0.0595);

// CPP2 Calculation (if applicable)
const cpp2Earnings = Math.min(grossPay, yampePerPeriod) - ympePerPeriod;
const cpp2Contribution = Math.max(0, cpp2Earnings * 0.04);

// EI Calculation (per pay period)
const insurableEarnings = Math.min(grossPay, maxInsurablePerPeriod);
const eiPremium = insurableEarnings * 0.0163;

// Overtime Pay
const overtimePay = overtimeHours * hourlyRate * 1.5;

// Vacation Accrual (Ontario)
const yearsOfService = calculateYearsOfService(hireDate);
const vacationRate = yearsOfService >= 5 ? 0.06 : 0.04;
const vacationAccrued = grossPay * vacationRate;
```
