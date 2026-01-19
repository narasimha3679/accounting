# Phase 2: Company Settings & Configuration

## Overview

This phase adds payroll configuration UI to the company settings. Admins can configure pay frequency, overtime rules, vacation policy, and define benefit types.

## Prerequisites

- Phase 1 database schema complete
- Existing Settings page (`frontend/src/pages/Settings.tsx`)
- Company data in context

## New Components

### 1. PayrollSettings Component

Location: `frontend/src/components/settings/PayrollSettings.tsx`

```typescript
interface PayrollSettingsProps {
    companyId: number;
}

interface PayrollSettingsForm {
    pay_frequency: 'weekly' | 'biweekly' | 'semi_monthly' | 'monthly';
    province: string;
    overtime_enabled: boolean;
    overtime_threshold_weekly: number;
    overtime_multiplier: number;
    vacation_tracking_enabled: boolean;
    vacation_rate_under_5_years: number;
    vacation_rate_5_plus_years: number;
    vacation_accrual_method: 'per_pay' | 'anniversary' | 'calendar_year';
    remitter_type: 'quarterly' | 'regular' | 'threshold1' | 'threshold2';
    default_work_hours_per_day: number;
    default_work_days_per_week: number;
}
```

**UI Sections:**

1. **Pay Frequency**
   - Radio buttons: Weekly, Biweekly, Semi-monthly, Monthly
   - Help text explaining each option

2. **Province**
   - Dropdown selector (currently only Ontario enabled)
   - Note: "More provinces coming soon"
   - Affects tax calculations

3. **Overtime Settings**
   - Toggle: Enable overtime tracking
   - If enabled:
     - Threshold input (default 44 hours/week)
     - Multiplier input (default 1.5x)
   - Help text: "Ontario standard: 1.5x after 44 hours/week"

4. **Vacation Settings**
   - Toggle: Enable vacation tracking
   - If enabled:
     - Rate for employees under 5 years (default 4%)
     - Rate for employees 5+ years (default 6%)
     - Accrual method dropdown
   - Help text: "Ontario minimum: 4% (< 5 years), 6% (5+ years)"

5. **CRA Remitter Type**
   - Dropdown with explanations:
     - Quarterly: Small businesses (<$1,000/month average)
     - Regular: Most employers (15th of following month)
     - Threshold 1: Large employers (25th of same month)
     - Threshold 2: Largest employers (multiple times per month)

6. **Default Work Schedule**
   - Hours per day (default 8)
   - Days per week (default 5)
   - Used for salary-to-hourly conversions

### 2. BenefitTypesManager Component

Location: `frontend/src/components/settings/BenefitTypesManager.tsx`

```typescript
interface BenefitType {
    id: number;
    name: string;
    description: string;
    category: 'taxable_benefit' | 'pre_tax_deduction' | 'post_tax_deduction';
    calculation_type: 'fixed' | 'percentage' | 'hourly';
    default_amount?: number;
    default_percentage?: number;
    default_hourly_rate?: number;
    annual_maximum?: number;
    t4_box?: string;
    is_active: boolean;
}
```

**UI Features:**

1. **Benefit Types List**
   - Table with columns: Name, Category, Type, Default Value, T4 Box, Status
   - Edit/Delete actions
   - Toggle active/inactive

2. **Add/Edit Benefit Type Modal**
   - Name input
   - Description textarea
   - Category dropdown:
     - Taxable Benefit (adds to gross income before tax)
     - Pre-tax Deduction (reduces taxable income - RRSP, etc.)
     - Post-tax Deduction (after taxes - union dues, garnishments)
   - Calculation type:
     - Fixed amount (e.g., $50/pay)
     - Percentage of gross (e.g., 5%)
     - Hourly rate (e.g., $2/hour worked)
   - Default value input (based on type)
   - Annual maximum (optional)
   - T4 box mapping (optional)

3. **Common Preset Buttons**
   - "Add RRSP Contribution" - pre-tax, percentage
   - "Add Health Benefits" - taxable benefit, fixed
   - "Add Union Dues" - post-tax, fixed
   - "Add Company Vehicle" - taxable benefit, fixed

### 3. EmployeeBenefitsAssignment Component

Location: `frontend/src/components/employees/EmployeeBenefitsAssignment.tsx`

**UI Features:**

1. **Assigned Benefits List**
   - Table: Benefit Name, Value, Effective Date, End Date, Actions

2. **Add Benefit Modal**
   - Benefit type dropdown (from company's benefit types)
   - Override value (optional - uses default if blank)
   - Effective date
   - End date (optional)

3. **Integration**
   - Appears on Employee detail/edit page
   - Can also be accessed from Employees list via "Manage Benefits" action

## API Methods

Add to `frontend/src/lib/api.ts`:

```typescript
// Payroll Settings
getPayrollSettings(companyId: number): Promise<PayrollSettings>
updatePayrollSettings(companyId: number, settings: Partial<PayrollSettings>): Promise<PayrollSettings>
createPayrollSettings(companyId: number, settings: PayrollSettings): Promise<PayrollSettings>

// Benefit Types
getBenefitTypes(companyId: number): Promise<BenefitType[]>
createBenefitType(benefitType: Omit<BenefitType, 'id'>): Promise<BenefitType>
updateBenefitType(id: number, benefitType: Partial<BenefitType>): Promise<BenefitType>
deleteBenefitType(id: number): Promise<void>

// Employee Benefits
getEmployeeBenefits(employeeId: number): Promise<EmployeeBenefit[]>
assignBenefit(employeeId: number, benefit: NewEmployeeBenefit): Promise<EmployeeBenefit>
updateEmployeeBenefit(id: number, benefit: Partial<EmployeeBenefit>): Promise<EmployeeBenefit>
removeEmployeeBenefit(id: number): Promise<void>

// Tax Credits
getEmployeeTaxCredits(employeeId: number, taxYear: number): Promise<EmployeeTaxCredits>
updateEmployeeTaxCredits(employeeId: number, taxYear: number, credits: EmployeeTaxCredits): Promise<EmployeeTaxCredits>
```

## UI/UX Guidelines

### Settings Page Integration

Add a new tab or section to the existing Settings page:

```
Settings
├── Company Info (existing)
├── HST Settings (existing)
├── Payroll Settings (NEW)
│   ├── General Configuration
│   ├── Overtime Rules
│   ├── Vacation Policy
│   └── CRA Remittance
└── Benefit Types (NEW)
```

### Form Validation

**Payroll Settings:**
- Overtime threshold: 1-168 hours (max hours in a week)
- Overtime multiplier: 1.0-3.0
- Vacation rates: 0-100%
- Work hours: 1-24 per day
- Work days: 1-7 per week

**Benefit Types:**
- Name: Required, 1-100 characters, unique per company
- Default amount: 0 or greater
- Default percentage: 0-100%
- Default hourly rate: 0 or greater
- Annual maximum: Must be >= default amount × pay periods

### Help Text & Tooltips

Include contextual help for:
- Pay frequency impact on tax calculations
- Overtime legal requirements in Ontario
- Vacation pay legal minimums
- CRA remitter type determination
- T4 box meanings

### Empty States

**No Payroll Settings:**
"Set up your payroll configuration to start processing pay runs. This includes pay frequency, overtime rules, and vacation policy."

**No Benefit Types:**
"Define benefit and deduction types that apply to your employees. Common examples include RRSP contributions, health benefits, and union dues."

## Implementation Steps

1. **Create API methods** for payroll settings and benefit types
2. **Create PayrollSettings component**
   - Fetch existing settings or show setup form
   - Handle create/update with validation
   - Add help text and tooltips
3. **Create BenefitTypesManager component**
   - List existing benefit types
   - Add/Edit modal with all fields
   - Delete with confirmation
4. **Create EmployeeBenefitsAssignment component**
   - Show assigned benefits for employee
   - Add/remove benefits
5. **Integrate into Settings page**
   - Add Payroll Settings tab
   - Add Benefit Types tab
6. **Update Employee page**
   - Add Benefits section
   - Link to assignment component

## Testing Checklist

- [ ] Create payroll settings for new company
- [ ] Update existing payroll settings
- [ ] Validation errors display correctly
- [ ] Create all benefit type categories
- [ ] Edit benefit type
- [ ] Delete benefit type (confirm in use)
- [ ] Assign benefit to employee
- [ ] Override benefit default value
- [ ] Remove benefit from employee
- [ ] Settings persist after page reload
- [ ] RLS policies enforce company isolation

## Mobile Responsiveness

- Forms should stack vertically on mobile
- Benefit types table should scroll horizontally on mobile
- Modals should be full-screen on mobile devices

## Next Phase

After company settings are complete, proceed to **Phase 3: Tax Calculation Engine** to implement the core payroll calculations.
