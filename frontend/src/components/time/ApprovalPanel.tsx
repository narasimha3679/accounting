import React, { useState } from 'react';
import type { TimeEntry } from '../../lib/api';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { CheckCircle, XCircle } from 'lucide-react';
import { calculateHours } from '../../lib/scheduleUtils';

interface ApprovalPanelProps {
    pendingEntries: TimeEntry[];
    onApprove: (entry: TimeEntry) => void;
    onReject: (entry: TimeEntry, reason: string) => void;
    onBatchApprove?: (entries: TimeEntry[]) => void;
}

const ApprovalPanel: React.FC<ApprovalPanelProps> = ({
    pendingEntries,
    onApprove,
    onReject,
    onBatchApprove,
}) => {
    const [rejectingEntry, setRejectingEntry] = useState<TimeEntry | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const handleReject = (entry: TimeEntry) => {
        if (!rejectionReason.trim()) {
            alert('Please provide a rejection reason');
            return;
        }
        onReject(entry, rejectionReason);
        setRejectingEntry(null);
        setRejectionReason('');
    };

    const handleBatchApprove = () => {
        if (onBatchApprove && pendingEntries.length > 0) {
            onBatchApprove(pendingEntries);
        }
    };

    if (pendingEntries.length === 0) {
        return (
            <Card className="p-6">
                <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-foreground font-medium">No pending approvals</p>
                    <p className="text-muted-foreground text-sm mt-1">All time entries are up to date</p>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                    Pending Approvals ({pendingEntries.length})
                </h3>
                {onBatchApprove && pendingEntries.length > 1 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBatchApprove}
                    >
                        Approve All Matching
                    </Button>
                )}
            </div>

            {pendingEntries.map((entry) => {
                const hours = calculateHours(entry.start_time, entry.end_time, entry.break_duration_minutes);
                const allottedHours = entry.allotted_entry
                    ? calculateHours(entry.allotted_entry.start_time, entry.allotted_entry.end_time, entry.allotted_entry.break_duration_minutes)
                    : null;
                const variance = allottedHours ? hours - allottedHours : null;
                const matchesAllotted = variance !== null && Math.abs(variance) < 0.1;

                const formattedDate = new Date(entry.entry_date).toLocaleDateString('en-CA', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                return (
                    <Card key={entry.id} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                                <h4 className="font-medium text-foreground">
                                    {entry.employee 
                                        ? `${entry.employee.first_name} ${entry.employee.last_name}`
                                        : 'Unknown Employee'}
                                </h4>
                                <p className="text-sm text-muted-foreground">{formattedDate}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onApprove(entry)}
                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                    title="Approve"
                                >
                                    <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setRejectingEntry(entry)}
                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                    title="Reject"
                                >
                                    <XCircle className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                            <div>
                                <span className="text-muted-foreground">Time:</span>
                                <p className="text-foreground font-medium">
                                    {entry.start_time} - {entry.end_time}
                                </p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Hours:</span>
                                <p className="text-foreground font-medium">{hours.toFixed(1)}h</p>
                            </div>
                        </div>

                        {entry.allotted_entry && (
                            <div className="mb-3 p-2 rounded bg-muted/50">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Allotted:</span>
                                    <span className="text-foreground">
                                        {entry.allotted_entry.start_time} - {entry.allotted_entry.end_time} ({allottedHours?.toFixed(1)}h)
                                    </span>
                                </div>
                                {variance !== null && (
                                    <div className={`mt-1 text-xs font-medium ${matchesAllotted ? 'text-green-600 dark:text-green-400' : Math.abs(variance) < 1 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {matchesAllotted ? '✓ Matches' : variance > 0 ? `+${variance.toFixed(1)}h variance` : `${variance.toFixed(1)}h variance`}
                                    </div>
                                )}
                            </div>
                        )}

                        {entry.notes && (
                            <p className="text-sm text-muted-foreground mb-2">{entry.notes}</p>
                        )}

                        {rejectingEntry?.id === entry.id && (
                            <div className="mt-3 pt-3 border-t border-border">
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Please provide a reason for rejection..."
                                    className="input min-h-[80px] mb-2"
                                    rows={3}
                                />
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleReject(entry)}
                                    >
                                        Reject
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setRejectingEntry(null);
                                            setRejectionReason('');
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>
                );
            })}
        </div>
    );
};

export default ApprovalPanel;
