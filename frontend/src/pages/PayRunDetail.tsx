import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { validatePayRun } from '../lib/payrollHelpers';

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

    const isNew = id === 'new';

    // Fetch pay run
    const { data: payRunData, isLoading } = useQuery({
        queryKey: ['payRun', id],
        queryFn: async () => {
            if (isNew) {
                // Create new draft pay run
                if (!user?.company_id) throw new Error('Company ID required');
                const today = new Date();
                const twoWeeksAgo = new Date(today);
                twoWeeksAgo.setDate(today.getDate() - 14);
                const oneWeekAgo = new Date(today);
                oneWeekAgo.setDate(today.getDate() - 7);

                const newPayRun = await api.createPayRun({
                    company_id: user.company_id,
                    pay_period_start: twoWeeksAgo.toISOString().split('T')[0],
                    pay_period_end: oneWeekAgo.toISOString().split('T')[0],
                    pay_date: today.toISOString().split('T')[0],
                });
                
                // Navigate to the new pay run
                navigate(`/payroll/runs/${newPayRun.id}`, { replace: true });
                return newPayRun;
            }
            return api.getPayRun(parseInt(id!));
        },
        enabled: !!id && !!user?.company_id,
    });

    const payRun = payRunData as (PayRun & { items?: PayRunItem[] }) | undefined;

    // Validate pay run when it changes
    useEffect(() => {
        if (payRun && payRun.items) {
            const validation = validatePayRun({
                items: payRun.items.map(item => ({
                    employee: item.employee ? { sin: item.employee.sin, payrate: item.employee.payrate } : undefined,
                    regular_hours: item.regular_hours,
                    overtime_hours: item.overtime_hours,
                    gross_pay: item.gross_pay,
                })),
            });
            setValidationWarnings(validation.warnings);
            setValidationErrors(validation.errors);
        }
    }, [payRun]);

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (data: Partial<PayRun>) => api.updatePayRun(payRun!.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payRun', id] });
            queryClient.invalidateQueries({ queryKey: ['payRuns'] });
        },
    });

    // Calculate all mutation
    const calculateAllMutation = useMutation({
        mutationFn: () => api.calculateAllPayRunItems(payRun!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payRun', id] });
        },
    });

    // Calculate single item mutation
    const calculateItemMutation = useMutation({
        mutationFn: (itemId: number) => api.calculatePayRunItem(itemId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payRun', id] });
        },
    });

    // Add employee mutation
    const addEmployeeMutation = useMutation({
        mutationFn: async (params: { employeeId: number; hours?: { regular: number; overtime: number } }) => {
            await api.addEmployeeToPayRun(payRun!.id, params.employeeId, params.hours);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payRun', id] });
            setShowAddEmployee(false);
        },
    });

    // Update item hours mutation
    const updateItemMutation = useMutation({
        mutationFn: ({ itemId, data }: { itemId: number; data: Partial<PayRunItem> }) =>
            api.updatePayRunItem(itemId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payRun', id] });
        },
    });

    // Remove item mutation
    const removeItemMutation = useMutation({
        mutationFn: async (itemId: number) => {
            await api.removePayRunItem(itemId);
            await api.recalculatePayRunTotals(payRun!.id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payRun', id] });
        },
    });

    // Workflow mutations
    const submitMutation = useMutation({
        mutationFn: () => api.submitPayRunForApproval(payRun!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payRun', id] });
            queryClient.invalidateQueries({ queryKey: ['payRuns'] });
        },
    });

    const approveMutation = useMutation({
        mutationFn: () => api.approvePayRun(payRun!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payRun', id] });
            queryClient.invalidateQueries({ queryKey: ['payRuns'] });
        },
    });

    const returnToDraftMutation = useMutation({
        mutationFn: () => api.returnPayRunToDraft(payRun!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payRun', id] });
            queryClient.invalidateQueries({ queryKey: ['payRuns'] });
        },
    });

    const finalizeMutation = useMutation({
        mutationFn: () => api.finalizePayRun(payRun!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payRun', id] });
            queryClient.invalidateQueries({ queryKey: ['payRuns'] });
        },
    });

    const handleHoursChange = async (itemId: number, field: string, value: number) => {
        await updateItemMutation.mutateAsync({ itemId, data: { [field]: value } });
        // Auto-calculate if draft
        if (payRun?.status === 'draft') {
            await calculateItemMutation.mutateAsync(itemId);
        }
    };

    const handleAddEmployee = async (employeeId: number, hours?: { regular: number; overtime: number }) => {
        await addEmployeeMutation.mutateAsync({ employeeId, hours });
    };

    const handleRemoveItem = (itemId: number) => {
        if (confirm('Remove this employee from the pay run?')) {
            removeItemMutation.mutate(itemId);
        }
    };

    const formatDate = (date: string) => {
        return formatLocalDate(date, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
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

            {/* Summary Card */}
            <PayRunSummaryCard payRun={payRun} />

            {/* Pay Period Info */}
            <Card className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">Pay Period Start</p>
                        <p className="text-foreground font-medium">{formatDate(payRun.pay_period_start)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">Pay Period End</p>
                        <p className="text-foreground font-medium">{formatDate(payRun.pay_period_end)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">Pay Date</p>
                        <p className="text-foreground font-medium">{formatDate(payRun.pay_date)}</p>
                    </div>
                </div>
            </Card>

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
                <div className="flex items-center justify-end gap-3">
                    {isDraft && (
                        <>
                            <Button
                                onClick={() => calculateAllMutation.mutate()}
                                icon={Calculator}
                                variant="outline"
                                disabled={calculateAllMutation.isPending || items.length === 0}
                            >
                                {calculateAllMutation.isPending ? 'Calculating...' : 'Calculate All'}
                            </Button>
                            <Button
                                onClick={() => updateMutation.mutate({})}
                                icon={Save}
                                variant="outline"
                                disabled={updateMutation.isPending}
                            >
                                Save
                            </Button>
                            <Button
                                onClick={() => submitMutation.mutate()}
                                icon={CheckCircle}
                                disabled={submitMutation.isPending || validationErrors.length > 0}
                            >
                                Submit for Approval
                            </Button>
                        </>
                    )}
                    {isPending && (
                        <>
                            <Button
                                onClick={() => returnToDraftMutation.mutate()}
                                icon={XCircle}
                                variant="outline"
                                disabled={returnToDraftMutation.isPending}
                            >
                                Return to Draft
                            </Button>
                            <Button
                                onClick={() => approveMutation.mutate()}
                                icon={CheckCircle}
                                disabled={approveMutation.isPending}
                            >
                                Approve
                            </Button>
                        </>
                    )}
                    {isApproved && (
                        <Button
                            onClick={() => finalizeMutation.mutate()}
                            icon={CheckCircle}
                            disabled={finalizeMutation.isPending}
                        >
                            Finalize
                        </Button>
                    )}
                    {isFinalized && (
                        <Button
                            icon={FileText}
                            variant="outline"
                            onClick={() => setShowPayStubs(true)}
                        >
                            View Pay Stubs
                        </Button>
                    )}
                </div>
            </Card>

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
