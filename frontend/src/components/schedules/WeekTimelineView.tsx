import React, { useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { EmployeeSchedule } from '../../lib/api';
import {
    getWeekDates,
    getShiftsForDate,
    formatDateKey,
    calculateShiftPosition,
    getEmployeeColorClasses,
    getCurrentTimePosition,
} from '../../lib/scheduleUtils';
import { cn } from '../../lib/utils';

interface WeekTimelineViewProps {
    currentDate: Date;
    schedules: EmployeeSchedule[];
    onShiftClick: (schedule: EmployeeSchedule) => void;
    onTimeSlotClick?: (date: Date, hour: number, minute: number) => void;
}

const WeekTimelineView: React.FC<WeekTimelineViewProps> = ({
    currentDate,
    schedules,
    onShiftClick,
    onTimeSlotClick,
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const dayStartHour = 6;
    const dayEndHour = 23;
    const timeSlots: number[] = [];
    
    for (let hour = dayStartHour; hour <= dayEndHour; hour++) {
        timeSlots.push(hour);
    }

    const weekDates = useMemo(() => {
        return getWeekDates(currentDate);
    }, [currentDate]);

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Group schedules by date
    const schedulesByDate = useMemo(() => {
        const grouped: Record<string, EmployeeSchedule[]> = {};
        weekDates.forEach(date => {
            const dateKey = formatDateKey(date);
            grouped[dateKey] = getShiftsForDate(schedules, date);
        });
        return grouped;
    }, [schedules, weekDates]);

    // Scroll to current time on mount
    useEffect(() => {
        const currentTimePos = getCurrentTimePosition(dayStartHour, dayEndHour);
        if (currentTimePos !== null && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const scrollPosition = (currentTimePos / 100) * container.scrollHeight;
            container.scrollTop = scrollPosition - 100; // Offset for visibility
        }
    }, []);

    const currentTimePos = getCurrentTimePosition(dayStartHour, dayEndHour);
    const todayDateKey = formatDateKey(new Date());

    return (
        <div className="flex flex-col h-[600px] sm:h-[700px] overflow-hidden">
            <div className="flex flex-1 overflow-hidden">
                {/* Time column */}
                <div className="flex-shrink-0 w-16 sm:w-20 border-r border-border">
                    <div className="h-12 border-b border-border"></div>
                    <div className="overflow-y-auto scrollbar-hide" ref={scrollContainerRef}>
                        {timeSlots.map((hour) => (
                            <div
                                key={hour}
                                className="h-16 border-b border-border/50 flex items-start justify-end pr-2 pt-1"
                            >
                                <span className="text-xs text-muted-foreground">
                                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Days columns */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden">
                    <div className="flex min-w-full h-full">
                        {weekDates.map((date, dayIndex) => {
                            const dateKey = formatDateKey(date);
                            const daySchedules = schedulesByDate[dateKey] || [];
                            const isTodayDate = formatDateKey(date) === todayDateKey;

                            return (
                                <div
                                    key={dateKey}
                                    className={cn(
                                        'flex-1 min-w-[120px] sm:min-w-[150px] border-r border-border last:border-r-0',
                                        isTodayDate && 'bg-neon-emerald/5'
                                    )}
                                >
                                    {/* Day header */}
                                    <div className={cn(
                                        'h-12 border-b border-border p-2 text-center',
                                        isTodayDate && 'bg-neon-emerald/10 border-neon-emerald/30'
                                    )}>
                                        <div className="text-xs font-semibold text-muted-foreground">
                                            {weekDays[dayIndex]}
                                        </div>
                                        <div className={cn(
                                            'text-sm font-bold',
                                            isTodayDate ? 'text-neon-emerald' : 'text-foreground'
                                        )}>
                                            {date.getDate()}
                                        </div>
                                    </div>

                                    {/* Time slots */}
                                    <div className="relative h-full overflow-y-auto scrollbar-hide">
                                        {timeSlots.map((hour) => (
                                            <div
                                                key={hour}
                                                className="h-16 border-b border-border/50 cursor-pointer hover:bg-white/5 transition-colors"
                                                onClick={() => onTimeSlotClick?.(date, hour, 0)}
                                            />
                                        ))}

                                        {/* Current time indicator - use pixels based on actual time slot heights */}
                                        {isTodayDate && currentTimePos !== null && (
                                            <div
                                                className="absolute left-0 right-0 z-10 pointer-events-none"
                                                style={{ top: `${(currentTimePos / 100) * timeSlots.length * 64}px` }}
                                            >
                                                <div className="h-0.5 bg-red-500 relative">
                                                    <div className="absolute -left-2 -top-1.5 w-4 h-4 bg-red-500 rounded-full"></div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Shifts - use pixel positioning for accurate placement */}
                                        {daySchedules.map((shift) => {
                                            const position = calculateShiftPosition(
                                                shift.start_time,
                                                shift.end_time,
                                                dayStartHour,
                                                dayEndHour
                                            );
                                            const colors = getEmployeeColorClasses(shift.employee_id, shift.status);
                                            const employeeName = shift.employee
                                                ? `${shift.employee.first_name} ${shift.employee.last_name}`
                                                : 'Unknown';
                                            // Convert percentage to pixels (each time slot is 64px = h-16)
                                            const totalHeight = timeSlots.length * 64;
                                            const topPx = (position.top / 100) * totalHeight;
                                            const heightPx = (position.height / 100) * totalHeight;

                                            return (
                                                <motion.div
                                                    key={shift.id}
                                                    className={cn(
                                                        'absolute left-1 right-1 rounded-md border p-1.5 cursor-pointer',
                                                        'glass text-xs overflow-hidden',
                                                        colors.border
                                                    )}
                                                    style={{
                                                        top: `${topPx}px`,
                                                        height: `${heightPx}px`,
                                                        minHeight: '24px',
                                                        ...colors.bgStyle,
                                                        ...colors.borderStyle,
                                                        ...colors.textStyle,
                                                    }}
                                                    onClick={() => onShiftClick(shift)}
                                                    whileHover={{ scale: 1.02, zIndex: 20 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <div className="font-semibold truncate">{employeeName}</div>
                                                    <div className="text-[10px] opacity-80 truncate">
                                                        {shift.start_time} - {shift.end_time}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeekTimelineView;
