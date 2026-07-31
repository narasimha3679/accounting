import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Clock, FileText, CheckCircle2, ArrowRight, Banknote, Users } from 'lucide-react';
import Button from '../ui/Button';

interface ActionCenterProps {
    overdueCount: number;
    overdueTotal?: number;
    hstFilingDue?: string; // ISO Date
    draftTimesheetsCount?: number;
    receiptsToReviewCount?: number;
    /** Open pay runs awaiting calculate / approve / finalize */
    openPayRunsCount?: number;
    openPayRunsTotal?: number;
    /** Unpaid CRA remittance periods (pending + overdue) */
    remittanceDueCount?: number;
    remittanceDueTotal?: number;
    remittanceOverdueCount?: number;
}

export const ActionCenter: React.FC<ActionCenterProps> = ({
    overdueCount,
    overdueTotal = 0,
    hstFilingDue,
    draftTimesheetsCount = 0,
    openPayRunsCount = 0,
    openPayRunsTotal = 0,
    remittanceDueCount = 0,
    remittanceDueTotal = 0,
    remittanceOverdueCount = 0,
}) => {
    const navigate = useNavigate();
    const hasActions =
        overdueCount > 0 ||
        !!hstFilingDue ||
        draftTimesheetsCount > 0 ||
        openPayRunsCount > 0 ||
        remittanceDueCount > 0;
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
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate('/invoices')}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                navigate('/invoices');
                            }
                        }}
                        className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center justify-between group cursor-pointer hover:bg-destructive/15 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-destructive/20 rounded-full text-destructive">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-destructive">
                                    {overdueCount} Overdue Invoice{overdueCount > 1 ? 's' : ''}
                                </h3>
                                <p className="text-xs text-destructive/80">
                                    Total outstanding: <span className="font-mono font-bold">{formatCurrency(overdueTotal)}</span>
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate('/invoices');
                            }}
                        >
                            View <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </motion.div>
                )}

                {/* Overdue / unpaid payroll remittances */}
                {remittanceDueCount > 0 && (
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.05 }}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate('/payroll/remittances')}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                navigate('/payroll/remittances');
                            }
                        }}
                        className={
                            remittanceOverdueCount > 0
                                ? 'bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center justify-between group cursor-pointer hover:bg-destructive/15 transition-colors'
                                : 'bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-center justify-between group cursor-pointer hover:bg-amber-500/15 transition-colors'
                        }
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className={
                                    remittanceOverdueCount > 0
                                        ? 'p-2 bg-destructive/20 rounded-full text-destructive'
                                        : 'p-2 bg-amber-500/20 rounded-full text-amber-500'
                                }
                            >
                                <Banknote className="w-5 h-5" />
                            </div>
                            <div>
                                <h3
                                    className={
                                        remittanceOverdueCount > 0
                                            ? 'font-semibold text-destructive'
                                            : 'font-semibold text-amber-700 dark:text-amber-400'
                                    }
                                >
                                    {remittanceOverdueCount > 0
                                        ? `${remittanceOverdueCount} Overdue Remittance${remittanceOverdueCount > 1 ? 's' : ''}`
                                        : `${remittanceDueCount} Remittance${remittanceDueCount > 1 ? 's' : ''} Due`}
                                </h3>
                                <p
                                    className={
                                        remittanceOverdueCount > 0
                                            ? 'text-xs text-destructive/80'
                                            : 'text-xs text-amber-600/80 dark:text-amber-400/80'
                                    }
                                >
                                    CRA source deductions:{' '}
                                    <span className="font-mono font-bold">{formatCurrency(remittanceDueTotal)}</span>
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={
                                remittanceOverdueCount > 0
                                    ? 'text-destructive hover:text-destructive hover:bg-destructive/10'
                                    : 'text-amber-500 hover:text-amber-600 hover:bg-amber-500/10'
                            }
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate('/payroll/remittances');
                            }}
                        >
                            Pay <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </motion.div>
                )}

                {/* Open pay runs awaiting processing */}
                {openPayRunsCount > 0 && (
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate('/payroll/runs')}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                navigate('/payroll/runs');
                            }
                        }}
                        className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center justify-between group cursor-pointer hover:bg-primary/15 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/20 rounded-full text-primary">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">
                                    {openPayRunsCount} Open Pay Run{openPayRunsCount > 1 ? 's' : ''}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Est. employer cost:{' '}
                                    <span className="font-mono font-bold text-foreground">
                                        {formatCurrency(openPayRunsTotal)}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary hover:bg-primary/10"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate('/payroll/runs');
                            }}
                        >
                            Review <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </motion.div>
                )}

                {/* HST Filing - Warning */}
                {hstFilingDue && (
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.15 }}
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
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate('/time-management')}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                navigate('/time-management');
                            }
                        }}
                        className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center justify-between group cursor-pointer hover:bg-primary/15 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/20 rounded-full text-primary">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">
                                    {draftTimesheetsCount} Draft Timesheet{draftTimesheetsCount > 1 ? 's' : ''}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Don't forget to submit end of week
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary hover:bg-primary/10"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate('/time-management');
                            }}
                        >
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
