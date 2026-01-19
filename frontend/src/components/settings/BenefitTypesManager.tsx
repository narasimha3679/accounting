import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { type BenefitType } from '../../lib/api';
import Button from '../ui/Button';
import Card from '../ui/Card';
import HelpIcon from '../ui/HelpIcon';
import { Plus, Edit, Trash2, X, Gift, CheckCircle, XCircle } from 'lucide-react';

interface BenefitTypesManagerProps {
    companyId: number;
}

interface BenefitTypeFormData {
    name: string;
    description: string;
    category: 'taxable_benefit' | 'pre_tax_deduction' | 'post_tax_deduction';
    calculation_type: 'fixed' | 'percentage' | 'hourly';
    default_amount?: number | null;
    default_percentage?: number | null;
    default_hourly_rate?: number | null;
    annual_maximum?: number | null;
    t4_box?: string | null;
    is_active: boolean;
}

const BenefitTypesManager: React.FC<BenefitTypesManagerProps> = ({ companyId }) => {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editingBenefit, setEditingBenefit] = useState<BenefitType | null>(null);
    const [formData, setFormData] = useState<BenefitTypeFormData>({
        name: '',
        description: '',
        category: 'pre_tax_deduction',
        calculation_type: 'fixed',
        default_amount: null,
        default_percentage: null,
        default_hourly_rate: null,
        annual_maximum: null,
        t4_box: null,
        is_active: true,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Fetch benefit types
    const { data: benefitTypes = [], isLoading } = useQuery({
        queryKey: ['benefitTypes', companyId],
        queryFn: () => api.getBenefitTypes(companyId),
        enabled: !!companyId,
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (benefitType: Omit<BenefitType, 'id' | 'created_at' | 'updated_at'>) =>
            api.createBenefitType(benefitType),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['benefitTypes', companyId] });
            handleCloseModal();
        },
        onError: (error: Error) => {
            setErrors({ submit: error.message });
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, updates }: { id: number; updates: Partial<BenefitType> }) =>
            api.updateBenefitType(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['benefitTypes', companyId] });
            handleCloseModal();
        },
        onError: (error: Error) => {
            setErrors({ submit: error.message });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.deleteBenefitType(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['benefitTypes', companyId] });
        },
    });

    const handleOpenModal = (benefit?: BenefitType) => {
        if (benefit) {
            setEditingBenefit(benefit);
            setFormData({
                name: benefit.name,
                description: benefit.description || '',
                category: benefit.category,
                calculation_type: benefit.calculation_type,
                default_amount: benefit.default_amount ?? null,
                default_percentage: benefit.default_percentage ?? null,
                default_hourly_rate: benefit.default_hourly_rate ?? null,
                annual_maximum: benefit.annual_maximum ?? null,
                t4_box: benefit.t4_box ?? null,
                is_active: benefit.is_active,
            });
        } else {
            setEditingBenefit(null);
            setFormData({
                name: '',
                description: '',
                category: 'pre_tax_deduction',
                calculation_type: 'fixed',
                default_amount: null,
                default_percentage: null,
                default_hourly_rate: null,
                annual_maximum: null,
                t4_box: null,
                is_active: true,
            });
        }
        setErrors({});
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingBenefit(null);
        setFormData({
            name: '',
            description: '',
            category: 'pre_tax_deduction',
            calculation_type: 'fixed',
            default_amount: null,
            default_percentage: null,
            default_hourly_rate: null,
            annual_maximum: null,
            t4_box: null,
            is_active: true,
        });
        setErrors({});
    };

    const handlePreset = (preset: 'rrsp' | 'health' | 'union' | 'vehicle') => {
        const presets: Record<string, Partial<BenefitTypeFormData>> = {
            rrsp: {
                name: 'RRSP Contribution',
                description: 'Registered Retirement Savings Plan contribution',
                category: 'pre_tax_deduction',
                calculation_type: 'percentage',
                default_percentage: 0.05,
                t4_box: '50',
            },
            health: {
                name: 'Health Benefits',
                description: 'Company health insurance benefits',
                category: 'taxable_benefit',
                calculation_type: 'fixed',
                default_amount: 50.00,
                t4_box: '40',
            },
            union: {
                name: 'Union Dues',
                description: 'Union membership dues',
                category: 'post_tax_deduction',
                calculation_type: 'fixed',
                default_amount: 25.00,
                t4_box: '44',
            },
            vehicle: {
                name: 'Company Vehicle',
                description: 'Personal use of company vehicle',
                category: 'taxable_benefit',
                calculation_type: 'fixed',
                default_amount: 200.00,
                t4_box: '40',
            },
        };

        const presetData = presets[preset];
        setFormData((prev) => ({ ...prev, ...presetData }));
        handleOpenModal();
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        } else if (formData.name.length > 100) {
            newErrors.name = 'Name must be 100 characters or less';
        }

        if (formData.calculation_type === 'fixed' && formData.default_amount !== null && formData.default_amount !== undefined) {
            if (formData.default_amount < 0) {
                newErrors.default_amount = 'Amount must be 0 or greater';
            }
        }

        if (formData.calculation_type === 'percentage' && formData.default_percentage !== null && formData.default_percentage !== undefined) {
            if (formData.default_percentage < 0 || formData.default_percentage > 1) {
                newErrors.default_percentage = 'Percentage must be between 0% and 100%';
            }
        }

        if (formData.calculation_type === 'hourly' && formData.default_hourly_rate !== null && formData.default_hourly_rate !== undefined) {
            if (formData.default_hourly_rate < 0) {
                newErrors.default_hourly_rate = 'Hourly rate must be 0 or greater';
            }
        }

        if (formData.annual_maximum !== null && formData.annual_maximum !== undefined && formData.annual_maximum < 0) {
            newErrors.annual_maximum = 'Annual maximum must be 0 or greater';
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

        const benefitTypeData: Omit<BenefitType, 'id' | 'created_at' | 'updated_at'> = {
            company_id: companyId,
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            category: formData.category,
            calculation_type: formData.calculation_type,
            default_amount: formData.calculation_type === 'fixed' ? formData.default_amount : null,
            default_percentage: formData.calculation_type === 'percentage' ? formData.default_percentage : null,
            default_hourly_rate: formData.calculation_type === 'hourly' ? formData.default_hourly_rate : null,
            annual_maximum: formData.annual_maximum ?? null,
            t4_box: formData.t4_box?.trim() || null,
            is_active: formData.is_active,
        };

        if (editingBenefit) {
            updateMutation.mutate({ id: editingBenefit.id, updates: benefitTypeData });
        } else {
            createMutation.mutate(benefitTypeData);
        }
    };

    const handleDelete = (benefit: BenefitType) => {
        if (confirm(`Are you sure you want to delete "${benefit.name}"? This will also remove it from all employees.`)) {
            deleteMutation.mutate(benefit.id);
        }
    };

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case 'taxable_benefit':
                return 'Taxable Benefit';
            case 'pre_tax_deduction':
                return 'Pre-tax Deduction';
            case 'post_tax_deduction':
                return 'Post-tax Deduction';
            default:
                return category;
        }
    };

    const getCalculationLabel = (type: string) => {
        switch (type) {
            case 'fixed':
                return 'Fixed';
            case 'percentage':
                return 'Percentage';
            case 'hourly':
                return 'Hourly';
            default:
                return type;
        }
    };

    const getDefaultValue = (benefit: BenefitType) => {
        if (benefit.calculation_type === 'fixed' && benefit.default_amount) {
            return `$${benefit.default_amount.toFixed(2)}`;
        }
        if (benefit.calculation_type === 'percentage' && benefit.default_percentage) {
            return `${(benefit.default_percentage * 100).toFixed(2)}%`;
        }
        if (benefit.calculation_type === 'hourly' && benefit.default_hourly_rate) {
            return `$${benefit.default_hourly_rate.toFixed(2)}/hr`;
        }
        return '-';
    };

    if (isLoading) {
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
                        <h2 className="text-lg font-medium text-white">Benefit Types</h2>
                        <HelpIcon
                            content="Define benefit and deduction types that apply to your employees. Common examples include RRSP contributions, health benefits, and union dues."
                            size="sm"
                            className="ml-2"
                        />
                    </div>
                    <Button onClick={() => handleOpenModal()} icon={Plus}>
                        Add Benefit Type
                    </Button>
                </div>

                {benefitTypes.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground text-lg mb-2">No benefit types defined</p>
                        <p className="text-muted-foreground/60 text-sm mb-4">
                            Define benefit and deduction types that apply to your employees. Common examples include RRSP contributions, health benefits, and union dues.
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handlePreset('rrsp')}>
                                Add RRSP Contribution
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handlePreset('health')}>
                                Add Health Benefits
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handlePreset('union')}>
                                Add Union Dues
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handlePreset('vehicle')}>
                                Add Company Vehicle
                            </Button>
                        </div>
                    </div>
                )}

                {benefitTypes.length > 0 && (
                    <>
                        <div className="mb-4 flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => handlePreset('rrsp')}>
                                Quick Add: RRSP
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handlePreset('health')}>
                                Quick Add: Health
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handlePreset('union')}>
                                Quick Add: Union
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handlePreset('vehicle')}>
                                Quick Add: Vehicle
                            </Button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Name</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Category</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Type</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Default Value</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-foreground">T4 Box</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-foreground">Status</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {benefitTypes.map((benefit) => (
                                        <tr key={benefit.id} className="border-b border-border hover:bg-muted/30">
                                            <td className="py-3 px-4 text-sm text-foreground">{benefit.name}</td>
                                            <td className="py-3 px-4 text-sm text-muted-foreground">
                                                {getCategoryLabel(benefit.category)}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-muted-foreground">
                                                {getCalculationLabel(benefit.calculation_type)}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-muted-foreground">
                                                {getDefaultValue(benefit)}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-muted-foreground">
                                                {benefit.t4_box || '-'}
                                            </td>
                                            <td className="py-3 px-4">
                                                {benefit.is_active ? (
                                                    <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                                        <CheckCircle className="h-3 w-3" />
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                        <XCircle className="h-3 w-3" />
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
                    </>
                )}
            </Card>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-foreground">
                                {editingBenefit ? 'Edit Benefit Type' : 'Add Benefit Type'}
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
                                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => {
                                        setFormData({ ...formData, name: e.target.value });
                                        if (errors.name) setErrors({ ...errors, name: '' });
                                    }}
                                    className={`input ${errors.name ? 'border-red-500' : ''}`}
                                    required
                                    maxLength={100}
                                />
                                {errors.name && (
                                    <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="input min-h-[80px]"
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="category" className="block text-sm font-medium text-foreground mb-2">
                                        Category *
                                        <HelpIcon
                                            content="Taxable Benefit: Adds to gross income before tax. Pre-tax Deduction: Reduces taxable income (e.g., RRSP). Post-tax Deduction: After taxes (e.g., union dues)."
                                            size="sm"
                                            className="ml-2"
                                        />
                                    </label>
                                    <select
                                        id="category"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                        className="input"
                                        required
                                    >
                                        <option value="taxable_benefit">Taxable Benefit</option>
                                        <option value="pre_tax_deduction">Pre-tax Deduction</option>
                                        <option value="post_tax_deduction">Post-tax Deduction</option>
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="calculation_type" className="block text-sm font-medium text-foreground mb-2">
                                        Calculation Type *
                                        <HelpIcon
                                            content="Fixed: Set amount per pay. Percentage: Percentage of gross pay. Hourly: Rate per hour worked."
                                            size="sm"
                                            className="ml-2"
                                        />
                                    </label>
                                    <select
                                        id="calculation_type"
                                        value={formData.calculation_type}
                                        onChange={(e) => {
                                            setFormData({
                                                ...formData,
                                                calculation_type: e.target.value as any,
                                                default_amount: null,
                                                default_percentage: null,
                                                default_hourly_rate: null,
                                            });
                                        }}
                                        className="input"
                                        required
                                    >
                                        <option value="fixed">Fixed Amount</option>
                                        <option value="percentage">Percentage</option>
                                        <option value="hourly">Hourly Rate</option>
                                    </select>
                                </div>
                            </div>

                            {formData.calculation_type === 'fixed' && (
                                <div>
                                    <label htmlFor="default_amount" className="block text-sm font-medium text-foreground mb-2">
                                        Default Amount ($)
                                    </label>
                                    <input
                                        type="number"
                                        id="default_amount"
                                        step="0.01"
                                        min="0"
                                        value={formData.default_amount || ''}
                                        onChange={(e) => {
                                            setFormData({
                                                ...formData,
                                                default_amount: e.target.value ? parseFloat(e.target.value) : null,
                                            });
                                            if (errors.default_amount) setErrors({ ...errors, default_amount: '' });
                                        }}
                                        className={`input ${errors.default_amount ? 'border-red-500' : ''}`}
                                    />
                                    {errors.default_amount && (
                                        <p className="mt-1 text-xs text-red-500">{errors.default_amount}</p>
                                    )}
                                </div>
                            )}

                            {formData.calculation_type === 'percentage' && (
                                <div>
                                    <label htmlFor="default_percentage" className="block text-sm font-medium text-foreground mb-2">
                                        Default Percentage (%)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            id="default_percentage"
                                            step="0.0001"
                                            min="0"
                                            max="1"
                                            value={formData.default_percentage !== null ? formData.default_percentage : ''}
                                            onChange={(e) => {
                                                setFormData({
                                                    ...formData,
                                                    default_percentage: e.target.value ? parseFloat(e.target.value) : null,
                                                });
                                                if (errors.default_percentage) setErrors({ ...errors, default_percentage: '' });
                                            }}
                                            className={`input pr-8 ${errors.default_percentage ? 'border-red-500' : ''}`}
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                            <span className="text-muted-foreground text-sm">%</span>
                                        </div>
                                    </div>
                                    {errors.default_percentage && (
                                        <p className="mt-1 text-xs text-red-500">{errors.default_percentage}</p>
                                    )}
                                    <p className="mt-1 text-xs text-muted-foreground">Enter as decimal (0.05 = 5%)</p>
                                </div>
                            )}

                            {formData.calculation_type === 'hourly' && (
                                <div>
                                    <label htmlFor="default_hourly_rate" className="block text-sm font-medium text-foreground mb-2">
                                        Default Hourly Rate ($/hr)
                                    </label>
                                    <input
                                        type="number"
                                        id="default_hourly_rate"
                                        step="0.01"
                                        min="0"
                                        value={formData.default_hourly_rate || ''}
                                        onChange={(e) => {
                                            setFormData({
                                                ...formData,
                                                default_hourly_rate: e.target.value ? parseFloat(e.target.value) : null,
                                            });
                                            if (errors.default_hourly_rate) setErrors({ ...errors, default_hourly_rate: '' });
                                        }}
                                        className={`input ${errors.default_hourly_rate ? 'border-red-500' : ''}`}
                                    />
                                    {errors.default_hourly_rate && (
                                        <p className="mt-1 text-xs text-red-500">{errors.default_hourly_rate}</p>
                                    )}
                                </div>
                            )}

                            <div>
                                <label htmlFor="annual_maximum" className="block text-sm font-medium text-foreground mb-2">
                                    Annual Maximum ($)
                                    <HelpIcon
                                        content="Optional: Maximum amount per year for this benefit/deduction."
                                        size="sm"
                                        className="ml-2"
                                    />
                                </label>
                                <input
                                    type="number"
                                    id="annual_maximum"
                                    step="0.01"
                                    min="0"
                                    value={formData.annual_maximum || ''}
                                    onChange={(e) => {
                                        setFormData({
                                            ...formData,
                                            annual_maximum: e.target.value ? parseFloat(e.target.value) : null,
                                        });
                                        if (errors.annual_maximum) setErrors({ ...errors, annual_maximum: '' });
                                    }}
                                    className={`input ${errors.annual_maximum ? 'border-red-500' : ''}`}
                                />
                                {errors.annual_maximum && (
                                    <p className="mt-1 text-xs text-red-500">{errors.annual_maximum}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="t4_box" className="block text-sm font-medium text-foreground mb-2">
                                    T4 Box
                                    <HelpIcon
                                        content="Optional: T4 box number where this benefit/deduction appears (e.g., 40, 44, 50)."
                                        size="sm"
                                        className="ml-2"
                                    />
                                </label>
                                <input
                                    type="text"
                                    id="t4_box"
                                    value={formData.t4_box || ''}
                                    onChange={(e) => setFormData({ ...formData, t4_box: e.target.value })}
                                    className="input"
                                    placeholder="e.g., 40, 44, 50"
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                                <div>
                                    <label className="text-sm font-medium text-foreground">Active</label>
                                    <p className="text-xs text-muted-foreground">Inactive benefit types won't appear in new assignments</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-input peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-input after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
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
                                            : 'Create'
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

export default BenefitTypesManager;
