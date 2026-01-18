import React, { useState, useEffect } from 'react';
import { type DividendRecipient } from '../../lib/api';
import Button from '../ui/Button';
import { X } from 'lucide-react';

interface DividendRecipientModalProps {
    recipient?: DividendRecipient | null;
    dividendAmount: number;
    existingRecipientsTotal: number;
    onClose: () => void;
    onSave: (recipient: Omit<DividendRecipient, 'id' | 'created_at' | 'updated_at'>) => void;
}

const DividendRecipientModal: React.FC<DividendRecipientModalProps> = ({
    recipient,
    dividendAmount,
    existingRecipientsTotal,
    onClose,
    onSave,
}) => {
    const [formData, setFormData] = useState({
        recipient_name: '',
        recipient_sin: '',
        recipient_type: 'individual' as 'individual' | 'corporation' | 'trust',
        business_number: '',
        amount: '',
        mailing_address: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (recipient) {
            setFormData({
                recipient_name: recipient.recipient_name,
                recipient_sin: recipient.recipient_sin || '',
                recipient_type: recipient.recipient_type,
                business_number: recipient.business_number || '',
                amount: recipient.amount.toString(),
                mailing_address: recipient.mailing_address || '',
            });
        }
    }, [recipient]);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.recipient_name.trim()) {
            newErrors.recipient_name = 'Recipient name is required';
        }

        if (formData.recipient_type === 'individual' && !formData.recipient_sin.trim()) {
            newErrors.recipient_sin = 'SIN is required for individuals (required for T5 filing)';
        }

        if (formData.recipient_type === 'corporation' && !formData.business_number.trim()) {
            newErrors.business_number = 'Business number is required for corporations';
        }

        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) {
            newErrors.amount = 'Amount must be greater than 0';
        } else {
            const remainingAmount = dividendAmount - existingRecipientsTotal + (recipient ? recipient.amount : 0);
            if (amount > remainingAmount) {
                newErrors.amount = `Amount cannot exceed remaining dividend amount ($${remainingAmount.toFixed(2)})`;
            }
        }

        // Validate SIN format (9 digits)
        if (formData.recipient_sin && formData.recipient_type === 'individual') {
            const cleanedSIN = formData.recipient_sin.replace(/\D/g, '');
            if (cleanedSIN.length !== 9) {
                newErrors.recipient_sin = 'SIN must be 9 digits';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        const recipientData: Omit<DividendRecipient, 'id' | 'created_at' | 'updated_at'> = {
            dividend_id: recipient?.dividend_id || 0, // Will be set by parent
            recipient_name: formData.recipient_name.trim(),
            recipient_sin: formData.recipient_sin.trim() || null,
            recipient_type: formData.recipient_type,
            business_number: formData.business_number.trim() || null,
            amount: parseFloat(formData.amount),
            mailing_address: formData.mailing_address.trim() || null,
        };

        onSave(recipientData);
    };

    const remainingAmount = dividendAmount - existingRecipientsTotal + (recipient ? recipient.amount : 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg border border-white/10 bg-card p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">
                        {recipient ? 'Edit Recipient' : 'Add Recipient'}
                    </h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 rounded-full"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Recipient Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.recipient_name}
                            onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Full name or company name"
                        />
                        {errors.recipient_name && (
                            <p className="text-sm text-destructive mt-1">{errors.recipient_name}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Recipient Type *
                        </label>
                        <select
                            required
                            value={formData.recipient_type}
                            onChange={(e) => setFormData({ ...formData, recipient_type: e.target.value as any })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="individual">Individual</option>
                            <option value="corporation">Corporation</option>
                            <option value="trust">Trust</option>
                        </select>
                    </div>

                    {formData.recipient_type === 'individual' && (
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                Social Insurance Number (SIN) *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.recipient_sin}
                                onChange={(e) => setFormData({ ...formData, recipient_sin: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="123 456 789"
                                maxLength={11}
                            />
                            {errors.recipient_sin && (
                                <p className="text-sm text-destructive mt-1">{errors.recipient_sin}</p>
                            )}
                            <p className="text-xs text-slate-muted mt-1">
                                Required for T5 slip generation
                            </p>
                        </div>
                    )}

                    {formData.recipient_type === 'corporation' && (
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                Business Number *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.business_number}
                                onChange={(e) => setFormData({ ...formData, business_number: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="123456789RC0001"
                            />
                            {errors.business_number && (
                                <p className="text-sm text-destructive mt-1">{errors.business_number}</p>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Amount (CAD) *
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="0.00"
                        />
                        {errors.amount && (
                            <p className="text-sm text-destructive mt-1">{errors.amount}</p>
                        )}
                        <p className="text-xs text-slate-muted mt-1">
                            Remaining: ${remainingAmount.toFixed(2)}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Mailing Address
                        </label>
                        <textarea
                            value={formData.mailing_address}
                            onChange={(e) => setFormData({ ...formData, mailing_address: e.target.value })}
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            rows={3}
                            placeholder="Street address, City, Province, Postal Code"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-white/10">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                        >
                            {recipient ? 'Update' : 'Add'} Recipient
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DividendRecipientModal;
