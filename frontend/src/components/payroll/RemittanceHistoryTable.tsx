import React from 'react';
import { type RemittancePeriod } from '../../lib/api';
import { Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';

interface RemittanceHistoryTableProps {
    periods: RemittancePeriod[];
    onRecordPayment: (periodId: number) => void;
}

const RemittanceHistoryTable: React.FC<RemittanceHistoryTableProps> = ({ periods, onRecordPayment }) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-CA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getStatusBadge = (status: RemittancePeriod['status']) => {
        switch (status) {
            case 'paid':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-300">
                        <CheckCircle className="h-3 w-3" />
                        Paid
                    </span>
                );
            case 'overdue':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-900/30 text-red-300">
                        <AlertCircle className="h-3 w-3" />
                        Overdue
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-300">
                        <Calendar className="h-3 w-3" />
                        Pending
                    </span>
                );
        }
    };

    if (periods.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">No remittance periods found</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-white/10">
                        <th className="text-left p-4 text-sm font-semibold text-white">Period</th>
                        <th className="text-left p-4 text-sm font-semibold text-white">Due Date</th>
                        <th className="text-right p-4 text-sm font-semibold text-white">Amount</th>
                        <th className="text-left p-4 text-sm font-semibold text-white">Paid Date</th>
                        <th className="text-center p-4 text-sm font-semibold text-white">Status</th>
                        <th className="text-right p-4 text-sm font-semibold text-white">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {periods.map((period) => (
                        <tr key={period.id} className="border-b border-white/5 hover:bg-white/5">
                            <td className="p-4 text-white">
                                {formatDate(period.period_start)} - {formatDate(period.period_end)}
                            </td>
                            <td className="p-4 text-white">{formatDate(period.due_date)}</td>
                            <td className="p-4 text-right text-white font-medium">{formatCurrency(period.total_owing)}</td>
                            <td className="p-4 text-white">
                                {period.paid_date ? formatDate(period.paid_date) : '-'}
                            </td>
                            <td className="p-4 text-center">{getStatusBadge(period.status)}</td>
                            <td className="p-4 text-right">
                                {period.status !== 'paid' && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onRecordPayment(period.id)}
                                    >
                                        Record Payment
                                    </Button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default RemittanceHistoryTable;
