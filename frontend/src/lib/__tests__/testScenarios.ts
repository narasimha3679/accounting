/**
 * Pre-defined Test Scenarios for Payroll Calculations
 * 
 * These scenarios can be used for validation against CRA PDOC
 * and for regression testing.
 */

import type { PayrollInput, EmployeeYTD } from '../payrollTypes';
import type { PayrollSettings } from '../api';
import { CRA_2026 } from '../cra2026Constants';

/**
 * Default tax credits (standard TD1 — CRA 2026 BPA)
 */
const defaultTaxCredits = {
    id: 1,
    employee_id: 1,
    tax_year: 2026,
    federal_basic_personal: CRA_2026.federalBpaMax,
    federal_additional_claims: 0,
    federal_total_claim: CRA_2026.federalBpaMax,
    provincial_basic_personal: CRA_2026.ontarioBpa,
    provincial_additional_claims: 0,
    provincial_total_claim: CRA_2026.ontarioBpa,
    claim_tax_exempt: false,
    additional_tax_per_pay: 0,
    effective_date: '2026-01-01',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

/**
 * Default payroll settings
 */
const defaultSettings: PayrollSettings = {
    id: 1,
    company_id: 1,
    pay_frequency: 'biweekly',
    province: 'ON',
    overtime_enabled: true,
    overtime_threshold_weekly: 44.0,
    overtime_multiplier: 1.5,
    vacation_tracking_enabled: true,
    vacation_rate_under_5_years: 0.04,
    vacation_rate_5_plus_years: 0.06,
    vacation_accrual_method: 'per_pay',
    remitter_type: 'regular',
    default_work_hours_per_day: 8.0,
    default_work_days_per_week: 5,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

/**
 * Zero YTD balances
 */
const zeroYTD: EmployeeYTD = {
    gross_earnings: 0,
    pensionable_earnings: 0,
    insurable_earnings: 0,
    taxable_earnings: 0,
    cpp_contributions: 0,
    cpp2_contributions: 0,
    ei_premiums: 0,
    federal_tax_withheld: 0,
    provincial_tax_withheld: 0,
    taxable_benefits: 0,
    rrsp_contributions: 0,
    union_dues: 0,
    charitable_donations: 0,
    vacation_earned: 0,
    vacation_used: 0,
    vacation_balance: 0,
    employer_cpp: 0,
    employer_ei: 0,
    cpp_maxed_out: false,
    cpp2_maxed_out: false,
    ei_maxed_out: false,
};

export const testScenarios = {
    /**
     * Scenario 1: Standard biweekly employee
     * - $52,000 annual salary
     * - Biweekly pay
     * - 80 regular hours per pay period
     * - No overtime, no benefits
     * - Starting fresh (zero YTD)
     */
    standardBiweekly: {
        description: 'Standard biweekly employee - $52,000 annual salary',
        input: {
            employee: {
                id: 1,
                province: 'ON',
                hire_date: '2023-01-15',
                payrate: 52000,
                payrate_type: 'salary' as const,
            },
            payPeriod: {
                start: '2026-01-01',
                end: '2026-01-14',
                payDate: '2026-01-15',
            },
            hours: {
                regular: 80,
                overtime: 0,
                vacation: 0,
                statutory_holiday: 0,
                sick: 0,
            },
            benefits: {
                taxable: 0,
                preTaxDeductions: 0,
                postTaxDeductions: 0,
            },
            ytd: zeroYTD,
            taxCredits: defaultTaxCredits,
            settings: defaultSettings,
        } as PayrollInput,
        expected: {
            grossPay: 2000, // $52,000 / 26 = $2,000
            cpp: {
                contribution: 110.99, // Approximate
                maxedOut: false,
            },
            ei: {
                premium: 32.6, // $2,000 * 1.63%
                maxedOut: false,
            },
            netPay: {
                min: 1500,
                max: 1800,
            },
        },
    },

    /**
     * Scenario 2: High earner hitting CPP max mid-year
     * - $150,000 annual salary
     * - Biweekly pay
     * - Already contributed $4,000 CPP YTD
     * - Should only deduct remaining room
     */
    highEarnerCppMax: {
        description: 'High earner hitting CPP maximum mid-year',
        input: {
            employee: {
                id: 2,
                province: 'ON',
                hire_date: '2020-01-15',
                payrate: 150000,
                payrate_type: 'salary' as const,
            },
            payPeriod: {
                start: '2026-07-01',
                end: '2026-07-14',
                payDate: '2026-07-15',
            },
            hours: {
                regular: 80,
                overtime: 0,
                vacation: 0,
                statutory_holiday: 0,
                sick: 0,
            },
            benefits: {
                taxable: 0,
                preTaxDeductions: 0,
                postTaxDeductions: 0,
            },
            ytd: {
                ...zeroYTD,
                cpp_contributions: 4000, // Close to max
            },
            taxCredits: defaultTaxCredits,
            settings: defaultSettings,
        } as PayrollInput,
        expected: {
            grossPay: 5769.23, // $150,000 / 26
            cpp: {
                contribution: {
                    min: 0,
                    max: 250, // Only remaining room
                },
                maxedOut: true,
            },
        },
    },

    /**
     * Scenario 3: Part-time hourly with overtime
     * - $25/hour
     * - 30 regular hours + 5 overtime hours
     * - Overtime at 1.5x
     */
    partTimeWithOT: {
        description: 'Part-time hourly employee with overtime',
        input: {
            employee: {
                id: 3,
                province: 'ON',
                hire_date: '2024-06-01',
                payrate: 25,
                payrate_type: 'hourly' as const,
            },
            payPeriod: {
                start: '2026-01-01',
                end: '2026-01-14',
                payDate: '2026-01-15',
            },
            hours: {
                regular: 30,
                overtime: 5,
                vacation: 0,
                statutory_holiday: 0,
                sick: 0,
            },
            benefits: {
                taxable: 0,
                preTaxDeductions: 0,
                postTaxDeductions: 0,
            },
            ytd: zeroYTD,
            taxCredits: defaultTaxCredits,
            settings: defaultSettings,
        } as PayrollInput,
        expected: {
            regularPay: 750, // 30 * $25
            overtimePay: 187.5, // 5 * $25 * 1.5
            grossPay: 937.5,
        },
    },

    /**
     * Scenario 4: Employee with benefits
     * - $60,000 annual salary
     * - RRSP contribution (pre-tax): $200
     * - Health benefits (taxable): $100
     * - Union dues (post-tax): $50
     */
    employeeWithBenefits: {
        description: 'Employee with RRSP, health benefits, and union dues',
        input: {
            employee: {
                id: 4,
                province: 'ON',
                hire_date: '2022-03-15',
                payrate: 60000,
                payrate_type: 'salary' as const,
            },
            payPeriod: {
                start: '2026-01-01',
                end: '2026-01-14',
                payDate: '2026-01-15',
            },
            hours: {
                regular: 80,
                overtime: 0,
                vacation: 0,
                statutory_holiday: 0,
                sick: 0,
            },
            benefits: {
                taxable: 100, // Health benefits
                preTaxDeductions: 200, // RRSP
                postTaxDeductions: 50, // Union dues
            },
            ytd: zeroYTD,
            taxCredits: defaultTaxCredits,
            settings: defaultSettings,
        } as PayrollInput,
        expected: {
            grossPay: 2407.69, // $60,000 / 26 + $100 benefit
            taxableBenefits: 100,
            preTaxDeductions: 200,
            postTaxDeductions: 50,
        },
    },

    /**
     * Scenario 5: Employee starting mid-year
     * - Hired July 1, 2026
     * - $50,000 annual salary
     * - First pay period
     * - Zero YTD (expected)
     */
    midYearStart: {
        description: 'Employee starting mid-year (July 1)',
        input: {
            employee: {
                id: 5,
                province: 'ON',
                hire_date: '2026-07-01',
                payrate: 50000,
                payrate_type: 'salary' as const,
            },
            payPeriod: {
                start: '2026-07-01',
                end: '2026-07-14',
                payDate: '2026-07-15',
            },
            hours: {
                regular: 80,
                overtime: 0,
                vacation: 0,
                statutory_holiday: 0,
                sick: 0,
            },
            benefits: {
                taxable: 0,
                preTaxDeductions: 0,
                postTaxDeductions: 0,
            },
            ytd: zeroYTD,
            taxCredits: defaultTaxCredits,
            settings: defaultSettings,
        } as PayrollInput,
        expected: {
            grossPay: 1923.08, // $50,000 / 26
            // Should calculate normally despite mid-year start
        },
    },

    /**
     * Scenario 6: Very low income (below exemptions)
     * - $15/hour
     * - 20 hours per pay period
     * - May have minimal or no CPP/EI deductions
     */
    veryLowIncome: {
        description: 'Very low income employee (below exemptions)',
        input: {
            employee: {
                id: 6,
                province: 'ON',
                hire_date: '2025-01-15',
                payrate: 15,
                payrate_type: 'hourly' as const,
            },
            payPeriod: {
                start: '2026-01-01',
                end: '2026-01-14',
                payDate: '2026-01-15',
            },
            hours: {
                regular: 20,
                overtime: 0,
                vacation: 0,
                statutory_holiday: 0,
                sick: 0,
            },
            benefits: {
                taxable: 0,
                preTaxDeductions: 0,
                postTaxDeductions: 0,
            },
            ytd: zeroYTD,
            taxCredits: defaultTaxCredits,
            settings: defaultSettings,
        } as PayrollInput,
        expected: {
            grossPay: 300, // 20 * $15
            // May have minimal deductions
        },
    },

    /**
     * Scenario 7: Very high income (all brackets)
     * - $250,000 annual salary
     * - Should hit all tax brackets
     * - Should have CPP2
     */
    veryHighIncome: {
        description: 'Very high income employee (all tax brackets)',
        input: {
            employee: {
                id: 7,
                province: 'ON',
                hire_date: '2015-01-15',
                payrate: 250000,
                payrate_type: 'salary' as const,
            },
            payPeriod: {
                start: '2026-01-01',
                end: '2026-01-14',
                payDate: '2026-01-15',
            },
            hours: {
                regular: 80,
                overtime: 0,
                vacation: 0,
                statutory_holiday: 0,
                sick: 0,
            },
            benefits: {
                taxable: 0,
                preTaxDeductions: 0,
                postTaxDeductions: 0,
            },
            ytd: zeroYTD,
            taxCredits: defaultTaxCredits,
            settings: defaultSettings,
        } as PayrollInput,
        expected: {
            grossPay: 9615.38, // $250,000 / 26
            cpp2: {
                contribution: {
                    min: 0,
                    max: 20, // Per period CPP2
                },
            },
            federalTax: {
                min: 2000,
                max: 3000, // High tax bracket
            },
        },
    },

    /**
     * Scenario 8: Tax-exempt employee
     * - Claims tax exempt on TD1
     * - Should have zero income tax
     * - Still pays CPP/EI
     */
    taxExempt: {
        description: 'Employee claiming tax exempt on TD1',
        input: {
            employee: {
                id: 8,
                province: 'ON',
                hire_date: '2023-01-15',
                payrate: 52000,
                payrate_type: 'salary' as const,
            },
            payPeriod: {
                start: '2026-01-01',
                end: '2026-01-14',
                payDate: '2026-01-15',
            },
            hours: {
                regular: 80,
                overtime: 0,
                vacation: 0,
                statutory_holiday: 0,
                sick: 0,
            },
            benefits: {
                taxable: 0,
                preTaxDeductions: 0,
                postTaxDeductions: 0,
            },
            ytd: zeroYTD,
            taxCredits: {
                ...defaultTaxCredits,
                claim_tax_exempt: true,
            },
            settings: defaultSettings,
        } as PayrollInput,
        expected: {
            grossPay: 2000,
            federalTax: 0,
            provincialTax: 0,
            totalIncomeTax: 0,
            // Still pays CPP/EI
            cpp: {
                contribution: {
                    min: 100,
                    max: 120,
                },
            },
        },
    },
};

/**
 * Helper to get scenario by name
 */
export function getScenario(name: keyof typeof testScenarios) {
    return testScenarios[name];
}

/**
 * List all scenario names
 */
export function getScenarioNames(): (keyof typeof testScenarios)[] {
    return Object.keys(testScenarios) as (keyof typeof testScenarios)[];
}
