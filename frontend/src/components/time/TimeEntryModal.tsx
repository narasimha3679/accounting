import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api, { type TimeEntry, type Employee } from '../../lib/api';
import { useMutation } from '@tanstack/react-query';
import Button from '../ui/Button';
import { X } from 'lucide-react';

interface TimeEntryModalProps {
    entry?: TimeEntry | null;
    employees: Employee[];
    entryType: 'allotted' | 'submitted';
    prefilledDate?: Date | null;
    prefilledTime?: { hour: number; minute: number } | null;
    prefilledEmployeeId?: number;
    onClose: () => void;
    onSave: () => void;
    onDelete?: (id: number) => void;
}

const TimeEntryModal: React.FC<TimeEntryModalProps> = ({
    entry,
    employees,
    entryType,
    prefilledDate,
    prefilledTime,
    prefilledEmployeeId,
    onClose,
    onSave,
    onDelete,
}) => {
    const { user } = useAuth();

    // Determine initial date
    const initialDate = entry?.entry_date 
        ? entry.entry_date.split('T')[0]
        : prefilledDate
        ? `${prefilledDate.getFullYear()}-${String(prefilledDate.getMonth() + 1).padStart(2, '0')}-${String(prefilledDate.getDate()).padStart(2, '0')}`
        : '';

    // Determine initial time - use allotted entry if available and user wants to use it
    const initialStartTime = entry?.start_time || (prefilledTime 
        ? `${String(prefilledTime.hour).padStart(2, '0')}:${String(prefilledTime.minute).padStart(2, '0')}`
        : '');
    
    const initialEndTime = entry?.end_time || (prefilledTime
        ? `${String(Math.min(23, prefilledTime.hour + 8)).padStart(2, '0')}:${String(prefilledTime.minute).padStart(2, '0')}`
        : '');

    const [formData, setFormData] = useState({
        employee_id: entry?.employee_id?.toString() || (prefilledEmployeeId ? prefilledEmployeeId.toString() : (user?.employee?.id ? user.employee.id.toString() : '')),
        entry_date: initialDate,
        start_time: initialStartTime,
        end_time: initialEndTime,
        break_duration_minutes: entry?.break_duration_minutes?.toString() || '0',
        notes: entry?.notes || '',
        status: entry?.status || (entryType === 'allotted' ? 'scheduled' : 'draft'),
    });

    const createTimeEntryMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.createTimeEntry({
                ...data,
                company_id: user!.company_id,
                employee_id: parseInt(data.employee_id),
                entry_type: entryType,
                break_duration_minutes: parseInt(data.break_duration_minutes) || 0,
            });
        },
        onSuccess: () => {
            onSave();
        },
    });

    const updateTimeEntryMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.updateTimeEntry(entry!.id, {
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

        if (entry) {
            updateTimeEntryMutation.mutate(formData);
        } else {
            createTimeEntryMutation.mutate(formData);
        }
    };

    const isEmployee = user?.isEmployee;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-foreground">
                        {entry ? 'Edit Time Entry' : `Add New ${entryType === 'allotted' ? 'Allotted' : 'Submitted'} Entry`}
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
                        {!isEmployee && (
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
                                    disabled={!!entry}
                                >
                                    <option value="">Select employee...</option>
                                    {employees.map((emp) => (
                                        <option key={emp.id} value={emp.id.toString()}>
                                            {emp.first_name} {emp.last_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {entryType === 'allotted' && !isEmployee && (
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
                        )}

                        <div>
                            <label htmlFor="entry_date" className="block text-sm font-medium text-foreground mb-2">
                                Date *
                            </label>
                            <input
                                id="entry_date"
                                type="date"
                                value={formData.entry_date}
                                onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                                className="input"
                                required
                                disabled={!!entry && entry.status !== 'draft'}
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
                                disabled={entry?.status === 'approved' || (entryType === 'allotted' && isEmployee)}
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
                                disabled={entry?.status === 'approved' || (entryType === 'allotted' && isEmployee)}
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
                                disabled={entry?.status === 'approved' || (entryType === 'allotted' && isEmployee)}
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
                                disabled={entry?.status === 'approved' || (entryType === 'allotted' && isEmployee)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-border">
                        {entry && onDelete && entry.status !== 'approved' && (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => {
                                    if (confirm('Are you sure you want to delete this time entry?')) {
                                        onDelete(entry.id);
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
                                disabled={createTimeEntryMutation.isPending || updateTimeEntryMutation.isPending}
                            >
                                {createTimeEntryMutation.isPending || updateTimeEntryMutation.isPending
                                    ? 'Saving...'
                                    : entry
                                        ? 'Update Entry'
                                        : 'Create Entry'
                                }
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TimeEntryModal;
