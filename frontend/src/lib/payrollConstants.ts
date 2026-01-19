/**
 * Payroll Constants and Helper Functions
 * 
 * Static constants and utility functions for payroll calculations.
 */

/**
 * Pay period multipliers (number of pay periods per year)
 */
export const PAY_PERIODS = {
    weekly: 52,
    biweekly: 26,
    semi_monthly: 24,
    monthly: 12,
} as const;

/**
 * Default tax year (can be updated annually)
 */
export const DEFAULT_TAX_YEAR = 2026;

/**
 * Get the number of pay periods per year for a given pay frequency
 */
export function getPayPeriodsPerYear(
    payFrequency: 'weekly' | 'biweekly' | 'semi_monthly' | 'monthly'
): number {
    return PAY_PERIODS[payFrequency];
}

/**
 * Calculate hours per year based on work schedule
 */
export function calculateHoursPerYear(
    hoursPerDay: number,
    daysPerWeek: number
): number {
    return hoursPerDay * daysPerWeek * 52;
}

/**
 * Convert annual salary to hourly rate
 */
export function annualToHourly(
    annualSalary: number,
    hoursPerDay: number,
    daysPerWeek: number
): number {
    const hoursPerYear = calculateHoursPerYear(hoursPerDay, daysPerWeek);
    return annualSalary / hoursPerYear;
}

/**
 * Convert biweekly salary to hourly rate
 */
export function biweeklyToHourly(
    biweeklySalary: number,
    hoursPerDay: number,
    daysPerWeek: number
): number {
    const hoursPerPeriod = hoursPerDay * daysPerWeek * 2;
    return biweeklySalary / hoursPerPeriod;
}

/**
 * Convert monthly salary to hourly rate
 */
export function monthlyToHourly(
    monthlySalary: number,
    hoursPerDay: number,
    daysPerWeek: number
): number {
    const hoursPerMonth = (hoursPerDay * daysPerWeek * 52) / 12;
    return monthlySalary / hoursPerMonth;
}

/**
 * Round to 2 decimal places (standard for currency)
 */
export function round(value: number): number {
    return Math.round(value * 100) / 100;
}
