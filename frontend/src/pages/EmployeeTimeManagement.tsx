import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import type { TimeEntry } from '../lib/api';
import { Calendar, Clock, Edit } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import TimeEntryModal from '../components/time/TimeEntryModal';
import TimeEntryCard from '../components/time/TimeEntryCard';
import { calculateHours } from '../lib/scheduleUtils';

const EmployeeTimeManagement: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
    const [prefilledDate, setPrefilledDate] = useState<Date | null>(null);
    const [startDateFilter, setStartDateFilter] = useState<string>('');
    const [endDateFilter, setEndDateFilter] = useState<string>('');

    const { data: timeMode, isLoading: isLoadingMode } = useQuery({
        queryKey: ['companyTimeMode', user?.company_id],
        queryFn: async () => {
            if (!user?.company_id) return null;
            return api.getCompanyTimeMode(user.company_id);
        },
        enabled: !!user?.company_id,
    });

    const isSubmittedMode = timeMode === 'submitted';
    const isAllottedMode = timeMode === 'allotted';

    // Fetch allotted entries (read-only)
    const { data: allottedData, isLoading: isLoadingAllotted } = useQuery({
        queryKey: ['timeEntries', 'employee', 'allotted', user?.employee?.id, startDateFilter, endDateFilter],
        queryFn: async () => {
            if (!user?.employee?.id) return [];
            const result = await api.getTimeEntries({
                employee_id: user.employee.id,
                entry_type: 'allotted',
                start_date: startDateFilter || undefined,
                end_date: endDateFilter || undefined,
                limit: 1000
            });
            return result.data;
        },
        enabled: !!user?.employee?.id && isAllottedMode,
    });

    // Fetch submitted entries (editable)
    const { data: submittedData, isLoading: isLoadingSubmitted } = useQuery({
        queryKey: ['timeEntries', 'employee', 'submitted', user?.employee?.id, startDateFilter, endDateFilter],
        queryFn: async () => {
            if (!user?.employee?.id) return [];
            const result = await api.getTimeEntries({
                employee_id: user.employee.id,
                entry_type: 'submitted',
                start_date: startDateFilter || undefined,
                end_date: endDateFilter || undefined,
                limit: 1000
            });
            return result.data;
        },
        enabled: !!user?.employee?.id && isSubmittedMode,
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return api.deleteTimeEntry(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
        },
    });

    // Submit mutation
    const submitMutation = useMutation({
        mutationFn: async (id: number) => {
            return api.submitTimeEntry(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
        },
    });

    const handleDelete = (entry: TimeEntry) => {
        if (confirm(`Are you sure you want to delete your time entry for ${new Date(entry.entry_date).toLocaleDateString('en-CA')}?`)) {
            deleteMutation.mutate(entry.id);
        }
    };

    const handleSubmit = (entry: TimeEntry) => {
        if (confirm(`Submit time entry for ${new Date(entry.entry_date).toLocaleDateString('en-CA')} for approval?`)) {
            submitMutation.mutate(entry.id);
        }
    };

    // Calculate statistics
    const totalHours = useMemo(() => {
        const data = isAllottedMode ? allottedData : submittedData;
        return (data || []).reduce((sum, e) => {
            if (e.status === 'scheduled' || e.status === 'approved') {
                return sum + calculateHours(e.start_time, e.end_time, e.break_duration_minutes);
            }
            return sum;
        }, 0);
    }, [isAllottedMode, allottedData, submittedData]);

    const pendingCount = useMemo(() => {
        if (!isSubmittedMode) return 0;
        return (submittedData || []).filter(e => e.status === 'pending').length;
    }, [isSubmittedMode, submittedData]);

    const draftCount = useMemo(() => {
        if (!isSubmittedMode) return 0;
        return (submittedData || []).filter(e => e.status === 'draft').length;
    }, [isSubmittedMode, submittedData]);

    const isLoading = isLoadingMode || (isSubmittedMode ? isLoadingSubmitted : isLoadingAllotted);
    const currentData = isAllottedMode ? allottedData : submittedData;

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

    if (!timeMode) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">My Time</h1>
                    <p className="text-muted-foreground mt-2">
                        Your company hasn&apos;t selected a time management mode yet.
                    </p>
                </div>
                <Card className="p-6">
                    <p className="text-muted-foreground">
                        Ask your manager to choose a time management mode in Settings so you can start tracking time.
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        {isAllottedMode ? 'My Schedule' : 'My Time'}
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        {isAllottedMode ? 'View your assigned schedule' : 'Log and track your hours'}
                    </p>
                </div>
                {isSubmittedMode && (
                    <Button
                        onClick={() => {
                            setPrefilledDate(null);
                            setShowCreateModal(true);
                        }}
                        icon={Edit}
                    >
                        Add Entry
                    </Button>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <StatCard
                    icon={Clock}
                    title={isAllottedMode ? 'Upcoming Hours' : 'Approved Hours'}
                    value={`${totalHours.toFixed(1)}h`}
                    gradient="blue"
                />
                {isSubmittedMode && (
                    <>
                        <StatCard
                            icon={Clock}
                            title="Pending Approval"
                            value={pendingCount.toString()}
                            gradient="amber"
                        />
                        <StatCard
                            icon={Edit}
                            title="Draft Entries"
                            value={draftCount.toString()}
                            gradient="none"
                        />
                    </>
                )}
                {isAllottedMode && (
                    <StatCard
                        icon={Calendar}
                        title="Upcoming Shifts"
                        value={(allottedData || []).filter(e => e.status === 'scheduled').length.toString()}
                        gradient="emerald"
                    />
                )}
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

            {/* Entries List */}
            <div className="space-y-4">
                {currentData && currentData.length > 0 ? (
                    currentData.map((entry) => (
                        <TimeEntryCard
                            key={entry.id}
                            entry={entry}
                            onEdit={isSubmittedMode && entry.status === 'draft' ? () => {
                                setEditingEntry(entry);
                                setShowCreateModal(true);
                            } : undefined}
                            onDelete={isSubmittedMode && entry.status === 'draft' ? () => handleDelete(entry) : undefined}
                            onSubmit={isSubmittedMode && entry.status === 'draft' ? () => handleSubmit(entry) : undefined}
                            showActions={isSubmittedMode}
                            isReadOnly={isAllottedMode}
                        />
                    ))
                ) : (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground text-lg">
                            {isAllottedMode ? 'No schedules found' : 'No time entries found'}
                        </p>
                        <p className="text-muted-foreground/60">
                            {isAllottedMode
                                ? 'Your schedule will appear here when assigned'
                                : 'Create your first time entry to get started'}
                        </p>
                    </div>
                )}
            </div>

            {/* Create/Edit Time Entry Modal */}
            {isSubmittedMode && (showCreateModal || editingEntry) && (
                <TimeEntryModal
                    entry={editingEntry}
                    employees={[]} // Not needed for employees
                    entryType="submitted"
                    prefilledDate={prefilledDate}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingEntry(null);
                        setPrefilledDate(null);
                    }}
                    onSave={() => {
                        queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
                        setShowCreateModal(false);
                        setEditingEntry(null);
                        setPrefilledDate(null);
                    }}
                    onDelete={(id) => {
                        deleteMutation.mutate(id, {
                            onSuccess: () => {
                                queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
                                setShowCreateModal(false);
                                setEditingEntry(null);
                            }
                        });
                    }}
                />
            )}
        </div>
    );
};

export default EmployeeTimeManagement;
