import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import Card from '../ui/Card';
import type { CompensationScenario } from '../../lib/salaryDividendOptimizer';

interface StrategyPreviewProps {
    scenario: CompensationScenario | null;
    isLoading?: boolean;
    error?: string | null;
    corporateNetIncome: number;
}

const StrategyPreview: React.FC<StrategyPreviewProps> = ({
    scenario,
    isLoading,
    error,
    corporateNetIncome,
}) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    if (isLoading) {
        return (
            <Card className="p-6">
                <div className="flex items-center justify-center gap-3 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Calculating...</span>
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="p-6 border-red-500/50 bg-red-500/10">
                <div className="flex items-center gap-3 text-red-500">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm">{error}</span>
                </div>
            </Card>
        );
    }

    if (!scenario) {
        return (
            <Card className="p-6">
                <div className="text-center text-muted-foreground text-sm">
                    Adjust the sliders above to see a live preview of your strategy
                </div>
            </Card>
        );
    }

    const totalCompensation = scenario.salary + scenario.eligibleDividends + scenario.nonEligibleDividends;
    const efficiency = corporateNetIncome > 0 ? (scenario.netCashToOwner / corporateNetIncome) * 100 : 0;

    return (
        <Card className="p-6">
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-semibold mb-1">Live Preview</h3>
                    <p className="text-sm text-muted-foreground">
                        Your estimated outcomes based on current settings
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Net Cash</div>
                        <div className="text-xl font-bold text-foreground">
                            {formatCurrency(scenario.netCashToOwner)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {efficiency.toFixed(1)}% efficiency
                        </div>
                    </div>

                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Total Tax</div>
                        <div className="text-xl font-bold text-foreground">
                            {formatCurrency(scenario.totalTaxBurden)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {scenario.effectiveTaxRate.toFixed(1)}% effective rate
                        </div>
                    </div>

                    <div>
                        <div className="text-xs text-muted-foreground mb-1">RRSP Room</div>
                        <div className="text-xl font-bold text-foreground">
                            {formatCurrency(scenario.rrspRoomGenerated)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {scenario.salary > 0 ? 'From salary' : 'No salary'}
                        </div>
                    </div>

                    <div>
                        <div className="text-xs text-muted-foreground mb-1">CPP Contributions</div>
                        <div className="text-xl font-bold text-foreground">
                            {formatCurrency(scenario.cppContributions)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {scenario.salary > 0 ? 'From salary' : 'No salary'}
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-border">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <div className="text-muted-foreground mb-1">Salary</div>
                            <div className="font-semibold">{formatCurrency(scenario.salary)}</div>
                        </div>
                        <div>
                            <div className="text-muted-foreground mb-1">Dividends</div>
                            <div className="font-semibold">{formatCurrency(scenario.nonEligibleDividends + scenario.eligibleDividends)}</div>
                            {scenario.nonEligibleDividends > 0 && scenario.rdtohRefund > 0 && (
                                <div className="text-xs text-green-500 mt-1">
                                    +{formatCurrency(scenario.rdtohRefund)} RDTOH refund
                                </div>
                            )}
                            {scenario.eligibleDividends > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                    ({formatCurrency(scenario.eligibleDividends)} eligible, {formatCurrency(scenario.nonEligibleDividends)} non-eligible)
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {totalCompensation > corporateNetIncome * 1.05 && (
                    <div className="pt-2 border-t border-border">
                        <div className="flex items-center gap-2 text-sm text-orange-500">
                            <AlertCircle className="w-4 h-4" />
                            <span>
                                Total compensation exceeds available corporate income. Adjust amounts to match your
                                corporate net income.
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default StrategyPreview;
