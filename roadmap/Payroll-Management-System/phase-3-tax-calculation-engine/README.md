# Phase 3: Tax Calculation Engine

## Overview

This phase implements the core payroll calculation library. This is the most critical phase as accuracy is essential for CRA compliance. The engine will calculate CPP, CPP2, EI, federal income tax, and Ontario provincial income tax.

## Prerequisites

- Phase 1 database schema complete (tax_rates, tax_constants tables populated)
- Phase 2 company settings complete (payroll_settings available)

## File Structure

```
frontend/src/lib/
├── payrollCalculations.ts      # Main calculation engine
├── taxTables.ts                # Tax bracket lookups
├── payrollConstants.ts         # 2026 constants
└── payrollTypes.ts             # TypeScript interfaces
```

## Core Interfaces

### `payrollTypes.ts`

```typescript
export interface PayrollInput {
    employee: {
        id: number;
        province: string;
        hire_date: string;
        payrate: number;
        payrate_type: 'hourly' | 'salary' | 'monthly' | 'biweekly';
    };
    payPeriod: {
        start: string;
        end: string;
        payDate: string;
    };
    hours: {
        regular: number;
        overtime: number;
        vacation: number;
        statutory_holiday: number;
        sick: number;
    };
    otherEarnings?: {
        bonus?: number;
        commission?: number;
        retroactive?: number;
        other?: number;
    };
    benefits: {
        taxable: number;        // Adds to gross before taxes
        preTaxDeductions: number;   // Reduces taxable income
        postTaxDeductions: number;  // After all taxes
    };
    ytd: EmployeeYTD;           // Year-to-date balances
    taxCredits: EmployeeTaxCredits;
    settings: PayrollSettings;
}

export interface PayrollOutput {
    // Earnings
    regularPay: number;
    overtimePay: number;
    vacationPay: number;
    statutoryHolidayPay: number;
    otherEarnings: number;
    taxableBenefits: number;
    grossPay: number;
    
    // Taxable income (after pre-tax deductions)
    taxableIncome: number;
    
    // Statutory deductions
    cpp: {
        pensionableEarnings: number;
        contribution: number;
        employerContribution: number;
        ytdAfter: number;
        maxedOut: boolean;
    };
    cpp2: {
        earnings: number;
        contribution: number;
        ytdAfter: number;
        maxedOut: boolean;
    };
    ei: {
        insurableEarnings: number;
        premium: number;
        employerPremium: number;
        ytdAfter: number;
        maxedOut: boolean;
    };
    
    // Income tax
    federalTax: number;
    provincialTax: number;
    totalIncomeTax: number;
    
    // Other deductions
    preTaxDeductions: number;
    postTaxDeductions: number;
    additionalTax: number;  // From TD1
    
    // Totals
    totalDeductions: number;
    netPay: number;
    
    // Employer costs
    employerCpp: number;
    employerEi: number;
    employerTotalCost: number;
    
    // Vacation accrual
    vacationAccrued: number;
    vacationRate: number;
    
    // Calculation metadata
    calculationDetails: {
        payPeriodsPerYear: number;
        annualizedIncome: number;
        annualFederalTax: number;
        annualProvincialTax: number;
        federalCreditsUsed: number;
        provincialCreditsUsed: number;
        ontarioSurtax?: number;
    };
}

export interface EmployeeYTD {
    gross_earnings: number;
    pensionable_earnings: number;
    insurable_earnings: number;
    cpp_contributions: number;
    cpp2_contributions: number;
    ei_premiums: number;
    federal_tax_withheld: number;
    provincial_tax_withheld: number;
    vacation_earned: number;
    vacation_used: number;
    employer_cpp: number;
    employer_ei: number;
}

export interface EmployeeTaxCredits {
    federal_total_claim: number;
    provincial_total_claim: number;
    claim_tax_exempt: boolean;
    additional_tax_per_pay: number;
}

export interface TaxConstants {
    cpp_rate: number;
    cpp_employer_rate: number;
    cpp_basic_exemption: number;
    cpp_ympe: number;
    cpp_max_contribution: number;
    cpp2_rate: number;
    cpp2_yampe: number;
    cpp2_max_contribution: number;
    ei_employee_rate: number;
    ei_employer_multiplier: number;
    ei_max_insurable: number;
    ei_max_premium: number;
    federal_basic_personal_amount: number;
}

export interface TaxBracket {
    min_income: number;
    max_income: number | null;
    rate: number;
}
```

## Main Calculation Engine

### `payrollCalculations.ts`

```typescript
import { PayrollInput, PayrollOutput, TaxConstants, TaxBracket } from './payrollTypes';

export class PayrollCalculator {
    private taxConstants: TaxConstants;
    private federalBrackets: TaxBracket[];
    private provincialBrackets: TaxBracket[];
    private payPeriodsPerYear: number;
    
    constructor(
        taxConstants: TaxConstants,
        federalBrackets: TaxBracket[],
        provincialBrackets: TaxBracket[],
        payFrequency: 'weekly' | 'biweekly' | 'semi_monthly' | 'monthly'
    ) {
        this.taxConstants = taxConstants;
        this.federalBrackets = federalBrackets;
        this.provincialBrackets = provincialBrackets;
        this.payPeriodsPerYear = this.getPayPeriods(payFrequency);
    }
    
    private getPayPeriods(frequency: string): number {
        switch (frequency) {
            case 'weekly': return 52;
            case 'biweekly': return 26;
            case 'semi_monthly': return 24;
            case 'monthly': return 12;
            default: return 26;
        }
    }
    
    calculate(input: PayrollInput): PayrollOutput {
        // Step 1: Calculate gross pay
        const earnings = this.calculateEarnings(input);
        
        // Step 2: Calculate taxable income (gross - pre-tax deductions)
        const taxableIncome = earnings.grossPay - input.benefits.preTaxDeductions + input.benefits.taxable;
        
        // Step 3: Calculate CPP
        const cpp = this.calculateCPP(taxableIncome, input.ytd);
        
        // Step 4: Calculate CPP2
        const cpp2 = this.calculateCPP2(taxableIncome, input.ytd);
        
        // Step 5: Calculate EI
        const ei = this.calculateEI(earnings.grossPay, input.ytd);
        
        // Step 6: Calculate income tax
        const { federalTax, provincialTax, details } = this.calculateIncomeTax(
            taxableIncome,
            cpp.contribution + cpp2.contribution,
            ei.premium,
            input.taxCredits,
            input.employee.province
        );
        
        // Step 7: Calculate total deductions
        const totalDeductions = 
            cpp.contribution + 
            cpp2.contribution + 
            ei.premium + 
            federalTax + 
            provincialTax + 
            input.benefits.preTaxDeductions + 
            input.benefits.postTaxDeductions +
            input.taxCredits.additional_tax_per_pay;
        
        // Step 8: Calculate net pay
        const netPay = earnings.grossPay + input.benefits.taxable - totalDeductions;
        
        // Step 9: Calculate vacation accrual
        const vacation = this.calculateVacation(earnings.grossPay, input);
        
        // Step 10: Calculate employer costs
        const employerCosts = {
            cpp: cpp.employerContribution,
            ei: ei.employerPremium,
            total: earnings.grossPay + cpp.employerContribution + ei.employerPremium
        };
        
        return {
            // Earnings
            regularPay: earnings.regularPay,
            overtimePay: earnings.overtimePay,
            vacationPay: earnings.vacationPay,
            statutoryHolidayPay: earnings.statutoryHolidayPay,
            otherEarnings: earnings.otherEarnings,
            taxableBenefits: input.benefits.taxable,
            grossPay: earnings.grossPay,
            
            taxableIncome,
            
            cpp,
            cpp2,
            ei,
            
            federalTax,
            provincialTax,
            totalIncomeTax: federalTax + provincialTax,
            
            preTaxDeductions: input.benefits.preTaxDeductions,
            postTaxDeductions: input.benefits.postTaxDeductions,
            additionalTax: input.taxCredits.additional_tax_per_pay,
            
            totalDeductions,
            netPay,
            
            employerCpp: employerCosts.cpp,
            employerEi: employerCosts.ei,
            employerTotalCost: employerCosts.total,
            
            vacationAccrued: vacation.accrued,
            vacationRate: vacation.rate,
            
            calculationDetails: {
                payPeriodsPerYear: this.payPeriodsPerYear,
                ...details
            }
        };
    }
    
    private calculateEarnings(input: PayrollInput) {
        const { hours, otherEarnings, settings, employee } = input;
        
        // Get hourly rate
        let hourlyRate: number;
        if (employee.payrate_type === 'hourly') {
            hourlyRate = employee.payrate;
        } else if (employee.payrate_type === 'salary') {
            // Annual salary to hourly
            const hoursPerYear = settings.default_work_hours_per_day * 
                                 settings.default_work_days_per_week * 52;
            hourlyRate = employee.payrate / hoursPerYear;
        } else if (employee.payrate_type === 'biweekly') {
            hourlyRate = employee.payrate / (settings.default_work_hours_per_day * 
                                              settings.default_work_days_per_week * 2);
        } else {
            // Monthly
            hourlyRate = employee.payrate / (settings.default_work_hours_per_day * 
                                              settings.default_work_days_per_week * 52 / 12);
        }
        
        // Calculate earnings
        const regularPay = hours.regular * hourlyRate;
        const overtimePay = settings.overtime_enabled 
            ? hours.overtime * hourlyRate * settings.overtime_multiplier
            : hours.overtime * hourlyRate;
        const vacationPay = hours.vacation * hourlyRate;
        const statutoryHolidayPay = hours.statutory_holiday * hourlyRate;
        
        const other = (otherEarnings?.bonus || 0) + 
                      (otherEarnings?.commission || 0) + 
                      (otherEarnings?.retroactive || 0) + 
                      (otherEarnings?.other || 0);
        
        const grossPay = regularPay + overtimePay + vacationPay + statutoryHolidayPay + other;
        
        return {
            regularPay: this.round(regularPay),
            overtimePay: this.round(overtimePay),
            vacationPay: this.round(vacationPay),
            statutoryHolidayPay: this.round(statutoryHolidayPay),
            otherEarnings: this.round(other),
            grossPay: this.round(grossPay),
            hourlyRate
        };
    }
    
    private calculateCPP(grossPay: number, ytd: EmployeeYTD) {
        const { cpp_rate, cpp_employer_rate, cpp_basic_exemption, cpp_ympe, cpp_max_contribution } = this.taxConstants;
        
        // Check if already maxed out
        if (ytd.cpp_contributions >= cpp_max_contribution) {
            return {
                pensionableEarnings: 0,
                contribution: 0,
                employerContribution: 0,
                ytdAfter: ytd.cpp_contributions,
                maxedOut: true
            };
        }
        
        // Calculate pensionable earnings for this period
        const exemptionPerPeriod = cpp_basic_exemption / this.payPeriodsPerYear;
        const ympePerPeriod = cpp_ympe / this.payPeriodsPerYear;
        
        const pensionableEarnings = Math.min(grossPay, ympePerPeriod);
        const contributionBase = Math.max(0, pensionableEarnings - exemptionPerPeriod);
        
        // Calculate contribution
        let contribution = contributionBase * cpp_rate;
        
        // Check against remaining room
        const remainingRoom = cpp_max_contribution - ytd.cpp_contributions;
        contribution = Math.min(contribution, remainingRoom);
        
        // Employer matches
        const employerContribution = contribution * (cpp_employer_rate / cpp_rate);
        
        return {
            pensionableEarnings: this.round(pensionableEarnings),
            contribution: this.round(contribution),
            employerContribution: this.round(employerContribution),
            ytdAfter: this.round(ytd.cpp_contributions + contribution),
            maxedOut: ytd.cpp_contributions + contribution >= cpp_max_contribution
        };
    }
    
    private calculateCPP2(grossPay: number, ytd: EmployeeYTD) {
        const { cpp2_rate, cpp_ympe, cpp2_yampe, cpp2_max_contribution } = this.taxConstants;
        
        // CPP2 only applies to earnings between YMPE and YAMPE
        // Check if already maxed out
        if (ytd.cpp2_contributions >= cpp2_max_contribution) {
            return {
                earnings: 0,
                contribution: 0,
                ytdAfter: ytd.cpp2_contributions,
                maxedOut: true
            };
        }
        
        const ympePerPeriod = cpp_ympe / this.payPeriodsPerYear;
        const yampePerPeriod = cpp2_yampe / this.payPeriodsPerYear;
        
        // CPP2 earnings are the portion between YMPE and YAMPE
        const cpp2Earnings = Math.max(0, Math.min(grossPay, yampePerPeriod) - ympePerPeriod);
        
        if (cpp2Earnings <= 0) {
            return {
                earnings: 0,
                contribution: 0,
                ytdAfter: ytd.cpp2_contributions,
                maxedOut: false
            };
        }
        
        let contribution = cpp2Earnings * cpp2_rate;
        
        // Check against remaining room
        const remainingRoom = cpp2_max_contribution - ytd.cpp2_contributions;
        contribution = Math.min(contribution, remainingRoom);
        
        return {
            earnings: this.round(cpp2Earnings),
            contribution: this.round(contribution),
            ytdAfter: this.round(ytd.cpp2_contributions + contribution),
            maxedOut: ytd.cpp2_contributions + contribution >= cpp2_max_contribution
        };
    }
    
    private calculateEI(grossPay: number, ytd: EmployeeYTD) {
        const { ei_employee_rate, ei_employer_multiplier, ei_max_insurable, ei_max_premium } = this.taxConstants;
        
        // Check if already maxed out
        if (ytd.ei_premiums >= ei_max_premium) {
            return {
                insurableEarnings: 0,
                premium: 0,
                employerPremium: 0,
                ytdAfter: ytd.ei_premiums,
                maxedOut: true
            };
        }
        
        const maxInsurablePerPeriod = ei_max_insurable / this.payPeriodsPerYear;
        const insurableEarnings = Math.min(grossPay, maxInsurablePerPeriod);
        
        let premium = insurableEarnings * ei_employee_rate;
        
        // Check against remaining room
        const remainingRoom = ei_max_premium - ytd.ei_premiums;
        premium = Math.min(premium, remainingRoom);
        
        // Employer pays 1.4x
        const employerPremium = premium * ei_employer_multiplier;
        
        return {
            insurableEarnings: this.round(insurableEarnings),
            premium: this.round(premium),
            employerPremium: this.round(employerPremium),
            ytdAfter: this.round(ytd.ei_premiums + premium),
            maxedOut: ytd.ei_premiums + premium >= ei_max_premium
        };
    }
    
    private calculateIncomeTax(
        grossPay: number,
        cppDeduction: number,
        eiDeduction: number,
        taxCredits: EmployeeTaxCredits,
        province: string
    ) {
        // If employee claims tax exempt
        if (taxCredits.claim_tax_exempt) {
            return {
                federalTax: 0,
                provincialTax: 0,
                details: {
                    annualizedIncome: 0,
                    annualFederalTax: 0,
                    annualProvincialTax: 0,
                    federalCreditsUsed: 0,
                    provincialCreditsUsed: 0
                }
            };
        }
        
        // Step 1: Annualize the income
        const annualGross = grossPay * this.payPeriodsPerYear;
        const annualCpp = cppDeduction * this.payPeriodsPerYear;
        const annualEi = eiDeduction * this.payPeriodsPerYear;
        
        // Step 2: Calculate annual federal tax
        const federalTaxableIncome = Math.max(0, annualGross - annualCpp - annualEi);
        const annualFederalTax = this.calculateBracketTax(federalTaxableIncome, this.federalBrackets);
        
        // Apply federal tax credits
        const federalCredits = taxCredits.federal_total_claim * 0.14; // 14% is lowest bracket rate
        const netFederalTax = Math.max(0, annualFederalTax - federalCredits);
        
        // Step 3: Calculate annual provincial tax
        const annualProvincialTax = this.calculateBracketTax(federalTaxableIncome, this.provincialBrackets);
        
        // Apply Ontario surtax if applicable
        let ontarioSurtax = 0;
        if (province === 'ON') {
            ontarioSurtax = this.calculateOntarioSurtax(annualProvincialTax);
        }
        
        const totalProvincialTax = annualProvincialTax + ontarioSurtax;
        
        // Apply provincial tax credits
        const provincialCredits = taxCredits.provincial_total_claim * 0.0505; // Lowest ON rate
        const netProvincialTax = Math.max(0, totalProvincialTax - provincialCredits);
        
        // Step 4: De-annualize back to pay period
        const federalTax = this.round(netFederalTax / this.payPeriodsPerYear);
        const provincialTax = this.round(netProvincialTax / this.payPeriodsPerYear);
        
        return {
            federalTax,
            provincialTax,
            details: {
                annualizedIncome: this.round(annualGross),
                annualFederalTax: this.round(annualFederalTax),
                annualProvincialTax: this.round(annualProvincialTax),
                federalCreditsUsed: this.round(federalCredits),
                provincialCreditsUsed: this.round(provincialCredits),
                ontarioSurtax: this.round(ontarioSurtax)
            }
        };
    }
    
    private calculateBracketTax(income: number, brackets: TaxBracket[]): number {
        let tax = 0;
        let remainingIncome = income;
        
        for (const bracket of brackets) {
            if (remainingIncome <= 0) break;
            
            const bracketMax = bracket.max_income ?? Infinity;
            const bracketSize = bracketMax - bracket.min_income;
            const taxableInBracket = Math.min(remainingIncome, bracketSize);
            
            tax += taxableInBracket * bracket.rate;
            remainingIncome -= taxableInBracket;
        }
        
        return tax;
    }
    
    private calculateOntarioSurtax(baseTax: number): number {
        const threshold1 = 5554;
        const threshold2 = 7108;
        const rate1 = 0.20;
        const rate2 = 0.36;
        
        let surtax = 0;
        
        if (baseTax > threshold1) {
            surtax += (Math.min(baseTax, threshold2) - threshold1) * rate1;
        }
        
        if (baseTax > threshold2) {
            surtax += (baseTax - threshold2) * rate2;
        }
        
        return surtax;
    }
    
    private calculateVacation(grossPay: number, input: PayrollInput) {
        const { settings, employee } = input;
        
        if (!settings.vacation_tracking_enabled) {
            return { accrued: 0, rate: 0 };
        }
        
        // Calculate years of service
        const hireDate = new Date(employee.hire_date);
        const now = new Date();
        const yearsOfService = (now.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        
        // Determine rate
        const rate = yearsOfService >= 5 
            ? settings.vacation_rate_5_plus_years 
            : settings.vacation_rate_under_5_years;
        
        const accrued = grossPay * rate;
        
        return {
            accrued: this.round(accrued),
            rate
        };
    }
    
    private round(value: number): number {
        return Math.round(value * 100) / 100;
    }
}

// Factory function to create calculator with loaded data
export async function createPayrollCalculator(
    companyId: number,
    taxYear: number = new Date().getFullYear()
): Promise<PayrollCalculator> {
    // Load from database
    const taxConstants = await api.getTaxConstants(taxYear);
    const federalBrackets = await api.getTaxRates(taxYear, 'federal');
    const payrollSettings = await api.getPayrollSettings(companyId);
    const provincialBrackets = await api.getTaxRates(taxYear, payrollSettings.province);
    
    return new PayrollCalculator(
        taxConstants,
        federalBrackets,
        provincialBrackets,
        payrollSettings.pay_frequency
    );
}
```

## API Methods

Add to `frontend/src/lib/api.ts`:

```typescript
// Tax Data
getTaxConstants(taxYear: number): Promise<TaxConstants>
getTaxRates(taxYear: number, jurisdiction: string): Promise<TaxBracket[]>
getProvincialTaxConstants(taxYear: number, province: string): Promise<ProvincialTaxConstants>

// YTD
getEmployeeYTD(employeeId: number, taxYear: number): Promise<EmployeeYTD>
updateEmployeeYTD(employeeId: number, taxYear: number, ytd: Partial<EmployeeYTD>): Promise<EmployeeYTD>
```

## Testing

### Unit Tests

Create `frontend/src/lib/__tests__/payrollCalculations.test.ts`:

```typescript
describe('PayrollCalculator', () => {
    describe('CPP calculations', () => {
        it('calculates CPP correctly for standard employee', () => {
            // Test case: $2,000 biweekly gross
            // Expected: ($2,000 - $134.62) * 5.95% = $110.99
        });
        
        it('stops CPP when maximum reached', () => {
            // Test case: YTD CPP already at $4,200
            // Expected: Only deduct remaining to reach $4,237.95
        });
        
        it('calculates CPP2 for high earners', () => {
            // Test case: $4,000 biweekly (above YMPE per period)
        });
    });
    
    describe('EI calculations', () => {
        it('calculates EI correctly', () => {
            // Test case: $2,000 biweekly
            // Expected: $2,000 * 1.63% = $32.60
        });
        
        it('stops EI when maximum reached', () => {
            // Test case: YTD EI already at $1,100
        });
    });
    
    describe('Income tax calculations', () => {
        it('calculates federal tax correctly', () => {
            // Test case: $60,000 annual salary
            // Should use first two brackets
        });
        
        it('applies Ontario surtax correctly', () => {
            // Test case: High income that triggers surtax
        });
        
        it('applies tax credits correctly', () => {
            // Test case: Custom TD1 claims
        });
        
        it('handles tax-exempt employees', () => {
            // Test case: Employee claims tax exempt on TD1
        });
    });
    
    describe('Overtime calculations', () => {
        it('calculates overtime at 1.5x', () => {
            // Test case: 10 OT hours at $25/hr
            // Expected: 10 * $25 * 1.5 = $375
        });
        
        it('respects overtime disabled setting', () => {
            // When overtime_enabled = false, use regular rate
        });
    });
    
    describe('Vacation accrual', () => {
        it('accrues at 4% for new employees', () => {
            // Test case: 1 year of service
        });
        
        it('accrues at 6% for 5+ year employees', () => {
            // Test case: 6 years of service
        });
    });
});
```

### Test Data Scenarios

Create `frontend/src/lib/__tests__/testScenarios.ts`:

```typescript
export const testScenarios = {
    // Scenario 1: Standard biweekly employee
    standardBiweekly: {
        input: {
            employee: {
                payrate: 52000,
                payrate_type: 'salary',
                province: 'ON',
                hire_date: '2023-01-15'
            },
            hours: { regular: 80, overtime: 0 },
            ytd: { cpp_contributions: 1500, ei_premiums: 400 }
        },
        expected: {
            grossPay: 2000,
            cpp: 110.99,
            ei: 32.60,
            // ... etc
        }
    },
    
    // Scenario 2: High earner hitting CPP max mid-year
    highEarnerCppMax: { /* ... */ },
    
    // Scenario 3: Part-time hourly with overtime
    partTimeWithOT: { /* ... */ },
    
    // Scenario 4: Employee with benefits
    employeeWithBenefits: { /* ... */ }
};
```

## Implementation Steps

1. **Create type definitions** (`payrollTypes.ts`)
2. **Implement PayrollCalculator class** (`payrollCalculations.ts`)
3. **Add API methods** for tax data fetching
4. **Write comprehensive unit tests**
5. **Create test scenarios** for common cases
6. **Validate against CRA PDOC** (Payroll Deductions Online Calculator)
7. **Document any edge cases** found during testing

## Validation

Before proceeding to Phase 4, validate calculations against:

1. **CRA PDOC** (Payroll Deductions Online Calculator)
   - https://www.canada.ca/en/revenue-agency/services/e-services/digital-services-businesses/payroll-deductions-online-calculator.html
   - Test multiple scenarios

2. **Manual calculation** using T4032 tables
   - Verify bracket calculations
   - Verify CPP/EI maximums

3. **Edge cases**:
   - Employee starting mid-year
   - Employee hitting CPP max
   - Employee hitting EI max
   - Employee with zero hours (salary only)
   - Employee with only overtime
   - Very high income (all brackets)
   - Very low income (below exemptions)

## Next Phase

After the tax calculation engine is complete and validated, proceed to **Phase 4: Pay Run System** to build the payroll processing workflow.
