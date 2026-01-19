import React from 'react';
import Card from '../ui/Card';
import type { TimeEntry } from '../../lib/api';
import { calculateHours } from '../../lib/scheduleUtils';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface TimeEntryCardProps {
    entry: TimeEntry;
    onEdit?: (entry: TimeEntry) => void;
    onDelete?: (entry: TimeEntry) => void;
    onApprove?: (entry: TimeEntry) => void;
    onReject?: (entry: TimeEntry) => void;
    onSubmit?: (entry: TimeEntry) => void;
    showActions?: boolean;
    isReadOnly?: boolean;
}

const TimeEntryCard: React.FC<TimeEntryCardProps> = ({
    entry,
    onEdit,
    onDelete,
    onApprove,
    onReject,
    onSubmit,
    showActions = true,
    isReadOnly = false,
}) => {
    const hours = calculateHours(entry.start_time, entry.end_time, entry.break_duration_minutes);
    
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'draft':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'approved':
            case 'completed':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'rejected':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            case 'cancelled':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved':
            case 'completed':
                return <CheckCircle className="h-4 w-4" />;
            case 'rejected':
            case 'cancelled':
                return <XCircle className="h-4 w-4" />;
            case 'pending':
                return <Clock className="h-4 w-4" />;
            default:
                return <AlertCircle className="h-4 w-4" />;
        }
    };

    const formattedDate = new Date(entry.entry_date).toLocaleDateString('en-CA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <h3 className="text-lg font-medium text-foreground">
                        {entry.employee 
                            ? `${entry.employee.first_name} ${entry.employee.last_name}`
                            : 'Unknown Employee'}
                    </h3>
                    <p className="text-sm text-muted-foreground">{formattedDate}</p>
                    {entry.entry_type === 'submitted' && entry.allotted_entry_id && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Linked to allotted schedule
                        </p>
                    )}
                </div>
                {showActions && !isReadOnly && (
                    <div className="flex items-center gap-2">
                        {entry.status === 'pending' && onApprove && onReject && (
                            <>
                                <button
                                    onClick={() => onApprove(entry)}
                                    className="h-8 w-8 rounded-full flex items-center justify-center text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                    title="Approve"
                                >
                                    <CheckCircle className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => onReject(entry)}
                                    className="h-8 w-8 rounded-full flex items-center justify-center text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                    title="Reject"
                                >
                                    <XCircle className="h-4 w-4" />
                                </button>
                            </>
                        )}
                        {entry.status === 'draft' && onEdit && (
                            <>
                                <button
                                    onClick={() => onEdit(entry)}
                                    className="h-8 w-8 rounded-full flex items-center justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                    title="Edit"
                                >
                                    <Clock className="h-4 w-4" />
                                </button>
                                {onSubmit && (
                                    <button
                                        onClick={() => onSubmit(entry)}
                                        className="h-8 w-8 rounded-full flex items-center justify-center text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                        title="Submit for Approval"
                                    >
                                        <CheckCircle className="h-4 w-4" />
                                    </button>
                                )}
                            </>
                        )}
                        {onDelete && (entry.status === 'draft' || entry.entry_type === 'allotted') && (
                            <button
                                onClick={() => onDelete(entry)}
                                className="h-8 w-8 rounded-full flex items-center justify-center text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Delete"
                            >
                                <XCircle className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
                <div>
                    <span className="font-medium text-foreground">Start Time:</span>
                    <p className="text-muted-foreground">{entry.start_time}</p>
                </div>
                <div>
                    <span className="font-medium text-foreground">End Time:</span>
                    <p className="text-muted-foreground">{entry.end_time}</p>
                </div>
                <div>
                    <span className="font-medium text-foreground">Break:</span>
                    <p className="text-muted-foreground">{entry.break_duration_minutes} minutes</p>
                </div>
                <div>
                    <span className="font-medium text-foreground">Hours:</span>
                    <p className="text-muted-foreground">{hours.toFixed(1)}h</p>
                </div>
            </div>

            {entry.notes && (
                <div className="mt-4 pt-4 border-t border-border">
                    <span className="font-medium text-foreground">Notes:</span>
                    <p className="text-muted-foreground mt-1">{entry.notes}</p>
                </div>
            )}

            {entry.rejection_reason && (
                <div className="mt-4 pt-4 border-t border-border">
                    <span className="font-medium text-foreground text-red-600 dark:text-red-400">Rejection Reason:</span>
                    <p className="text-muted-foreground mt-1">{entry.rejection_reason}</p>
                </div>
            )}

            <div className="mt-4 flex items-center justify-between">
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(entry.status)}`}>
                    {getStatusIcon(entry.status)}
                    {entry.status}
                </span>
                {entry.approved_at && (
                    <span className="text-xs text-muted-foreground">
                        Approved: {new Date(entry.approved_at).toLocaleDateString('en-CA')}
                    </span>
                )}
            </div>
        </Card>
    );
};

export default TimeEntryCard;
