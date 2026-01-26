import React, { useState } from 'react';
import { Info } from 'lucide-react';

import { cn } from '../../lib/utils';
import Card from '../ui/Card';

import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/Tooltip';

interface SafeToSpendProps {
    hstOwed: number;
    corpTaxOwed: number;
    upcomingPayroll?: number; // Optional V2
    availableCash: number;
}

export const SafeToSpendWidget: React.FC<SafeToSpendProps> = ({
    hstOwed,
    corpTaxOwed,
    availableCash,
    upcomingPayroll = 0
}) => {
    const [tooltipOpen, setTooltipOpen] = useState(false);

    // Use calculated available cash instead of manual bank balance
    const bankBalance = availableCash;
    const totalLiabilities = hstOwed + corpTaxOwed + upcomingPayroll;
    const safeToSpend = bankBalance - totalLiabilities;
    const isDanger = safeToSpend < 0;



    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(val);

    return (
        <Card className={cn(
            "relative overflow-hidden border-2",
            isDanger ? "border-red-500/20 bg-red-500/5" : "border-emerald-500/20 bg-emerald-500/5"
        )}>
            {/* Background Decor */}
            <div className={cn(
                "absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-10",
                isDanger ? "bg-red-500" : "bg-emerald-500"
            )} />

            <div className="relative z-10 p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

                    {/* Main Number */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <h2 className="text-sm uppercase tracking-wider font-semibold text-muted-foreground">
                                Safe to Spend
                            </h2>
                            <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen} delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        onClick={() => setTooltipOpen(!tooltipOpen)}
                                        className="inline-flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                                        aria-label="Show calculation details"
                                    >
                                        <Info className="w-4 h-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" align="start" className="w-64 p-3 bg-popover border border-border rounded-lg shadow-xl z-50 text-xs">
                                    <p className="font-semibold mb-1">How is this calculated?</p>
                                    <div className="flex justify-between py-1 border-b border-border/50">
                                        <span>Est. Cash Flow:</span>
                                        <span>{formatCurrency(bankBalance)}</span>
                                    </div>
                                    <div className="flex justify-between py-1 text-red-500">
                                        <span>HST Owed:</span>
                                        <span>-{formatCurrency(hstOwed)}</span>
                                    </div>
                                    <div className="flex justify-between py-1 text-red-500">
                                        <span>Corp Tax (Est):</span>
                                        <span>-{formatCurrency(corpTaxOwed)}</span>
                                    </div>
                                    {upcomingPayroll > 0 && (
                                        <div className="flex justify-between py-1 text-red-500">
                                            <span>Est. Payroll:</span>
                                            <span>-{formatCurrency(upcomingPayroll)}</span>
                                        </div>
                                    )}
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        <div className={cn(
                            "text-5xl font-bold tracking-tight transition-colors",
                            isDanger ? "text-red-500" : "text-emerald-500"
                        )}>
                            {formatCurrency(safeToSpend)}
                        </div>

                        {isDanger && (
                            <p className="text-red-500 font-medium text-sm mt-2 flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                Warning: You are dipping into tax money!
                            </p>
                        )}
                    </div>



                </div>
            </div>
        </Card>
    );
};
