import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type TimeEntry } from '../lib/api';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import TimeEntryModal from '../components/time/TimeEntryModal';
import ApprovalPanel from '../components/time/ApprovalPanel';
import ModeSelectionModal from '../components/time/ModeSelectionModal';
import TimeEntryCard from '../components/time/TimeEntryCard';
import CalendarHeader from '../components/schedules/CalendarHeader';
import MonthCalendarView from '../components/schedules/MonthCalendarView';
import WeekTimelineView from '../components/schedules/WeekTimelineView';
import DayTimelineView from '../components/schedules/DayTimelineView';
import type { CalendarView } from '../components/schedules/ViewToggle';
import { calculateHours, formatDateKey, getWeekDates } from '../lib/scheduleUtils';
import type { EmployeeSchedule } from '../lib/api';

const TimeManagement: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
    const [employeeFilter, setEmployeeFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [startDateFilter, setStartDateFilter] = useState<string>('');
    const [endDateFilter, setEndDateFilter] = useState<string>('');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<CalendarView>('month');
    const [prefilledDate, setPrefilledDate] = useState<Date | null>(null);
    const [prefilledTime, setPrefilledTime] = useState<{ hour: number; minute: number } | null>(null);
    const [prefilledEmployeeId, setPrefilledEmployeeId] = useState<number | undefined>(undefined);

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


    // Fetch employees for filter dropdown
    const { data: employees } = useQuery({
        queryKey: ['employees', user?.company_id],
        queryFn: async () => {
            const result = await api.getEmployees({
                company_id: user?.company_id,
                status: 'active',
                limit: 1000
            });
            return result.data;
        },
        enabled: !!user?.company_id,
    });

    // Calculate visible date range
    const visibleDateRange = useMemo(() => {
        if (view === 'month') {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const start = new Date(year, month, 1);
            const end = new Date(year, month + 1, 0);
            return {
                start_date: formatDateKey(start),
                end_date: formatDateKey(end),
            };
        } else if (view === 'week') {
            const weekDates = getWeekDates(currentDate);
            return {
                start_date: formatDateKey(weekDates[0]),
                end_date: formatDateKey(weekDates[6]),
            };
        } else {
            const dateKey = formatDateKey(currentDate);
            return {
                start_date: dateKey,
                end_date: dateKey,
            };
        }
    }, [view, currentDate]);

    const dateRange = useMemo(() => {
        if (view === 'day') {
            const prevDate = new Date(currentDate);
            prevDate.setDate(currentDate.getDate() - 1);
            return {
                start_date: formatDateKey(prevDate),
                end_date: visibleDateRange.end_date,
            };
        }
        return visibleDateRange;
    }, [view, currentDate, visibleDateRange]);

    const activeDateRange = useMemo(() => {
        if (isSubmittedMode) {
            return {
                start_date: startDateFilter || undefined,
                end_date: endDateFilter || undefined,
            };
        }
        return {
            start_date: dateRange.start_date,
            end_date: dateRange.end_date,
        };
    }, [isSubmittedMode, startDateFilter, endDateFilter, dateRange]);

    // Fetch time entries for selected mode
    const { data: timeEntriesData, isLoading } = useQuery({
        queryKey: [
            'timeEntries',
            user?.company_id,
            timeMode,
            employeeFilter,
            statusFilter,
            activeDateRange.start_date,
            activeDateRange.end_date,
        ],
        queryFn: async () => {
            if (!timeMode) return [];
            const result = await api.getTimeEntries({
                company_id: user?.company_id,
                employee_id: employeeFilter ? parseInt(employeeFilter) : undefined,
                status: statusFilter || undefined,
                entry_type: timeMode,
                start_date: activeDateRange.start_date,
                end_date: activeDateRange.end_date,
                limit: 1000
            });
            return result.data;
        },
        enabled: !!user?.company_id && !!timeMode,
    });

    // Fetch pending entries for approval panel
    const { data: pendingEntriesData } = useQuery({
        queryKey: ['timeEntries', 'pending', user?.company_id],
        queryFn: async () => {
            const result = await api.getTimeEntries({
                company_id: user?.company_id,
                status: 'pending',
                entry_type: 'submitted',
                limit: 100
            });
            return result.data;
        },
        enabled: !!user?.company_id && isSubmittedMode,
    });

    // Convert TimeEntry to EmployeeSchedule for calendar components
    const adaptedSchedules = useMemo(() => {
        if (!timeEntriesData || !isAllottedMode) return [];
        return timeEntriesData.map(entry => ({
            id: entry.id,
            company_id: entry.company_id,
            employee_id: entry.employee_id,
            schedule_date: entry.entry_date,
            start_time: entry.start_time,
            end_time: entry.end_time,
            break_duration_minutes: entry.break_duration_minutes,
            notes: entry.notes,
            status: entry.status === 'scheduled' ? 'scheduled' : entry.status === 'cancelled' ? 'cancelled' : 'completed',
            created_by: entry.created_by,
            created_at: entry.created_at,
            updated_at: entry.updated_at,
            employee: entry.employee,
        } as EmployeeSchedule));
    }, [timeEntriesData, isAllottedMode]);

    // Compute available employees from time entries in current date range
    const availableEmployees = useMemo(() => {
        if (!timeEntriesData || !employees || !isAllottedMode) return [];
        const employeeIdsInUse = new Set(timeEntriesData.map(e => e.employee_id));
        return employees.filter(emp => employeeIdsInUse.has(emp.id));
    }, [timeEntriesData, employees, isAllottedMode]);

    // Reset employee filter if it becomes unavailable (e.g., after date change)
    useEffect(() => {
        if (employeeFilter && isAllottedMode) {
            if (availableEmployees.length === 0) {
                // No employees available, reset to empty (all)
                setEmployeeFilter('');
            } else {
                const employeeExists = availableEmployees.some(emp => emp.id === parseInt(employeeFilter));
                if (!employeeExists) {
                    setEmployeeFilter('');
                }
            }
        }
    }, [employeeFilter, availableEmployees, isAllottedMode]);

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return api.deleteTimeEntry(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
        },
    });

    // Approve mutation
    const approveMutation = useMutation({
        mutationFn: async (id: number) => {
            return api.approveTimeEntry(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
        },
    });

    // Reject mutation
    const rejectMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
            return api.rejectTimeEntry(id, reason);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
        },
    });

    const updateTimeModeMutation = useMutation({
        mutationFn: async (selectedMode: 'allotted' | 'submitted') => {
            if (!user?.company_id) return;
            await api.updateCompanyTimeMode(user.company_id, selectedMode);
        },
        onSuccess: (_data, selectedMode) => {
            queryClient.setQueryData(['companyTimeMode', user?.company_id], selectedMode);
        },
    });

    const handleDateClick = (date: Date) => {
        setPrefilledDate(date);
        setCurrentDate(date);
        setShowCreateModal(true);
    };

    const handleTimeSlotClick = (date: Date, hour: number, minute: number, employeeId?: number) => {
        setPrefilledDate(date);
        setPrefilledTime({ hour, minute });
        setPrefilledEmployeeId(employeeId);
        setCurrentDate(date);
        setShowCreateModal(true);
    };

    const handleShiftClick = (schedule: EmployeeSchedule) => {
        const entry = timeEntriesData?.find(e => e.id === schedule.id);
        if (entry) {
            setEditingEntry(entry);
            setShowCreateModal(true);
        }
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    // Calculate statistics
    const approvedHours = useMemo(() => {
        if (!isSubmittedMode) return 0;
        return (timeEntriesData || []).reduce((sum, e) => {
            if (e.status === 'approved') {
                return sum + calculateHours(e.start_time, e.end_time, e.break_duration_minutes);
            }
            return sum;
        }, 0);
    }, [timeEntriesData, isSubmittedMode]);

    const scheduledHours = useMemo(() => {
        if (!isAllottedMode) return 0;
        return (timeEntriesData || []).reduce((sum, e) => {
            if (e.status === 'scheduled' || e.status === 'completed') {
                return sum + calculateHours(e.start_time, e.end_time, e.break_duration_minutes);
            }
            return sum;
        }, 0);
    }, [timeEntriesData, isAllottedMode]);

    const pendingCount = useMemo(() => {
        if (!isSubmittedMode) return 0;
        return (timeEntriesData || []).filter(e => e.status === 'pending').length;
    }, [timeEntriesData, isSubmittedMode]);

    const todayCount = useMemo(() => {
        if (!isSubmittedMode) return 0;
        const today = formatDateKey(new Date());
        return (timeEntriesData || []).filter(e => e.entry_date.split('T')[0] === today).length;
    }, [timeEntriesData, isSubmittedMode]);

    const shiftCount = useMemo(() => {
        if (!isAllottedMode) return 0;
        return (timeEntriesData || []).filter(e => e.status === 'scheduled').length;
    }, [timeEntriesData, isAllottedMode]);

    if (isLoading || isLoadingMode) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {timeMode === null && (
                <ModeSelectionModal
                    onSelect={(selectedMode) => updateTimeModeMutation.mutate(selectedMode)}
                    isSaving={updateTimeModeMutation.isPending}
                />
            )}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Time Management</h1>
                    <p className="text-muted-foreground mt-2">
                        {isAllottedMode
                            ? 'Plan schedules and manage shifts'
                            : 'Review and approve submitted hours'}
                    </p>
                    {timeMode && (
                        <div className="mt-2 inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                            Mode: {isAllottedMode ? 'Fixed schedules' : 'Employees enter time'}
                        </div>
                    )}
                </div>
                {isSubmittedMode && (
                    <Button
                        onClick={() => {
                            setPrefilledDate(null);
                            setPrefilledTime(null);
                            setPrefilledEmployeeId(undefined);
                            setShowCreateModal(true);
                        }}
                    >
                        Add Time Entry
                    </Button>
                )}
            </div>

            {/* Summary Cards */}
            {timeMode && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    <StatCard
                        icon={Clock}
                        title={isAllottedMode ? 'Total Scheduled Hours' : 'Total Approved Hours'}
                        value={`${(isAllottedMode ? scheduledHours : approvedHours).toFixed(1)}h`}
                        gradient="blue"
                    />
                    {isSubmittedMode && (
                        <>
                            <StatCard
                                icon={AlertCircle}
                                title="Pending Approval"
                                value={pendingCount.toString()}
                                gradient="amber"
                            />
                            <StatCard
                                icon={Calendar}
                                title="Today's Entries"
                                value={todayCount.toString()}
                                gradient="emerald"
                            />
                        </>
                    )}
                    {isAllottedMode && (
                        <StatCard
                            icon={Calendar}
                            title="Scheduled Shifts"
                            value={shiftCount.toString()}
                            gradient="emerald"
                        />
                    )}
                </div>
            )}

            {isSubmittedMode && (
                <>
                    {pendingEntriesData && pendingEntriesData.length > 0 && (
                        <ApprovalPanel
                            pendingEntries={pendingEntriesData}
                            onApprove={(entry) => approveMutation.mutate(entry.id)}
                            onReject={(entry, reason) => rejectMutation.mutate({ id: entry.id, reason })}
                        />
                    )}

                    <Card className="p-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Employee
                                </label>
                                <select
                                    value={employeeFilter}
                                    onChange={(e) => setEmployeeFilter(e.target.value)}
                                    className="input"
                                >
                                    <option value="">All employees</option>
                                    {(employees || []).map((emp) => (
                                        <option key={emp.id} value={emp.id.toString()}>
                                            {emp.first_name} {emp.last_name}
                                        </option>
                                    ))}
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
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Status
                                </label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="input"
                                >
                                    <option value="">All statuses</option>
                                    <option value="draft">Draft</option>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                        </div>
                    </Card>

                    <div className="space-y-4">
                        {timeEntriesData && timeEntriesData.length > 0 ? (
                            timeEntriesData.map((entry) => (
                                <TimeEntryCard
                                    key={entry.id}
                                    entry={entry}
                                    showActions={false}
                                />
                            ))
                        ) : (
                            <Card className="p-6">
                                <p className="text-muted-foreground text-center">
                                    No time entries found for the selected filters.
                                </p>
                            </Card>
                        )}
                    </div>
                </>
            )}

            {isAllottedMode && (
                <>
                    <CalendarHeader
                        currentDate={currentDate}
                        view={view}
                        onViewChange={setView}
                        onDateChange={setCurrentDate}
                        onToday={handleToday}
                        employees={availableEmployees}
                        employeeFilter={employeeFilter}
                        statusFilter={statusFilter}
                        onEmployeeFilterChange={setEmployeeFilter}
                        onStatusFilterChange={setStatusFilter}
                        onCreateSchedule={() => {
                            setPrefilledDate(null);
                            setPrefilledTime(null);
                            setPrefilledEmployeeId(undefined);
                            setShowCreateModal(true);
                        }}
                    />

                    <Card className="p-4 sm:p-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={view}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                            >
                                {view === 'month' && (
                                    <MonthCalendarView
                                        currentDate={currentDate}
                                        schedules={adaptedSchedules}
                                        onDateClick={handleDateClick}
                                        onShiftClick={handleShiftClick}
                                    />
                                )}
                                {view === 'week' && (
                                    <WeekTimelineView
                                        currentDate={currentDate}
                                        schedules={adaptedSchedules}
                                        onShiftClick={handleShiftClick}
                                        onTimeSlotClick={handleTimeSlotClick}
                                    />
                                )}
                                {view === 'day' && (
                                    <DayTimelineView
                                        currentDate={currentDate}
                                        schedules={adaptedSchedules}
                                        employees={employees}
                                        onShiftClick={handleShiftClick}
                                        onTimeSlotClick={handleTimeSlotClick}
                                    />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </Card>
                </>
            )}

            {/* Create/Edit Time Entry Modal */}
            {timeMode && (showCreateModal || editingEntry) && (
                <TimeEntryModal
                    entry={editingEntry}
                    employees={employees || []}
                    entryType={isAllottedMode ? 'allotted' : 'submitted'}
                    prefilledDate={prefilledDate}
                    prefilledTime={prefilledTime}
                    prefilledEmployeeId={prefilledEmployeeId}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingEntry(null);
                        setPrefilledDate(null);
                        setPrefilledTime(null);
                        setPrefilledEmployeeId(undefined);
                    }}
                    onSave={() => {
                        queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
                        setShowCreateModal(false);
                        setEditingEntry(null);
                        setPrefilledDate(null);
                        setPrefilledTime(null);
                        setPrefilledEmployeeId(undefined);
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

export default TimeManagement;
