import { describe, expect, it } from 'vitest';
import { buildPayrollJournalEntries } from '../payrollHelpers';

describe('buildPayrollJournalEntries', () => {
    it('balances when net equals gross minus employee withholdings', () => {
        const total_gross = 2000;
        const total_cpp = 100;
        const total_cpp2 = 20;
        const total_ei = 30;
        const total_federal_tax = 200;
        const total_provincial_tax = 80;
        const total_other_deductions = 50;
        const total_employer_cpp = 100;
        const total_employer_ei = 42;
        const total_net =
            total_gross -
            total_cpp -
            total_cpp2 -
            total_ei -
            total_federal_tax -
            total_provincial_tax -
            total_other_deductions;

        const { total_debit, total_credit, entries } = buildPayrollJournalEntries({
            total_gross,
            total_employer_cpp,
            total_employer_ei,
            total_cpp,
            total_cpp2,
            total_ei,
            total_federal_tax,
            total_provincial_tax,
            total_other_deductions,
            total_net,
        });

        expect(Math.abs(total_debit - total_credit)).toBeLessThanOrEqual(0.01);
        expect(entries.some((e) => e.account === 'Overtime Expense')).toBe(false);
        expect(entries.filter((e) => e.account === 'Wages Expense')).toHaveLength(1);
    });
});
