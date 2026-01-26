import React from 'react';
import { Target, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import Card from '../ui/Card';
import type { StrategyProgress } from '../../lib/api';
import { cn } from '../../lib/utils';

interface StrategyTrackingDashboardProps {
    progress: StrategyProgress;
    dividendType?: 'eligible' | 'non_eligible';
}

const StrategyTrackingDashboard: React.FC<StrategyTrackingDashboardProps> = ({
    progress,
    dividendType = 'non_eligible'
}) => {
    const { strategy, ytd, progress: progressPercentages, recommendation } = progress;

    if (!strategy) return null;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatPercent = (value: number) => {
        return `${value.toFixed(1)}%`;
    };

    const getProgressColor = (percent: number) => {
        if (percent >= 100) return 'bg-green-500';
        if (percent >= 75) return 'bg-primary';
        if (percent >= 50) return 'bg-yellow-500';
        return 'bg-orange-500';
    };

    const getRecommendationIcon = () => {
        switch (recommendation.type) {
            case 'salary':
                return <Target className="w-5 h-5" />;
            case 'eligible_dividend':
            case 'non_eligible_dividend':
                return <TrendingUp className="w-5 h-5" />;
            case 'complete':
                return <CheckCircle className="w-5 h-5" />;
            default:
                return <AlertCircle className="w-5 h-5" />;
        }
    };

    const getRecommendationColor = () => {
        switch (recommendation.type) {
            case 'complete':
                return 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400';
            default:
                return 'bg-primary/10 border-primary/20 text-primary';
        }
    };

    return (
        <div className="space-y-6">
            {/* Strategy Summary */}
            <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">
                    {strategy.fiscal_year} Compensation Strategy
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <div className="text-sm text-muted-foreground">Goal</div>
                        <div className="font-semibold capitalize">
                            {strategy.goal_type.replace('_', ' ')}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm text-muted-foreground">Planned Salary</div>
                        <div className="font-semibold">{formatCurrency(strategy.planned_salary)}</div>
                    </div>
                    <div>
                        <div className="text-sm text-muted-foreground">Planned Dividends</div>
                        <div className="font-semibold">
                            {formatCurrency(
                                strategy.planned_eligible_dividends +
                                strategy.planned_non_eligible_dividends
                            )}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm text-muted-foreground">Overall Progress</div>
                        <div className="font-semibold">{formatPercent(progressPercentages.overall)}</div>
                    </div>
                </div>
            </Card>

            {/* Progress Tracking */}
            <div className="grid md:grid-cols-3 gap-4">
                {/* Salary Progress */}
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="text-sm text-muted-foreground">Salary</div>
                            <div className="text-2xl font-bold">
                                {formatCurrency(ytd.salary)} / {formatCurrency(strategy.planned_salary)}
                            </div>
                        </div>
                        {progressPercentages.salary >= 100 ? (
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        ) : (
                            <Target className="w-8 h-8 text-primary" />
                        )}
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span className="font-semibold">
                                {formatPercent(progressPercentages.salary)}
                            </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                            <div
                                className={cn(
                                    'h-2 rounded-full transition-all',
                                    getProgressColor(progressPercentages.salary)
                                )}
                                style={{ width: `${Math.min(100, progressPercentages.salary)}%` }}
                            />
                        </div>
                        {ytd.salary < strategy.planned_salary && (
                            <div className="text-xs text-muted-foreground">
                                {formatCurrency(strategy.planned_salary - ytd.salary)} remaining
                            </div>
                        )}
                    </div>
                </Card>

                {/* Non-Eligible Dividends Progress */}
                {dividendType === 'non_eligible' && (
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="text-sm text-muted-foreground">Non-Eligible Dividends</div>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(ytd.nonEligibleDividends)} /{' '}
                                    {formatCurrency(strategy.planned_non_eligible_dividends)}
                                </div>
                            </div>
                            {progressPercentages.nonEligibleDividends >= 100 ? (
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            ) : (
                                <TrendingUp className="w-8 h-8 text-primary" />
                            )}
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Progress</span>
                                <span className="font-semibold">
                                    {formatPercent(progressPercentages.nonEligibleDividends)}
                                </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                                <div
                                    className={cn(
                                        'h-2 rounded-full transition-all',
                                        getProgressColor(progressPercentages.nonEligibleDividends)
                                    )}
                                    style={{
                                        width: `${Math.min(100, progressPercentages.nonEligibleDividends)}%`,
                                    }}
                                />
                            </div>
                            {ytd.nonEligibleDividends < strategy.planned_non_eligible_dividends && (
                                <div className="text-xs text-muted-foreground">
                                    {formatCurrency(
                                        strategy.planned_non_eligible_dividends - ytd.nonEligibleDividends
                                    )}{' '}
                                    remaining
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {/* Eligible Dividends Progress */}
                {dividendType === 'eligible' && (
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="text-sm text-muted-foreground">Eligible Dividends</div>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(ytd.eligibleDividends)} /{' '}
                                    {formatCurrency(strategy.planned_eligible_dividends)}
                                </div>
                            </div>
                            {progressPercentages.eligibleDividends >= 100 ? (
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            ) : (
                                <TrendingUp className="w-8 h-8 text-primary" />
                            )}
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Progress</span>
                                <span className="font-semibold">
                                    {formatPercent(progressPercentages.eligibleDividends)}
                                </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                                <div
                                    className={cn(
                                        'h-2 rounded-full transition-all',
                                        getProgressColor(progressPercentages.eligibleDividends)
                                    )}
                                    style={{
                                        width: `${Math.min(100, progressPercentages.eligibleDividends)}%`,
                                    }}
                                />
                            </div>
                            {ytd.eligibleDividends < strategy.planned_eligible_dividends && (
                                <div className="text-xs text-muted-foreground">
                                    {formatCurrency(
                                        strategy.planned_eligible_dividends - ytd.eligibleDividends
                                    )}{' '}
                                    remaining
                                </div>
                            )}
                        </div>
                    </Card>
                )}
            </div>

            {/* Recommendation */}
            <Card className={cn('p-6 border-2', getRecommendationColor())}>
                <div className="flex items-start gap-4">
                    <div className="mt-1">{getRecommendationIcon()}</div>
                    <div className="flex-1">
                        <div className="font-semibold mb-2">Next Withdrawal Recommendation</div>
                        <p className="text-sm mb-2">{recommendation.reason}</p>
                        {recommendation.type !== 'complete' && (
                            <div className="text-sm">
                                <span className="font-semibold">Recommended type:</span>{' '}
                                {recommendation.type.replace('_', ' ').replace(/\b\w/g, (l) =>
                                    l.toUpperCase()
                                )}
                                {recommendation.remaining > 0 && (
                                    <>
                                        {' '}
                                        <span className="text-muted-foreground">
                                            ({formatCurrency(recommendation.remaining)} remaining)
                                        </span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Projected vs Actual (if available) */}
            {strategy.projected_net_cash && (
                <Card className="p-6">
                    <h3 className="font-semibold mb-4">Projected vs Actual</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm text-muted-foreground">Projected Net Cash</div>
                            <div className="text-xl font-bold">
                                {formatCurrency(strategy.projected_net_cash)}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">YTD Total</div>
                            <div className="text-xl font-bold">{formatCurrency(ytd.total)}</div>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default StrategyTrackingDashboard;
