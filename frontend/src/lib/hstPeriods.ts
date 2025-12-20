/**
 * HST Filing Period Utility Functions
 * 
 * Provides utilities for calculating HST/GST filing periods based on filing frequency
 * and fiscal year end date.
 */

import { getFiscalYear, getFiscalYearRange, type FiscalYearRange } from './fiscalYear';

export type HSTFilingFrequency = 'monthly' | 'quarterly' | 'annual';

export interface HSTPeriod {
    period: string; // e.g., "2024-Q1", "2024-03", "2024"
    start: Date;
    end: Date;
    fiscalYear: number;
    periodNumber: number; // 1-12 for monthly, 1-4 for quarterly, 1 for annual
}

/**
 * Get the HST filing period for a given date.
 * 
 * @param date - The date to check
 * @param filingFrequency - The HST filing frequency (monthly, quarterly, annual)
 * @param fiscalYearEnd - The fiscal year end date
 * @returns HST period information
 */
export function getHSTPeriodForDate(
    date: Date | string,
    filingFrequency: HSTFilingFrequency,
    fiscalYearEnd: string
): HSTPeriod {
    const checkDate = typeof date === 'string' ? new Date(date) : date;
    const fiscalYear = getFiscalYear(checkDate, fiscalYearEnd);
    const fiscalYearRange = getFiscalYearRange(fiscalYear, fiscalYearEnd);
    
    const fyEnd = new Date(fiscalYearEnd);
    const fyEndMonth = fyEnd.getMonth();
    const fyEndDay = fyEnd.getDate();
    
    let periodNumber: number;
    let periodStart: Date;
    let periodEnd: Date;
    let periodLabel: string;
    
    if (filingFrequency === 'annual') {
        // Annual filing - entire fiscal year
        periodNumber = 1;
        periodStart = new Date(fiscalYearRange.start);
        periodEnd = new Date(fiscalYearRange.end);
        periodLabel = fiscalYear.toString();
    } else if (filingFrequency === 'quarterly') {
        // Quarterly filing - 4 periods per fiscal year
        const monthsSinceFYStart = getMonthsSinceFiscalYearStart(checkDate, fiscalYearRange.start, fyEndMonth);
        periodNumber = Math.floor(monthsSinceFYStart / 3) + 1;
        
        // Calculate quarter boundaries
        periodStart = new Date(fiscalYearRange.start);
        periodStart.setMonth(periodStart.getMonth() + (periodNumber - 1) * 3);
        
        periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 3);
        periodEnd.setDate(periodEnd.getDate() - 1);
        
        // Ensure period end doesn't exceed fiscal year end
        if (periodEnd > fiscalYearRange.end) {
            periodEnd = new Date(fiscalYearRange.end);
        }
        
        periodLabel = `${fiscalYear}-Q${periodNumber}`;
    } else {
        // Monthly filing - 12 periods per fiscal year
        const monthsSinceFYStart = getMonthsSinceFiscalYearStart(checkDate, fiscalYearRange.start, fyEndMonth);
        periodNumber = monthsSinceFYStart + 1;
        
        // Calculate month boundaries
        periodStart = new Date(fiscalYearRange.start);
        periodStart.setMonth(periodStart.getMonth() + monthsSinceFYStart);
        
        periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        periodEnd.setDate(periodEnd.getDate() - 1);
        
        // Ensure period end doesn't exceed fiscal year end
        if (periodEnd > fiscalYearRange.end) {
            periodEnd = new Date(fiscalYearRange.end);
        }
        
        const monthName = periodStart.toLocaleDateString('en-CA', { month: 'short' });
        periodLabel = `${fiscalYear}-${String(periodNumber).padStart(2, '0')}`;
    }
    
    return {
        period: periodLabel,
        start: periodStart,
        end: periodEnd,
        fiscalYear,
        periodNumber,
    };
}

/**
 * Helper function to calculate months since fiscal year start.
 */
function getMonthsSinceFiscalYearStart(
    date: Date,
    fiscalYearStart: Date,
    fiscalYearEndMonth: number
): number {
    const dateYear = date.getFullYear();
    const dateMonth = date.getMonth();
    const dateDay = date.getDate();
    
    const fyStartYear = fiscalYearStart.getFullYear();
    const fyStartMonth = fiscalYearStart.getMonth();
    const fyStartDay = fiscalYearStart.getDate();
    
    // Calculate months difference
    let monthsDiff = (dateYear - fyStartYear) * 12 + (dateMonth - fyStartMonth);
    
    // Adjust if day is before fiscal year start day
    if (dateDay < fyStartDay) {
        monthsDiff--;
    }
    
    return Math.max(0, monthsDiff);
}

/**
 * Get all HST filing periods within a date range.
 * 
 * @param filingFrequency - The HST filing frequency
 * @param fiscalYearEnd - The fiscal year end date
 * @param startDate - Start of the date range
 * @param endDate - End of the date range
 * @returns Array of HST periods
 */
export function getHSTPeriods(
    filingFrequency: HSTFilingFrequency,
    fiscalYearEnd: string,
    startDate: Date | string,
    endDate: Date | string
): HSTPeriod[] {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    
    const periods: HSTPeriod[] = [];
    const startPeriod = getHSTPeriodForDate(start, filingFrequency, fiscalYearEnd);
    const endPeriod = getHSTPeriodForDate(end, filingFrequency, fiscalYearEnd);
    
    // If same period, return just that
    if (startPeriod.period === endPeriod.period) {
        return [startPeriod];
    }
    
    // Generate all periods between start and end
    let currentDate = new Date(startPeriod.start);
    
    while (currentDate <= end) {
        const period = getHSTPeriodForDate(currentDate, filingFrequency, fiscalYearEnd);
        periods.push(period);
        
        // Move to next period
        currentDate = new Date(period.end);
        currentDate.setDate(currentDate.getDate() + 1);
        
        // Avoid infinite loop
        if (periods.length > 100) break;
    }
    
    return periods;
}

/**
 * Get the date range for a specific HST period.
 * 
 * @param period - The period identifier (e.g., "2024-Q1", "2024-03", "2024")
 * @param filingFrequency - The HST filing frequency
 * @param fiscalYearEnd - The fiscal year end date
 * @returns HST period information
 */
export function getHSTPeriodRange(
    period: string,
    filingFrequency: HSTFilingFrequency,
    fiscalYearEnd: string
): HSTPeriod | null {
    // Parse period string
    let fiscalYear: number;
    let periodNumber: number;
    
    if (filingFrequency === 'annual') {
        fiscalYear = parseInt(period, 10);
        periodNumber = 1;
    } else if (filingFrequency === 'quarterly') {
        const match = period.match(/^(\d+)-Q(\d+)$/);
        if (!match) return null;
        fiscalYear = parseInt(match[1], 10);
        periodNumber = parseInt(match[2], 10);
    } else {
        // Monthly
        const match = period.match(/^(\d+)-(\d+)$/);
        if (!match) return null;
        fiscalYear = parseInt(match[1], 10);
        periodNumber = parseInt(match[2], 10);
    }
    
    // Get fiscal year range
    const fiscalYearRange = getFiscalYearRange(fiscalYear, fiscalYearEnd);
    const fyEnd = new Date(fiscalYearEnd);
    const fyEndMonth = fyEnd.getMonth();
    
    let periodStart: Date;
    let periodEnd: Date;
    
    if (filingFrequency === 'annual') {
        periodStart = new Date(fiscalYearRange.start);
        periodEnd = new Date(fiscalYearRange.end);
    } else if (filingFrequency === 'quarterly') {
        periodStart = new Date(fiscalYearRange.start);
        periodStart.setMonth(periodStart.getMonth() + (periodNumber - 1) * 3);
        
        periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 3);
        periodEnd.setDate(periodEnd.getDate() - 1);
        
        if (periodEnd > fiscalYearRange.end) {
            periodEnd = new Date(fiscalYearRange.end);
        }
    } else {
        // Monthly
        periodStart = new Date(fiscalYearRange.start);
        periodStart.setMonth(periodStart.getMonth() + (periodNumber - 1));
        
        periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        periodEnd.setDate(periodEnd.getDate() - 1);
        
        if (periodEnd > fiscalYearRange.end) {
            periodEnd = new Date(fiscalYearRange.end);
        }
    }
    
    return {
        period,
        start: periodStart,
        end: periodEnd,
        fiscalYear,
        periodNumber,
    };
}

/**
 * Format an HST period for display.
 * 
 * @param period - The HST period
 * @param filingFrequency - The filing frequency
 * @returns Formatted string
 */
export function formatHSTPeriod(period: HSTPeriod, filingFrequency: HSTFilingFrequency): string {
    if (filingFrequency === 'annual') {
        return `FY ${period.fiscalYear}`;
    } else if (filingFrequency === 'quarterly') {
        return `Q${period.periodNumber} ${period.fiscalYear}`;
    } else {
        const monthName = period.start.toLocaleDateString('en-CA', { month: 'long' });
        return `${monthName} ${period.fiscalYear}`;
    }
}

/**
 * Get HST periods for a specific fiscal year.
 * 
 * @param fiscalYear - The fiscal year number
 * @param filingFrequency - The HST filing frequency
 * @param fiscalYearEnd - The fiscal year end date
 * @returns Array of HST periods for the fiscal year
 */
export function getHSTPeriodsForFiscalYear(
    fiscalYear: number,
    filingFrequency: HSTFilingFrequency,
    fiscalYearEnd: string
): HSTPeriod[] {
    const fiscalYearRange = getFiscalYearRange(fiscalYear, fiscalYearEnd);
    return getHSTPeriods(filingFrequency, fiscalYearEnd, fiscalYearRange.start, fiscalYearRange.end);
}

