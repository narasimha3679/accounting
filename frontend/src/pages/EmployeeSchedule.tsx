import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Calendar, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Card from '../components/ui/Card';
import { calculateHours, isPastDate, parseLocalDate } from '../lib/scheduleUtils';

const EmployeeSchedule: React.FC = () => {
    const { user } = useAuth();
    const [startDateFilter, setStartDateFilter] = useState<string>('');
    const [endDateFilter, setEndDateFilter] = useState<string>('');

    // Fetch schedules for current employee
    const { data: schedulesData, isLoading } = useQuery({
        queryKey: ['schedules', 'employee', user?.employee?.id, startDateFilter, endDateFilter],
        queryFn: async () => {
            if (!user?.employee?.id) return [];
            const result = await api.getSchedules({
                employee_id: user.employee.id,
                start_date: startDateFilter || undefined,
                end_date: endDateFilter || undefined,
                limit: 1000
            });
            return result.data;
        },
        enabled: !!user?.employee?.id,
    });


    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'cancelled':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            case 'completed':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    const totalHours = schedulesData?.reduce((sum, s) => {
        if (s.status === 'scheduled') {
            return sum + calculateHours(s.start_time, s.end_time, s.break_duration_minutes);
        }
        return sum;
    }, 0) || 0;

    const upcomingCount = schedulesData?.filter(s => 
        s.status === 'scheduled' && !isPastDate(s.schedule_date)
    ).length || 0;

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
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">My Schedule</h1>
                <p className="text-muted-foreground mt-2">View your work schedule</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
                            <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-muted-foreground truncate">
                                    Upcoming Hours
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
                            <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-muted-foreground truncate">
                                    Upcoming Shifts
                                </dt>
                                <dd className="text-2xl font-bold text-foreground">
                                    {upcomingCount}
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

            {/* Schedules List */}
            <div className="space-y-4">
                {schedulesData && schedulesData.length > 0 ? (
                    schedulesData.map((schedule) => (
                        <Card key={schedule.id} className="p-6">
                            <div className="mb-4">
                                <h3 className="text-lg font-medium text-foreground">
                                    {parseLocalDate(schedule.schedule_date).toLocaleDateString('en-CA', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="font-medium text-foreground">Start Time:</span>
                                    <p className="text-muted-foreground">{schedule.start_time}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-foreground">End Time:</span>
                                    <p className="text-muted-foreground">{schedule.end_time}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-foreground">Break:</span>
                                    <p className="text-muted-foreground">
                                        {schedule.break_duration_minutes} minutes
                                    </p>
                                </div>
                                <div>
                                    <span className="font-medium text-foreground">Hours:</span>
                                    <p className="text-muted-foreground">
                                        {calculateHours(schedule.start_time, schedule.end_time, schedule.break_duration_minutes).toFixed(1)}h
                                    </p>
                                </div>
                            </div>

                            {schedule.notes && (
                                <div className="mt-4 pt-4 border-t border-border">
                                    <span className="font-medium text-foreground">Notes:</span>
                                    <p className="text-muted-foreground mt-1">{schedule.notes}</p>
                                </div>
                            )}

                            <div className="mt-4">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(schedule.status)}`}>
                                    {schedule.status}
                                </span>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground text-lg">No schedules found</p>
                        <p className="text-muted-foreground/60">Your schedule will appear here when assigned</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeSchedule;
