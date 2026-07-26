import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api, { type PayRun, type PayRunItem } from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Save,
    Plus,
    Calculator,
    CheckCircle,
    ArrowLeft,
    XCircle,
    FileText,
    AlertCircle,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import PayRunStatusBadge from '../components/payroll/PayRunStatusBadge';
import PayRunSummaryCard from '../components/payroll/PayRunSummaryCard';
import { formatLocalDate } from '../lib/utils';
import PayRunItemsTable from '../components/payroll/PayRunItemsTable';
import AddEmployeeToPayRun from '../components/payroll/AddEmployeeToPayRun';
import PayRunItemDetail from '../components/payroll/PayRunItemDetail';
import PayStubsList from '../components/payroll/PayStubsList';
import { derivePayPeriodFromStart, validatePayRun } from '../lib/payrollHelpers';

const PayRunDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [showAddEmployee, setShowAddEmployee] = useState(false);
    const [viewingItem, setViewingItem] = useState<PayRunItem | null>(null);
    const [showPayStubs, setShowPayStubs] = useState(false);
    const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [periodStart, setPeriodStart] = useState('');
    const [periodEnd, setPeriodEnd] = useState('');
    const [payDate, setPayDate] = useState('');
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState('');
    const [actionError, setActionError] = useState('');
    const [showVoidDialog, setShowVoidDialog] = useState(false);
    const [voidReason, setVoidReason] = useState('');

    const isNew = id === 'new';

    // Legacy /new route — create flow lives in the list modal now
    useEffect(() => {
        if (isNew) {
            navigate('/payroll/runs', { replace: true });
        }
    }, [isNew, navigate]);

    // Ensure payroll settings before calculate
    const {
        data: payrollSettings,
        isLoading: settingsLoading,
        isError: settingsError,
    } = useQuery({
        queryKey: ['payrollSettings', user?.company_id],
        queryFn: async () => {
            if (!user?.company_id) throw new Error('Company ID required');
            const { settings } = await api.ensurePayrollSettings(user.company_id);
            return settings;
        },
        enabled: !!user?.company_id && !isNew,
    });

    // Fetch pay run
    const { data: payRunData, isLoading } = useQuery({
        queryKey: ['payRun', id],
        queryFn: async () => api.getPayRun(parseInt(id!)),
        enabled: !!id && !isNew && !!user?.company_id && !!payrollSettings,
    });

    const payRun = payRunData as (PayRun & { items?: PayRunItem[] }) | undefined;

    useEffect(() => {
        if (payRun) {
            setPeriodStart(payRun.pay_period_start);
            setPeriodEnd(payRun.pay_period_end);
            setPayDate(payRun.pay_date);
        }
    }, [payRun]);

    // Validate pay run when it changes
    useEffect(() => {
        if (payRun && payRun.items) {
            const validation = validatePayRun({
                items: payRun.items.map((item) => ({
                    employee: item.employee
                        ? { sin: item.employee.sin, payrate: item.employee.payrate }
                        : undefined,
                    regular_hours: item.regular_hours,
                    overtime_hours: item.overtime_hours,
                    gross_pay: item.gross_pay,
                })),
            });
            setValidationWarnings(validation.warnings);
            setValidationErrors(validation.errors);
        }
    }, [payRun]);

    const showMutationError = (error: Error) => {
        setActionError(error.message);
    };

    const clearActionError = () => setActionError('');

    const invalidatePayRunQueries = () => {
        queryClient.invalidateQueries({ queryKey: ['payRun', id] });
        queryClient.invalidateQueries({ queryKey: ['payRuns'] });
    };

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (data: Partial<PayRun>) => api.updatePayRun(payRun!.id, data),
        onSuccess: () => {
            invalidatePayRunQueries();
            setSaveError('');
            setSaveSuccess('Pay period dates saved');
            setTimeout(() => setSaveSuccess(''), 3000);
        },
        onError: (error: Error) => {
            setSaveSuccess('');
            setSaveError(error.message);
            showMutationError(error);
        },
    });

    // Calculate all mutation
    const calculateAllMutation = useMutation({
        mutationFn: () => api.calculateAllPayRunItems(payRun!.id),
        onSuccess: () => {
            clearActionError();
            queryClient.invalidateQueries({ queryKey: ['payRun', id] });
        },
        onError: showMutationError,
    });

    // Calculate single item mutation
    const calculateItemMutation = useMutation({
        mutationFn: (itemId: number) => api.calculatePayRunItem(itemId),
        onSuccess: () => {
            clearActionError();
            queryClient.invalidateQueries({ queryKey: ['payRun', id] });
        },
        onError: showMutationError,
    });

    // Add employee mutation
    const addEmployeeMutation = useMutation({
        mutationFn: async (params: {
            employeeId: number;
            hours?: { regular: number; overtime: number };
        }) => {
            await api.addEmployeeToPayRun(payRun!.id, params.employeeId, params.hours);
        },
        onSuccess: () => {
            clearActionError();
            queryClient.invalidateQueries({ queryKey: ['payRun', id] });
            setShowAddEmployee(false);
        },
        onError: showMutationError,
    });

    // Update item hours mutation
    const updateItemMutation = useMutation({
        mutationFn: ({ itemId, data }: { itemId: number; data: Partial<PayRunItem> }) =>
            api.updatePayRunItem(itemId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payRun', id] });
        },
        onError: showMutationError,
    });

    // Remove item mutation
    const removeItemMutation = useMutation({
        mutationFn: async (itemId: number) => {
            await api.removePayRunItem(itemId);
            await api.recalculatePayRunTotals(payRun!.id);
        },
        onSuccess: () => {
            clearActionError();
            queryClient.invalidateQueries({ queryKey: ['payRun', id] });
        },
        onError: showMutationError,
    });

    // Workflow mutations
    const submitMutation = useMutation({
        mutationFn: () => api.submitPayRunForApproval(payRun!.id),
        onSuccess: () => {
            clearActionError();
            invalidatePayRunQueries();
        },
        onError: showMutationError,
    });

    const approveMutation = useMutation({
        mutationFn: () => api.approvePayRun(payRun!.id),
        onSuccess: () => {
            clearActionError();
            invalidatePayRunQueries();
        },
        onError: showMutationError,
    });

    const returnToDraftMutation = useMutation({
        mutationFn: () => api.returnPayRunToDraft(payRun!.id),
        onSuccess: () => {
            clearActionError();
            invalidatePayRunQueries();
        },
        onError: showMutationError,
    });

    const finalizeMutation = useMutation({
        mutationFn: () => api.finalizePayRun(payRun!.id),
        onSuccess: () => {
            clearActionError();
            invalidatePayRunQueries();
        },
        onError: showMutationError,
    });

    const voidMutation = useMutation({
        mutationFn: (reason: string) => api.voidPayRun(payRun!.id, reason),
        onSuccess: () => {
            clearActionError();
            setShowVoidDialog(false);
            setVoidReason('');
            invalidatePayRunQueries();
        },
        onError: showMutationError,
    });

    // Solo-owner shortcut: calculate → submit → approve → finalize
    const calculateAndFinalizeMutation = useMutation({
        mutationFn: async () => {
            const payRunId = payRun!.id;
            await api.calculateAllPayRunItems(payRunId);
            await api.submitPayRunForApproval(payRunId);
            await api.approvePayRun(payRunId);
            await api.finalizePayRun(payRunId);
        },
        onSuccess: () => {
            clearActionError();
            invalidatePayRunQueries();
        },
        onError: showMutationError,
    });

    // Fired by the table on blur or after 2s idle (whichever first)
    const handleHoursChange = async (itemId: number, field: string, value: number) => {
        try {
            await updateItemMutation.mutateAsync({ itemId, data: { [field]: value } });
            if (payRun?.status === 'draft') {
                await calculateItemMutation.mutateAsync(itemId);
            }
        } catch {
            // Errors surfaced via mutation onError
        }
    };

    const handleAddEmployee = async (
        employeeId: number,
        hours?: { regular: number; overtime: number }
    ) => {
        await addEmployeeMutation.mutateAsync({ employeeId, hours });
    };

    const handleRemoveItem = (itemId: number) => {
        if (confirm('Remove this employee from the pay run?')) {
            removeItemMutation.mutate(itemId);
        }
    };

    const handlePeriodStartChange = (value: string) => {
        setPeriodStart(value);
        setSaveError('');
        setSaveSuccess('');
        if (!value) return;
        const frequency = payrollSettings?.pay_frequency ?? 'biweekly';
        const derived = derivePayPeriodFromStart(value, frequency);
        setPeriodEnd(derived.pay_period_end);
        setPayDate(derived.pay_date);
    };

    const handleSaveDates = () => {
        setSaveError('');
        setSaveSuccess('');

        if (!periodStart || !periodEnd || !payDate) {
            setSaveError('All date fields are required');
            return;
        }
        if (periodEnd < periodStart) {
            setSaveError('Pay period end must be on or after the start date');
            return;
        }
        if (payDate < periodEnd) {
            setSaveError('Pay date must be on or after the pay period end date');
            return;
        }

        updateMutation.mutate({
            pay_period_start: periodStart,
            pay_period_end: periodEnd,
            pay_date: payDate,
        });
    };

    const formatDate = (date: string) => {
        return formatLocalDate(date, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (isNew) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    if (isLoading || settingsLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    if (settingsError || !payrollSettings) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/payroll/runs')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-2xl font-bold text-white">Pay Run Details</h1>
                </div>
                <Card className="p-6 border-destructive/40 bg-destructive/10">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                        <div className="space-y-3">
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">
                                    Payroll settings required
                                </h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Configure payroll settings before calculating or finalizing a pay
                                    run.
                                </p>
                            </div>
                            <Button asChild>
                                <Link to="/settings/payroll">Go to Settings → Payroll</Link>
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    if (!payRun) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Pay run not found</p>
                <Button onClick={() => navigate('/payroll/runs')} className="mt-4" variant="outline">
                    Back to Pay Runs
                </Button>
            </div>
        );
    }

    const isDraft = payRun.status === 'draft';
    const isPending = payRun.status === 'pending_approval';
    const isApproved = payRun.status === 'approved';
    const isFinalized = payRun.status === 'finalized';

    const items = payRun.items || [];
    const datesDirty =
        periodStart !== payRun.pay_period_start ||
        periodEnd !== payRun.pay_period_end ||
        payDate !== payRun.pay_date;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/payroll/runs')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Pay Run Details</h1>
                        <p className="text-muted-foreground mt-1">
                            {formatDate(payRun.pay_period_start)} - {formatDate(payRun.pay_period_end)}
                        </p>
                    </div>
                </div>
                <PayRunStatusBadge status={payRun.status} />
            </div>

            {/* Validation Messages */}
            {actionError && (
                <Card className="p-4 border-destructive/40 bg-destructive/10">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-destructive mb-1">Error</h4>
                            <p className="text-sm text-destructive">{actionError}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={clearActionError}>
                            Dismiss
                        </Button>
                    </div>
                </Card>
            )}

            {validationErrors.length > 0 && (
                <Card className="p-4 bg-red-900/20 border-red-800">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-semibold text-red-300 mb-1">Errors</h4>
                            <ul className="text-sm text-red-300 list-disc list-inside">
                                {validationErrors.map((error, idx) => (
                                    <li key={idx}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Card>
            )}

            {validationWarnings.length > 0 && (
                <Card className="p-4 bg-yellow-900/20 border-yellow-800">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-semibold text-yellow-300 mb-1">Warnings</h4>
                            <ul className="text-sm text-yellow-300 list-disc list-inside">
                                {validationWarnings.map((warning, idx) => (
                                    <li key={idx}>{warning}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Card>
            )}

            {/* Pay period dates — editable while draft */}
            <Card className="p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight text-foreground">
                            Pay period
                        </h2>
                        {isDraft ? (
                            <p className="text-sm text-muted-foreground mt-1">
                                Change these dates like when you created the run. Changing start
                                auto-fills end and pay date from your{' '}
                                {(payrollSettings?.pay_frequency ?? 'biweekly').replace('_', '-')}{' '}
                                schedule. You can still adjust them. Click Save dates when done.
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground mt-1">
                                Dates are locked after the pay run leaves draft.
                            </p>
                        )}
                    </div>
                    {isDraft && (
                        <Button
                            onClick={handleSaveDates}
                            icon={Save}
                            size="sm"
                            disabled={updateMutation.isPending || !datesDirty}
                            className="shrink-0"
                        >
                            {updateMutation.isPending ? 'Saving...' : 'Save dates'}
                        </Button>
                    )}
                </div>
                {saveError && (
                    <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/40 text-sm text-destructive">
                        {saveError}
                    </div>
                )}
                {saveSuccess && (
                    <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/40 text-sm text-foreground">
                        {saveSuccess}
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Pay Period Start
                        </label>
                        {isDraft ? (
                            <input
                                type="date"
                                className="input w-full"
                                value={periodStart}
                                onChange={(e) => handlePeriodStartChange(e.target.value)}
                            />
                        ) : (
                            <p className="text-foreground font-medium">
                                {formatDate(payRun.pay_period_start)}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Pay Period End
                        </label>
                        {isDraft ? (
                            <input
                                type="date"
                                className="input w-full"
                                value={periodEnd}
                                onChange={(e) => {
                                    setPeriodEnd(e.target.value);
                                    setSaveError('');
                                    setSaveSuccess('');
                                }}
                            />
                        ) : (
                            <p className="text-foreground font-medium">
                                {formatDate(payRun.pay_period_end)}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Pay Date
                        </label>
                        {isDraft ? (
                            <input
                                type="date"
                                className="input w-full"
                                value={payDate}
                                onChange={(e) => {
                                    setPayDate(e.target.value);
                                    setSaveError('');
                                    setSaveSuccess('');
                                }}
                            />
                        ) : (
                            <p className="text-foreground font-medium">
                                {formatDate(payRun.pay_date)}
                            </p>
                        )}
                    </div>
                </div>
            </Card>

            {/* Summary Card */}
            <PayRunSummaryCard payRun={payRun} />

            {/* Employee Table */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Employees</h2>
                    {isDraft && (
                        <Button onClick={() => setShowAddEmployee(true)} icon={Plus} size="sm">
                            Add Employee
                        </Button>
                    )}
                </div>
                <PayRunItemsTable
                    items={items}
                    isEditable={isDraft}
                    onHoursChange={handleHoursChange}
                    onViewDetails={setViewingItem}
                    onRemove={handleRemoveItem}
                />
            </Card>

            {/* Action Buttons */}
            <Card className="p-6">
                <div className="flex items-center justify-end gap-3 flex-wrap">
                    {isDraft && (
                        <>
                            <Button
                                onClick={() => {
                                    clearActionError();
                                    calculateAllMutation.mutate();
                                }}
                                icon={Calculator}
                                variant="outline"
                                disabled={calculateAllMutation.isPending || items.length === 0}
                            >
                                {calculateAllMutation.isPending ? 'Calculating...' : 'Calculate All'}
                            </Button>
                            <Button
                                onClick={() => {
                                    clearActionError();
                                    submitMutation.mutate();
                                }}
                                icon={CheckCircle}
                                variant="outline"
                                disabled={submitMutation.isPending || validationErrors.length > 0}
                            >
                                Submit for Approval
                            </Button>
                            <Button
                                onClick={() => {
                                    clearActionError();
                                    calculateAndFinalizeMutation.mutate();
                                }}
                                icon={CheckCircle}
                                disabled={
                                    calculateAndFinalizeMutation.isPending ||
                                    items.length === 0 ||
                                    validationErrors.length > 0
                                }
                            >
                                {calculateAndFinalizeMutation.isPending
                                    ? 'Finalizing...'
                                    : 'Calculate & Finalize'}
                            </Button>
                        </>
                    )}
                    {isPending && (
                        <>
                            <Button
                                onClick={() => {
                                    clearActionError();
                                    returnToDraftMutation.mutate();
                                }}
                                icon={XCircle}
                                variant="outline"
                                disabled={returnToDraftMutation.isPending}
                            >
                                Return to Draft
                            </Button>
                            <Button
                                onClick={() => {
                                    clearActionError();
                                    approveMutation.mutate();
                                }}
                                icon={CheckCircle}
                                disabled={approveMutation.isPending}
                            >
                                Approve
                            </Button>
                        </>
                    )}
                    {isApproved && (
                        <Button
                            onClick={() => {
                                clearActionError();
                                finalizeMutation.mutate();
                            }}
                            icon={CheckCircle}
                            disabled={finalizeMutation.isPending}
                        >
                            Finalize
                        </Button>
                    )}
                    {isFinalized && (
                        <>
                            <Button
                                icon={FileText}
                                variant="outline"
                                onClick={() => setShowPayStubs(true)}
                            >
                                View Pay Stubs
                            </Button>
                            <Button
                                icon={XCircle}
                                variant="outline"
                                onClick={() => {
                                    clearActionError();
                                    setVoidReason('');
                                    setShowVoidDialog(true);
                                }}
                                disabled={voidMutation.isPending}
                            >
                                Void
                            </Button>
                        </>
                    )}
                </div>
            </Card>

            {showVoidDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
                        <h2 className="text-xl font-semibold tracking-tight text-foreground mb-2">
                            Void Pay Run
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            This reverses YTD totals and remittance period amounts. A reason is
                            required.
                        </p>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Void reason
                        </label>
                        <textarea
                            className="input w-full min-h-[96px] mb-4"
                            value={voidReason}
                            onChange={(e) => setVoidReason(e.target.value)}
                            placeholder="e.g. Incorrect hours entered"
                        />
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowVoidDialog(false)}
                                disabled={voidMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    if (!voidReason.trim()) {
                                        setActionError('Void reason is required');
                                        return;
                                    }
                                    voidMutation.mutate(voidReason.trim());
                                }}
                                disabled={voidMutation.isPending || !voidReason.trim()}
                            >
                                {voidMutation.isPending ? 'Voiding...' : 'Confirm Void'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            {showAddEmployee && payRun && (
                <AddEmployeeToPayRun
                    companyId={payRun.company_id}
                    payRunId={payRun.id}
                    existingEmployeeIds={items.map((item) => item.employee_id)}
                    periodStart={payRun.pay_period_start}
                    periodEnd={payRun.pay_period_end}
                    onAdd={handleAddEmployee}
                    onClose={() => setShowAddEmployee(false)}
                />
            )}

            {viewingItem && (
                <PayRunItemDetail item={viewingItem} onClose={() => setViewingItem(null)} />
            )}

            {showPayStubs && payRun && (
                <Card className="p-6">
                    <PayStubsList payRun={payRun} onClose={() => setShowPayStubs(false)} />
                </Card>
            )}
        </div>
    );
};

export default PayRunDetail;
