import React, { useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { EmployeeSchedule } from '../../lib/api';
import {
    getWeekDates,
    getShiftsForDateWithSegments,
    formatDateKey,
    calculateShiftPosition,
    getEmployeeColorClasses,
    getCurrentTimePosition,
    calculateColumnPositionsForSegments,
    type ShiftSegment,
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
    const timeColumnScrollRef = useRef<HTMLDivElement>(null);
    const daysScrollRef = useRef<HTMLDivElement>(null);
    const dayStartHour = 0;
    const dayEndHour = 23;
    const timeSlots: number[] = [];

    for (let hour = dayStartHour; hour <= dayEndHour; hour++) {
        timeSlots.push(hour);
    }

    const weekDates = useMemo(() => {
        return getWeekDates(currentDate);
    }, [currentDate]);

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Group segments by date (includes overnight shift segments)
    const segmentsByDate = useMemo(() => {
        const grouped: Record<string, ShiftSegment[]> = {};
        weekDates.forEach(date => {
            const dateKey = formatDateKey(date);
            grouped[dateKey] = getShiftsForDateWithSegments(schedules, date);
        });
        return grouped;
    }, [schedules, weekDates]);

    // Calculate column positions for each day's segments
    const columnPositionsByDate = useMemo(() => {
        const positions: Record<string, Map<string, import('../../lib/scheduleUtils').ColumnPosition>> = {};
        weekDates.forEach(date => {
            const dateKey = formatDateKey(date);
            const daySegments = segmentsByDate[dateKey] || [];
            positions[dateKey] = calculateColumnPositionsForSegments(daySegments);
        });
        return positions;
    }, [segmentsByDate, weekDates]);

    // Sync scroll between time column and day columns
    useEffect(() => {
        const timeColumn = timeColumnScrollRef.current;
        const daysScrollContainer = daysScrollRef.current;

        if (!timeColumn || !daysScrollContainer) return;

        let timeScrolling = false;
        let daysScrolling = false;

        const handleTimeScroll = () => {
            if (daysScrolling) return;
            timeScrolling = true;
            const scrollTop = timeColumn.scrollTop;
            if (Math.abs(daysScrollContainer.scrollTop - scrollTop) > 1) {
                daysScrollContainer.scrollTop = scrollTop;
            }
            requestAnimationFrame(() => {
                timeScrolling = false;
            });
        };

        const handleDaysScroll = () => {
            if (timeScrolling) return;
            daysScrolling = true;
            const scrollTop = daysScrollContainer.scrollTop;
            if (Math.abs(timeColumn.scrollTop - scrollTop) > 1) {
                timeColumn.scrollTop = scrollTop;
            }
            requestAnimationFrame(() => {
                daysScrolling = false;
            });
        };

        timeColumn.addEventListener('scroll', handleTimeScroll, { passive: true });
        daysScrollContainer.addEventListener('scroll', handleDaysScroll, { passive: true });

        return () => {
            timeColumn.removeEventListener('scroll', handleTimeScroll);
            daysScrollContainer.removeEventListener('scroll', handleDaysScroll);
        };
    }, []);

    // Scroll to current time on mount
    useEffect(() => {
        const currentTimePos = getCurrentTimePosition(dayStartHour, dayEndHour);
        if (currentTimePos !== null && timeColumnScrollRef.current) {
            const container = timeColumnScrollRef.current;
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
                <div className="flex-shrink-0 w-16 sm:w-20 border-r border-border flex flex-col">
                    <div className="h-12 border-b border-border flex-shrink-0"></div>
                    <div 
                        className="overflow-y-auto scrollbar-hide flex-1" 
                        ref={timeColumnScrollRef}
                    >
                        <div style={{ height: `${timeSlots.length * 64}px` }}>
                            {timeSlots.map((hour) => (
                                <div
                                    key={hour}
                                    className="h-16 border-b border-border/50 flex items-start justify-end pr-2 pt-1 flex-shrink-0"
                                >
                                    <span className="text-xs text-muted-foreground">
                                        {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Days columns */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Day headers - fixed */}
                    <div className="flex flex-shrink-0 border-b border-border">
                        {weekDates.map((date, dayIndex) => {
                            const dateKey = formatDateKey(date);
                            const isTodayDate = formatDateKey(date) === todayDateKey;
                            return (
                                <div
                                    key={`header-${dateKey}`}
                                    className={cn(
                                        'flex-1 min-w-[120px] sm:min-w-[150px] border-r border-border last:border-r-0 p-2 text-center h-12',
                                        isTodayDate && 'bg-neon-emerald/10 border-neon-emerald/30'
                                    )}
                                >
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
                            );
                        })}
                    </div>

                    {/* Shared scroll container for day columns */}
                    <div 
                        className="flex-1 overflow-x-auto overflow-y-auto scrollbar-hide"
                        ref={daysScrollRef}
                    >
                        <div className="flex min-w-full" style={{ height: `${timeSlots.length * 64}px` }}>
                            {weekDates.map((date) => {
                                const dateKey = formatDateKey(date);
                                const daySegments = segmentsByDate[dateKey] || [];
                                const columnPositions = columnPositionsByDate[dateKey] || new Map();
                                const isTodayDate = formatDateKey(date) === todayDateKey;

                                return (
                                    <div
                                        key={dateKey}
                                        className={cn(
                                            'flex-1 min-w-[120px] sm:min-w-[150px] border-r border-border last:border-r-0 relative',
                                            isTodayDate && 'bg-neon-emerald/5'
                                        )}
                                    >
                                        {/* Time slots background */}
                                        <div className="absolute inset-0">
                                            {timeSlots.map((hour) => (
                                                <div
                                                    key={hour}
                                                    className="h-16 border-b border-border/50 cursor-pointer hover:bg-white/5 transition-colors"
                                                    onClick={() => onTimeSlotClick?.(date, hour, 0)}
                                                />
                                            ))}
                                        </div>

                                        {/* Current time indicator */}
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

                                        {/* Shift segments with parallel column layout */}
                                        {daySegments.map((segment) => {
                                            const position = calculateShiftPosition(
                                                segment.startTime,
                                                segment.endTime,
                                                dayStartHour,
                                                dayEndHour
                                            );
                                            const segmentKey = `${segment.schedule.id}-${segment.segmentIndex}`;
                                            const columnPos = columnPositions.get(segmentKey);
                                            const colors = getEmployeeColorClasses(segment.schedule.employee_id, segment.schedule.status);
                                            const employeeName = segment.schedule.employee
                                                ? `${segment.schedule.employee.first_name} ${segment.schedule.employee.last_name}`
                                                : 'Unknown';
                                            
                                            // Convert percentage to pixels (each time slot is 64px = h-16)
                                            const totalHeight = timeSlots.length * 64;
                                            const topPx = (position.top / 100) * totalHeight;
                                            const heightPx = (position.height / 100) * totalHeight;

                                            // Calculate column width and position
                                            const columnWidth = columnPos ? columnPos.widthPercent : 100;
                                            const columnLeft = columnPos ? columnPos.leftPercent : 0;

                                            return (
                                                <motion.div
                                                    key={segmentKey}
                                                    className={cn(
                                                        'absolute rounded-md border p-1.5 cursor-pointer',
                                                        'glass text-xs overflow-hidden',
                                                        colors.border
                                                    )}
                                                    style={{
                                                        top: `${topPx}px`,
                                                        height: `${heightPx}px`,
                                                        minHeight: '24px',
                                                        left: `${columnLeft}%`,
                                                        width: `${columnWidth}%`,
                                                        marginLeft: columnPos && columnPos.columnIndex > 0 ? '2px' : '4px',
                                                        marginRight: columnPos && columnPos.columnIndex < (columnPos.maxColumns - 1) ? '2px' : '4px',
                                                        ...colors.bgStyle,
                                                        ...colors.borderStyle,
                                                        ...colors.textStyle,
                                                    }}
                                                    onClick={() => onShiftClick(segment.schedule)}
                                                    whileHover={{ scale: 1.02, zIndex: 20 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <div className="font-semibold truncate">{employeeName}</div>
                                                    <div className="text-[10px] opacity-80 truncate">
                                                        {segment.startTime} - {segment.endTime}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeekTimelineView;
