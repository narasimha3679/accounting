/**
 * Payroll Helper Functions
 * 
 * Utility functions for payroll calculations and data processing.
 */

import type { EmployeeBenefit } from './api';
import api from './api';
import { supabase } from './supabaseClient';

/**
 * Calculate benefit totals from employee benefits
 */
export function calculateBenefitTotals(
    benefits: EmployeeBenefit[],
    grossPay: number
): {
    taxable: number;
    preTaxDeductions: number;
    postTaxDeductions: number;
} {
    let taxable = 0;
    let preTaxDeductions = 0;
    let postTaxDeductions = 0;

    const now = new Date();
    const activeBenefits = benefits.filter((benefit) => {
        if (!benefit.is_active) return false;
        if (benefit.end_date) {
            const endDate = new Date(benefit.end_date);
            return endDate >= now;
        }
        return true;
    });

    for (const benefit of activeBenefits) {
        const benefitType = benefit.benefit_type;
        if (!benefitType) continue;

        let amount = 0;

        // Calculate amount based on type
        if (benefitType.calculation_type === 'fixed') {
            amount = benefit.amount ?? benefitType.default_amount ?? 0;
        } else if (benefitType.calculation_type === 'percentage') {
            const percentage = benefit.percentage ?? benefitType.default_percentage ?? 0;
            amount = grossPay * percentage;
        } else if (benefitType.calculation_type === 'hourly') {
            // For hourly benefits, we'd need hours worked - this is a simplified version
            // In practice, this would be calculated per pay period based on hours
            const rate = benefit.hourly_rate ?? benefitType.default_hourly_rate ?? 0;
            // This is a placeholder - actual implementation would use hours from pay run
            amount = rate * 80; // Default to 80 hours per pay period
        }

        // Categorize by benefit type
        if (benefitType.category === 'taxable_benefit') {
            taxable += amount;
        } else if (benefitType.category === 'pre_tax_deduction') {
            preTaxDeductions += amount;
        } else if (benefitType.category === 'post_tax_deduction') {
            postTaxDeductions += amount;
        }
    }

    return {
        taxable: Math.round(taxable * 100) / 100,
        preTaxDeductions: Math.round(preTaxDeductions * 100) / 100,
        postTaxDeductions: Math.round(postTaxDeductions * 100) / 100,
    };
}

/**
 * Pull hours from time entries for a period
 */
export async function pullHoursFromTimeEntries(
    employeeId: number,
    periodStart: string,
    periodEnd: string
): Promise<{ regularHours: number; overtimeHours: number }> {
    // Get payroll settings to determine overtime threshold
    const employee = await api.getEmployee(employeeId);
    if (!employee || !employee.company_id) {
        throw new Error('Employee not found');
    }

    const { settings: payrollSettings } = await api.ensurePayrollSettings(employee.company_id);

    // Get approved time entries for the period
    const { data: entries, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('entry_date', periodStart)
        .lte('entry_date', periodEnd)
        .eq('status', 'approved');

    if (error) {
        throw new Error(`Failed to fetch time entries: ${error.message}`);
    }

    if (!entries || entries.length === 0) {
        return { regularHours: 0, overtimeHours: 0 };
    }

    // Group entries by week for overtime calculation
    const weeklyHours: Map<string, number> = new Map();

    for (const entry of entries) {
        const entryDate = new Date(entry.entry_date);
        const weekStart = getWeekStart(entryDate);
        const weekKey = weekStart.toISOString().split('T')[0];

        const hours = entry.hours || 0;
        weeklyHours.set(weekKey, (weeklyHours.get(weekKey) || 0) + hours);
    }

    let regularHours = 0;
    let overtimeHours = 0;

    for (const [, weekTotalHours] of weeklyHours) {
        if (
            payrollSettings.overtime_enabled &&
            weekTotalHours > payrollSettings.overtime_threshold_weekly
        ) {
            regularHours += payrollSettings.overtime_threshold_weekly;
            overtimeHours += weekTotalHours - payrollSettings.overtime_threshold_weekly;
        } else {
            regularHours += weekTotalHours;
        }
    }

    return {
        regularHours: Math.round(regularHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
    };
}

/**
 * Get week start date (Monday)
 */
function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
}

/**
 * Validate pay run for common issues
 */
export function validatePayRun(payRun: {
    items: Array<{
        employee?: { sin?: string | null; payrate?: number | null };
        regular_hours: number;
        overtime_hours: number;
        gross_pay: number;
    }>;
}): {
    warnings: string[];
    errors: string[];
} {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (payRun.items.length === 0) {
        warnings.push('No employees added to pay run');
    }

    for (const item of payRun.items) {
        if (!item.employee) {
            errors.push('Employee data missing for one or more items');
            continue;
        }

        if (!item.employee.sin) {
            warnings.push(`${item.employee.sin || 'Employee'} is missing SIN`);
        }

        if (!item.employee.payrate || item.employee.payrate === 0) {
            warnings.push(`${item.employee.sin || 'Employee'} has no pay rate set`);
        }

        if (item.regular_hours === 0 && item.overtime_hours === 0 && item.gross_pay === 0) {
            warnings.push(`${item.employee.sin || 'Employee'} has no hours entered`);
        }
    }

    return { warnings, errors };
}

/**
 * Calculate pay run totals from items
 */
export function calculatePayRunTotals(items: Array<{
    gross_pay: number;
    cpp_employee: number;
    cpp2_employee: number;
    ei_employee: number;
    federal_tax: number;
    provincial_tax: number;
    pre_tax_deductions: number;
    post_tax_deductions: number;
    net_pay: number;
    cpp_employer: number;
    ei_employer: number;
}>): {
    total_gross: number;
    total_cpp: number;
    total_cpp2: number;
    total_ei: number;
    total_federal_tax: number;
    total_provincial_tax: number;
    total_other_deductions: number;
    total_net: number;
    total_employer_cpp: number;
    total_employer_ei: number;
    total_employer_cost: number;
} {
    const totals = items.reduce<{
        total_gross: number;
        total_cpp: number;
        total_cpp2: number;
        total_ei: number;
        total_federal_tax: number;
        total_provincial_tax: number;
        total_other_deductions: number;
        total_net: number;
        total_employer_cpp: number;
        total_employer_ei: number;
        total_employer_cost: number;
    }>(
        (acc, item) => ({
            total_gross: acc.total_gross + item.gross_pay,
            total_cpp: acc.total_cpp + item.cpp_employee,
            total_cpp2: acc.total_cpp2 + item.cpp2_employee,
            total_ei: acc.total_ei + item.ei_employee,
            total_federal_tax: acc.total_federal_tax + item.federal_tax,
            total_provincial_tax: acc.total_provincial_tax + item.provincial_tax,
            total_other_deductions: acc.total_other_deductions + item.pre_tax_deductions + item.post_tax_deductions,
            total_net: acc.total_net + item.net_pay,
            total_employer_cpp: acc.total_employer_cpp + item.cpp_employer,
            total_employer_ei: acc.total_employer_ei + item.ei_employer,
            total_employer_cost: acc.total_employer_cost + item.gross_pay + item.cpp_employer + item.ei_employer,
        }),
        {
            total_gross: 0,
            total_cpp: 0,
            total_cpp2: 0,
            total_ei: 0,
            total_federal_tax: 0,
            total_provincial_tax: 0,
            total_other_deductions: 0,
            total_net: 0,
            total_employer_cpp: 0,
            total_employer_ei: 0,
            total_employer_cost: 0,
        }
    );

    // Round all values
    return {
        total_gross: Math.round(totals.total_gross * 100) / 100,
        total_cpp: Math.round(totals.total_cpp * 100) / 100,
        total_cpp2: Math.round(totals.total_cpp2 * 100) / 100,
        total_ei: Math.round(totals.total_ei * 100) / 100,
        total_federal_tax: Math.round(totals.total_federal_tax * 100) / 100,
        total_provincial_tax: Math.round(totals.total_provincial_tax * 100) / 100,
        total_other_deductions: Math.round(totals.total_other_deductions * 100) / 100,
        total_net: Math.round(totals.total_net * 100) / 100,
        total_employer_cpp: Math.round(totals.total_employer_cpp * 100) / 100,
        total_employer_ei: Math.round(totals.total_employer_ei * 100) / 100,
        total_employer_cost: Math.round(totals.total_employer_cost * 100) / 100,
    };
}

/**
 * Build balanced payroll journal lines from pay-run totals.
 * Debits wage expense once for gross (OT/vacation already included).
 */
export function buildPayrollJournalEntries(input: {
    total_gross: number;
    total_employer_cpp: number;
    total_employer_ei: number;
    total_cpp: number;
    total_cpp2: number;
    total_ei: number;
    total_federal_tax: number;
    total_provincial_tax: number;
    total_other_deductions: number;
    total_net: number;
}): { entries: Array<{ account: string; debit: number; credit: number }>; total_debit: number; total_credit: number } {
    const entries: Array<{ account: string; debit: number; credit: number }> = [
        { account: 'Wages Expense', debit: input.total_gross, credit: 0 },
        {
            account: 'CPP Expense (Employer)',
            debit: input.total_employer_cpp + input.total_cpp2,
            credit: 0,
        },
        { account: 'EI Expense (Employer)', debit: input.total_employer_ei, credit: 0 },
        {
            account: 'CPP Payable',
            debit: 0,
            credit: input.total_cpp + input.total_employer_cpp + input.total_cpp2 * 2,
        },
        {
            account: 'EI Payable',
            debit: 0,
            credit: input.total_ei + input.total_employer_ei,
        },
        { account: 'Federal Tax Payable', debit: 0, credit: input.total_federal_tax },
        { account: 'Provincial Tax Payable', debit: 0, credit: input.total_provincial_tax },
    ];

    if (input.total_other_deductions > 0) {
        entries.push({
            account: 'Other Deductions Payable',
            debit: 0,
            credit: input.total_other_deductions,
        });
    }

    entries.push({
        account: 'Wages Payable / Cash',
        debit: 0,
        credit: input.total_net,
    });

    const total_debit =
        Math.round(entries.reduce((sum, entry) => sum + entry.debit, 0) * 100) / 100;
    const total_credit =
        Math.round(entries.reduce((sum, entry) => sum + entry.credit, 0) * 100) / 100;

    return { entries, total_debit, total_credit };
}

/** Format a Date as YYYY-MM-DD in local time. */
export function toLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/** Add days to a YYYY-MM-DD string (noon local to avoid DST edge cases). */
export function addDaysToDateString(dateStr: string, days: number): string {
    const d = new Date(`${dateStr}T12:00:00`);
    d.setDate(d.getDate() + days);
    return toLocalDateString(d);
}

/**
 * Prefill pay period dates from payroll frequency.
 * Rule: end = start + (period length − 1), pay_date = end.
 * Default start is the beginning of the most recent completed-length period ending today.
 */
export function getDefaultPayPeriodDates(
    payFrequency: 'weekly' | 'biweekly' | 'semi_monthly' | 'monthly' = 'biweekly',
    referenceDate: Date = new Date()
): { pay_period_start: string; pay_period_end: string; pay_date: string } {
    const end = new Date(referenceDate);
    end.setHours(12, 0, 0, 0);

    let start = new Date(end);
    switch (payFrequency) {
        case 'weekly':
            start.setDate(end.getDate() - 6);
            break;
        case 'biweekly':
            start.setDate(end.getDate() - 13);
            break;
        case 'semi_monthly':
            start.setDate(end.getDate() - 14);
            break;
        case 'monthly':
            start = new Date(end.getFullYear(), end.getMonth(), 1);
            break;
        default: {
            const _exhaustive: never = payFrequency;
            void _exhaustive;
            start.setDate(end.getDate() - 13);
            break;
        }
    }

    const pay_period_start = toLocalDateString(start);
    const pay_period_end = toLocalDateString(end);
    return {
        pay_period_start,
        pay_period_end,
        pay_date: pay_period_end,
    };
}

/**
 * Derive end and pay date when the start date changes (same frequency rules).
 */
export function derivePayPeriodFromStart(
    startDate: string,
    payFrequency: 'weekly' | 'biweekly' | 'semi_monthly' | 'monthly' = 'biweekly'
): { pay_period_end: string; pay_date: string } {
    let daysToAdd: number;
    switch (payFrequency) {
        case 'weekly':
            daysToAdd = 6;
            break;
        case 'biweekly':
            daysToAdd = 13;
            break;
        case 'semi_monthly':
            daysToAdd = 14;
            break;
        case 'monthly': {
            const start = new Date(`${startDate}T12:00:00`);
            const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
            const pay_period_end = toLocalDateString(end);
            return { pay_period_end, pay_date: pay_period_end };
        }
        default: {
            const _exhaustive: never = payFrequency;
            void _exhaustive;
            daysToAdd = 13;
            break;
        }
    }
    const pay_period_end = addDaysToDateString(startDate, daysToAdd);
    return { pay_period_end, pay_date: pay_period_end };
}
