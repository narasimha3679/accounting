import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { type PayrollSettings as PayrollSettingsType } from '../../lib/api';
import Button from '../ui/Button';
import Card from '../ui/Card';
import HelpIcon from '../ui/HelpIcon';
import { Save, DollarSign } from 'lucide-react';

interface PayrollSettingsProps {
    companyId: number;
}

const PayrollSettings: React.FC<PayrollSettingsProps> = ({ companyId }) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<Partial<PayrollSettingsType>>({
        pay_frequency: 'biweekly',
        province: 'ON',
        overtime_enabled: true,
        overtime_threshold_weekly: 44.00,
        overtime_multiplier: 1.50,
        vacation_tracking_enabled: true,
        vacation_rate_under_5_years: 0.040,
        vacation_rate_5_plus_years: 0.060,
        vacation_accrual_method: 'per_pay',
        remitter_type: 'regular',
        default_work_hours_per_day: 8.00,
        default_work_days_per_week: 5,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [success, setSuccess] = useState('');

    // Fetch existing settings
    const { data: existingSettings, isLoading } = useQuery({
        queryKey: ['payrollSettings', companyId],
        queryFn: () => api.getPayrollSettings(companyId),
        enabled: !!companyId,
    });

    // Initialize form data when settings are loaded
    useEffect(() => {
        if (existingSettings) {
            setFormData(existingSettings);
        }
    }, [existingSettings]);

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (settings: Omit<PayrollSettingsType, 'id' | 'company_id' | 'created_at' | 'updated_at'>) =>
            api.createPayrollSettings(companyId, settings),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payrollSettings', companyId] });
            setSuccess('Payroll settings created successfully!');
            setErrors({});
            setTimeout(() => setSuccess(''), 3000);
        },
        onError: (error: Error) => {
            setErrors({ submit: error.message });
            setSuccess('');
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (settings: Partial<Omit<PayrollSettingsType, 'id' | 'company_id' | 'created_at' | 'updated_at'>>) =>
            api.updatePayrollSettings(companyId, settings),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payrollSettings', companyId] });
            setSuccess('Payroll settings updated successfully!');
            setErrors({});
            setTimeout(() => setSuccess(''), 3000);
        },
        onError: (error: Error) => {
            setErrors({ submit: error.message });
            setSuccess('');
        },
    });

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (formData.overtime_threshold_weekly !== undefined) {
            if (formData.overtime_threshold_weekly < 1 || formData.overtime_threshold_weekly > 168) {
                newErrors.overtime_threshold_weekly = 'Overtime threshold must be between 1 and 168 hours per week';
            }
        }

        if (formData.overtime_multiplier !== undefined) {
            if (formData.overtime_multiplier < 1.0 || formData.overtime_multiplier > 3.0) {
                newErrors.overtime_multiplier = 'Overtime multiplier must be between 1.0 and 3.0';
            }
        }

        if (formData.vacation_rate_under_5_years !== undefined) {
            if (formData.vacation_rate_under_5_years < 0 || formData.vacation_rate_under_5_years > 1) {
                newErrors.vacation_rate_under_5_years = 'Vacation rate must be between 0% and 100%';
            }
        }

        if (formData.vacation_rate_5_plus_years !== undefined) {
            if (formData.vacation_rate_5_plus_years < 0 || formData.vacation_rate_5_plus_years > 1) {
                newErrors.vacation_rate_5_plus_years = 'Vacation rate must be between 0% and 100%';
            }
        }

        if (formData.default_work_hours_per_day !== undefined) {
            if (formData.default_work_hours_per_day < 1 || formData.default_work_hours_per_day > 24) {
                newErrors.default_work_hours_per_day = 'Work hours per day must be between 1 and 24';
            }
        }

        if (formData.default_work_days_per_week !== undefined) {
            if (formData.default_work_days_per_week < 1 || formData.default_work_days_per_week > 7) {
                newErrors.default_work_days_per_week = 'Work days per week must be between 1 and 7';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccess('');
        setErrors({});

        if (!validate()) {
            return;
        }

        const settingsData = {
            pay_frequency: formData.pay_frequency!,
            province: formData.province!,
            overtime_enabled: formData.overtime_enabled ?? true,
            overtime_threshold_weekly: formData.overtime_threshold_weekly!,
            overtime_multiplier: formData.overtime_multiplier!,
            vacation_tracking_enabled: formData.vacation_tracking_enabled ?? true,
            vacation_rate_under_5_years: formData.vacation_rate_under_5_years!,
            vacation_rate_5_plus_years: formData.vacation_rate_5_plus_years!,
            vacation_accrual_method: formData.vacation_accrual_method!,
            remitter_type: formData.remitter_type!,
            default_work_hours_per_day: formData.default_work_hours_per_day!,
            default_work_days_per_week: formData.default_work_days_per_week!,
        };

        if (existingSettings) {
            updateMutation.mutate(settingsData);
        } else {
            createMutation.mutate(settingsData);
        }
    };

    const handleInputChange = (field: keyof PayrollSettingsType, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    return (
        <Card className="p-6">
            <div className="flex items-center mb-6">
                <DollarSign className="h-5 w-5 text-slate-muted mr-2" />
                <h2 className="text-lg font-medium text-white">Payroll Settings</h2>
                <HelpIcon
                    content="Configure your company's payroll settings including pay frequency, overtime rules, vacation policy, and CRA remittance type."
                    size="sm"
                    className="ml-2"
                />
            </div>

            {success && (
                <div className="mb-4 p-3 rounded-lg bg-green-900/20 border border-green-800 text-sm text-green-300">
                    {success}
                </div>
            )}

            {errors.submit && (
                <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-800 text-sm text-red-300">
                    {errors.submit}
                </div>
            )}

            {!existingSettings && (
                <div className="mb-6 p-4 rounded-lg bg-muted/30 border border-border">
                    <p className="text-sm text-muted-foreground">
                        Set up your payroll configuration to start processing pay runs. This includes pay frequency, overtime rules, and vacation policy.
                    </p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Pay Frequency */}
                <div>
                    <label className="block text-sm font-medium text-white mb-2">
                        Pay Frequency
                        <HelpIcon
                            content="How often employees are paid. This affects how tax calculations are prorated per pay period."
                            size="sm"
                            className="ml-2"
                        />
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(['weekly', 'biweekly', 'semi_monthly', 'monthly'] as const).map((freq) => (
                            <label
                                key={freq}
                                className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                                    formData.pay_frequency === freq
                                        ? 'border-primary bg-muted/40'
                                        : 'border-border hover:border-primary/50'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="pay_frequency"
                                    value={freq}
                                    checked={formData.pay_frequency === freq}
                                    onChange={(e) => handleInputChange('pay_frequency', e.target.value)}
                                    className="text-primary"
                                />
                                <span className="text-sm text-foreground capitalize">
                                    {freq.replace('_', '-')}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Province */}
                <div>
                    <label htmlFor="province" className="block text-sm font-medium text-white mb-2">
                        Province
                        <HelpIcon
                            content="The province where your business operates. Currently only Ontario is supported. More provinces coming soon."
                            size="sm"
                            className="ml-2"
                        />
                    </label>
                    <select
                        id="province"
                        value={formData.province || 'ON'}
                        onChange={(e) => handleInputChange('province', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="ON">Ontario</option>
                    </select>
                    <p className="mt-1 text-xs text-slate-muted">More provinces coming soon</p>
                </div>

                {/* Overtime Settings */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div>
                            <label className="text-sm font-medium text-white">Enable Overtime Tracking</label>
                            <HelpIcon
                                content="Track and calculate overtime pay. Ontario standard: 1.5x pay after 44 hours per week."
                                size="sm"
                                className="ml-2"
                            />
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.overtime_enabled ?? true}
                                onChange={(e) => handleInputChange('overtime_enabled', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-input peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-input after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    {formData.overtime_enabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4 border-l-2 border-primary">
                            <div>
                                <label htmlFor="overtime_threshold" className="block text-sm font-medium text-white mb-2">
                                    Overtime Threshold (hours/week)
                                </label>
                                <input
                                    type="number"
                                    id="overtime_threshold"
                                    step="0.01"
                                    min="1"
                                    max="168"
                                    value={formData.overtime_threshold_weekly || 44}
                                    onChange={(e) => handleInputChange('overtime_threshold_weekly', parseFloat(e.target.value) || 0)}
                                    className={`flex h-10 w-full rounded-md border ${
                                        errors.overtime_threshold_weekly ? 'border-red-500' : 'border-input'
                                    } bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                                />
                                {errors.overtime_threshold_weekly && (
                                    <p className="mt-1 text-xs text-red-500">{errors.overtime_threshold_weekly}</p>
                                )}
                                <p className="mt-1 text-xs text-slate-muted">Ontario standard: 44 hours/week</p>
                            </div>

                            <div>
                                <label htmlFor="overtime_multiplier" className="block text-sm font-medium text-white mb-2">
                                    Overtime Multiplier
                                </label>
                                <input
                                    type="number"
                                    id="overtime_multiplier"
                                    step="0.01"
                                    min="1.0"
                                    max="3.0"
                                    value={formData.overtime_multiplier || 1.5}
                                    onChange={(e) => handleInputChange('overtime_multiplier', parseFloat(e.target.value) || 0)}
                                    className={`flex h-10 w-full rounded-md border ${
                                        errors.overtime_multiplier ? 'border-red-500' : 'border-input'
                                    } bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                                />
                                {errors.overtime_multiplier && (
                                    <p className="mt-1 text-xs text-red-500">{errors.overtime_multiplier}</p>
                                )}
                                <p className="mt-1 text-xs text-slate-muted">Ontario standard: 1.5x</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Vacation Settings */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div>
                            <label className="text-sm font-medium text-white">Enable Vacation Tracking</label>
                            <HelpIcon
                                content="Track vacation accrual and usage. Ontario minimum: 4% for employees under 5 years, 6% for 5+ years."
                                size="sm"
                                className="ml-2"
                            />
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.vacation_tracking_enabled ?? true}
                                onChange={(e) => handleInputChange('vacation_tracking_enabled', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-input peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-input after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    {formData.vacation_tracking_enabled && (
                        <div className="space-y-4 pl-4 border-l-2 border-primary">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="vacation_rate_under_5" className="block text-sm font-medium text-white mb-2">
                                        Vacation Rate (Under 5 Years)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            id="vacation_rate_under_5"
                                            step="0.001"
                                            min="0"
                                            max="1"
                                            value={formData.vacation_rate_under_5_years || 0.04}
                                            onChange={(e) => handleInputChange('vacation_rate_under_5_years', parseFloat(e.target.value) || 0)}
                                            className={`flex h-10 w-full rounded-md border ${
                                                errors.vacation_rate_under_5_years ? 'border-red-500' : 'border-input'
                                            } bg-background px-3 py-2 pr-8 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                            <span className="text-slate-muted text-sm">%</span>
                                        </div>
                                    </div>
                                    {errors.vacation_rate_under_5_years && (
                                        <p className="mt-1 text-xs text-red-500">{errors.vacation_rate_under_5_years}</p>
                                    )}
                                    <p className="mt-1 text-xs text-slate-muted">Enter as decimal (0.04 = 4%)</p>
                                </div>

                                <div>
                                    <label htmlFor="vacation_rate_5_plus" className="block text-sm font-medium text-white mb-2">
                                        Vacation Rate (5+ Years)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            id="vacation_rate_5_plus"
                                            step="0.001"
                                            min="0"
                                            max="1"
                                            value={formData.vacation_rate_5_plus_years || 0.06}
                                            onChange={(e) => handleInputChange('vacation_rate_5_plus_years', parseFloat(e.target.value) || 0)}
                                            className={`flex h-10 w-full rounded-md border ${
                                                errors.vacation_rate_5_plus_years ? 'border-red-500' : 'border-input'
                                            } bg-background px-3 py-2 pr-8 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                            <span className="text-slate-muted text-sm">%</span>
                                        </div>
                                    </div>
                                    {errors.vacation_rate_5_plus_years && (
                                        <p className="mt-1 text-xs text-red-500">{errors.vacation_rate_5_plus_years}</p>
                                    )}
                                    <p className="mt-1 text-xs text-slate-muted">Enter as decimal (0.06 = 6%)</p>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="vacation_accrual_method" className="block text-sm font-medium text-white mb-2">
                                    Vacation Accrual Method
                                    <HelpIcon
                                        content="How vacation is accrued: per pay period, on anniversary date, or calendar year."
                                        size="sm"
                                        className="ml-2"
                                    />
                                </label>
                                <select
                                    id="vacation_accrual_method"
                                    value={formData.vacation_accrual_method || 'per_pay'}
                                    onChange={(e) => handleInputChange('vacation_accrual_method', e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <option value="per_pay">Per Pay Period</option>
                                    <option value="anniversary">On Anniversary Date</option>
                                    <option value="calendar_year">Calendar Year</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* CRA Remitter Type */}
                <div>
                    <label htmlFor="remitter_type" className="block text-sm font-medium text-white mb-2">
                        CRA Remitter Type
                        <HelpIcon
                            content="Determines how often you must remit payroll deductions to CRA. Based on your average monthly remittance amount."
                            size="sm"
                            className="ml-2"
                        />
                    </label>
                    <select
                        id="remitter_type"
                        value={formData.remitter_type || 'regular'}
                        onChange={(e) => handleInputChange('remitter_type', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        <option value="quarterly">Quarterly - Small businesses (&lt;$1,000/month average)</option>
                        <option value="regular">Regular - Most employers (15th of following month)</option>
                        <option value="threshold1">Threshold 1 - Large employers (25th of same month)</option>
                        <option value="threshold2">Threshold 2 - Largest employers (multiple times per month)</option>
                    </select>
                </div>

                {/* Default Work Schedule */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="work_hours_per_day" className="block text-sm font-medium text-white mb-2">
                            Default Work Hours Per Day
                            <HelpIcon
                                content="Used for salary-to-hourly conversions and default calculations."
                                size="sm"
                                className="ml-2"
                            />
                        </label>
                        <input
                            type="number"
                            id="work_hours_per_day"
                            step="0.01"
                            min="1"
                            max="24"
                            value={formData.default_work_hours_per_day || 8}
                            onChange={(e) => handleInputChange('default_work_hours_per_day', parseInt(e.target.value) || 0)}
                            className={`flex h-10 w-full rounded-md border ${
                                errors.default_work_hours_per_day ? 'border-red-500' : 'border-input'
                            } bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                        />
                        {errors.default_work_hours_per_day && (
                            <p className="mt-1 text-xs text-red-500">{errors.default_work_hours_per_day}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="work_days_per_week" className="block text-sm font-medium text-white mb-2">
                            Default Work Days Per Week
                        </label>
                        <input
                            type="number"
                            id="work_days_per_week"
                            step="1"
                            min="1"
                            max="7"
                            value={formData.default_work_days_per_week || 5}
                            onChange={(e) => handleInputChange('default_work_days_per_week', parseInt(e.target.value) || 0)}
                            className={`flex h-10 w-full rounded-md border ${
                                errors.default_work_days_per_week ? 'border-red-500' : 'border-input'
                            } bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                        />
                        {errors.default_work_days_per_week && (
                            <p className="mt-1 text-xs text-red-500">{errors.default_work_days_per_week}</p>
                        )}
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-4 border-t border-border">
                    <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        icon={Save}
                    >
                        {createMutation.isPending || updateMutation.isPending
                            ? 'Saving...'
                            : existingSettings
                                ? 'Update Settings'
                                : 'Create Settings'
                        }
                    </Button>
                </div>
            </form>
        </Card>
    );
};

export { PayrollSettings };
export default PayrollSettings;
