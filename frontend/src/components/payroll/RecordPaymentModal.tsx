import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface RecordPaymentModalProps {
    periodId: number;
    onClose: () => void;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({ periodId, onClose }) => {
    const queryClient = useQueryClient();
    const [paidAmount, setPaidAmount] = useState<string>('');
    const [paidDate, setPaidDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [confirmationNumber, setConfirmationNumber] = useState<string>('');
    const [notes, setNotes] = useState<string>('');

    const { data: period, isLoading } = useQuery({
        queryKey: ['remittancePeriod', periodId],
        queryFn: () => api.getRemittancePeriod(periodId),
        enabled: !!periodId,
    });

    const recordPaymentMutation = useMutation({
        mutationFn: async (payment: {
            paid_amount: number;
            paid_date: string;
            confirmation_number?: string;
            notes?: string;
        }) => {
            return api.recordRemittancePayment(periodId, payment);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['remittancePeriods'] });
            queryClient.invalidateQueries({ queryKey: ['currentRemittancePeriod'] });
            queryClient.invalidateQueries({ queryKey: ['remittancePeriod', periodId] });
            onClose();
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!paidAmount || !paidDate) {
            alert('Please fill in all required fields');
            return;
        }

        const amount = parseFloat(paidAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid payment amount');
            return;
        }

        recordPaymentMutation.mutate({
            paid_amount: amount,
            paid_date: paidDate,
            confirmation_number: confirmationNumber || undefined,
            notes: notes || undefined,
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="p-6 max-w-md w-full">
                    <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
                    </div>
                </Card>
            </div>
        );
    }

    if (!period) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <Card>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Record Remittance Payment</h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="mb-4 p-4 bg-white/5 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Period</p>
                    <p className="text-white">
                        {new Date(period.period_start).toLocaleDateString()} - {new Date(period.period_end).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2 mb-1">Amount Due</p>
                    <p className="text-white font-semibold text-lg">{formatCurrency(period.total_owing)}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-white mb-1">
                            Amount Paid <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={paidAmount}
                            onChange={(e) => setPaidAmount(e.target.value)}
                            placeholder={formatCurrency(period.total_owing)}
                            className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-1">
                            Payment Date <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="date"
                            value={paidDate}
                            onChange={(e) => setPaidDate(e.target.value)}
                            className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-1">
                            Confirmation Number
                        </label>
                        <input
                            type="text"
                            value={confirmationNumber}
                            onChange={(e) => setConfirmationNumber(e.target.value)}
                            placeholder="e.g., RC1234567890"
                            className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-1">Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Optional notes about this payment"
                            rows={3}
                            className="w-full flex rounded-md border border-input bg-background px-3 py-2 text-sm text-white"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                            disabled={recordPaymentMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={recordPaymentMutation.isPending}
                        >
                            {recordPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                        </Button>
                    </div>
                </form>
                </Card>
            </div>
        </div>
    );
};

export default RecordPaymentModal;
