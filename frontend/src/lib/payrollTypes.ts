/**
 * Payroll Calculation Types
 * 
 * Type definitions for the payroll calculation engine.
 * These types define the input/output structures for payroll calculations.
 */

import type { PayrollSettings, EmployeeTaxCredits } from './api';

/**
 * Input structure for payroll calculations
 */
export interface PayrollInput {
    employee: {
        id: number;
        province: string;
        hire_date: string;
        payrate: number;
        payrate_type: 'hourly' | 'salary' | 'monthly' | 'biweekly';
        /** When true, EI employee and employer premiums are zero */
        ei_exempt?: boolean;
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

/**
 * Complete payroll calculation output
 */
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
        employerContribution: number;
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
    
    // Income tax (provincialTax includes Ontario Health Premium when enabled)
    federalTax: number;
    provincialTax: number;
    ontarioHealthPremium: number;
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
        annualTaxableIncome: number;
        annualFederalTax: number;
        annualProvincialTax: number;
        federalCreditsUsed: number;
        provincialCreditsUsed: number;
        ontarioSurtax?: number;
        ontarioTaxReduction?: number;
        ontarioHealthPremium?: number;
    };
}

/**
 * Year-to-date tracking structure
 */
export interface EmployeeYTD {
    gross_earnings: number;
    pensionable_earnings: number;
    insurable_earnings: number;
    taxable_earnings: number;
    cpp_contributions: number;
    cpp2_contributions: number;
    ei_premiums: number;
    federal_tax_withheld: number;
    provincial_tax_withheld: number;
    taxable_benefits: number;
    rrsp_contributions: number;
    union_dues: number;
    charitable_donations: number;
    vacation_earned: number;
    vacation_used: number;
    vacation_balance: number;
    employer_cpp: number;
    employer_ei: number;
    cpp_maxed_out: boolean;
    cpp2_maxed_out: boolean;
    ei_maxed_out: boolean;
}

/**
 * Tax constants from database
 */
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
    federal_employment_amount: number;
    rrsp_max_contribution_room?: number;
}

/**
 * Dividend gross-up and tax credit constants
 */
export interface DividendTaxConstants {
    tax_year: number;
    province: string;
    dividend_type: 'eligible' | 'non_eligible';
    gross_up_rate: number;
    federal_tax_credit_rate: number;
    provincial_tax_credit_rate: number;
}

/**
 * Ontario Health Premium tier
 */
export interface OntarioHealthPremiumTier {
    tax_year: number;
    min_income: number;
    max_income: number | null;
    base_premium: number;
    rate_on_excess: number;
}

/**
 * Tax bracket structure
 */
export interface TaxBracket {
    min_income: number;
    max_income: number | null;
    rate: number;
}

/**
 * Provincial tax constants
 */
export interface ProvincialTaxConstants {
    basic_personal_amount: number;
    surtax_threshold_1?: number | null;
    surtax_rate_1?: number | null;
    surtax_threshold_2?: number | null;
    surtax_rate_2?: number | null;
    /** Ontario tax reduction base amount (default $300 for 2026) */
    tax_reduction_base?: number | null;
    health_premium_enabled: boolean;
}

/**
 * Simplified tax credits for calculations
 */
export interface SimplifiedTaxCredits {
    federal_total_claim: number;
    provincial_total_claim: number;
    claim_tax_exempt: boolean;
    additional_tax_per_pay: number;
}
