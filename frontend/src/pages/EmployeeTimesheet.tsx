import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type Timesheet } from '../lib/api';
import { Plus, Edit, Trash2, X, Clock, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const EmployeeTimesheet: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingTimesheet, setEditingTimesheet] = useState<Timesheet | null>(null);
    // Set default date range to last 30 days for better performance
    const getDefaultStartDate = () => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
    };
    
    const [startDateFilter, setStartDateFilter] = useState<string>(getDefaultStartDate());
    const [endDateFilter, setEndDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);

    // Fetch timesheets for current employee
    const { data: timesheetsData, isLoading } = useQuery({
        queryKey: ['timesheets', 'employee', user?.employee?.id, startDateFilter, endDateFilter],
        queryFn: async () => {
            if (!user?.employee?.id) return [];
            const result = await api.getTimesheets({
                employee_id: user.employee.id,
                start_date: startDateFilter || undefined,
                end_date: endDateFilter || undefined,
                limit: 100  // Reduced from 1000 to 100 for better performance
            });
            return result.data;
        },
        enabled: !!user?.employee?.id,
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

    // Submit timesheet mutation
    const submitMutation = useMutation({
        mutationFn: async (id: number) => {
            return api.submitTimesheet(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
        },
    });

    const handleDelete = (timesheet: Timesheet) => {
        if (confirm(`Are you sure you want to delete your timesheet for ${new Date(timesheet.timesheet_date).toLocaleDateString('en-CA')}?`)) {
            deleteMutation.mutate(timesheet.id);
        }
    };

    const handleSubmit = (timesheet: Timesheet) => {
        if (confirm(`Submit timesheet for ${new Date(timesheet.timesheet_date).toLocaleDateString('en-CA')} for approval?`)) {
            submitMutation.mutate(timesheet.id);
        }
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

    const draftCount = useMemo(() => {
        return timesheetsData?.filter(t => t.status === 'draft').length || 0;
    }, [timesheetsData]);

    if (!user?.isEmployee || !user.employee) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Access denied. This page is for employees only.</p>
            </div>
        );
    }

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
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">My Timesheets</h1>
                    <p className="text-muted-foreground mt-2">Submit and track your timesheets</p>
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
                        <div className="flex-shrink-0 p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-muted-foreground truncate">
                                    Approved Hours
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
                        <div className="flex-shrink-0 p-3 rounded-full bg-gray-100 dark:bg-gray-900/20">
                            <Edit className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-muted-foreground truncate">
                                    Draft Timesheets
                                </dt>
                                <dd className="text-2xl font-bold text-foreground">
                                    {draftCount}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                        {formattedDate}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    {timesheet.status === 'draft' && (
                                        <>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setEditingTimesheet(timesheet)}
                                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                                title="Edit"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleSubmit(timesheet)}
                                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                                title="Submit for Approval"
                                                disabled={submitMutation.isPending}
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(timesheet)}
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                    {timesheet.status === 'pending' && (
                                        <span className="text-sm text-muted-foreground">Awaiting approval...</span>
                                    )}
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
        </div>
    );
};

// Timesheet Modal Component
interface TimesheetModalProps {
    timesheet?: Timesheet | null;
    onClose: () => void;
    onSave: () => void;
}

function TimesheetModal({ timesheet, onClose, onSave }: TimesheetModalProps) {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        timesheet_date: timesheet?.timesheet_date ? timesheet.timesheet_date.split('T')[0] : '',
        start_time: timesheet?.start_time || '',
        end_time: timesheet?.end_time || '',
        break_duration_minutes: timesheet?.break_duration_minutes?.toString() || '0',
        notes: timesheet?.notes || '',
    });

    const createTimesheetMutation = useMutation({
        mutationFn: async (data: any) => {
            if (!user?.employee?.id || !user?.company_id) throw new Error('Missing employee or company information');
            return api.createTimesheet({
                ...data,
                company_id: user.company_id,
                employee_id: user.employee.id,
                break_duration_minutes: parseInt(data.break_duration_minutes) || 0,
                status: 'draft',
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
                break_duration_minutes: parseInt(data.break_duration_minutes) || 0,
            });
        },
        onSuccess: () => {
            onSave();
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user?.employee?.id || !user?.company_id) return;

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
                                    : 'Save as Draft'
                            }
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EmployeeTimesheet;
