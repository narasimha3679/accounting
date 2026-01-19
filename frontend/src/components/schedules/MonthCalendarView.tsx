import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { EmployeeSchedule } from '../../lib/api';
import {
    getMonthDates,
    isToday,
    isPast,
    formatDateKey,
    getEmployeeColorClasses,
} from '../../lib/scheduleUtils';
import { cn } from '../../lib/utils';

interface MonthCalendarViewProps {
    currentDate: Date;
    schedules: EmployeeSchedule[];
    onDateClick: (date: Date) => void;
    onShiftClick: (schedule: EmployeeSchedule) => void;
}

const MonthCalendarView: React.FC<MonthCalendarViewProps> = ({
    currentDate,
    schedules,
    onDateClick,
    onShiftClick,
}) => {
    const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

    const monthDates = useMemo(() => {
        return getMonthDates(currentDate.getFullYear(), currentDate.getMonth());
    }, [currentDate]);

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const groupedSchedules = useMemo(() => {
        const grouped: Record<string, EmployeeSchedule[]> = {};
        schedules.forEach(schedule => {
            const dateKey = schedule.schedule_date.split('T')[0];
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(schedule);
        });
        return grouped;
    }, [schedules]);

    const getShiftsForDateKey = (dateKey: string): EmployeeSchedule[] => {
        return groupedSchedules[dateKey] || [];
    };

    const isCurrentMonth = (date: Date): boolean => {
        return date.getMonth() === currentDate.getMonth() &&
               date.getFullYear() === currentDate.getFullYear();
    };

    return (
        <div className="space-y-4">
            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map((day) => (
                    <div
                        key={day}
                        className="text-center text-sm font-semibold text-muted-foreground py-2"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
                {monthDates.map((date, index) => {
                    const dateKey = formatDateKey(date);
                    const dayShifts = getShiftsForDateKey(dateKey);
                    const isCurrentMonthDay = isCurrentMonth(date);
                    const isTodayDate = isToday(date);
                    const isPastDate = isPast(date);
                    const isHovered = hoveredDate && formatDateKey(hoveredDate) === dateKey;

                    return (
                        <motion.div
                            key={dateKey}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.01 }}
                            className={cn(
                                'glass-light rounded-lg p-2 min-h-[100px] sm:min-h-[120px]',
                                'cursor-pointer transition-all duration-200',
                                isTodayDate && 'ring-2 ring-neon-emerald/50 border border-neon-emerald/30',
                                !isCurrentMonthDay && 'opacity-40',
                                isPastDate && isCurrentMonthDay && 'opacity-60',
                                isHovered && 'scale-105 bg-white/5'
                            )}
                            onClick={() => onDateClick(date)}
                            onMouseEnter={() => setHoveredDate(date)}
                            onMouseLeave={() => setHoveredDate(null)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {/* Date number */}
                            <div className={cn(
                                'text-sm font-semibold mb-1',
                                isTodayDate ? 'text-neon-emerald' : 'text-foreground',
                                !isCurrentMonthDay && 'text-muted-foreground'
                            )}>
                                {date.getDate()}
                            </div>

                            {/* Shifts */}
                            <div className="space-y-1">
                                {dayShifts.slice(0, 3).map((shift) => {
                                    const colors = getEmployeeColorClasses(shift.employee_id, shift.status);
                                    const employeeName = shift.employee
                                        ? `${shift.employee.first_name} ${shift.employee.last_name}`
                                        : 'Unknown';
                                    
                                    return (
                                        <motion.div
                                            key={shift.id}
                                            className={cn(
                                                'text-xs px-2 py-1 rounded border cursor-pointer',
                                                colors.border,
                                                'truncate'
                                            )}
                                            style={{
                                                ...colors.bgStyle,
                                                ...colors.borderStyle,
                                                ...colors.textStyle,
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onShiftClick(shift);
                                            }}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            title={`${employeeName}: ${shift.start_time} - ${shift.end_time}`}
                                        >
                                            <div className="font-medium truncate">{employeeName}</div>
                                            <div className="text-[10px] opacity-80">
                                                {shift.start_time} - {shift.end_time}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                                {dayShifts.length > 3 && (
                                    <div className="text-xs text-muted-foreground px-2 py-1">
                                        +{dayShifts.length - 3} more
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default MonthCalendarView;
