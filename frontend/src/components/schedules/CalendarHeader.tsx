import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../ui/Button';
import ViewToggle, { type CalendarView } from './ViewToggle';
import { cn } from '../../lib/utils';
import type { Employee } from '../../lib/api';

interface CalendarHeaderProps {
    currentDate: Date;
    view: CalendarView;
    onViewChange: (view: CalendarView) => void;
    onDateChange: (date: Date) => void;
    onToday: () => void;
    employees?: Employee[];
    employeeFilter: string;
    statusFilter: string;
    onEmployeeFilterChange: (value: string) => void;
    onStatusFilterChange: (value: string) => void;
    onCreateSchedule?: () => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
    currentDate,
    view,
    onViewChange,
    onDateChange,
    onToday,
    employees,
    employeeFilter,
    statusFilter,
    onEmployeeFilterChange,
    onStatusFilterChange,
    onCreateSchedule,
}) => {
    const [showFilters, setShowFilters] = useState(false);

    const formatDateDisplay = () => {
        if (view === 'month') {
            return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } else {
            // Week view
            const weekStart = new Date(currentDate);
            weekStart.setDate(currentDate.getDate() - currentDate.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            return `${startStr} - ${endStr}`;
        }
    };

    const navigateDate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        
        if (view === 'month') {
            newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        } else {
            // Week view
            newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        }
        
        onDateChange(newDate);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Left: Date Navigation */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigateDate('prev')}
                            className="h-9 w-9"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigateDate('next')}
                            className="h-9 w-9"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={onToday}
                            className="px-4"
                        >
                            Today
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                        <CalendarIcon className="h-5 w-5 text-neon-emerald" />
                        <span>{formatDateDisplay()}</span>
                    </div>
                </div>

                {/* Right: View Toggle and Actions */}
                <div className="flex items-center gap-3">
                    <ViewToggle view={view} onChange={onViewChange} />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            'h-9 w-9',
                            showFilters && 'bg-neon-emerald/10 text-neon-emerald'
                        )}
                    >
                        <Filter className="h-4 w-4" />
                    </Button>
                    {onCreateSchedule && (
                        <Button
                            onClick={onCreateSchedule}
                            className="hidden sm:flex"
                        >
                            Add Schedule
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters Panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="glass rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-foreground">Filters</h3>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowFilters(false)}
                                    className="h-6 w-6"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Employee
                                    </label>
                                    <select
                                        value={employeeFilter}
                                        onChange={(e) => onEmployeeFilterChange(e.target.value)}
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
                                        onChange={(e) => onStatusFilterChange(e.target.value)}
                                        className="input"
                                    >
                                        <option value="">All Status</option>
                                        <option value="scheduled">Scheduled</option>
                                        <option value="cancelled">Cancelled</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CalendarHeader;
