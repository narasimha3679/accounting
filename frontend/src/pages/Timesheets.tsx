import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type Timesheet, type Employee } from '../lib/api';
import { Plus, Edit, Trash2, X, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const Timesheets: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingTimesheet, setEditingTimesheet] = useState<Timesheet | null>(null);
    const [rejectingTimesheet, setRejectingTimesheet] = useState<Timesheet | null>(null);
    const [employeeFilter, setEmployeeFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    
    // Set default date range to last 30 days for better performance
    const getDefaultStartDate = () => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
    };
    
    const [startDateFilter, setStartDateFilter] = useState<string>(getDefaultStartDate());
    const [endDateFilter, setEndDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);

    // Fetch employees for filter dropdown
    const { data: employees } = useQuery({
        queryKey: ['employees', user?.company_id],
        queryFn: async () => {
            const result = await api.getEmployees({
                company_id: user?.company_id,
                status: 'active',
                limit: 200  // Reduced from 1000 to 200 for better performance
            });
            return result.data;
        },
        enabled: !!user?.company_id,
        staleTime: 10 * 60 * 1000, // 10 minutes - employees don't change often
    });

    // Fetch timesheets with reasonable limit
    const { data: timesheetsData, isLoading } = useQuery({
        queryKey: ['timesheets', user?.company_id, employeeFilter, statusFilter, startDateFilter, endDateFilter],
        queryFn: async () => {
            const result = await api.getTimesheets({
                company_id: user?.company_id,
                employee_id: employeeFilter ? parseInt(employeeFilter) : undefined,
                status: statusFilter || undefined,
                start_date: startDateFilter || undefined,
                end_date: endDateFilter || undefined,
                limit: 100  // Reduced from 1000 to 100 for better performance
            });
            return result.data;
        },
        enabled: !!user?.company_id,
        staleTime: 2 * 60 * 1000, // 2 minutes - timesheets can change more frequently
    });

    // Delete timesheet mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return api.deleteTimesheet(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
        },
    });

    // Approve timesheet mutation
    const approveMutation = useMutation({
        mutationFn: async (id: number) => {
            return api.approveTimesheet(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
        },
    });

    // Reject timesheet mutation
    const rejectMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
            return api.rejectTimesheet(id, reason);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
            setRejectingTimesheet(null);
        },
    });

    const handleDelete = (timesheet: Timesheet) => {
        const employeeName = timesheet.employee 
            ? `${timesheet.employee.first_name} ${timesheet.employee.last_name}`
            : 'this timesheet';
        if (confirm(`Are you sure you want to delete the timesheet for ${employeeName} on ${new Date(timesheet.timesheet_date).toLocaleDateString('en-CA')}?`)) {
            deleteMutation.mutate(timesheet.id);
        }
    };

    const handleApprove = (timesheet: Timesheet) => {
        approveMutation.mutate(timesheet.id);
    };

    const handleReject = (timesheet: Timesheet) => {
        setRejectingTimesheet(timesheet);
    };

    const calculateHours = (startTime: string, endTime: string, breakMinutes: number): number => {
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        const diffMs = end.getTime() - start.getTime();
        const diffMinutes = diffMs / (1000 * 60) - breakMinutes;
        return Math.max(0, diffMinutes / 60);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'approved':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'rejected':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    // Memoize expensive calculations
    const totalHours = useMemo(() => {
        if (!timesheetsData) return 0;
        return timesheetsData.reduce((sum, t) => {
            if (t.status === 'approved') {
                return sum + calculateHours(t.start_time, t.end_time, t.break_duration_minutes);
            }
            return sum;
        }, 0);
    }, [timesheetsData]);

    const pendingCount = useMemo(() => {
        return timesheetsData?.filter(t => t.status === 'pending').length || 0;
    }, [timesheetsData]);

    const approvedCount = useMemo(() => {
        return timesheetsData?.filter(t => t.status === 'approved').length || 0;
    }, [timesheetsData]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Timesheets</h1>
                    <p className="text-muted-foreground mt-2">Manage and approve employee timesheets</p>
                </div>
                <Button
                    onClick={() => setShowCreateModal(true)}
                    icon={Plus}
                    className="w-full sm:w-auto"
                >
                    Add Timesheet
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
                            <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-muted-foreground truncate">
                                    Total Approved Hours
                                </dt>
                                <dd className="text-2xl font-bold text-foreground">
                                    {totalHours.toFixed(1)}h
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                            <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-muted-foreground truncate">
                                    Pending Approval
                                </dt>
                                <dd className="text-2xl font-bold text-foreground">
                                    {pendingCount}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-muted-foreground truncate">
                                    Approved
                                </dt>
                                <dd className="text-2xl font-bold text-foreground">
                                    {approvedCount}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Employee
                        </label>
                        <select
                            value={employeeFilter}
                            onChange={(e) => setEmployeeFilter(e.target.value)}
                            className="input"
                        >
                            <option value="">All Employees</option>
                            {employees?.map((emp) => (
                                <option key={emp.id} value={emp.id.toString()}>
                                    {emp.first_name} {emp.last_name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="input"
                        >
                            <option value="">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={startDateFilter}
                            onChange={(e) => setStartDateFilter(e.target.value)}
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            End Date
                        </label>
                        <input
                            type="date"
                            value={endDateFilter}
                            onChange={(e) => setEndDateFilter(e.target.value)}
                            className="input"
                        />
                    </div>
                </div>
            </Card>

            {/* Timesheets List */}
            <div className="space-y-4">
                {timesheetsData && timesheetsData.length > 0 ? (
                    timesheetsData.map((timesheet) => {
                        // Memoize calculated hours and formatted date per timesheet
                        const hours = calculateHours(timesheet.start_time, timesheet.end_time, timesheet.break_duration_minutes);
                        const formattedDate = new Date(timesheet.timesheet_date).toLocaleDateString('en-CA', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                        
                        return (
                        <Card key={timesheet.id} className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-medium text-foreground">
                                        {timesheet.employee 
                                            ? `${timesheet.employee.first_name} ${timesheet.employee.last_name}`
                                            : 'Unknown Employee'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {formattedDate}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {timesheet.status === 'pending' && (
                                        <>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleApprove(timesheet)}
                                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                                title="Approve"
                                                disabled={approveMutation.isPending}
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleReject(timesheet)}
                                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                                title="Reject"
                                            >
                                                <XCircle className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                    {timesheet.status === 'draft' && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setEditingTimesheet(timesheet)}
                                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                            title="Edit"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(timesheet)}
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="font-medium text-foreground">Start Time:</span>
                                    <p className="text-muted-foreground">{timesheet.start_time}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-foreground">End Time:</span>
                                    <p className="text-muted-foreground">{timesheet.end_time}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-foreground">Break:</span>
                                    <p className="text-muted-foreground">
                                        {timesheet.break_duration_minutes} minutes
                                    </p>
                                </div>
                                <div>
                                    <span className="font-medium text-foreground">Hours:</span>
                                    <p className="text-muted-foreground">
                                        {hours.toFixed(1)}h
                                    </p>
                                </div>
                            </div>

                            {timesheet.notes && (
                                <div className="mt-4 pt-4 border-t border-border">
                                    <span className="font-medium text-foreground">Notes:</span>
                                    <p className="text-muted-foreground mt-1">{timesheet.notes}</p>
                                </div>
                            )}

                            {timesheet.rejection_reason && (
                                <div className="mt-4 pt-4 border-t border-border">
                                    <span className="font-medium text-foreground text-red-600 dark:text-red-400">Rejection Reason:</span>
                                    <p className="text-muted-foreground mt-1">{timesheet.rejection_reason}</p>
                                </div>
                            )}

                            <div className="mt-4 flex items-center justify-between">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(timesheet.status)}`}>
                                    {timesheet.status}
                                </span>
                                {timesheet.approved_at && (
                                    <span className="text-xs text-muted-foreground">
                                        Approved: {new Date(timesheet.approved_at).toLocaleDateString('en-CA')}
                                    </span>
                                )}
                            </div>
                        </Card>
                        );
                    })
                ) : (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground text-lg">No timesheets found</p>
                        <p className="text-muted-foreground/60">Create your first timesheet to get started</p>
                    </div>
                )}
            </div>

            {/* Create/Edit Timesheet Modal */}
            {(showCreateModal || editingTimesheet) && (
                <TimesheetModal
                    timesheet={editingTimesheet}
                    employees={employees || []}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingTimesheet(null);
                    }}
                    onSave={() => {
                        queryClient.invalidateQueries({ queryKey: ['timesheets'] });
                        setShowCreateModal(false);
                        setEditingTimesheet(null);
                    }}
                />
            )}

            {/* Reject Timesheet Modal */}
            {rejectingTimesheet && (
                <RejectModal
                    timesheet={rejectingTimesheet}
                    onClose={() => setRejectingTimesheet(null)}
                    onReject={(reason) => {
                        rejectMutation.mutate({ id: rejectingTimesheet.id, reason });
                    }}
                />
            )}
        </div>
    );
};

// Timesheet Modal Component
interface TimesheetModalProps {
    timesheet?: Timesheet | null;
    employees: Employee[];
    onClose: () => void;
    onSave: () => void;
}

function TimesheetModal({ timesheet, employees, onClose, onSave }: TimesheetModalProps) {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        employee_id: timesheet?.employee_id?.toString() || '',
        timesheet_date: timesheet?.timesheet_date ? timesheet.timesheet_date.split('T')[0] : '',
        start_time: timesheet?.start_time || '',
        end_time: timesheet?.end_time || '',
        break_duration_minutes: timesheet?.break_duration_minutes?.toString() || '0',
        notes: timesheet?.notes || '',
        status: (timesheet?.status || 'approved') as 'draft' | 'pending' | 'approved' | 'rejected',
    });

    const createTimesheetMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.createTimesheet({
                ...data,
                company_id: user!.company_id,
                employee_id: parseInt(data.employee_id),
                break_duration_minutes: parseInt(data.break_duration_minutes) || 0,
            });
        },
        onSuccess: () => {
            onSave();
        },
    });

    const updateTimesheetMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.updateTimesheet(timesheet!.id, {
                ...data,
                employee_id: parseInt(data.employee_id),
                break_duration_minutes: parseInt(data.break_duration_minutes) || 0,
            });
        },
        onSuccess: () => {
            onSave();
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user?.company_id) return;

        // Validate times
        if (formData.start_time >= formData.end_time) {
            alert('End time must be after start time');
            return;
        }

        if (timesheet) {
            updateTimesheetMutation.mutate(formData);
        } else {
            createTimesheetMutation.mutate(formData);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-foreground">
                        {timesheet ? 'Edit Timesheet' : 'Add New Timesheet'}
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

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                            <label htmlFor="employee_id" className="block text-sm font-medium text-foreground mb-2">
                                Employee *
                            </label>
                            <select
                                id="employee_id"
                                value={formData.employee_id}
                                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                                className="input"
                                required
                            >
                                <option value="">Select employee...</option>
                                {employees.map((emp) => (
                                    <option key={emp.id} value={emp.id.toString()}>
                                        {emp.first_name} {emp.last_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-foreground mb-2">
                                Status *
                            </label>
                            <select
                                id="status"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                className="input"
                                required
                            >
                                <option value="approved">Approved</option>
                                <option value="draft">Draft</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="timesheet_date" className="block text-sm font-medium text-foreground mb-2">
                                Date *
                            </label>
                            <input
                                id="timesheet_date"
                                type="date"
                                value={formData.timesheet_date}
                                onChange={(e) => setFormData({ ...formData, timesheet_date: e.target.value })}
                                className="input"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="start_time" className="block text-sm font-medium text-foreground mb-2">
                                Start Time *
                            </label>
                            <input
                                id="start_time"
                                type="time"
                                value={formData.start_time}
                                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                className="input"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="end_time" className="block text-sm font-medium text-foreground mb-2">
                                End Time *
                            </label>
                            <input
                                id="end_time"
                                type="time"
                                value={formData.end_time}
                                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                className="input"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="break_duration_minutes" className="block text-sm font-medium text-foreground mb-2">
                                Break Duration (minutes)
                            </label>
                            <input
                                id="break_duration_minutes"
                                type="number"
                                min="0"
                                value={formData.break_duration_minutes}
                                onChange={(e) => setFormData({ ...formData, break_duration_minutes: e.target.value })}
                                className="input"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-2">
                                Notes
                            </label>
                            <textarea
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="input min-h-[80px]"
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={createTimesheetMutation.isPending || updateTimesheetMutation.isPending}
                        >
                            {createTimesheetMutation.isPending || updateTimesheetMutation.isPending
                                ? 'Saving...'
                                : timesheet
                                    ? 'Update Timesheet'
                                    : 'Create Timesheet'
                            }
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Reject Modal Component
interface RejectModalProps {
    timesheet: Timesheet;
    onClose: () => void;
    onReject: (reason: string) => void;
}

function RejectModal({ timesheet, onClose, onReject }: RejectModalProps) {
    const [reason, setReason] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) {
            alert('Please provide a rejection reason');
            return;
        }
        onReject(reason);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Reject Timesheet</h3>
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
                        <p className="text-sm text-muted-foreground mb-2">
                            Rejecting timesheet for {timesheet.employee 
                                ? `${timesheet.employee.first_name} ${timesheet.employee.last_name}`
                                : 'employee'} on {new Date(timesheet.timesheet_date).toLocaleDateString('en-CA')}
                        </p>
                        <label htmlFor="rejection_reason" className="block text-sm font-medium text-foreground mb-2">
                            Rejection Reason *
                        </label>
                        <textarea
                            id="rejection_reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="input min-h-[100px]"
                            rows={4}
                            required
                            placeholder="Please provide a reason for rejection..."
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                        >
                            Reject Timesheet
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Timesheets;
