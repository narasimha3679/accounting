import React from 'react';
import type { PayRun } from '../../lib/api';
import { formatLocalDate } from '../../lib/utils';
import PayRunStatusBadge from './PayRunStatusBadge';
import Button from '../ui/Button';
import { Trash2 } from 'lucide-react';

interface PayRunTableProps {
    payRuns: PayRun[];
    onOpen: (id: number) => void;
    onDelete: (id: number) => void;
}

const PayRunTable: React.FC<PayRunTableProps> = ({ payRuns, onOpen, onDelete }) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const formatDate = (date: string) => formatLocalDate(date);

    if (payRuns.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">No pay runs found</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Pay Period</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Pay Date</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Status</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-foreground">Gross Pay</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-foreground">Net Pay</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-foreground">
                            <span className="sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {payRuns.map((payRun) => (
                        <tr
                            key={payRun.id}
                            role="link"
                            tabIndex={0}
                            onClick={() => onOpen(payRun.id)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onOpen(payRun.id);
                                }
                            }}
                            className="border-b border-border hover:bg-muted/30 cursor-pointer"
                        >
                            <td className="py-3 px-4 text-sm text-foreground">
                                {formatDate(payRun.pay_period_start)} - {formatDate(payRun.pay_period_end)}
                            </td>
                            <td className="py-3 px-4 text-sm text-foreground">{formatDate(payRun.pay_date)}</td>
                            <td className="py-3 px-4">
                                <PayRunStatusBadge status={payRun.status} />
                            </td>
                            <td className="py-3 px-4 text-sm text-foreground text-right">
                                {formatCurrency(payRun.total_gross)}
                            </td>
                            <td className="py-3 px-4 text-sm text-foreground text-right">
                                {formatCurrency(payRun.total_net)}
                            </td>
                            <td className="py-3 px-4">
                                {payRun.status === 'draft' && (
                                    <div className="flex justify-end">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(payRun.id);
                                            }}
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default PayRunTable;
