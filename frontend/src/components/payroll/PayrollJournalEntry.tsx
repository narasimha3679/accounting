import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Download } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface PayrollJournalEntryProps {
    payRunId: number;
}

const PayrollJournalEntry: React.FC<PayrollJournalEntryProps> = ({ payRunId }) => {
    const { data: journalEntry, isLoading, error } = useQuery({
        queryKey: ['payrollJournalEntry', payRunId],
        queryFn: () => api.getPayrollJournalEntry(payRunId),
        enabled: !!payRunId,
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const handleExportCSV = () => {
        if (!journalEntry) return;

        const csvRows = [
            ['Payroll Journal Entry'],
            [`Pay Period: ${new Date(journalEntry.pay_period_start).toLocaleDateString()} - ${new Date(journalEntry.pay_period_end).toLocaleDateString()}`],
            [`Pay Date: ${new Date(journalEntry.pay_date).toLocaleDateString()}`],
            [''],
            ['Account', 'Debit', 'Credit'],
            ...journalEntry.entries.map((entry) => [
                entry.account,
                entry.debit > 0 ? formatCurrency(entry.debit) : '',
                entry.credit > 0 ? formatCurrency(entry.credit) : '',
            ]),
            ['TOTALS', formatCurrency(journalEntry.total_debit), formatCurrency(journalEntry.total_credit)],
        ];

        const csvContent = csvRows.map((row) => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payroll-journal-${journalEntry.pay_run_id}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-400">Error loading journal entry: {error instanceof Error ? error.message : 'Unknown error'}</p>
            </div>
        );
    }

    if (!journalEntry) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">No journal entry data available</p>
            </div>
        );
    }

    const isBalanced = Math.abs(journalEntry.total_debit - journalEntry.total_credit) < 0.01;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Payroll Journal Entry</h2>
                    <p className="text-muted-foreground mt-1">
                        Pay Period: {new Date(journalEntry.pay_period_start).toLocaleDateString()} - {new Date(journalEntry.pay_period_end).toLocaleDateString()}
                        {' | '}
                        Pay Date: {new Date(journalEntry.pay_date).toLocaleDateString()}
                    </p>
                </div>
                <Button variant="outline" size="sm" icon={Download} onClick={handleExportCSV}>
                    Export CSV
                </Button>
            </div>

            <Card className="p-0 overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="text-left p-4 text-sm font-semibold text-white">Account</th>
                            <th className="text-right p-4 text-sm font-semibold text-white">Debit</th>
                            <th className="text-right p-4 text-sm font-semibold text-white">Credit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {journalEntry.entries.map((entry, idx) => (
                            <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                <td className="p-4 text-white">{entry.account}</td>
                                <td className="p-4 text-right text-white">
                                    {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                                </td>
                                <td className="p-4 text-right text-white">
                                    {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                                </td>
                            </tr>
                        ))}
                        <tr className="border-t-2 border-white/20 font-semibold">
                            <td className="p-4 text-white">TOTALS</td>
                            <td className="p-4 text-right text-white">{formatCurrency(journalEntry.total_debit)}</td>
                            <td className="p-4 text-right text-white">{formatCurrency(journalEntry.total_credit)}</td>
                        </tr>
                    </tbody>
                </table>
            </Card>

            {/* Balance Check */}
            <Card className={`p-4 ${isBalanced ? 'bg-green-900/20 border-green-800' : 'bg-red-900/20 border-red-800'}`}>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                        {isBalanced ? '✓ Journal Entry is Balanced' : '✗ Journal Entry is NOT Balanced'}
                    </span>
                    <span className="text-sm">
                        Difference: {formatCurrency(Math.abs(journalEntry.total_debit - journalEntry.total_credit))}
                    </span>
                </div>
            </Card>
        </div>
    );
};

export default PayrollJournalEntry;
