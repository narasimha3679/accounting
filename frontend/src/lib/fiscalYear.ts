/**
 * Fiscal Year Utility Functions
 * 
 * Provides utilities for calculating fiscal year periods based on a company's fiscal year end date.
 * Fiscal years can end on any date (e.g., March 31, June 30, September 30, December 31).
 */

export interface FiscalYearRange {
    start: Date;
    end: Date;
    fiscalYear: number;
}

/**
 * Get the fiscal year number for a given date based on fiscal year end date.
 * 
 * The fiscal year number is typically the year in which the fiscal year ends.
 * For example, if fiscal year ends March 31:
 * - April 1, 2023 - March 31, 2024 = FY 2024
 * - April 1, 2024 - March 31, 2025 = FY 2025
 * 
 * @param date - The date to check
 * @param fiscalYearEnd - The fiscal year end date (e.g., "2024-03-31")
 * @returns The fiscal year number
 */
export function getFiscalYear(date: Date | string, fiscalYearEnd: string): number {
    const checkDate = typeof date === 'string' ? new Date(date) : date;
    const fyEnd = new Date(fiscalYearEnd);
    
    // Extract month and day from fiscal year end
    const fyEndMonth = fyEnd.getMonth();
    const fyEndDay = fyEnd.getDate();
    
    const checkYear = checkDate.getFullYear();
    const checkMonth = checkDate.getMonth();
    const checkDay = checkDate.getDate();
    
    // Determine which fiscal year this date belongs to
    // If the date is on or before the fiscal year end date in the same calendar year,
    // it belongs to the fiscal year that ends in that calendar year.
    // Otherwise, it belongs to the next fiscal year.
    
    if (checkMonth < fyEndMonth || (checkMonth === fyEndMonth && checkDay <= fyEndDay)) {
        // Date is in the fiscal year that ends in the current calendar year
        return checkYear;
    } else {
        // Date is in the fiscal year that ends in the next calendar year
        return checkYear + 1;
    }
}

/**
 * Get the fiscal year number from a date string.
 * Alias for getFiscalYear for clarity.
 */
export function getFiscalYearFromDate(date: Date | string, fiscalYearEnd: string): number {
    return getFiscalYear(date, fiscalYearEnd);
}

/**
 * Get the start and end dates for a specific fiscal year.
 * 
 * @param fiscalYear - The fiscal year number (e.g., 2024)
 * @param fiscalYearEnd - The fiscal year end date (e.g., "2024-03-31")
 * @returns Object with start date, end date, and fiscal year number
 */
export function getFiscalYearRange(fiscalYear: number, fiscalYearEnd: string): FiscalYearRange {
    const fyEnd = new Date(fiscalYearEnd);
    const fyEndMonth = fyEnd.getMonth();
    const fyEndDay = fyEnd.getDate();
    
    // Fiscal year end is in the same calendar year as the fiscal year number
    // Fiscal year start is the day after the previous fiscal year end
    const endDate = new Date(fiscalYear, fyEndMonth, fyEndDay);
    const startDate = new Date(endDate);
    startDate.setFullYear(fiscalYear - 1);
    startDate.setDate(startDate.getDate() + 1);
    
    return {
        start: startDate,
        end: endDate,
        fiscalYear,
    };
}

/**
 * Check if a date falls within a specific fiscal year.
 * 
 * @param date - The date to check
 * @param fiscalYear - The fiscal year number to check against
 * @param fiscalYearEnd - The fiscal year end date
 * @returns True if the date is in the specified fiscal year
 */
export function isDateInFiscalYear(
    date: Date | string,
    fiscalYear: number,
    fiscalYearEnd: string
): boolean {
    const dateFiscalYear = getFiscalYear(date, fiscalYearEnd);
    return dateFiscalYear === fiscalYear;
}

/**
 * Get all fiscal periods (years) that fall within a date range.
 * 
 * @param fiscalYearEnd - The fiscal year end date
 * @param startDate - Start of the date range
 * @param endDate - End of the date range
 * @returns Array of fiscal year ranges
 */
export function getFiscalPeriods(
    fiscalYearEnd: string,
    startDate: Date | string,
    endDate: Date | string
): FiscalYearRange[] {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    
    const startFY = getFiscalYear(start, fiscalYearEnd);
    const endFY = getFiscalYear(end, fiscalYearEnd);
    
    const periods: FiscalYearRange[] = [];
    
    for (let fy = startFY; fy <= endFY; fy++) {
        periods.push(getFiscalYearRange(fy, fiscalYearEnd));
    }
    
    return periods;
}

/**
 * Get the current fiscal year based on today's date.
 * 
 * @param fiscalYearEnd - The fiscal year end date
 * @returns The current fiscal year number
 */
export function getCurrentFiscalYear(fiscalYearEnd: string): number {
    return getFiscalYear(new Date(), fiscalYearEnd);
}

/**
 * Get a list of fiscal years for selection (e.g., in dropdowns).
 * Returns fiscal years from N years ago to N years in the future.
 * 
 * @param fiscalYearEnd - The fiscal year end date
 * @param yearsBack - Number of years to go back (default: 5)
 * @param yearsForward - Number of years to go forward (default: 1)
 * @returns Array of fiscal year numbers
 */
export function getFiscalYearOptions(
    fiscalYearEnd: string,
    yearsBack: number = 5,
    yearsForward: number = 1
): number[] {
    const currentFY = getCurrentFiscalYear(fiscalYearEnd);
    const years: number[] = [];
    
    for (let i = yearsBack; i >= 0; i--) {
        years.push(currentFY - i);
    }
    
    for (let i = 1; i <= yearsForward; i++) {
        years.push(currentFY + i);
    }
    
    return years;
}

/**
 * Format a fiscal year for display (e.g., "FY 2024").
 * 
 * @param fiscalYear - The fiscal year number
 * @returns Formatted string
 */
export function formatFiscalYear(fiscalYear: number): string {
    return `FY ${fiscalYear}`;
}

/**
 * Get a human-readable description of a fiscal year period.
 * 
 * @param fiscalYear - The fiscal year number
 * @param fiscalYearEnd - The fiscal year end date
 * @returns Formatted string like "April 1, 2023 - March 31, 2024"
 */
export function formatFiscalYearPeriod(fiscalYear: number, fiscalYearEnd: string): string {
    const range = getFiscalYearRange(fiscalYear, fiscalYearEnd);
    const startStr = range.start.toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const endStr = range.end.toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    return `${startStr} - ${endStr}`;
}

