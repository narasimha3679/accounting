import React, { useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { EmployeeSchedule, Employee } from '../../lib/api';
import {
    getShiftsForDate,
    calculateShiftPosition,
    getEmployeeColorClasses,
    getCurrentTimePosition,
    formatDateKey,
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
    employees,
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

    const daySchedules = useMemo(() => {
        return getShiftsForDate(schedules, currentDate);
    }, [schedules, currentDate]);

    // Get unique employees who have shifts today, or all employees if provided
    const employeesWithShifts = useMemo(() => {
        const employeeMap = new Map<number, Employee>();
        
        // Add employees from schedules
        daySchedules.forEach(schedule => {
            if (schedule.employee && schedule.employee_id) {
                employeeMap.set(schedule.employee_id, schedule.employee);
            }
        });

        // Add all employees if provided (for empty rows)
        if (employees) {
            employees.forEach(emp => {
                if (!employeeMap.has(emp.id)) {
                    employeeMap.set(emp.id, emp);
                }
            });
        }

        return Array.from(employeeMap.values());
    }, [daySchedules, employees]);

    // Group schedules by employee
    const schedulesByEmployee = useMemo(() => {
        const grouped: Record<number, EmployeeSchedule[]> = {};
        daySchedules.forEach(schedule => {
            const empId = schedule.employee_id;
            if (!grouped[empId]) {
                grouped[empId] = [];
            }
            grouped[empId].push(schedule);
        });
        return grouped;
    }, [daySchedules]);

    // Scroll to current time on mount
    useEffect(() => {
        const currentTimePos = getCurrentTimePosition(dayStartHour, dayEndHour);
        if (currentTimePos !== null && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
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
                <div className="flex-shrink-0 w-16 sm:w-20 border-r border-border">
                    <div className="h-16 border-b border-border flex items-center justify-end pr-2">
                        <span className="text-xs font-semibold text-muted-foreground">Time</span>
                    </div>
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

                {/* Employee rows */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    {employeesWithShifts.length > 0 ? (
                        employeesWithShifts.map((employee) => {
                            const employeeSchedules = schedulesByEmployee[employee.id] || [];

                            return (
                                <div
                                    key={employee.id}
                                    className="border-b border-border last:border-b-0"
                                >
                                    {/* Employee header */}
                                    <div className="h-16 border-b border-border p-2 flex items-center bg-card/50">
                                        <div className="font-semibold text-foreground">
                                            {employee.first_name} {employee.last_name}
                                        </div>
                                        {employeeSchedules.length > 0 && (
                                            <div className="ml-auto text-xs text-muted-foreground">
                                                {employeeSchedules.length} shift{employeeSchedules.length !== 1 ? 's' : ''}
                                            </div>
                                        )}
                                    </div>

                                    {/* Time slots row */}
                                    <div className="relative h-16 overflow-x-auto">
                                        <div className="absolute inset-0 flex">
                                            {timeSlots.map((hour) => (
                                                <div
                                                    key={hour}
                                                    className="flex-1 h-full border-r border-border/50 cursor-pointer hover:bg-white/5 transition-colors"
                                                    onClick={() => onTimeSlotClick?.(currentDate, hour, 0, employee.id)}
                                                />
                                            ))}
                                        </div>

                                        {/* Current time indicator */}
                                        {isTodayDate && currentTimePos !== null && (
                                            <div
                                                className="absolute top-0 bottom-0 z-10 pointer-events-none"
                                                style={{ left: `${currentTimePos}%` }}
                                            >
                                                <div className="w-0.5 h-full bg-red-500 relative">
                                                    <div className="absolute -top-2 -left-1.5 w-4 h-4 bg-red-500 rounded-full"></div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Shifts */}
                                        <div className="absolute inset-0">
                                            {employeeSchedules.map((shift) => {
                                                const position = calculateShiftPosition(
                                                    shift.start_time,
                                                    shift.end_time,
                                                    dayStartHour,
                                                    dayEndHour
                                                );
                                                const colors = getEmployeeColorClasses(shift.employee_id, shift.status);

                                                return (
                                                    <motion.div
                                                        key={shift.id}
                                                        className={cn(
                                                            'absolute rounded-md border p-2 cursor-pointer',
                                                            'glass text-xs',
                                                            colors.border
                                                        )}
                                                        style={{
                                                            left: `${position.top}%`,
                                                            width: `${position.height}%`,
                                                            minWidth: '120px',
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
                                                        <div className="font-semibold">
                                                            {shift.start_time} - {shift.end_time}
                                                        </div>
                                                        {shift.notes && (
                                                            <div className="text-[10px] opacity-80 mt-1 truncate">
                                                                {shift.notes}
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <div className="text-center">
                                <p className="text-lg">No schedules for this day</p>
                                <p className="text-sm mt-2">Click on a time slot to create a schedule</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DayTimelineView;
