import React from 'react';
import Card from '../ui/Card';
import { cn } from '../../lib/utils';
import type { StrategyOption } from '../../lib/salaryDividendOptimizer';

interface StrategyComparisonProps {
    options: StrategyOption[];
    recommended: string;
}

const StrategyComparison: React.FC<StrategyComparisonProps> = ({ options, recommended }) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    if (options.length === 0) {
        return null;
    }

    // Find the best value for each metric to highlight
    const bestNetCash = Math.max(...options.map((o) => o.scenario.netCashToOwner));
    const bestRRSP = Math.max(...options.map((o) => o.scenario.rrspRoomGenerated));
    const bestCPP = Math.max(...options.map((o) => o.scenario.cppContributions));
    const bestTax = Math.min(...options.map((o) => o.scenario.totalTaxBurden));

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-xl font-semibold mb-2">Compare Strategies</h3>
                <p className="text-sm text-muted-foreground">
                    Side-by-side comparison of key metrics
                </p>
            </div>

            <div className="overflow-x-auto">
                <Card className="p-0 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left p-4 font-semibold text-foreground">Strategy</th>
                                <th className="text-right p-4 font-semibold text-foreground">Net Cash</th>
                                <th className="text-right p-4 font-semibold text-foreground">Total Tax</th>
                                <th className="text-right p-4 font-semibold text-foreground">RRSP Room</th>
                                <th className="text-right p-4 font-semibold text-foreground">CPP</th>
                                <th className="text-right p-4 font-semibold text-foreground">Tax Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {options.map((option, idx) => {
                                const scenario = option.scenario;
                                const isRecommended = option.id === recommended;

                                return (
                                    <tr
                                        key={option.id}
                                        className={cn(
                                            'border-b border-border/50 transition-colors',
                                            isRecommended && 'bg-primary/10',
                                            idx % 2 === 0 ? 'bg-card/50' : 'bg-card'
                                        )}
                                    >
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{option.name}</span>
                                                {isRecommended && (
                                                    <span className="text-xs px-2 py-0.5 bg-primary text-primary-foreground rounded">
                                                        Recommended
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {option.description}
                                            </div>
                                        </td>
                                        <td
                                            className={cn(
                                                'text-right p-4 font-semibold',
                                                scenario.netCashToOwner === bestNetCash && 'text-green-500'
                                            )}
                                        >
                                            {formatCurrency(scenario.netCashToOwner)}
                                        </td>
                                        <td
                                            className={cn(
                                                'text-right p-4 font-semibold',
                                                scenario.totalTaxBurden === bestTax && 'text-green-500'
                                            )}
                                        >
                                            {formatCurrency(scenario.totalTaxBurden)}
                                        </td>
                                        <td
                                            className={cn(
                                                'text-right p-4 font-semibold',
                                                scenario.rrspRoomGenerated === bestRRSP && 'text-green-500'
                                            )}
                                        >
                                            {formatCurrency(scenario.rrspRoomGenerated)}
                                        </td>
                                        <td
                                            className={cn(
                                                'text-right p-4 font-semibold',
                                                scenario.cppContributions === bestCPP && 'text-green-500'
                                            )}
                                        >
                                            {formatCurrency(scenario.cppContributions)}
                                        </td>
                                        <td className="text-right p-4 text-muted-foreground">
                                            {scenario.effectiveTaxRate.toFixed(1)}%
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </Card>
            </div>

            <div className="text-xs text-muted-foreground">
                <span className="text-green-500">Green</span> indicates the best value for each metric
            </div>
        </div>
    );
};

export default StrategyComparison;
