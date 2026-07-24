import React, { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import api, { type PayrollSettings } from '../../lib/api';
import Button from '../ui/Button';
import {
    derivePayPeriodFromStart,
    getDefaultPayPeriodDates,
} from '../../lib/payrollHelpers';

interface CreatePayRunModalProps {
    companyId: number;
    payFrequency?: PayrollSettings['pay_frequency'];
    onCreated: (payRunId: number) => void;
    onClose: () => void;
}

const CreatePayRunModal: React.FC<CreatePayRunModalProps> = ({
    companyId,
    payFrequency = 'biweekly',
    onCreated,
    onClose,
}) => {
    const defaults = getDefaultPayPeriodDates(payFrequency);
    const [payPeriodStart, setPayPeriodStart] = useState(defaults.pay_period_start);
    const [payPeriodEnd, setPayPeriodEnd] = useState(defaults.pay_period_end);
    const [payDate, setPayDate] = useState(defaults.pay_date);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        const next = getDefaultPayPeriodDates(payFrequency);
        setPayPeriodStart(next.pay_period_start);
        setPayPeriodEnd(next.pay_period_end);
        setPayDate(next.pay_date);
    }, [payFrequency]);

    const createMutation = useMutation({
        mutationFn: () =>
            api.createPayRun({
                company_id: companyId,
                pay_period_start: payPeriodStart,
                pay_period_end: payPeriodEnd,
                pay_date: payDate,
            }),
        onSuccess: (payRun) => {
            onCreated(payRun.id);
        },
        onError: (error: Error) => {
            setFormError(error.message);
        },
    });

    const handleStartChange = (value: string) => {
        setPayPeriodStart(value);
        if (!value) return;
        const derived = derivePayPeriodFromStart(value, payFrequency);
        setPayPeriodEnd(derived.pay_period_end);
        setPayDate(derived.pay_date);
        setFormError('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        if (!payPeriodStart || !payPeriodEnd || !payDate) {
            setFormError('All date fields are required');
            return;
        }
        if (payPeriodEnd < payPeriodStart) {
            setFormError('Pay period end must be on or after the start date');
            return;
        }
        if (payDate < payPeriodEnd) {
            setFormError('Pay date must be on or after the pay period end date');
            return;
        }

        createMutation.mutate();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">
                        Create Pay Run
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                    Prefill uses your {payFrequency.replace('_', '-')} pay frequency: period end =
                    start + period length, pay date = period end.
                </p>

                {formError && (
                    <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/40 text-sm text-destructive">
                        {formError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Pay Period Start
                        </label>
                        <input
                            type="date"
                            className="input w-full"
                            value={payPeriodStart}
                            onChange={(e) => handleStartChange(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Pay Period End
                        </label>
                        <input
                            type="date"
                            className="input w-full"
                            value={payPeriodEnd}
                            onChange={(e) => {
                                setPayPeriodEnd(e.target.value);
                                setFormError('');
                            }}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Pay Date
                        </label>
                        <input
                            type="date"
                            className="input w-full"
                            value={payDate}
                            onChange={(e) => {
                                setPayDate(e.target.value);
                                setFormError('');
                            }}
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                            {createMutation.isPending ? 'Creating...' : 'Create Pay Run'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatePayRunModal;
