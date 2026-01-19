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

    const payrollSettings = await api.getPayrollSettings(employee.company_id);
    if (!payrollSettings) {
        throw new Error('Payroll settings not found');
    }

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
