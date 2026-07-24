import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api, { type ROERecord, type ROEInput } from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, Eye, FileText, Plus, X } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { ROE_REASON_CODES } from '../lib/roeHelpers';
import ROEPreview from '../components/payroll/ROEPreview';
import SelectEmployeeForROEModal from '../components/payroll/SelectEmployeeForROEModal';

const ROEGeneration: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const isNew = id === 'new';
    const employeeIdParam = searchParams.get('employee');

    const [formData, setFormData] = useState<Partial<ROERecord>>({
        reason_code: '',
        first_day_worked: '',
        last_day_paid: '',
        final_pay_period_end: '',
        total_insurable_hours: 0,
        total_insurable_earnings: 0,
        vacation_pay: 0,
        pay_period_earnings: [],
        other_monies: [],
        comments: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showPreview, setShowPreview] = useState(false);
    const [isCollectingData, setIsCollectingData] = useState(false);

    // Fetch employee if provided
    const employeeId = employeeIdParam
        ? parseInt(employeeIdParam)
        : formData.employee_id || null;

    const { data: employee } = useQuery({
        queryKey: ['employee', employeeId],
        queryFn: () => (employeeId ? api.getEmployee(employeeId) : null),
        enabled: !!employeeId,
    });

    // Fetch existing ROE if editing
    const { data: existingROE, isLoading: isLoadingROE } = useQuery({
        queryKey: ['roe', id],
        queryFn: () => (id && !isNew ? api.getROE(parseInt(id)) : null),
        enabled: !!id && !isNew,
    });

    // Collect ROE data for employee
    const collectDataMutation = useMutation({
        mutationFn: (empId: number) => api.collectROEDataForEmployee(empId),
        onSuccess: (data) => {
            setFormData((prev) => ({
                ...prev,
                ...data,
                employee_id: employeeId!,
                company_id: user?.company_id!,
            }));
            setIsCollectingData(false);
        },
        onError: (error) => {
            alert(`Failed to collect ROE data: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setIsCollectingData(false);
        },
    });

    // Load existing ROE or collect data for new ROE
    useEffect(() => {
        if (existingROE) {
            setFormData(existingROE);
        } else if (isNew && employeeId && !formData.first_day_worked) {
            setIsCollectingData(true);
            collectDataMutation.mutate(employeeId);
        }
    }, [existingROE, isNew, employeeId]);

    // Create ROE mutation
    const createMutation = useMutation({
        mutationFn: (input: ROEInput) => api.createROE(input),
        onSuccess: (roe) => {
            queryClient.invalidateQueries({ queryKey: ['roes'] });
            navigate(`/payroll/roe/${roe.id}`);
        },
    });

    // Update ROE mutation
    const updateMutation = useMutation({
        mutationFn: (data: Partial<ROERecord>) => api.updateROE(parseInt(id!), data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roe', id] });
            queryClient.invalidateQueries({ queryKey: ['roes'] });
        },
    });

    // Generate ROE mutation
    const generateMutation = useMutation({
        mutationFn: () => api.generateROE(parseInt(id!)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roe', id] });
            queryClient.invalidateQueries({ queryKey: ['roes'] });
        },
    });

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.reason_code) {
            newErrors.reason_code = 'Reason code is required';
        }
        if (!formData.first_day_worked) {
            newErrors.first_day_worked = 'First day worked is required';
        }
        if (!formData.last_day_paid) {
            newErrors.last_day_paid = 'Last day paid is required';
        }
        if (!formData.final_pay_period_end) {
            newErrors.final_pay_period_end = 'Final pay period end is required';
        }
        if (formData.first_day_worked && formData.last_day_paid) {
            if (new Date(formData.first_day_worked) > new Date(formData.last_day_paid)) {
                newErrors.last_day_paid = 'Last day paid must be on or after first day worked';
            }
        }
        if (formData.total_insurable_hours !== undefined && formData.total_insurable_hours < 0) {
            newErrors.total_insurable_hours = 'Total insurable hours must be >= 0';
        }
        if (!formData.pay_period_earnings || formData.pay_period_earnings.length === 0) {
            newErrors.pay_period_earnings = 'At least one pay period is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;

        if (isNew) {
            if (!employeeId) {
                alert('Employee ID is required');
                return;
            }
            await createMutation.mutateAsync({
                employeeId,
                reasonCode: formData.reason_code!,
                lastDayPaid: formData.last_day_paid!,
                finalPayPeriodEnd: formData.final_pay_period_end!,
                vacationPay: formData.vacation_pay,
                otherMonies: formData.other_monies || undefined,
                comments: formData.comments || undefined,
            });
        } else {
            await updateMutation.mutateAsync(formData);
        }
    };

    const handleGenerate = async () => {
        if (!validate()) return;
        if (isNew) {
            await handleSave();
            return;
        }
        await generateMutation.mutateAsync();
    };

    const handlePayPeriodEarningsChange = (
        index: number,
        field: 'period_end' | 'earnings' | 'hours',
        value: string | number
    ) => {
        const updated = [...(formData.pay_period_earnings || [])];
        updated[index] = { ...updated[index], [field]: value };
        setFormData((prev) => ({
            ...prev,
            pay_period_earnings: updated,
            total_insurable_hours: updated.reduce((sum, p) => sum + (p.hours || 0), 0),
            total_insurable_earnings: updated.reduce((sum, p) => sum + (p.earnings || 0), 0),
        }));
    };

    const handleAddOtherMoney = () => {
        setFormData((prev) => ({
            ...prev,
            other_monies: [...(prev.other_monies || []), { type: '', amount: 0 }],
        }));
    };

    const handleRemoveOtherMoney = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            other_monies: prev.other_monies?.filter((_, i) => i !== index) || [],
        }));
    };

    const handleOtherMoneyChange = (index: number, field: 'type' | 'amount', value: string | number) => {
        const updated = [...(formData.other_monies || [])];
        updated[index] = { ...updated[index], [field]: value };
        setFormData((prev) => ({ ...prev, other_monies: updated }));
    };

    if (isLoadingROE) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    if (isNew && !employeeId) {
        if (!user?.company_id) {
            return (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Company required to create an ROE</p>
                </div>
            );
        }
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/payroll/roe')}>
                        Back
                    </Button>
                    <h1 className="text-2xl font-bold text-white">Generate Record of Employment</h1>
                </div>
                <Card className="p-6">
                    <p className="text-sm text-muted-foreground mb-4">
                        Select an employee to generate their Record of Employment.
                    </p>
                </Card>
                <SelectEmployeeForROEModal
                    companyId={user.company_id}
                    onSelect={(selectedId) => {
                        navigate(`/payroll/roe/new?employee=${selectedId}`, { replace: true });
                    }}
                    onClose={() => navigate('/payroll/roe')}
                />
            </div>
        );
    }

    if (isCollectingData) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald mx-auto mb-4"></div>
                    <p className="text-slate-muted">Collecting ROE data from pay run history...</p>
                </div>
            </div>
        );
    }

    if (!employee && employeeId) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-red-400">Employee not found</p>
            </div>
        );
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" icon={ArrowLeft} onClick={() => navigate('/payroll/roe')}>
                        Back
                    </Button>
                    <h1 className="text-2xl font-bold text-white">
                        {isNew ? 'Generate Record of Employment' : 'Edit Record of Employment'}
                    </h1>
                </div>
            </div>

            {employee && (
                <Card className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-slate-muted">Employee</p>
                            <p className="font-medium">
                                {employee.first_name} {employee.last_name} ({employee.employee_id})
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-muted">Status</p>
                            <p className="font-medium capitalize">{employee.status}</p>
                        </div>
                    </div>
                </Card>
            )}

            <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">ROE Information</h2>

                <div className="space-y-4">
                    {/* Block 10: First Day Worked */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            BLOCK 10: First Day Worked *
                        </label>
                        <input
                            type="date"
                            value={formData.first_day_worked || ''}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, first_day_worked: e.target.value }))
                            }
                            className={`w-full px-3 py-2 bg-slate-800 border rounded-lg ${
                                errors.first_day_worked ? 'border-red-500' : 'border-slate-700'
                            }`}
                        />
                        {errors.first_day_worked && (
                            <p className="text-red-400 text-sm mt-1">{errors.first_day_worked}</p>
                        )}
                    </div>

                    {/* Block 11: Last Day For Which Paid */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            BLOCK 11: Last Day For Which Paid *
                        </label>
                        <input
                            type="date"
                            value={formData.last_day_paid || ''}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, last_day_paid: e.target.value }))
                            }
                            className={`w-full px-3 py-2 bg-slate-800 border rounded-lg ${
                                errors.last_day_paid ? 'border-red-500' : 'border-slate-700'
                            }`}
                        />
                        {errors.last_day_paid && (
                            <p className="text-red-400 text-sm mt-1">{errors.last_day_paid}</p>
                        )}
                    </div>

                    {/* Block 12: Final Pay Period Ending Date */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            BLOCK 12: Final Pay Period Ending Date *
                        </label>
                        <input
                            type="date"
                            value={formData.final_pay_period_end || ''}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    final_pay_period_end: e.target.value,
                                }))
                            }
                            className={`w-full px-3 py-2 bg-slate-800 border rounded-lg ${
                                errors.final_pay_period_end ? 'border-red-500' : 'border-slate-700'
                            }`}
                        />
                        {errors.final_pay_period_end && (
                            <p className="text-red-400 text-sm mt-1">{errors.final_pay_period_end}</p>
                        )}
                    </div>

                    {/* Block 15A: Total Insurable Hours */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            BLOCK 15A: Total Insurable Hours *
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.total_insurable_hours || 0}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    total_insurable_hours: parseFloat(e.target.value) || 0,
                                }))
                            }
                            className={`w-full px-3 py-2 bg-slate-800 border rounded-lg ${
                                errors.total_insurable_hours ? 'border-red-500' : 'border-slate-700'
                            }`}
                        />
                        {errors.total_insurable_hours && (
                            <p className="text-red-400 text-sm mt-1">{errors.total_insurable_hours}</p>
                        )}
                    </div>

                    {/* Block 15B: Total Insurable Earnings */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            BLOCK 15B: Total Insurable Earnings *
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.total_insurable_earnings || 0}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    total_insurable_earnings: parseFloat(e.target.value) || 0,
                                }))
                            }
                            className={`w-full px-3 py-2 bg-slate-800 border rounded-lg ${
                                errors.total_insurable_earnings ? 'border-red-500' : 'border-slate-700'
                            }`}
                        />
                        <p className="text-sm text-slate-muted mt-1">
                            {formatCurrency(formData.total_insurable_earnings || 0)}
                        </p>
                    </div>

                    {/* Block 16: Reason for Issuing ROE */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            BLOCK 16: Reason for Issuing ROE *
                        </label>
                        <select
                            value={formData.reason_code || ''}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, reason_code: e.target.value }))
                            }
                            className={`w-full px-3 py-2 bg-slate-800 border rounded-lg ${
                                errors.reason_code ? 'border-red-500' : 'border-slate-700'
                            }`}
                        >
                            <option value="">Select reason code</option>
                            {ROE_REASON_CODES.map((reason) => (
                                <option key={reason.code} value={reason.code}>
                                    {reason.code} - {reason.label} ({reason.description})
                                </option>
                            ))}
                        </select>
                        {errors.reason_code && (
                            <p className="text-red-400 text-sm mt-1">{errors.reason_code}</p>
                        )}
                    </div>

                    {/* Block 17A: Vacation Pay */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            BLOCK 17A: Vacation Pay
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.vacation_pay || 0}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    vacation_pay: parseFloat(e.target.value) || 0,
                                }))
                            }
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                        />
                        <p className="text-sm text-slate-muted mt-1">
                            {formatCurrency(formData.vacation_pay || 0)}
                        </p>
                    </div>

                    {/* Block 17C: Other Monies */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium">
                                BLOCK 17C: Other Monies
                            </label>
                            <Button
                                variant="outline"
                                size="sm"
                                icon={Plus}
                                onClick={handleAddOtherMoney}
                            >
                                Add
                            </Button>
                        </div>
                        {formData.other_monies && formData.other_monies.length > 0 && (
                            <div className="space-y-2">
                                {formData.other_monies.map((money, index) => (
                                    <div key={index} className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Type (e.g., Severance)"
                                            value={money.type}
                                            onChange={(e) =>
                                                handleOtherMoneyChange(index, 'type', e.target.value)
                                            }
                                            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                                        />
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="Amount"
                                            value={money.amount}
                                            onChange={(e) =>
                                                handleOtherMoneyChange(
                                                    index,
                                                    'amount',
                                                    parseFloat(e.target.value) || 0
                                                )
                                            }
                                            className="w-32 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            icon={X}
                                            onClick={() => handleRemoveOtherMoney(index)}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Block 18: Comments */}
                    <div>
                        <label className="block text-sm font-medium mb-2">BLOCK 18: Comments</label>
                        <textarea
                            value={formData.comments || ''}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, comments: e.target.value }))
                            }
                            rows={3}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                        />
                    </div>
                </div>
            </Card>

            {/* Block 15C: Pay Period Earnings */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">
                    BLOCK 15C: Insurable Earnings by Pay Period (Last 27 Periods)
                </h2>
                {errors.pay_period_earnings && (
                    <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg">
                        <p className="text-red-400 text-sm">{errors.pay_period_earnings}</p>
                    </div>
                )}
                {formData.pay_period_earnings && formData.pay_period_earnings.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left py-2 px-3 text-sm font-medium">PP#</th>
                                    <th className="text-left py-2 px-3 text-sm font-medium">
                                        Period Ending
                                    </th>
                                    <th className="text-right py-2 px-3 text-sm font-medium">
                                        Insurable Earnings
                                    </th>
                                    <th className="text-right py-2 px-3 text-sm font-medium">Hours</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.pay_period_earnings.map((period, index) => (
                                    <tr key={index} className="border-b border-slate-700">
                                        <td className="py-2 px-3">{index + 1}</td>
                                        <td className="py-2 px-3">
                                            <input
                                                type="date"
                                                value={period.period_end}
                                                onChange={(e) =>
                                                    handlePayPeriodEarningsChange(
                                                        index,
                                                        'period_end',
                                                        e.target.value
                                                    )
                                                }
                                                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded"
                                            />
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={period.earnings}
                                                onChange={(e) =>
                                                    handlePayPeriodEarningsChange(
                                                        index,
                                                        'earnings',
                                                        parseFloat(e.target.value) || 0
                                                    )
                                                }
                                                className="w-32 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-right"
                                            />
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={period.hours}
                                                onChange={(e) =>
                                                    handlePayPeriodEarningsChange(
                                                        index,
                                                        'hours',
                                                        parseFloat(e.target.value) || 0
                                                    )
                                                }
                                                className="w-24 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-right"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-slate-muted">No pay period data available</p>
                )}
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <Button
                        variant="default"
                        icon={Save}
                        onClick={handleSave}
                        disabled={createMutation.isPending || updateMutation.isPending}
                    >
                        {createMutation.isPending || updateMutation.isPending
                            ? 'Saving...'
                            : 'Save Draft'}
                    </Button>
                    {!isNew && (
                        <Button
                            variant="outline"
                            icon={Eye}
                            onClick={() => setShowPreview(true)}
                        >
                            Preview
                        </Button>
                    )}
                </div>
                <Button
                    variant="default"
                    icon={FileText}
                    onClick={handleGenerate}
                    disabled={generateMutation.isPending}
                >
                    {generateMutation.isPending ? 'Generating...' : 'Generate ROE'}
                </Button>
            </div>

            {/* Preview Modal */}
            {showPreview && !isNew && existingROE && (
                <ROEPreview
                    roe={existingROE}
                    employee={employee!}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </div>
    );
};

export default ROEGeneration;
