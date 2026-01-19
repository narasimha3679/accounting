import React, { useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { EmployeeSchedule, Employee } from '../../lib/api';
import {
    getShiftsForDateWithSegments,
    calculateShiftPosition,
    getEmployeeColorClasses,
    getCurrentTimePosition,
    formatDateKey,
    type ShiftSegment,
} from '../../lib/scheduleUtils';
import { cn } from '../../lib/utils';

interface DayTimelineViewProps {
    currentDate: Date;
    schedules: EmployeeSchedule[];
    employees?: Employee[];
    onShiftClick: (schedule: EmployeeSchedule) => void;
    onTimeSlotClick?: (date: Date, hour: number, minute: number, employeeId?: number) => void;
}

const DayTimelineView: React.FC<DayTimelineViewProps> = ({
    currentDate,
    schedules,
    onShiftClick,
    onTimeSlotClick,
}) => {
    const timeColumnScrollRef = useRef<HTMLDivElement>(null);
    const employeesScrollRef = useRef<HTMLDivElement>(null);
    const dayStartHour = 0;
    const dayEndHour = 23;
    const timeSlots: number[] = [];
    
    for (let hour = dayStartHour; hour <= dayEndHour; hour++) {
        timeSlots.push(hour);
    }

    // Get segments for this date (includes overnight shift segments)
    const daySegments = useMemo(() => {
        return getShiftsForDateWithSegments(schedules, currentDate);
    }, [schedules, currentDate]);

    // Get unique employees who have shifts today
    const employeesWithShifts = useMemo(() => {
        const employeeMap = new Map<number, Employee>();
        
        daySegments.forEach(segment => {
            if (segment.schedule.employee && segment.schedule.employee_id) {
                employeeMap.set(segment.schedule.employee_id, segment.schedule.employee);
            }
        });

        return Array.from(employeeMap.values());
    }, [daySegments]);

    // Group segments by employee
    const segmentsByEmployee = useMemo(() => {
        const grouped: Record<number, ShiftSegment[]> = {};
        daySegments.forEach(segment => {
            const empId = segment.schedule.employee_id;
            if (!grouped[empId]) {
                grouped[empId] = [];
            }
            grouped[empId].push(segment);
        });
        return grouped;
    }, [daySegments]);

    // Sync scroll between time column and employee columns
    useEffect(() => {
        const timeColumn = timeColumnScrollRef.current;
        const employeesScrollContainer = employeesScrollRef.current;

        if (!timeColumn || !employeesScrollContainer) return;

        let timeScrolling = false;
        let employeesScrolling = false;

        const handleTimeScroll = () => {
            if (employeesScrolling) return;
            timeScrolling = true;
            const scrollTop = timeColumn.scrollTop;
            if (Math.abs(employeesScrollContainer.scrollTop - scrollTop) > 1) {
                employeesScrollContainer.scrollTop = scrollTop;
            }
            requestAnimationFrame(() => {
                timeScrolling = false;
            });
        };

        const handleEmployeesScroll = () => {
            if (timeScrolling) return;
            employeesScrolling = true;
            const scrollTop = employeesScrollContainer.scrollTop;
            if (Math.abs(timeColumn.scrollTop - scrollTop) > 1) {
                timeColumn.scrollTop = scrollTop;
            }
            requestAnimationFrame(() => {
                employeesScrolling = false;
            });
        };

        timeColumn.addEventListener('scroll', handleTimeScroll, { passive: true });
        employeesScrollContainer.addEventListener('scroll', handleEmployeesScroll, { passive: true });

        return () => {
            timeColumn.removeEventListener('scroll', handleTimeScroll);
            employeesScrollContainer.removeEventListener('scroll', handleEmployeesScroll);
        };
    }, []);

    // Scroll to current time on mount
    useEffect(() => {
        const currentTimePos = getCurrentTimePosition(dayStartHour, dayEndHour);
        if (currentTimePos !== null && timeColumnScrollRef.current) {
            const container = timeColumnScrollRef.current;
            const scrollPosition = (currentTimePos / 100) * container.scrollHeight;
            container.scrollTop = scrollPosition - 100;
        }
    }, []);

    const currentTimePos = getCurrentTimePosition(dayStartHour, dayEndHour);
    const isTodayDate = formatDateKey(currentDate) === formatDateKey(new Date());

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

                {/* Employee columns */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Employee headers - fixed */}
                    <div className="flex flex-shrink-0 border-b border-border">
                        {employeesWithShifts.length > 0 ? (
                            employeesWithShifts.map((employee) => {
                                const employeeSegments = segmentsByEmployee[employee.id] || [];
                                return (
                                    <div
                                        key={`header-${employee.id}`}
                                        className="flex-1 min-w-[150px] sm:min-w-[200px] border-r border-border last:border-r-0 p-2 text-center h-12"
                                    >
                                        <div className="text-xs font-semibold text-muted-foreground">
                                            {employee.first_name} {employee.last_name}
                                        </div>
                                        {employeeSegments.length > 0 && (
                                            <div className="text-[10px] text-muted-foreground mt-0.5">
                                                {employeeSegments.length} shift{employeeSegments.length !== 1 ? 's' : ''}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex-1 p-2 text-center h-12"></div>
                        )}
                    </div>

                    {/* Shared scroll container for employee columns */}
                    <div 
                        className="flex-1 overflow-x-auto overflow-y-auto scrollbar-hide"
                        ref={employeesScrollRef}
                    >
                        {employeesWithShifts.length > 0 ? (
                            <div className="flex min-w-full" style={{ height: `${timeSlots.length * 64}px` }}>
                                {employeesWithShifts.map((employee) => {
                                    const employeeSegments = segmentsByEmployee[employee.id] || [];

                                    return (
                                        <div
                                            key={employee.id}
                                            className="flex-1 min-w-[150px] sm:min-w-[200px] border-r border-border last:border-r-0 relative"
                                        >
                                            {/* Time slots background */}
                                            <div className="absolute inset-0">
                                                {timeSlots.map((hour) => (
                                                    <div
                                                        key={hour}
                                                        className="h-16 border-b border-border/50 cursor-pointer hover:bg-white/5 transition-colors"
                                                        onClick={() => onTimeSlotClick?.(currentDate, hour, 0, employee.id)}
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

                                            {/* Shift segments */}
                                            {employeeSegments.map((segment) => {
                                                const position = calculateShiftPosition(
                                                    segment.startTime,
                                                    segment.endTime,
                                                    dayStartHour,
                                                    dayEndHour
                                                );
                                                const colors = getEmployeeColorClasses(segment.schedule.employee_id, segment.schedule.status);
                                                const employeeName = segment.schedule.employee
                                                    ? `${segment.schedule.employee.first_name} ${segment.schedule.employee.last_name}`
                                                    : 'Unknown';
                                                
                                                // Convert percentage to pixels
                                                const totalHeight = timeSlots.length * 64;
                                                const topPx = (position.top / 100) * totalHeight;
                                                const heightPx = (position.height / 100) * totalHeight;

                                                return (
                                                    <motion.div
                                                        key={`${segment.schedule.id}-${segment.segmentIndex}`}
                                                        className={cn(
                                                            'absolute rounded-md border p-1.5 cursor-pointer',
                                                            'glass text-xs overflow-hidden',
                                                            colors.border
                                                        )}
                                                        style={{
                                                            top: `${topPx}px`,
                                                            height: `${heightPx}px`,
                                                            minHeight: '24px',
                                                            left: '4px',
                                                            right: '4px',
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
                                                        {segment.schedule.notes && (
                                                            <div className="text-[10px] opacity-70 mt-0.5 truncate">
                                                                {segment.schedule.notes}
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                <div className="text-center">
                                    <p className="text-lg">No employees scheduled for this day</p>
                                    <p className="text-sm mt-2">Click on a time slot to create a schedule</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DayTimelineView;
