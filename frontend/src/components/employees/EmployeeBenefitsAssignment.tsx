import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { type EmployeeBenefit, type BenefitType } from '../../lib/api';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Plus, Edit, Trash2, X, Gift } from 'lucide-react';

interface EmployeeBenefitsAssignmentProps {
    employeeId: number;
    companyId: number;
}

interface BenefitAssignmentFormData {
    benefit_type_id: number;
    amount?: number | null;
    percentage?: number | null;
    hourly_rate?: number | null;
    effective_date: string;
    end_date?: string | null;
}

const EmployeeBenefitsAssignment: React.FC<EmployeeBenefitsAssignmentProps> = ({ employeeId, companyId }) => {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editingBenefit, setEditingBenefit] = useState<EmployeeBenefit | null>(null);
    const [formData, setFormData] = useState<BenefitAssignmentFormData>({
        benefit_type_id: 0,
        amount: null,
        percentage: null,
        hourly_rate: null,
        effective_date: new Date().toISOString().split('T')[0],
        end_date: null,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Fetch employee benefits
    const { data: employeeBenefits = [], isLoading: isLoadingBenefits } = useQuery({
        queryKey: ['employeeBenefits', employeeId],
        queryFn: () => api.getEmployeeBenefits(employeeId),
        enabled: !!employeeId,
    });

    // Fetch available benefit types
    const { data: benefitTypes = [], isLoading: isLoadingTypes } = useQuery({
        queryKey: ['benefitTypes', companyId],
        queryFn: () => api.getBenefitTypes(companyId),
        enabled: !!companyId,
    });

    // Filter to only active benefit types
    const activeBenefitTypes = benefitTypes.filter((bt) => bt.is_active);

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (benefit: Omit<EmployeeBenefit, 'id' | 'employee_id' | 'created_at' | 'updated_at' | 'benefit_type'>) =>
            api.assignBenefit(employeeId, benefit),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employeeBenefits', employeeId] });
            handleCloseModal();
        },
        onError: (error: Error) => {
            setErrors({ submit: error.message });
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, updates }: { id: number; updates: Partial<EmployeeBenefit> }) =>
            api.updateEmployeeBenefit(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employeeBenefits', employeeId] });
            handleCloseModal();
        },
        onError: (error: Error) => {
            setErrors({ submit: error.message });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.removeEmployeeBenefit(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employeeBenefits', employeeId] });
        },
    });

    const handleOpenModal = (benefit?: EmployeeBenefit) => {
        if (benefit) {
            setEditingBenefit(benefit);
            setFormData({
                benefit_type_id: benefit.benefit_type_id,
                amount: benefit.amount ?? null,
                percentage: benefit.percentage ?? null,
                hourly_rate: benefit.hourly_rate ?? null,
                effective_date: benefit.effective_date.split('T')[0],
                end_date: benefit.end_date ? benefit.end_date.split('T')[0] : null,
            });
        } else {
            setEditingBenefit(null);
            setFormData({
                benefit_type_id: 0,
                amount: null,
                percentage: null,
                hourly_rate: null,
                effective_date: new Date().toISOString().split('T')[0],
                end_date: null,
            });
        }
        setErrors({});
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingBenefit(null);
        setFormData({
            benefit_type_id: 0,
            amount: null,
            percentage: null,
            hourly_rate: null,
            effective_date: new Date().toISOString().split('T')[0],
            end_date: null,
        });
        setErrors({});
    };

    const getSelectedBenefitType = (): BenefitType | undefined => {
        return activeBenefitTypes.find((bt) => bt.id === formData.benefit_type_id);
    };

    const getDisplayValue = (benefit: EmployeeBenefit): string => {
        const type = benefit.benefit_type;
        if (!type) return '-';

        if (benefit.amount !== null && benefit.amount !== undefined) {
            return `$${benefit.amount.toFixed(2)}`;
        }
        if (benefit.percentage !== null && benefit.percentage !== undefined) {
            return `${(benefit.percentage * 100).toFixed(2)}%`;
        }
        if (benefit.hourly_rate !== null && benefit.hourly_rate !== undefined) {
            return `$${benefit.hourly_rate.toFixed(2)}/hr`;
        }

        // Fall back to default values
        if (type.calculation_type === 'fixed' && type.default_amount) {
            return `$${type.default_amount.toFixed(2)} (default)`;
        }
        if (type.calculation_type === 'percentage' && type.default_percentage) {
            return `${(type.default_percentage * 100).toFixed(2)}% (default)`;
        }
        if (type.calculation_type === 'hourly' && type.default_hourly_rate) {
            return `$${type.default_hourly_rate.toFixed(2)}/hr (default)`;
        }

        return '-';
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.benefit_type_id) {
            newErrors.benefit_type_id = 'Please select a benefit type';
        }

        const selectedType = getSelectedBenefitType();
        if (selectedType) {
            if (selectedType.calculation_type === 'fixed' && formData.amount !== null && formData.amount !== undefined) {
                if (formData.amount < 0) {
                    newErrors.amount = 'Amount must be 0 or greater';
                }
            }
            if (selectedType.calculation_type === 'percentage' && formData.percentage !== null && formData.percentage !== undefined) {
                if (formData.percentage < 0 || formData.percentage > 1) {
                    newErrors.percentage = 'Percentage must be between 0% and 100%';
                }
            }
            if (selectedType.calculation_type === 'hourly' && formData.hourly_rate !== null && formData.hourly_rate !== undefined) {
                if (formData.hourly_rate < 0) {
                    newErrors.hourly_rate = 'Hourly rate must be 0 or greater';
                }
            }
        }

        if (!formData.effective_date) {
            newErrors.effective_date = 'Effective date is required';
        }

        if (formData.end_date && formData.effective_date && formData.end_date < formData.effective_date) {
            newErrors.end_date = 'End date must be after effective date';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        if (!validate()) {
            return;
        }

        const selectedType = getSelectedBenefitType();
        if (!selectedType) {
            setErrors({ submit: 'Please select a benefit type' });
            return;
        }

        const benefitData: Omit<EmployeeBenefit, 'id' | 'employee_id' | 'created_at' | 'updated_at' | 'benefit_type'> = {
            benefit_type_id: formData.benefit_type_id,
            amount: selectedType.calculation_type === 'fixed' ? (formData.amount ?? null) : null,
            percentage: selectedType.calculation_type === 'percentage' ? (formData.percentage ?? null) : null,
            hourly_rate: selectedType.calculation_type === 'hourly' ? (formData.hourly_rate ?? null) : null,
            effective_date: formData.effective_date,
            end_date: formData.end_date || null,
            is_active: true,
        };

        if (editingBenefit) {
            updateMutation.mutate({ id: editingBenefit.id, updates: benefitData });
        } else {
            createMutation.mutate(benefitData);
        }
    };

    const handleDelete = (benefit: EmployeeBenefit) => {
        if (confirm(`Remove "${benefit.benefit_type?.name || 'this benefit'}" from this employee?`)) {
            deleteMutation.mutate(benefit.id);
        }
    };

    const isActive = (benefit: EmployeeBenefit): boolean => {
        if (!benefit.is_active) return false;
        if (benefit.end_date) {
            const endDate = new Date(benefit.end_date);
            return endDate >= new Date();
        }
        return true;
    };

    if (isLoadingBenefits || isLoadingTypes) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    return (
        <>
            <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <Gift className="h-5 w-5 text-slate-muted mr-2" />
                        <h3 className="text-lg font-medium text-white">Assigned Benefits</h3>
                    </div>
                    <Button
                        onClick={() => handleOpenModal()}
                        icon={Plus}
                        disabled={activeBenefitTypes.length === 0}
                        size="sm"
                    >
                        Add Benefit
                    </Button>
                </div>

                {activeBenefitTypes.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-muted-foreground text-sm">
                            No benefit types available. Create benefit types in Settings first.
                        </p>
                    </div>
                )}

                {activeBenefitTypes.length > 0 && employeeBenefits.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-muted-foreground text-sm mb-4">
                            No benefits assigned to this employee yet.
                        </p>
                        <Button onClick={() => handleOpenModal()} icon={Plus} size="sm">
                            Add First Benefit
                        </Button>
                    </div>
                )}

                {employeeBenefits.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Benefit Name</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Value</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Effective Date</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-foreground">End Date</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Status</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employeeBenefits.map((benefit) => {
                                    const active = isActive(benefit);
                                    return (
                                        <tr key={benefit.id} className="border-b border-border hover:bg-muted/30">
                                            <td className="py-3 px-4 text-sm text-foreground">
                                                {benefit.benefit_type?.name || 'Unknown'}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-muted-foreground">
                                                {getDisplayValue(benefit)}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-muted-foreground">
                                                {new Date(benefit.effective_date).toLocaleDateString('en-CA')}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-muted-foreground">
                                                {benefit.end_date ? new Date(benefit.end_date).toLocaleDateString('en-CA') : '-'}
                                            </td>
                                            <td className="py-3 px-4">
                                                {active ? (
                                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleOpenModal(benefit)}
                                                        className="h-8 w-8"
                                                        title="Edit"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(benefit)}
                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                        title="Remove"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-foreground">
                                {editingBenefit ? 'Edit Benefit Assignment' : 'Assign Benefit'}
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleCloseModal}
                                className="h-8 w-8 rounded-full"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {errors.submit && (
                            <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-800 text-sm text-red-300">
                                {errors.submit}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="benefit_type_id" className="block text-sm font-medium text-foreground mb-2">
                                    Benefit Type *
                                </label>
                                <select
                                    id="benefit_type_id"
                                    value={formData.benefit_type_id}
                                    onChange={(e) => {
                                        const selectedId = parseInt(e.target.value);
                                        setFormData({
                                            ...formData,
                                            benefit_type_id: selectedId,
                                            amount: null,
                                            percentage: null,
                                            hourly_rate: null,
                                        });
                                        if (errors.benefit_type_id) setErrors({ ...errors, benefit_type_id: '' });
                                    }}
                                    className={`input ${errors.benefit_type_id ? 'border-red-500' : ''}`}
                                    required
                                >
                                    <option value="0">Select a benefit type...</option>
                                    {activeBenefitTypes.map((bt) => (
                                        <option key={bt.id} value={bt.id}>
                                            {bt.name} ({bt.category.replace('_', ' ')})
                                        </option>
                                    ))}
                                </select>
                                {errors.benefit_type_id && (
                                    <p className="mt-1 text-xs text-red-500">{errors.benefit_type_id}</p>
                                )}
                            </div>

                            {formData.benefit_type_id > 0 && (() => {
                                const selectedType = getSelectedBenefitType();
                                if (!selectedType) return null;

                                return (
                                    <>
                                        {selectedType.calculation_type === 'fixed' && (
                                            <div>
                                                <label htmlFor="amount" className="block text-sm font-medium text-foreground mb-2">
                                                    Amount ($)
                                                    <span className="text-xs text-muted-foreground ml-2">
                                                        (Leave blank to use default: ${selectedType.default_amount?.toFixed(2) || '0.00'})
                                                    </span>
                                                </label>
                                                <input
                                                    type="number"
                                                    id="amount"
                                                    step="0.01"
                                                    min="0"
                                                    value={formData.amount || ''}
                                                    onChange={(e) => {
                                                        setFormData({
                                                            ...formData,
                                                            amount: e.target.value ? parseFloat(e.target.value) : null,
                                                        });
                                                        if (errors.amount) setErrors({ ...errors, amount: '' });
                                                    }}
                                                    className={`input ${errors.amount ? 'border-red-500' : ''}`}
                                                />
                                                {errors.amount && (
                                                    <p className="mt-1 text-xs text-red-500">{errors.amount}</p>
                                                )}
                                            </div>
                                        )}

                                        {selectedType.calculation_type === 'percentage' && (
                                            <div>
                                                <label htmlFor="percentage" className="block text-sm font-medium text-foreground mb-2">
                                                    Percentage (%)
                                                    <span className="text-xs text-muted-foreground ml-2">
                                                        (Leave blank to use default: {(selectedType.default_percentage || 0) * 100}%)
                                                    </span>
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        id="percentage"
                                                        step="0.0001"
                                                        min="0"
                                                        max="1"
                                                        value={formData.percentage !== null ? formData.percentage : ''}
                                                        onChange={(e) => {
                                                            setFormData({
                                                                ...formData,
                                                                percentage: e.target.value ? parseFloat(e.target.value) : null,
                                                            });
                                                            if (errors.percentage) setErrors({ ...errors, percentage: '' });
                                                        }}
                                                        className={`input pr-8 ${errors.percentage ? 'border-red-500' : ''}`}
                                                    />
                                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                        <span className="text-muted-foreground text-sm">%</span>
                                                    </div>
                                                </div>
                                                {errors.percentage && (
                                                    <p className="mt-1 text-xs text-red-500">{errors.percentage}</p>
                                                )}
                                                <p className="mt-1 text-xs text-muted-foreground">Enter as decimal (0.05 = 5%)</p>
                                            </div>
                                        )}

                                        {selectedType.calculation_type === 'hourly' && (
                                            <div>
                                                <label htmlFor="hourly_rate" className="block text-sm font-medium text-foreground mb-2">
                                                    Hourly Rate ($/hr)
                                                    <span className="text-xs text-muted-foreground ml-2">
                                                        (Leave blank to use default: ${selectedType.default_hourly_rate?.toFixed(2) || '0.00'}/hr)
                                                    </span>
                                                </label>
                                                <input
                                                    type="number"
                                                    id="hourly_rate"
                                                    step="0.01"
                                                    min="0"
                                                    value={formData.hourly_rate || ''}
                                                    onChange={(e) => {
                                                        setFormData({
                                                            ...formData,
                                                            hourly_rate: e.target.value ? parseFloat(e.target.value) : null,
                                                        });
                                                        if (errors.hourly_rate) setErrors({ ...errors, hourly_rate: '' });
                                                    }}
                                                    className={`input ${errors.hourly_rate ? 'border-red-500' : ''}`}
                                                />
                                                {errors.hourly_rate && (
                                                    <p className="mt-1 text-xs text-red-500">{errors.hourly_rate}</p>
                                                )}
                                            </div>
                                        )}
                                    </>
                                );
                            })()}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="effective_date" className="block text-sm font-medium text-foreground mb-2">
                                        Effective Date *
                                    </label>
                                    <input
                                        type="date"
                                        id="effective_date"
                                        value={formData.effective_date}
                                        onChange={(e) => {
                                            setFormData({ ...formData, effective_date: e.target.value });
                                            if (errors.effective_date) setErrors({ ...errors, effective_date: '' });
                                        }}
                                        className={`input ${errors.effective_date ? 'border-red-500' : ''}`}
                                        required
                                    />
                                    {errors.effective_date && (
                                        <p className="mt-1 text-xs text-red-500">{errors.effective_date}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="end_date" className="block text-sm font-medium text-foreground mb-2">
                                        End Date
                                        <span className="text-xs text-muted-foreground ml-2">(Optional)</span>
                                    </label>
                                    <input
                                        type="date"
                                        id="end_date"
                                        value={formData.end_date || ''}
                                        onChange={(e) => {
                                            setFormData({ ...formData, end_date: e.target.value || null });
                                            if (errors.end_date) setErrors({ ...errors, end_date: '' });
                                        }}
                                        className={`input ${errors.end_date ? 'border-red-500' : ''}`}
                                    />
                                    {errors.end_date && (
                                        <p className="mt-1 text-xs text-red-500">{errors.end_date}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <Button type="button" variant="outline" onClick={handleCloseModal}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                >
                                    {createMutation.isPending || updateMutation.isPending
                                        ? 'Saving...'
                                        : editingBenefit
                                            ? 'Update'
                                            : 'Assign'
                                    }
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default EmployeeBenefitsAssignment;
