/**
 * Unit Tests for Payroll Calculator
 * 
 * Comprehensive test suite for payroll calculations including CPP, CPP2, EI,
 * federal tax, provincial tax, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { PayrollCalculator } from '../payrollCalculations';
import type {
    PayrollInput,
    TaxConstants,
    TaxBracket,
    ProvincialTaxConstants,
    EmployeeYTD,
} from '../payrollTypes';
import type { PayrollSettings } from '../api';

// 2026 Tax Constants (from seed data)
const mockTaxConstants: TaxConstants = {
    cpp_rate: 0.0595,
    cpp_employer_rate: 0.0595,
    cpp_basic_exemption: 3500.0,
    cpp_ympe: 74600.0,
    cpp_max_contribution: 4237.95,
    cpp2_rate: 0.04,
    cpp2_yampe: 85000.0,
    cpp2_max_contribution: 416.0,
    ei_employee_rate: 0.0163,
    ei_employer_multiplier: 1.4,
    ei_max_insurable: 68900.0,
    ei_max_premium: 1123.07,
    federal_basic_personal_amount: 16129.0,
    federal_employment_amount: 1433.0,
};

// 2026 Federal Tax Brackets
const mockFederalBrackets: TaxBracket[] = [
    { min_income: 0, max_income: 58523, rate: 0.14 },
    { min_income: 58523.01, max_income: 117037, rate: 0.205 },
    { min_income: 117037.01, max_income: 161087, rate: 0.26 },
    { min_income: 161087.01, max_income: 246752, rate: 0.29 },
    { min_income: 246752.01, max_income: null, rate: 0.33 },
];

// 2026 Ontario Tax Brackets
const mockOntarioBrackets: TaxBracket[] = [
    { min_income: 0, max_income: 51446, rate: 0.0505 },
    { min_income: 51446.01, max_income: 102894, rate: 0.0915 },
    { min_income: 102894.01, max_income: 150000, rate: 0.1116 },
    { min_income: 150000.01, max_income: 220000, rate: 0.1216 },
    { min_income: 220000.01, max_income: null, rate: 0.1316 },
];

// Ontario Provincial Constants
const mockOntarioConstants: ProvincialTaxConstants = {
    basic_personal_amount: 12399.0,
    surtax_threshold_1: 5554.0,
    surtax_rate_1: 0.2,
    surtax_threshold_2: 7108.0,
    surtax_rate_2: 0.36,
    health_premium_enabled: true,
};

// Default payroll settings
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

// Default YTD (zero balances)
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

// Default tax credits
const defaultTaxCredits = {
    id: 1,
    employee_id: 1,
    tax_year: 2026,
    federal_basic_personal: 16129.0,
    federal_additional_claims: 0,
    federal_total_claim: 16129.0,
    provincial_basic_personal: 12399.0,
    provincial_additional_claims: 0,
    provincial_total_claim: 12399.0,
    claim_tax_exempt: false,
    additional_tax_per_pay: 0,
    effective_date: '2026-01-01',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
};

// Helper to create calculator
function createCalculator(payFrequency: 'weekly' | 'biweekly' | 'semi_monthly' | 'monthly' = 'biweekly') {
    return new PayrollCalculator(
        mockTaxConstants,
        mockFederalBrackets,
        mockOntarioBrackets,
        mockOntarioConstants,
        payFrequency
    );
}

// Helper to create payroll input
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
            // CPP: $1,865.38 * 5.95% = $111.00 (approximately)
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
                    cpp_contributions: 4200, // Close to max of $4,237.95
                },
            });

            const result = calculator.calculate(input);

            // Should only deduct remaining room
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

            // High earner should have CPP2
            // YMPE per period: $74,600 / 26 = $2,869.23
            // YAMPE per period: $85,000 / 26 = $3,269.23
            // If gross > YAMPE per period, CPP2 applies
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

            // $2,000 biweekly
            // EI: $2,000 * 1.63% = $32.60
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

            // Should only deduct remaining room
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
    });

    describe('Income Tax Calculations', () => {
        it('calculates federal tax correctly', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                employee: { id: 1, province: 'ON', hire_date: '2023-01-15', payrate: 60000, payrate_type: 'salary' },
                hours: { regular: 80, overtime: 0, vacation: 0, statutory_holiday: 0, sick: 0 },
            });

            const result = calculator.calculate(input);

            // Should have federal tax
            expect(result.federalTax).toBeGreaterThan(0);
            expect(result.totalIncomeTax).toBeGreaterThan(result.federalTax);
        });

        it('applies tax credits correctly', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                taxCredits: {
                    ...defaultTaxCredits,
                    federal_total_claim: 20000, // Higher claim
                    provincial_total_claim: 15000,
                },
            });

            const result = calculator.calculate(input);

            // Higher credits should reduce tax
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

            // Regular: 80 * $25 = $2,000
            // Overtime: 10 * $25 * 1.5 = $375
            expect(result.overtimePay).toBe(375);
            expect(result.grossPay).toBeGreaterThan(2375);
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

            // Overtime should be at regular rate
            expect(result.overtimePay).toBe(250); // 10 * $25
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
                    taxable: 200, // Company vehicle benefit
                    preTaxDeductions: 0,
                    postTaxDeductions: 0,
                },
            });

            const result = calculator.calculate(input);

            expect(result.taxableBenefits).toBe(200);
            expect(result.grossPay).toBeGreaterThan(2000); // Should include benefit
        });

        it('handles pre-tax deductions (RRSP)', () => {
            const calculator = createCalculator('biweekly');
            const input = createPayrollInput({
                benefits: {
                    taxable: 0,
                    preTaxDeductions: 100, // RRSP contribution
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
                    postTaxDeductions: 50, // Union dues
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

            // Weekly should have different CPP exemption per period
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

            // Should still calculate, but may have minimal deductions
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
});
