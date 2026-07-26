/**
 * Unit Tests for Payroll Calculator
 *
 * Includes CRA-aligned 2026 seed mocks and golden PDOC-style asserts.
 * Expected values: internal golden derived from corrected CRA 2026 brackets/
 * constants (T4032-ON Jan 2026 + canada.ca CPP/EI tables). Replace with
 * live PDOC screenshots when available.
 */

import { describe, it, expect } from 'vitest';
import { PayrollCalculator } from '../payrollCalculations';
import { CRA_2026 } from '../cra2026Constants';
import type {
    PayrollInput,
    TaxConstants,
    TaxBracket,
    ProvincialTaxConstants,
    EmployeeYTD,
} from '../payrollTypes';
import type { PayrollSettings } from '../api';

/** Assert currency within $1 (PDOC tolerance from Phase 2 plan). */
function expectWithinDollar(actual: number, expected: number, label: string) {
    expect(Math.abs(actual - expected), `${label}: got ${actual}, expected ~${expected}`).toBeLessThanOrEqual(1);
}

// 2026 Tax Constants (aligned with CRA / cra2026Constants / Supabase seeds)
const mockTaxConstants: TaxConstants = {
    cpp_rate: CRA_2026.cppRate,
    cpp_employer_rate: CRA_2026.cppRate,
    cpp_basic_exemption: CRA_2026.cppExemption,
    cpp_ympe: CRA_2026.cppYmpe,
    cpp_max_contribution: CRA_2026.cppMaxContribution,
    cpp2_rate: CRA_2026.cpp2Rate,
    cpp2_yampe: CRA_2026.cpp2Yampe,
    cpp2_max_contribution: CRA_2026.cpp2MaxContribution,
    ei_employee_rate: CRA_2026.eiRate,
    ei_employer_multiplier: CRA_2026.eiEmployerMultiplier,
    ei_max_insurable: CRA_2026.eiMie,
    ei_max_premium: CRA_2026.eiMaxPremium,
    federal_basic_personal_amount: CRA_2026.federalBpaMax,
    federal_employment_amount: CRA_2026.canadaEmploymentAmount,
};

const mockFederalBrackets: TaxBracket[] = CRA_2026.federalBrackets.map((b) => ({ ...b }));

const mockOntarioBrackets: TaxBracket[] = CRA_2026.ontarioBrackets.map((b) => ({ ...b }));

const mockOntarioConstants: ProvincialTaxConstants = {
    basic_personal_amount: CRA_2026.ontarioBpa,
    surtax_threshold_1: CRA_2026.ontarioSurtaxThreshold1,
    surtax_rate_1: CRA_2026.ontarioSurtaxRate1,
    surtax_threshold_2: CRA_2026.ontarioSurtaxThreshold2,
    surtax_rate_2: CRA_2026.ontarioSurtaxRate2,
    health_premium_enabled: true,
};

const mockPayrollSettings: PayrollSettings = {
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

const defaultYTD: EmployeeYTD = {
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

function createCalculator(payFrequency: 'weekly' | 'biweekly' | 'semi_monthly' | 'monthly' = 'biweekly') {
    return new PayrollCalculator(
        mockTaxConstants,
        mockFederalBrackets,
        mockOntarioBrackets,
        mockOntarioConstants,
        payFrequency
    );
}

function createPayrollInput(overrides: Partial<PayrollInput> = {}): PayrollInput {
    return {
        employee: {
            id: 1,
            province: 'ON',
            hire_date: '2023-01-15',
            payrate: 52000,
            payrate_type: 'salary',
            ...overrides.employee,
        },
        payPeriod: {
            start: '2026-01-01',
            end: '2026-01-14',
            payDate: '2026-01-15',
            ...overrides.payPeriod,
        },
        hours: {
            regular: 80,
            overtime: 0,
            vacation: 0,
            statutory_holiday: 0,
            sick: 0,
            ...overrides.hours,
        },
        otherEarnings: overrides.otherEarnings,
        benefits: {
            taxable: 0,
            preTaxDeductions: 0,
            postTaxDeductions: 0,
            ...overrides.benefits,
        },
        ytd: overrides.ytd || defaultYTD,
        taxCredits: overrides.taxCredits || defaultTaxCredits,
        settings: overrides.settings || mockPayrollSettings,
    };
}

describe('PayrollCalculator', () => {
    describe('CPP Calculations', () => {
        it('calculates CPP correctly for standard biweekly employee', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                employee: { id: 1, province: 'ON', hire_date: '2023-01-15', payrate: 52000, payrate_type: 'salary' },
                hours: { regular: 80, overtime: 0, vacation: 0, statutory_holiday: 0, sick: 0 },
            });

            const result = calculator.calculate(input);

            // $2,000 biweekly gross
            // CPP exemption per period: $3,500 / 26 = $134.62
            // Pensionable: $2,000 - $134.62 = $1,865.38
            // CPP: $1,865.38 * 5.95% = $110.99
            expect(result.cpp.contribution).toBeGreaterThan(100);
            expect(result.cpp.contribution).toBeLessThan(120);
            expect(result.cpp.employerContribution).toBe(result.cpp.contribution);
            expect(result.cpp.maxedOut).toBe(false);
        });

        it('stops CPP when maximum reached', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                ytd: {
                    ...defaultYTD,
                    cpp_contributions: 4200, // Close to max of $4,230.45
                },
            });

            const result = calculator.calculate(input);

            expect(result.cpp.contribution).toBeLessThan(50);
            expect(result.cpp.ytdAfter).toBeLessThanOrEqual(mockTaxConstants.cpp_max_contribution);
        });

        it('returns zero CPP when already maxed out', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                ytd: {
                    ...defaultYTD,
                    cpp_contributions: mockTaxConstants.cpp_max_contribution,
                },
            });

            const result = calculator.calculate(input);

            expect(result.cpp.contribution).toBe(0);
            expect(result.cpp.maxedOut).toBe(true);
        });
    });

    describe('CPP2 Calculations', () => {
        it('calculates CPP2 for high earners', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                employee: { id: 1, province: 'ON', hire_date: '2023-01-15', payrate: 100000, payrate_type: 'salary' },
                hours: { regular: 80, overtime: 0, vacation: 0, statutory_holiday: 0, sick: 0 },
            });

            const result = calculator.calculate(input);

            // YMPE/period $2,869.23; YAMPE/period $3,269.23 — gross ~$3,846 → CPP2 on $400
            if (result.grossPay > 3269.23) {
                expect(result.cpp2.contribution).toBeGreaterThan(0);
            }
        });

        it('returns zero CPP2 when already maxed out', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                ytd: {
                    ...defaultYTD,
                    cpp2_contributions: mockTaxConstants.cpp2_max_contribution,
                },
            });

            const result = calculator.calculate(input);

            expect(result.cpp2.contribution).toBe(0);
            expect(result.cpp2.maxedOut).toBe(true);
        });
    });

    describe('EI Calculations', () => {
        it('calculates EI correctly', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                employee: { id: 1, province: 'ON', hire_date: '2023-01-15', payrate: 52000, payrate_type: 'salary' },
                hours: { regular: 80, overtime: 0, vacation: 0, statutory_holiday: 0, sick: 0 },
            });

            const result = calculator.calculate(input);

            // $2,000 biweekly → EI: $2,000 * 1.63% = $32.60
            expect(result.ei.premium).toBeGreaterThan(30);
            expect(result.ei.premium).toBeLessThan(35);
            expect(result.ei.employerPremium).toBeCloseTo(result.ei.premium * 1.4, 2);
            expect(result.ei.maxedOut).toBe(false);
        });

        it('stops EI when maximum reached', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                ytd: {
                    ...defaultYTD,
                    ei_premiums: 1100, // Close to max of $1,123.07
                },
            });

            const result = calculator.calculate(input);

            expect(result.ei.premium).toBeLessThan(25);
            expect(result.ei.ytdAfter).toBeLessThanOrEqual(mockTaxConstants.ei_max_premium);
        });

        it('returns zero EI when already maxed out', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                ytd: {
                    ...defaultYTD,
                    ei_premiums: mockTaxConstants.ei_max_premium,
                },
            });

            const result = calculator.calculate(input);

            expect(result.ei.premium).toBe(0);
            expect(result.ei.maxedOut).toBe(true);
        });

        it('returns zero EI when employee is ei_exempt', () => {
            const calculator = createCalculator('biweekly');
            const withEi = calculator.calculate(
                createPayrollInput({
                    employee: {
                        id: 1,
                        province: 'ON',
                        hire_date: '2023-01-15',
                        payrate: 25,
                        payrate_type: 'hourly',
                        ei_exempt: false,
                    },
                    hours: { regular: 80, overtime: 0, vacation: 0, statutory_holiday: 0, sick: 0 },
                })
            );
            const exempt = calculator.calculate(
                createPayrollInput({
                    employee: {
                        id: 1,
                        province: 'ON',
                        hire_date: '2023-01-15',
                        payrate: 25,
                        payrate_type: 'hourly',
                        ei_exempt: true,
                    },
                    hours: { regular: 80, overtime: 0, vacation: 0, statutory_holiday: 0, sick: 0 },
                })
            );

            expect(exempt.ei.premium).toBe(0);
            expect(exempt.ei.employerPremium).toBe(0);
            expect(exempt.ei.insurableEarnings).toBe(0);
            expect(exempt.ei.ytdAfter).toBe(0);
            expect(withEi.ei.premium).toBeGreaterThan(0);
            expect(exempt.netPay).toBeGreaterThan(withEi.netPay);
        });
    });

    describe('Income Tax Calculations', () => {
        it('calculates federal tax correctly', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                employee: { id: 1, province: 'ON', hire_date: '2023-01-15', payrate: 60000, payrate_type: 'salary' },
                hours: { regular: 80, overtime: 0, vacation: 0, statutory_holiday: 0, sick: 0 },
            });

            const result = calculator.calculate(input);

            expect(result.federalTax).toBeGreaterThan(0);
            expect(result.totalIncomeTax).toBeGreaterThan(result.federalTax);
        });

        it('applies tax credits correctly', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                taxCredits: {
                    ...defaultTaxCredits,
                    federal_total_claim: 20000,
                    provincial_total_claim: 15000,
                },
            });

            const result = calculator.calculate(input);

            expect(result.calculationDetails.federalCreditsUsed).toBeGreaterThan(0);
            expect(result.calculationDetails.provincialCreditsUsed).toBeGreaterThan(0);
        });

        it('handles tax-exempt employees', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                taxCredits: {
                    ...defaultTaxCredits,
                    claim_tax_exempt: true,
                },
            });

            const result = calculator.calculate(input);

            expect(result.federalTax).toBe(0);
            expect(result.provincialTax).toBe(0);
            expect(result.totalIncomeTax).toBe(0);
        });
    });

    describe('Overtime Calculations', () => {
        it('calculates overtime at 1.5x', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                employee: { id: 1, province: 'ON', hire_date: '2023-01-15', payrate: 25, payrate_type: 'hourly' },
                hours: { regular: 80, overtime: 10, vacation: 0, statutory_holiday: 0, sick: 0 },
                settings: {
                    ...mockPayrollSettings,
                    overtime_enabled: true,
                    overtime_multiplier: 1.5,
                },
            });

            const result = calculator.calculate(input);

            expect(result.overtimePay).toBe(375);
            expect(result.grossPay).toBe(2375);
        });

        it('respects overtime disabled setting', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                employee: { id: 1, province: 'ON', hire_date: '2023-01-15', payrate: 25, payrate_type: 'hourly' },
                hours: { regular: 80, overtime: 10, vacation: 0, statutory_holiday: 0, sick: 0 },
                settings: {
                    ...mockPayrollSettings,
                    overtime_enabled: false,
                },
            });

            const result = calculator.calculate(input);

            expect(result.overtimePay).toBe(250);
        });
    });

    describe('Vacation Accrual', () => {
        it('accrues at 4% for employees under 5 years', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                employee: { id: 1, province: 'ON', hire_date: '2024-01-15', payrate: 52000, payrate_type: 'salary' },
                hours: { regular: 80, overtime: 0, vacation: 0, statutory_holiday: 0, sick: 0 },
                settings: {
                    ...mockPayrollSettings,
                    vacation_tracking_enabled: true,
                },
            });

            const result = calculator.calculate(input);

            expect(result.vacationRate).toBe(0.04);
            expect(result.vacationAccrued).toBeGreaterThan(0);
        });

        it('accrues at 6% for employees 5+ years', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                employee: { id: 1, province: 'ON', hire_date: '2018-01-15', payrate: 52000, payrate_type: 'salary' },
                hours: { regular: 80, overtime: 0, vacation: 0, statutory_holiday: 0, sick: 0 },
                settings: {
                    ...mockPayrollSettings,
                    vacation_tracking_enabled: true,
                },
            });

            const result = calculator.calculate(input);

            expect(result.vacationRate).toBe(0.06);
            expect(result.vacationAccrued).toBeGreaterThan(0);
        });

        it('returns zero vacation when tracking disabled', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                settings: {
                    ...mockPayrollSettings,
                    vacation_tracking_enabled: false,
                },
            });

            const result = calculator.calculate(input);

            expect(result.vacationAccrued).toBe(0);
            expect(result.vacationRate).toBe(0);
        });
    });

    describe('Benefits and Deductions', () => {
        it('handles taxable benefits', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                benefits: {
                    taxable: 200,
                    preTaxDeductions: 0,
                    postTaxDeductions: 0,
                },
            });

            const result = calculator.calculate(input);

            expect(result.taxableBenefits).toBe(200);
            expect(result.taxableIncome).toBe(result.grossPay + 200);
            expect(result.grossPay).toBe(2000);
        });

        it('handles pre-tax deductions (RRSP)', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                benefits: {
                    taxable: 0,
                    preTaxDeductions: 100,
                    postTaxDeductions: 0,
                },
            });

            const result = calculator.calculate(input);

            expect(result.preTaxDeductions).toBe(100);
            expect(result.taxableIncome).toBeLessThan(result.grossPay);
        });

        it('handles post-tax deductions (union dues)', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                benefits: {
                    taxable: 0,
                    preTaxDeductions: 0,
                    postTaxDeductions: 50,
                },
            });

            const result = calculator.calculate(input);

            expect(result.postTaxDeductions).toBe(50);
            expect(result.totalDeductions).toBeGreaterThan(50);
        });
    });

    describe('Pay Frequency Variations', () => {
        it('calculates correctly for weekly pay', () => {
            const calculator = createCalculator('weekly');
            const input = createPayrollInput({
                employee: { id: 1, province: 'ON', hire_date: '2023-01-15', payrate: 52000, payrate_type: 'salary' },
                hours: { regular: 40, overtime: 0, vacation: 0, statutory_holiday: 0, sick: 0 },
            });

            const result = calculator.calculate(input);

            expect(result.cpp.contribution).toBeGreaterThan(0);
        });

        it('calculates correctly for monthly pay', () => {
            const calculator = createCalculator('monthly');
            const input = createPayrollInput({
                employee: { id: 1, province: 'ON', hire_date: '2023-01-15', payrate: 52000, payrate_type: 'salary' },
                hours: { regular: 173.33, overtime: 0, vacation: 0, statutory_holiday: 0, sick: 0 },
            });

            const result = calculator.calculate(input);

            expect(result.cpp.contribution).toBeGreaterThan(0);
        });
    });

    describe('Edge Cases', () => {
        it('handles very low income (below exemptions)', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                employee: { id: 1, province: 'ON', hire_date: '2023-01-15', payrate: 100, payrate_type: 'hourly' },
                hours: { regular: 10, overtime: 0, vacation: 0, statutory_holiday: 0, sick: 0 },
            });

            const result = calculator.calculate(input);

            expect(result.grossPay).toBeGreaterThan(0);
        });

        it('handles zero hours worked', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                hours: { regular: 0, overtime: 0, vacation: 0, statutory_holiday: 0, sick: 0 },
            });

            const result = calculator.calculate(input);

            expect(result.grossPay).toBe(0);
            expect(result.netPay).toBe(0);
        });
    });

    /**
     * Golden scenarios (Phase 2.2 + T4032 alignment)
     *
     * Source: CRA T4032-ON methodology matching canadaTaxEngine /
     * PayrollCalculator (enhanced CPP + CPP2 as deductions; base CPP, EI,
     * TD1, CEA as credits; ON surtax → tax reduction → health premium).
     * Replace expecteds with CRA PDOC screenshots when available.
     */
    describe('Golden PDOC-style scenarios (within $1)', () => {
        it('1. biweekly ON hourly mid-income, no YTD, standard TD1', () => {
            const calculator = createCalculator('biweekly');
            const result = calculator.calculate(
                createPayrollInput({
                    employee: {
                        id: 1,
                        province: 'ON',
                        hire_date: '2023-01-15',
                        payrate: 25,
                        payrate_type: 'hourly',
                    },
                    hours: { regular: 80, overtime: 0, vacation: 0, statutory_holiday: 0, sick: 0 },
                })
            );

            // Gross $2,000; CPP $110.99; EI $32.60; fed $163.23; ON+OHP $91.60; net $1,601.58
            expectWithinDollar(result.grossPay, 2000, 'gross');
            expectWithinDollar(result.cpp.contribution, 110.99, 'cpp');
            expectWithinDollar(result.ei.premium, 32.6, 'ei');
            expectWithinDollar(result.federalTax, 163.23, 'federalTax');
            expectWithinDollar(result.ontarioHealthPremium, 23.08, 'ohp');
            expectWithinDollar(result.provincialTax, 91.6, 'provincialTax+ohp');
            expectWithinDollar(result.netPay, 1601.58, 'netPay');
            expect(result.cpp2.contribution).toBe(0);
        });

        it('2. near CPP YMPE (YTD almost maxed) → CPP near remaining room only', () => {
            const calculator = createCalculator('biweekly');
            const ytdCpp = 4220; // remaining room vs $4,230.45 max = $10.45
            const result = calculator.calculate(
                createPayrollInput({
                    employee: {
                        id: 1,
                        province: 'ON',
                        hire_date: '2023-01-15',
                        payrate: 25,
                        payrate_type: 'hourly',
                    },
                    hours: { regular: 80, overtime: 0, vacation: 0, statutory_holiday: 0, sick: 0 },
                    ytd: { ...defaultYTD, cpp_contributions: ytdCpp },
                })
            );

            expectWithinDollar(result.cpp.contribution, 10.45, 'cpp remaining');
            expect(result.cpp.ytdAfter).toBeLessThanOrEqual(CRA_2026.cppMaxContribution);
            expect(result.cpp.maxedOut).toBe(true);
        });

        it('3. high earner triggering CPP2', () => {
            const calculator = createCalculator('biweekly');
            const result = calculator.calculate(
                createPayrollInput({
                    employee: {
                        id: 1,
                        province: 'ON',
                        hire_date: '2020-01-15',
                        payrate: 100000,
                        payrate_type: 'salary',
                    },
                    hours: { regular: 80, overtime: 0, vacation: 0, statutory_holiday: 0, sick: 0 },
                })
            );

            // 80h × ($100k/2080) = $3,846.15; CPP2 on $400 between YMPE/YAMPE per period = $16.00
            expectWithinDollar(result.grossPay, 3846.15, 'gross');
            expectWithinDollar(result.cpp.contribution, 162.71, 'cpp');
            expectWithinDollar(result.cpp2.contribution, 16.0, 'cpp2');
            expectWithinDollar(result.cpp2.employerContribution, 16.0, 'cpp2 employer');
            expectWithinDollar(result.ei.premium, 43.19, 'ei');
            expectWithinDollar(result.federalTax, 511.6, 'federalTax');
            expectWithinDollar(result.ontarioHealthPremium, 28.85, 'ohp');
            expect(result.cpp2.contribution).toBeGreaterThan(0);
            expect(result.employerCpp).toBe(
                result.cpp.employerContribution + result.cpp2.employerContribution
            );
        });

        it('4. overtime period — gross and 1.5x OT rate', () => {
            const calculator = createCalculator('biweekly');
            const result = calculator.calculate(
                createPayrollInput({
                    employee: {
                        id: 1,
                        province: 'ON',
                        hire_date: '2023-01-15',
                        payrate: 25,
                        payrate_type: 'hourly',
                    },
                    hours: { regular: 80, overtime: 10, vacation: 0, statutory_holiday: 0, sick: 0 },
                    settings: {
                        ...mockPayrollSettings,
                        overtime_enabled: true,
                        overtime_multiplier: 1.5,
                    },
                })
            );

            expectWithinDollar(result.regularPay, 2000, 'regularPay');
            expectWithinDollar(result.overtimePay, 375, 'overtimePay'); // 10 × $25 × 1.5
            expectWithinDollar(result.grossPay, 2375, 'gross');
            expect(result.cpp.contribution).toBeGreaterThan(0);
            expect(result.ei.premium).toBeGreaterThan(0);
            expect(result.netPay).toBeGreaterThan(0);
            expect(result.netPay).toBeLessThan(result.grossPay);
        });

        it('5. zero hours → zeros', () => {
            const calculator = createCalculator('biweekly');
            const result = calculator.calculate(
                createPayrollInput({
                    hours: { regular: 0, overtime: 0, vacation: 0, statutory_holiday: 0, sick: 0 },
                })
            );

            expect(result.grossPay).toBe(0);
            expect(result.cpp.contribution).toBe(0);
            expect(result.cpp2.contribution).toBe(0);
            expect(result.ei.premium).toBe(0);
            expect(result.federalTax).toBe(0);
            expect(result.provincialTax).toBe(0);
            expect(result.ontarioHealthPremium).toBe(0);
            expect(result.netPay).toBe(0);
        });
    });
});
