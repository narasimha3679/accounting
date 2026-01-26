import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Clock, FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';

interface ActionCenterProps {
    overdueCount: number;
    overdueTotal?: number;
    hstFilingDue?: string; // ISO Date
    draftTimesheetsCount?: number;
    receiptsToReviewCount?: number;
}

export const ActionCenter: React.FC<ActionCenterProps> = ({
    overdueCount,
    overdueTotal = 0,
    hstFilingDue,
    draftTimesheetsCount = 0,
}) => {
    const hasActions = overdueCount > 0 || !!hstFilingDue || draftTimesheetsCount > 0;
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(val);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-neon-emerald" />
                    Action Center
                </h2>
                {!hasActions && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        All Caught Up!
                    </span>
                )}
            </div>

            <div className="space-y-3">
                {/* Overdue Invoices - High Priority */}
                {overdueCount > 0 && (
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center justify-between group cursor-pointer hover:bg-red-500/15 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500/20 rounded-full text-red-500">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-red-700 dark:text-red-400">
                                    {overdueCount} Overdue Invoice{overdueCount > 1 ? 's' : ''}
                                </h3>
                                <p className="text-xs text-red-600/80 dark:text-red-400/80">
                                    Total outstanding: <span className="font-mono font-bold">{formatCurrency(overdueTotal)}</span>
                                </p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                            View <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </motion.div>
                )}

                {/* HST Filing - Warning */}
                {hstFilingDue && (
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/20 rounded-full text-amber-500">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-amber-700 dark:text-amber-400">
                                    HST Filing Due
                                </h3>
                                <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                                    Deadline: {new Date(hstFilingDue).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-amber-500 hover:text-amber-600 hover:bg-amber-500/10">
                            File <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </motion.div>
                )}

                {/* Draft Timesheets - Notice */}
                {draftTimesheetsCount > 0 && (
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-full text-blue-500">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-blue-700 dark:text-blue-400">
                                    {draftTimesheetsCount} Draft Timesheet{draftTimesheetsCount > 1 ? 's' : ''}
                                </h3>
                                <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                                    Don't forget to submit end of week
                                </p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-blue-500 hover:text-blue-600 hover:bg-blue-500/10">
                            Submit <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </motion.div>
                )}

                {!hasActions && (
                    <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg border border-border/50 border-dashed">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">You are all efficient!</p>
                    </div>
                )}
            </div>
        </div>
    );
};
