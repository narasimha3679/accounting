import React from 'react';
import { type DividendRecipient } from '../../lib/api';
import Button from '../ui/Button';
import { Edit, Trash2, AlertCircle } from 'lucide-react';

interface DividendRecipientListProps {
    recipients: DividendRecipient[];
    dividendAmount: number;
    onEdit: (recipient: DividendRecipient) => void;
    onDelete: (id: number) => void;
}

const DividendRecipientList: React.FC<DividendRecipientListProps> = ({
    recipients,
    dividendAmount,
    onEdit,
    onDelete,
}) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const formatSIN = (sin: string | null | undefined): string => {
        if (!sin) return '-';
        const cleaned = sin.replace(/\D/g, '');
        if (cleaned.length !== 9) return sin;
        return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)}`;
    };

    const totalAllocated = recipients.reduce((sum, r) => sum + r.amount, 0);
    const remaining = dividendAmount - totalAllocated;
    const isComplete = Math.abs(remaining) < 0.01;
    const hasMissingSIN = recipients.some(
        r => r.recipient_type === 'individual' && !r.recipient_sin
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">Recipients</h4>
                <div className="text-xs text-slate-muted">
                    Total: {formatCurrency(totalAllocated)} / {formatCurrency(dividendAmount)}
                </div>
            </div>

            {hasMissingSIN && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-900/20 border border-yellow-800/50">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <p className="text-sm text-yellow-300">
                        Some recipients are missing SIN numbers. T5 slips require SIN for individuals.
                    </p>
                </div>
            )}

            {!isComplete && (
                <div className={`flex items-center gap-2 p-3 rounded-md ${
                    remaining > 0 
                        ? 'bg-blue-900/20 border border-blue-800/50' 
                        : 'bg-red-900/20 border border-red-800/50'
                }`}>
                    <AlertCircle className={`h-4 w-4 ${
                        remaining > 0 ? 'text-blue-500' : 'text-red-500'
                    }`} />
                    <p className={`text-sm ${
                        remaining > 0 ? 'text-blue-300' : 'text-red-300'
                    }`}>
                        {remaining > 0 
                            ? `Remaining amount to allocate: ${formatCurrency(remaining)}`
                            : `Over-allocated by: ${formatCurrency(Math.abs(remaining))}`
                        }
                    </p>
                </div>
            )}

            {recipients.length === 0 ? (
                <div className="text-center py-8 text-slate-muted">
                    <p className="text-sm">No recipients added yet</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-4 py-3 text-left">Name</th>
                                <th className="px-4 py-3 text-left">Type</th>
                                <th className="px-4 py-3 text-left">SIN/BN</th>
                                <th className="px-4 py-3 text-right">Amount</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {recipients.map((recipient) => (
                                <tr key={recipient.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-4 py-3 text-white">
                                        {recipient.recipient_name}
                                    </td>
                                    <td className="px-4 py-3 text-slate-muted capitalize">
                                        {recipient.recipient_type}
                                    </td>
                                    <td className="px-4 py-3 text-slate-muted">
                                        {recipient.recipient_type === 'individual' 
                                            ? (recipient.recipient_sin ? formatSIN(recipient.recipient_sin) : (
                                                <span className="text-yellow-500 text-xs">Missing SIN</span>
                                            ))
                                            : (recipient.business_number || '-')
                                        }
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-white">
                                        {formatCurrency(recipient.amount)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onEdit(recipient)}
                                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                                title="Edit"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    if (window.confirm('Are you sure you want to delete this recipient?')) {
                                                        onDelete(recipient.id);
                                                    }
                                                }}
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default DividendRecipientList;
