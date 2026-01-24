import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Format a date string as a local date (not UTC)
 * Prevents timezone conversion issues where dates shift by one day
 * 
 * @param dateString - Date string in format "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss.sssZ"
 * @param options - Optional Intl.DateTimeFormatOptions for custom formatting
 * @returns Formatted date string in local timezone
 */
export function formatLocalDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
    // Handle both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss.sssZ" formats
    const dateOnly = dateString.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0); // Normalize to local midnight
    
    return date.toLocaleDateString('en-CA', options || {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}
