import type { EmployeeSchedule } from './api';
import type { CSSProperties } from 'react';

/**
 * Group schedules by date (YYYY-MM-DD format)
 */
export function groupSchedulesByDate(schedules: EmployeeSchedule[]): Record<string, EmployeeSchedule[]> {
    const grouped: Record<string, EmployeeSchedule[]> = {};

    schedules.forEach(schedule => {
        const dateKey = schedule.schedule_date.split('T')[0];
        if (!grouped[dateKey]) {
            grouped[dateKey] = [];
        }
        grouped[dateKey].push(schedule);
    });

    return grouped;
}

/**
 * Get all shifts for a specific date
 */
export function getShiftsForDate(schedules: EmployeeSchedule[], date: Date): EmployeeSchedule[] {
    const dateStr = formatDateKey(date);
    const grouped = groupSchedulesByDate(schedules);
    return grouped[dateStr] || [];
}

/**
 * Format date as YYYY-MM-DD key
 */
export function formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Calculate shift position and height for timeline views
 * Returns { top: percentage, height: percentage }
 * Note: dayEndHour should be the last hour shown (e.g., 23 for 11 PM)
 * The duration includes the full last hour, so we add 1 hour to the end time
 */
export function calculateShiftPosition(
    startTime: string,
    endTime: string,
    dayStartHour: number = 6,
    dayEndHour: number = 23
): { top: number; height: number } {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    const dayStartMinutes = dayStartHour * 60;
    // Add 1 hour to dayEndHour to include the full last hour (e.g., 23 becomes 24 for 11 PM to 12 AM)
    const dayEndMinutes = (dayEndHour + 1) * 60;
    const dayDuration = dayEndMinutes - dayStartMinutes;

    const top = ((startMinutes - dayStartMinutes) / dayDuration) * 100;
    const height = ((endMinutes - startMinutes) / dayDuration) * 100;

    return {
        top: Math.max(0, Math.min(100, top)),
        height: Math.max(0, Math.min(100, height))
    };
}

/**
 * Format shift time display
 */
export function formatShiftTime(startTime: string, endTime: string): string {
    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

/**
 * Get 7 dates for week view (Sunday to Saturday)
 */
export function getWeekDates(centerDate: Date): Date[] {
    const dates: Date[] = [];
    const dayOfWeek = centerDate.getDay(); // 0 = Sunday, 6 = Saturday
    const startOfWeek = new Date(centerDate);
    startOfWeek.setDate(centerDate.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        dates.push(date);
    }

    return dates;
}

/**
 * Get all dates for a month view
 * Returns array of dates including leading/trailing days from adjacent months
 */
export function getMonthDates(year: number, month: number): Date[] {
    const dates: Date[] = [];

    // First day of the month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const lastDayOfWeek = lastDay.getDay();

    // Start from the Sunday of the week containing the first day
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDayOfWeek);

    // End at the Saturday of the week containing the last day
    const endDate = new Date(lastDay);
    endDate.setDate(lastDay.getDate() + (6 - lastDayOfWeek));

    // Generate all dates
    const current = new Date(startDate);
    while (current <= endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    return dates;
}

/**
 * Parse date string safely, handling both DATE and TIMESTAMP types
 * Returns a Date object normalized to local midnight
 */
export function parseLocalDate(dateString: string): Date {
    // Handle both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss.sssZ" formats
    const dateOnly = dateString.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0); // Normalize to local midnight
    return date;
}

/**
 * Normalize a Date object to local midnight
 */
export function normalizeToLocalMidnight(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
}

/**
 * Check if a date string represents today (in local timezone)
 */
export function isTodayDate(dateString: string): boolean {
    const scheduleDate = parseLocalDate(dateString);
    const today = normalizeToLocalMidnight(new Date());
    return scheduleDate.getTime() === today.getTime();
}

/**
 * Check if a date string is in the past (in local timezone)
 */
export function isPastDate(dateString: string): boolean {
    const scheduleDate = parseLocalDate(dateString);
    const today = normalizeToLocalMidnight(new Date());
    return scheduleDate.getTime() < today.getTime();
}

/**
 * Compare two dates (normalized to local midnight)
 */
export function compareDates(date1: Date | string, date2: Date | string): number {
    const d1 = typeof date1 === 'string' ? parseLocalDate(date1) : normalizeToLocalMidnight(date1);
    const d2 = typeof date2 === 'string' ? parseLocalDate(date2) : normalizeToLocalMidnight(date2);
    return d1.getTime() - d2.getTime();
}

/**
 * Check if a date is today
 * Accepts both Date objects and date strings
 */
export function isToday(date: Date | string): boolean {
    if (typeof date === 'string') {
        return isTodayDate(date);
    }
    const today = normalizeToLocalMidnight(new Date());
    const compareDate = normalizeToLocalMidnight(date);
    return compareDate.getTime() === today.getTime();
}

/**
 * Check if a date is in the past
 * Accepts both Date objects and date strings
 */
export function isPast(date: Date | string): boolean {
    if (typeof date === 'string') {
        return isPastDate(date);
    }
    const today = normalizeToLocalMidnight(new Date());
    const compareDate = normalizeToLocalMidnight(date);
    return compareDate.getTime() < today.getTime();
}

/**
 * Calculate hours worked from shift times
 * Uses direct time arithmetic to avoid timezone issues
 */
export function calculateHours(startTime: string, endTime: string, breakMinutes: number): number {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const diffMinutes = endMinutes - startMinutes - breakMinutes;
    return Math.max(0, diffMinutes / 60);
}

/**
 * Color palette for employees - 16 distinct colors that work in dark mode
 * Using HSL values for easy manipulation
 */
const EMPLOYEE_COLOR_PALETTE = [
    { h: 200, s: 70, l: 60 },  // Blue
    { h: 160, s: 70, l: 50 },  // Emerald (neon-emerald variant)
    { h: 280, s: 70, l: 60 },  // Purple
    { h: 340, s: 70, l: 60 },  // Pink
    { h: 40, s: 90, l: 60 },   // Amber/Yellow
    { h: 10, s: 80, l: 60 },   // Orange
    { h: 150, s: 60, l: 55 },  // Teal
    { h: 260, s: 70, l: 65 },  // Light Purple
    { h: 180, s: 70, l: 55 },  // Cyan
    { h: 320, s: 70, l: 60 },  // Magenta
    { h: 30, s: 85, l: 60 },   // Orange-Yellow
    { h: 210, s: 70, l: 60 },  // Light Blue
    { h: 120, s: 60, l: 55 },  // Green
    { h: 0, s: 70, l: 60 },    // Red
    { h: 270, s: 65, l: 60 },  // Violet
    { h: 50, s: 90, l: 65 },   // Light Yellow
];

/**
 * Get a consistent color for an employee based on their ID
 * Returns HSL color object
 */
export function getEmployeeColor(employeeId: number): { h: number; s: number; l: number } {
    const index = employeeId % EMPLOYEE_COLOR_PALETTE.length;
    return EMPLOYEE_COLOR_PALETTE[index];
}

/**
 * Get employee-specific color classes combined with status
 * Returns background, border, and text color classes/styles
 */
export function getEmployeeColorClasses(
    employeeId: number,
    status: 'scheduled' | 'cancelled' | 'completed'
): {
    bg: string;
    border: string;
    text: string;
    bgStyle?: CSSProperties;
    borderStyle?: CSSProperties;
    textStyle?: CSSProperties;
} {
    const color = getEmployeeColor(employeeId);

    // Create a copy to avoid mutating the original color
    let h = color.h;
    let s = color.s;
    let l = color.l;

    // Adjust opacity and lightness based on status
    let bgOpacity = 0.25;
    let borderOpacity = 0.50;
    let textLightness = l;

    switch (status) {
        case 'scheduled':
            bgOpacity = 0.25;
            borderOpacity = 0.50;
            textLightness = l;
            break;
        case 'completed':
            bgOpacity = 0.20;
            borderOpacity = 0.40;
            textLightness = Math.min(70, l + 5); // Slightly lighter
            break;
        case 'cancelled':
            bgOpacity = 0.15;
            borderOpacity = 0.30;
            textLightness = Math.max(40, l - 15); // Much darker/grayed out
            // For cancelled, also reduce saturation to gray it out
            s = Math.max(30, s - 40);
            break;
    }

    // Use inline styles for dynamic colors since Tailwind doesn't support runtime color generation
    const bgStyle: CSSProperties = {
        backgroundColor: `hsl(${h} ${s}% ${l}% / ${bgOpacity})`,
    };

    const borderStyle: CSSProperties = {
        borderColor: `hsl(${h} ${s}% ${l}% / ${borderOpacity})`,
    };

    const textStyle: CSSProperties = {
        color: `hsl(${h} ${Math.min(80, s)}% ${textLightness}%)`,
    };

    // Return Tailwind classes for structure, but components will use inline styles
    return {
        bg: '', // Empty - use bgStyle instead
        border: 'border', // Keep border class for structure
        text: '', // Empty - use textStyle instead
        bgStyle,
        borderStyle,
        textStyle,
    };
}

/**
 * Get status color classes (kept for backward compatibility)
 */
export function getStatusColorClasses(status: 'scheduled' | 'cancelled' | 'completed'): {
    bg: string;
    border: string;
    text: string;
} {
    switch (status) {
        case 'scheduled':
            return {
                bg: 'bg-blue-500/20',
                border: 'border-blue-400/40',
                text: 'text-blue-300'
            };
        case 'completed':
            return {
                bg: 'bg-neon-emerald/20',
                border: 'border-neon-emerald/40',
                text: 'text-neon-emerald'
            };
        case 'cancelled':
            return {
                bg: 'bg-red-500/20',
                border: 'border-red-400/40',
                text: 'text-red-300'
            };
        default:
            return {
                bg: 'bg-muted/20',
                border: 'border-muted/40',
                text: 'text-muted-foreground'
            };
    }
}

/**
 * Get current time position in timeline (0-100 percentage)
 */
export function getCurrentTimePosition(dayStartHour: number = 6, dayEndHour: number = 23): number | null {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Only show if within the visible time range
    if (currentHour < dayStartHour || currentHour > dayEndHour) {
        return null;
    }

    const currentMinutes = currentHour * 60 + currentMinute;
    const dayStartMinutes = dayStartHour * 60;
    // Add 1 hour to dayEndHour to include the full last hour
    const dayEndMinutes = (dayEndHour + 1) * 60;
    const dayDuration = dayEndMinutes - dayStartMinutes;

    return ((currentMinutes - dayStartMinutes) / dayDuration) * 100;
}

/**
 * Check if two shifts overlap in time
 */
function shiftsOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
): boolean {
    const [startHour1, startMin1] = start1.split(':').map(Number);
    const [endHour1, endMin1] = end1.split(':').map(Number);
    const [startHour2, startMin2] = start2.split(':').map(Number);
    const [endHour2, endMin2] = end2.split(':').map(Number);

    const start1Minutes = startHour1 * 60 + startMin1;
    const end1Minutes = endHour1 * 60 + endMin1;
    const start2Minutes = startHour2 * 60 + startMin2;
    const end2Minutes = endHour2 * 60 + endMin2;

    // Two shifts overlap if one starts before the other ends
    return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
}

/**
 * Overlap group containing shifts that overlap with each other
 */
export interface OverlapGroup {
    shifts: EmployeeSchedule[];
    maxColumns: number;
}

/**
 * Column position information for a shift
 */
export interface ColumnPosition {
    columnIndex: number;
    maxColumns: number;
    widthPercent: number;
    leftPercent: number;
}

/**
 * Detect overlapping shifts and group them together
 * Returns an array of overlap groups, where each group contains shifts that overlap
 */
export function detectOverlaps(shifts: EmployeeSchedule[]): OverlapGroup[] {
    if (shifts.length === 0) {
        return [];
    }

    // Sort shifts by start time
    const sortedShifts = [...shifts].sort((a, b) => {
        const [hourA, minA] = a.start_time.split(':').map(Number);
        const [hourB, minB] = b.start_time.split(':').map(Number);
        const minutesA = hourA * 60 + minA;
        const minutesB = hourB * 60 + minB;
        return minutesA - minutesB;
    });

    const groups: OverlapGroup[] = [];

    for (const shift of sortedShifts) {
        let addedToGroup = false;

        // Try to add to existing group
        for (const group of groups) {
            // Check if this shift overlaps with any shift in the group
            const overlapsWithGroup = group.shifts.some(existingShift =>
                shiftsOverlap(
                    shift.start_time,
                    shift.end_time,
                    existingShift.start_time,
                    existingShift.end_time
                )
            );

            if (overlapsWithGroup) {
                group.shifts.push(shift);
                group.maxColumns = Math.max(group.maxColumns, group.shifts.length);
                addedToGroup = true;
                break;
            }
        }

        // If no overlap found, create new group
        if (!addedToGroup) {
            groups.push({
                shifts: [shift],
                maxColumns: 1,
            });
        }
    }

    // Merge groups that overlap with each other (transitive overlap)
    // This handles cases where A overlaps B, and B overlaps C, but A doesn't directly overlap C
    let merged = true;
    while (merged) {
        merged = false;
        for (let i = 0; i < groups.length; i++) {
            for (let j = i + 1; j < groups.length; j++) {
                const group1 = groups[i];
                const group2 = groups[j];

                // Check if any shift in group1 overlaps with any shift in group2
                const groupsOverlap = group1.shifts.some(shift1 =>
                    group2.shifts.some(shift2 =>
                        shiftsOverlap(
                            shift1.start_time,
                            shift1.end_time,
                            shift2.start_time,
                            shift2.end_time
                        )
                    )
                );

                if (groupsOverlap) {
                    // Merge group2 into group1
                    group1.shifts.push(...group2.shifts);
                    group1.maxColumns = Math.max(group1.maxColumns, group1.shifts.length);
                    groups.splice(j, 1);
                    merged = true;
                    break;
                }
            }
            if (merged) break;
        }
    }

    return groups;
}

/**
 * Calculate column positions for shifts based on overlap detection
 * Returns a map of shift ID to column position
 */
export function calculateColumnPositions(shifts: EmployeeSchedule[]): Map<number, ColumnPosition> {
    const positions = new Map<number, ColumnPosition>();

    if (shifts.length === 0) {
        return positions;
    }

    // Detect overlap groups
    const overlapGroups = detectOverlaps(shifts);

    // Assign column positions within each group
    for (const group of overlapGroups) {
        // Sort shifts within group by start time for consistent column assignment
        const sortedGroupShifts = [...group.shifts].sort((a, b) => {
            const [hourA, minA] = a.start_time.split(':').map(Number);
            const [hourB, minB] = b.start_time.split(':').map(Number);
            const minutesA = hourA * 60 + minA;
            const minutesB = hourB * 60 + minB;
            return minutesA - minutesB;
        });

        const maxColumns = group.maxColumns;
        const columnWidthPercent = 100 / maxColumns;

        sortedGroupShifts.forEach((shift, index) => {
            const columnIndex = index % maxColumns;
            const leftPercent = (columnIndex / maxColumns) * 100;

            positions.set(shift.id, {
                columnIndex,
                maxColumns,
                widthPercent: columnWidthPercent,
                leftPercent,
            });
        });
    }

    // Handle shifts that don't overlap with anything (not in any group)
    // These should take full width
    shifts.forEach(shift => {
        if (!positions.has(shift.id)) {
            positions.set(shift.id, {
                columnIndex: 0,
                maxColumns: 1,
                widthPercent: 100,
                leftPercent: 0,
            });
        }
    });

    return positions;
}

/**
 * Display segment for a shift (used for overnight shifts that span multiple days)
 */
export interface ShiftSegment {
    schedule: EmployeeSchedule;
    displayDate: Date; // The date this segment should be displayed on
    startTime: string; // Start time for this segment (HH:MM)
    endTime: string; // End time for this segment (HH:MM)
    isOvernight: boolean; // Whether this is part of an overnight shift
    segmentIndex: number; // 0 for first segment, 1 for second segment
}

/**
 * Check if a shift is overnight (end time is before start time)
 */
export function isOvernightShift(startTime: string, endTime: string): boolean {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return endMinutes < startMinutes;
}

/**
 * Split an overnight shift into display segments
 * Returns array of segments: [segment for start date, segment for next date]
 */
export function splitOvernightShift(
    schedule: EmployeeSchedule
): ShiftSegment[] {
    const isOvernight = isOvernightShift(schedule.start_time, schedule.end_time);
    
    if (!isOvernight) {
        // Regular shift - single segment
        const scheduleDate = parseLocalDate(schedule.schedule_date);
        return [{
            schedule,
            displayDate: scheduleDate,
            startTime: schedule.start_time,
            endTime: schedule.end_time,
            isOvernight: false,
            segmentIndex: 0,
        }];
    }
    
    // Overnight shift - split into two segments
    const scheduleDate = parseLocalDate(schedule.schedule_date);
    const nextDate = new Date(scheduleDate);
    nextDate.setDate(scheduleDate.getDate() + 1);
    
    return [
        {
            schedule,
            displayDate: scheduleDate,
            startTime: schedule.start_time,
            endTime: '23:59', // End at midnight
            isOvernight: true,
            segmentIndex: 0,
        },
        {
            schedule,
            displayDate: nextDate,
            startTime: '00:00', // Start at midnight
            endTime: schedule.end_time,
            isOvernight: true,
            segmentIndex: 1,
        },
    ];
}

/**
 * Get all display segments for schedules on a specific date
 * This includes regular shifts and overnight shift segments
 */
export function getShiftsForDateWithSegments(
    schedules: EmployeeSchedule[],
    date: Date
): ShiftSegment[] {
    const dateKey = formatDateKey(date);
    const segments: ShiftSegment[] = [];
    
    schedules.forEach(schedule => {
        const scheduleDateKey = schedule.schedule_date.split('T')[0];
        const isOvernight = isOvernightShift(schedule.start_time, schedule.end_time);
        
        if (scheduleDateKey === dateKey) {
            // Shift starts on this date
            if (isOvernight) {
                // Add first segment (before midnight)
                segments.push({
                    schedule,
                    displayDate: date,
                    startTime: schedule.start_time,
                    endTime: '23:59',
                    isOvernight: true,
                    segmentIndex: 0,
                });
            } else {
                // Regular shift
                segments.push({
                    schedule,
                    displayDate: date,
                    startTime: schedule.start_time,
                    endTime: schedule.end_time,
                    isOvernight: false,
                    segmentIndex: 0,
                });
            }
        } else if (isOvernight) {
            // Check if this is the second segment of an overnight shift
            const scheduleDate = parseLocalDate(schedule.schedule_date);
            const nextDate = new Date(scheduleDate);
            nextDate.setDate(scheduleDate.getDate() + 1);
            const nextDateKey = formatDateKey(nextDate);
            
            if (nextDateKey === dateKey) {
                // This is the second segment (after midnight)
                segments.push({
                    schedule,
                    displayDate: date,
                    startTime: '00:00',
                    endTime: schedule.end_time,
                    isOvernight: true,
                    segmentIndex: 1,
                });
            }
        }
    });
    
    return segments;
}

/**
 * Calculate column positions for shift segments based on their display times
 * This is similar to calculateColumnPositions but works with segments
 */
export function calculateColumnPositionsForSegments(segments: ShiftSegment[]): Map<string, ColumnPosition> {
    const positions = new Map<string, ColumnPosition>();

    if (segments.length === 0) {
        return positions;
    }

    // Create temporary shifts for overlap detection using segment times
    const tempShifts: Array<{ id: string; start_time: string; end_time: string }> = segments.map(seg => ({
        id: `${seg.schedule.id}-${seg.segmentIndex}`,
        start_time: seg.startTime,
        end_time: seg.endTime,
    }));

    // Detect overlap groups using segment times
    const overlapGroups: Array<{ shifts: typeof tempShifts; maxColumns: number }> = [];
    
    for (const tempShift of tempShifts) {
        let addedToGroup = false;

        // Try to add to existing group
        for (const group of overlapGroups) {
            const overlapsWithGroup = group.shifts.some(existingShift =>
                shiftsOverlap(
                    tempShift.start_time,
                    tempShift.end_time,
                    existingShift.start_time,
                    existingShift.end_time
                )
            );

            if (overlapsWithGroup) {
                group.shifts.push(tempShift);
                group.maxColumns = Math.max(group.maxColumns, group.shifts.length);
                addedToGroup = true;
                break;
            }
        }

        // If no overlap found, create new group
        if (!addedToGroup) {
            overlapGroups.push({
                shifts: [tempShift],
                maxColumns: 1,
            });
        }
    }

    // Merge groups that overlap with each other (transitive overlap)
    let merged = true;
    while (merged) {
        merged = false;
        for (let i = 0; i < overlapGroups.length; i++) {
            for (let j = i + 1; j < overlapGroups.length; j++) {
                const group1 = overlapGroups[i];
                const group2 = overlapGroups[j];

                const groupsOverlap = group1.shifts.some(shift1 =>
                    group2.shifts.some(shift2 =>
                        shiftsOverlap(
                            shift1.start_time,
                            shift1.end_time,
                            shift2.start_time,
                            shift2.end_time
                        )
                    )
                );

                if (groupsOverlap) {
                    group1.shifts.push(...group2.shifts);
                    group1.maxColumns = Math.max(group1.maxColumns, group1.shifts.length);
                    overlapGroups.splice(j, 1);
                    merged = true;
                    break;
                }
            }
            if (merged) break;
        }
    }

    // Assign column positions within each group
    for (const group of overlapGroups) {
        // Sort shifts within group by start time
        const sortedGroupShifts = [...group.shifts].sort((a, b) => {
            const [hourA, minA] = a.start_time.split(':').map(Number);
            const [hourB, minB] = b.start_time.split(':').map(Number);
            const minutesA = hourA * 60 + minA;
            const minutesB = hourB * 60 + minB;
            return minutesA - minutesB;
        });

        const maxColumns = group.maxColumns;
        const columnWidthPercent = 100 / maxColumns;

        sortedGroupShifts.forEach((shift, index) => {
            const columnIndex = index % maxColumns;
            const leftPercent = (columnIndex / maxColumns) * 100;

            positions.set(shift.id, {
                columnIndex,
                maxColumns,
                widthPercent: columnWidthPercent,
                leftPercent,
            });
        });
    }

    // Handle segments that don't overlap with anything
    segments.forEach(segment => {
        const segmentKey = `${segment.schedule.id}-${segment.segmentIndex}`;
        if (!positions.has(segmentKey)) {
            positions.set(segmentKey, {
                columnIndex: 0,
                maxColumns: 1,
                widthPercent: 100,
                leftPercent: 0,
            });
        }
    });

    return positions;
}
