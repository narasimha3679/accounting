import React, { useEffect, useState } from 'react';
import { type DividendRecipientProfile } from '../../lib/api';
import Button from '../ui/Button';
import { X } from 'lucide-react';

interface DividendRecipientProfileModalProps {
    profile?: DividendRecipientProfile | null;
    companyId: number;
    onClose: () => void;
    onSave: (
        profile: Omit<DividendRecipientProfile, 'id' | 'created_at' | 'updated_at'>
    ) => Promise<void>;
}

const DividendRecipientProfileModal: React.FC<DividendRecipientProfileModalProps> = ({
    profile,
    companyId,
    onClose,
    onSave,
}) => {
    const [formData, setFormData] = useState({
        name: '',
        recipient_sin: '',
        recipient_type: 'individual' as 'individual' | 'corporation' | 'trust',
        business_number: '',
        mailing_address: '',
        is_default: false,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (profile) {
            setFormData({
                name: profile.name,
                recipient_sin: profile.recipient_sin || '',
                recipient_type: profile.recipient_type,
                business_number: profile.business_number || '',
                mailing_address: profile.mailing_address || '',
                is_default: profile.is_default,
            });
        } else {
            setFormData({
                name: '',
                recipient_sin: '',
                recipient_type: 'individual',
                business_number: '',
                mailing_address: '',
                is_default: false,
            });
        }
        setErrors({});
    }, [profile]);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (formData.recipient_type === 'individual' && !formData.recipient_sin.trim()) {
            newErrors.recipient_sin = 'SIN is required for individuals (required for T5 filing)';
        }

        if (formData.recipient_type === 'corporation' && !formData.business_number.trim()) {
            newErrors.business_number = 'Business number is required for corporations';
        }

        if (formData.recipient_sin && formData.recipient_type === 'individual') {
            const cleanedSIN = formData.recipient_sin.replace(/\D/g, '');
            if (cleanedSIN.length !== 9) {
                newErrors.recipient_sin = 'SIN must be 9 digits';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setSaving(true);
        try {
            await onSave({
                company_id: companyId,
                name: formData.name.trim(),
                recipient_sin: formData.recipient_sin.trim() || null,
                recipient_type: formData.recipient_type,
                business_number: formData.business_number.trim() || null,
                mailing_address: formData.mailing_address.trim() || null,
                is_default: formData.is_default,
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-foreground">
                        {profile ? 'Edit Recipient Profile' : 'Add Recipient Profile'}
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
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="input"
                            placeholder="Full name or company name"
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive mt-1">{errors.name}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Recipient Type *
                        </label>
                        <select
                            required
                            value={formData.recipient_type}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    recipient_type: e.target.value as 'individual' | 'corporation' | 'trust',
                                })
                            }
                            className="input"
                        >
                            <option value="individual">Individual</option>
                            <option value="corporation">Corporation</option>
                            <option value="trust">Trust</option>
                        </select>
                    </div>

                    {formData.recipient_type === 'individual' && (
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Social Insurance Number (SIN) *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.recipient_sin}
                                onChange={(e) => setFormData({ ...formData, recipient_sin: e.target.value })}
                                className="input"
                                placeholder="123 456 789"
                                maxLength={11}
                            />
                            {errors.recipient_sin && (
                                <p className="text-sm text-destructive mt-1">{errors.recipient_sin}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                Required for T5 slip generation
                            </p>
                        </div>
                    )}

                    {formData.recipient_type === 'corporation' && (
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Business Number *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.business_number}
                                onChange={(e) => setFormData({ ...formData, business_number: e.target.value })}
                                className="input"
                                placeholder="123456789RC0001"
                            />
                            {errors.business_number && (
                                <p className="text-sm text-destructive mt-1">{errors.business_number}</p>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Mailing Address
                        </label>
                        <textarea
                            value={formData.mailing_address}
                            onChange={(e) => setFormData({ ...formData, mailing_address: e.target.value })}
                            className="input min-h-[80px]"
                            rows={3}
                            placeholder="Street address, City, Province, Postal Code"
                        />
                    </div>

                    <label className="flex items-center gap-2 text-sm text-foreground">
                        <input
                            type="checkbox"
                            checked={formData.is_default}
                            onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                            className="h-4 w-4 rounded border-input"
                        />
                        Use as default for new dividends
                    </label>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border">
                        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Saving...' : profile ? 'Update Profile' : 'Add Profile'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DividendRecipientProfileModal;
