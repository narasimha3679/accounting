import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type EmployeeSchedule, type Employee } from '../lib/api';
import { X, Calendar, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import CalendarHeader from '../components/schedules/CalendarHeader';
import MonthCalendarView from '../components/schedules/MonthCalendarView';
import WeekTimelineView from '../components/schedules/WeekTimelineView';
import DayTimelineView from '../components/schedules/DayTimelineView';
import type { CalendarView } from '../components/schedules/ViewToggle';
import { calculateHours, formatDateKey, getWeekDates, getShiftsForDate } from '../lib/scheduleUtils';

const Schedules: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<EmployeeSchedule | null>(null);
    const [employeeFilter, setEmployeeFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<CalendarView>('month');
    const [prefilledDate, setPrefilledDate] = useState<Date | null>(null);
    const [prefilledTime, setPrefilledTime] = useState<{ hour: number; minute: number } | null>(null);
    const [prefilledEmployeeId, setPrefilledEmployeeId] = useState<number | undefined>(undefined);

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

    // Calculate visible date range (what the user sees in the calendar)
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
            // Day view - just the current day
            const dateKey = formatDateKey(currentDate);
            return {
                start_date: dateKey,
                end_date: dateKey,
            };
        }
    }, [view, currentDate]);

    // Fetch date range (may include extra days for overnight shifts)
    const dateRange = useMemo(() => {
        if (view === 'day') {
            // Include previous day for overnight shift segments
            const prevDate = new Date(currentDate);
            prevDate.setDate(currentDate.getDate() - 1);
            return {
                start_date: formatDateKey(prevDate),
                end_date: visibleDateRange.end_date,
            };
        }
        return visibleDateRange;
    }, [view, currentDate, visibleDateRange]);

    // Fetch schedules
    const { data: schedulesData, isLoading } = useQuery({
        queryKey: ['schedules', user?.company_id, employeeFilter, statusFilter, dateRange.start_date, dateRange.end_date],
        queryFn: async () => {
            const result = await api.getSchedules({
                company_id: user?.company_id,
                employee_id: employeeFilter ? parseInt(employeeFilter) : undefined,
                status: statusFilter || undefined,
                start_date: dateRange.start_date,
                end_date: dateRange.end_date,
                limit: 1000
            });
            return result.data;
        },
        enabled: !!user?.company_id,
    });

    // Delete schedule mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return api.deleteSchedule(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
        },
    });

    const handleDateClick = (date: Date) => {
        // Check if the day has any schedules
        const daySchedules = getShiftsForDate(schedulesData || [], date);
        
        if (daySchedules.length === 0) {
            // No schedules - open create modal
            setPrefilledDate(date);
            setCurrentDate(date);
            setShowCreateModal(true);
        } else {
            // Has schedules - switch to day view
            setCurrentDate(date);
            setView('day');
        }
    };

    const handleTimeSlotClick = (date: Date, hour: number, minute: number, employeeId?: number) => {
        setPrefilledDate(date);
        setPrefilledTime({ hour, minute });
        setPrefilledEmployeeId(employeeId);
        setCurrentDate(date);
        setShowCreateModal(true);
    };

    const handleShiftClick = (schedule: EmployeeSchedule) => {
        setEditingSchedule(schedule);
        setShowCreateModal(true);
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    // Filter schedules to only those in the visible date range
    const visibleSchedules = useMemo(() => {
        return schedulesData?.filter(s => {
            const scheduleDate = s.schedule_date.split('T')[0];
            return scheduleDate >= visibleDateRange.start_date && scheduleDate <= visibleDateRange.end_date;
        }) || [];
    }, [schedulesData, visibleDateRange]);

    const totalHours = useMemo(() => {
        return visibleSchedules.reduce((sum, s) => {
            return sum + calculateHours(s.start_time, s.end_time, s.break_duration_minutes);
        }, 0);
    }, [visibleSchedules]);

    const scheduledCount = useMemo(() => {
        const now = new Date();
        return visibleSchedules.filter(s => {
            if (s.status !== 'scheduled') return false;
            const scheduleDate = s.schedule_date.split('T')[0];
            const shiftStart = new Date(`${scheduleDate}T${s.start_time}`);
            return shiftStart >= now;
        }).length;
    }, [visibleSchedules]);

    const completedCount = useMemo(() => {
        const now = new Date();
        return visibleSchedules.filter(s => {
            // Cancelled shifts don't count as completed
            if (s.status === 'cancelled') return false;
            
            // Calculate shift end time
            const scheduleDate = s.schedule_date.split('T')[0];
            const shiftStart = new Date(`${scheduleDate}T${s.start_time}`);
            const shiftEnd = new Date(`${scheduleDate}T${s.end_time}`);
            
            // Handle overnight shifts (end time is before start time)
            if (shiftEnd < shiftStart) {
                shiftEnd.setDate(shiftEnd.getDate() + 1);
            }
            
            // Count as completed if explicitly marked OR if shift has ended
            return s.status === 'completed' || shiftEnd <= now;
        }).length;
    }, [visibleSchedules]);

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
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Schedules</h1>
                    <p className="text-muted-foreground mt-2">Manage employee work schedules</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
                            <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-muted-foreground truncate">
                                    Total Scheduled Hours
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
                        <div className="flex-shrink-0 p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                            <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-muted-foreground truncate">
                                    Upcoming Shifts
                                </dt>
                                <dd className="text-2xl font-bold text-foreground">
                                    {scheduledCount}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/20">
                            <Clock className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-muted-foreground truncate">
                                    Completed
                                </dt>
                                <dd className="text-2xl font-bold text-foreground">
                                    {completedCount}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Calendar Header */}
            <CalendarHeader
                currentDate={currentDate}
                view={view}
                onViewChange={setView}
                onDateChange={setCurrentDate}
                onToday={handleToday}
                employees={employees}
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

            {/* Calendar Views */}
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
                                schedules={schedulesData || []}
                                onDateClick={handleDateClick}
                                onShiftClick={handleShiftClick}
                            />
                        )}
                        {view === 'week' && (
                            <WeekTimelineView
                                currentDate={currentDate}
                                schedules={schedulesData || []}
                                onShiftClick={handleShiftClick}
                                onTimeSlotClick={handleTimeSlotClick}
                            />
                        )}
                        {view === 'day' && (
                            <DayTimelineView
                                currentDate={currentDate}
                                schedules={schedulesData || []}
                                employees={employees}
                                onShiftClick={handleShiftClick}
                                onTimeSlotClick={handleTimeSlotClick}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </Card>

            {/* Create/Edit Schedule Modal */}
            {(showCreateModal || editingSchedule) && (
                <ScheduleModal
                    schedule={editingSchedule}
                    employees={employees || []}
                    prefilledDate={prefilledDate}
                    prefilledTime={prefilledTime}
                    prefilledEmployeeId={prefilledEmployeeId}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingSchedule(null);
                        setPrefilledDate(null);
                        setPrefilledTime(null);
                        setPrefilledEmployeeId(undefined);
                    }}
                    onSave={() => {
                        queryClient.invalidateQueries({ queryKey: ['schedules'] });
                        setShowCreateModal(false);
                        setEditingSchedule(null);
                        setPrefilledDate(null);
                        setPrefilledTime(null);
                        setPrefilledEmployeeId(undefined);
                    }}
                    onDelete={(id) => {
                        deleteMutation.mutate(id, {
                            onSuccess: () => {
                                queryClient.invalidateQueries({ queryKey: ['schedules'] });
                                setShowCreateModal(false);
                                setEditingSchedule(null);
                            }
                        });
                    }}
                />
            )}
        </div>
    );
};

// Schedule Modal Component
interface ScheduleModalProps {
    schedule?: EmployeeSchedule | null;
    employees: Employee[];
    onClose: () => void;
    onSave: () => void;
    prefilledDate?: Date | null;
    prefilledTime?: { hour: number; minute: number } | null;
    prefilledEmployeeId?: number;
    onDelete?: (id: number) => void;
}

function ScheduleModal({ schedule, employees, onClose, onSave, prefilledDate, prefilledTime, prefilledEmployeeId, onDelete }: ScheduleModalProps) {
    const { user } = useAuth();
    
    // Determine initial date
    const initialDate = schedule?.schedule_date 
        ? schedule.schedule_date.split('T')[0]
        : prefilledDate
        ? `${prefilledDate.getFullYear()}-${String(prefilledDate.getMonth() + 1).padStart(2, '0')}-${String(prefilledDate.getDate()).padStart(2, '0')}`
        : '';

    // Determine initial time
    const initialStartTime = schedule?.start_time || (prefilledTime 
        ? `${String(prefilledTime.hour).padStart(2, '0')}:${String(prefilledTime.minute).padStart(2, '0')}`
        : '');
    
    const initialEndTime = schedule?.end_time || (prefilledTime
        ? `${String(Math.min(23, prefilledTime.hour + 8)).padStart(2, '0')}:${String(prefilledTime.minute).padStart(2, '0')}`
        : '');

    const [formData, setFormData] = useState({
        employee_id: schedule?.employee_id?.toString() || (prefilledEmployeeId ? prefilledEmployeeId.toString() : ''),
        schedule_date: initialDate,
        start_time: initialStartTime,
        end_time: initialEndTime,
        break_duration_minutes: schedule?.break_duration_minutes?.toString() || '0',
        notes: schedule?.notes || '',
        status: (schedule?.status || 'scheduled') as 'scheduled' | 'cancelled' | 'completed',
    });

    const createScheduleMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.createSchedule({
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

    const updateScheduleMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.updateSchedule(schedule!.id, {
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

        if (schedule) {
            updateScheduleMutation.mutate(formData);
        } else {
            createScheduleMutation.mutate(formData);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-foreground">
                        {schedule ? 'Edit Schedule' : 'Add New Schedule'}
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
                                <option value="scheduled">Scheduled</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="schedule_date" className="block text-sm font-medium text-foreground mb-2">
                                Date *
                            </label>
                            <input
                                id="schedule_date"
                                type="date"
                                value={formData.schedule_date}
                                onChange={(e) => setFormData({ ...formData, schedule_date: e.target.value })}
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

                    <div className="flex justify-between items-center pt-4 border-t border-border">
                        {schedule && onDelete && (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => {
                                    if (confirm('Are you sure you want to delete this schedule?')) {
                                        onDelete(schedule.id);
                                    }
                                }}
                            >
                                Delete
                            </Button>
                        )}
                        <div className="flex justify-end gap-3 ml-auto">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
                            >
                                {createScheduleMutation.isPending || updateScheduleMutation.isPending
                                    ? 'Saving...'
                                    : schedule
                                        ? 'Update Schedule'
                                        : 'Create Schedule'
                                }
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Schedules;
