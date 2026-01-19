/**
 * ROE Helper Functions
 * 
 * Helper functions for ROE data collection and processing.
 */

import api, { type ROERecord } from './api';

/**
 * Collect ROE data for an employee from pay run history
 * This is a convenience wrapper around the API method
 */
export async function collectROEDataForEmployee(
    employeeId: number
): Promise<Partial<ROERecord>> {
    return api.collectROEDataForEmployee(employeeId);
}

/**
 * ROE Reason Code definitions
 */
export const ROE_REASON_CODES = [
    { code: 'A', label: 'Shortage of work', description: 'Layoff, contract end' },
    { code: 'B', label: 'Strike or lockout', description: 'Labor dispute' },
    { code: 'D', label: 'Illness or injury', description: 'Short-term disability' },
    { code: 'E', label: 'Quit', description: 'Voluntary resignation' },
    { code: 'F', label: 'Maternity', description: 'Maternity leave' },
    { code: 'G', label: 'Retirement', description: 'Voluntary retirement' },
    { code: 'K', label: 'Other', description: 'Not covered by other codes' },
    { code: 'M', label: 'Dismissal', description: 'Terminated for cause' },
    { code: 'N', label: 'Leave of absence', description: 'Unpaid leave' },
    { code: 'P', label: 'Parental', description: 'Parental leave' },
    { code: 'Z', label: 'Compassionate care', description: 'Caregiver leave' },
] as const;

/**
 * Get reason code label
 */
export function getReasonCodeLabel(code: string): string {
    const reason = ROE_REASON_CODES.find((r) => r.code === code);
    return reason ? `${reason.code} - ${reason.label}` : code;
}
