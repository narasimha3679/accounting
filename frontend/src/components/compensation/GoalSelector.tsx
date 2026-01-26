import React from 'react';
import { DollarSign, TrendingUp, Target, CheckCircle } from 'lucide-react';
import Card from '../ui/Card';
import { cn } from '../../lib/utils';

export type GoalType = 'minimize_tax' | 'maximize_rrsp' | 'maximize_cpp' | 'net_cash';

export interface GoalOption {
    id: GoalType;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}

const goalOptions: GoalOption[] = [
    {
        id: 'minimize_tax',
        label: 'Minimize Taxes',
        description: 'Pay the least amount of tax possible',
        icon: Target,
    },
    {
        id: 'maximize_rrsp',
        label: 'Build RRSP Room',
        description: 'Generate maximum RRSP contribution room for retirement savings',
        icon: TrendingUp,
    },
    {
        id: 'maximize_cpp',
        label: 'Maximize CPP Benefits',
        description: 'Build Canada Pension Plan benefits for retirement',
        icon: Target,
    },
    {
        id: 'net_cash',
        label: 'Target Cash Amount',
        description: 'I need a specific amount of cash this year',
        icon: DollarSign,
    },
];

interface GoalSelectorProps {
    selectedGoals: GoalType[];
    onGoalsChange: (goals: GoalType[]) => void;
    targetCash?: number;
    onTargetCashChange?: (amount: number | undefined) => void;
}

const GoalSelector: React.FC<GoalSelectorProps> = ({
    selectedGoals,
    onGoalsChange,
    targetCash,
    onTargetCashChange,
}) => {
    const handleGoalToggle = (goalId: GoalType) => {
        if (selectedGoals.includes(goalId)) {
            onGoalsChange(selectedGoals.filter((g) => g !== goalId));
            // If deselecting net_cash, clear target cash
            if (goalId === 'net_cash' && onTargetCashChange) {
                onTargetCashChange(undefined);
            }
        } else {
            onGoalsChange([...selectedGoals, goalId]);
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-xl font-semibold mb-2">What matters most to you?</h3>
                <p className="text-sm text-muted-foreground">
                    Select one or more goals. We'll find the best strategy that balances your priorities.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goalOptions.map((goal) => {
                    const Icon = goal.icon;
                    const isSelected = selectedGoals.includes(goal.id);

                    return (
                        <button
                            key={goal.id}
                            type="button"
                            onClick={() => handleGoalToggle(goal.id)}
                            className={cn(
                                'text-left transition-all duration-200',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                            )}
                        >
                            <Card
                                className={cn(
                                    'h-full transition-all duration-200',
                                    isSelected
                                        ? 'border-2 border-primary bg-primary/10'
                                        : 'border-2 border-border hover:border-primary/50 hover:bg-card/50'
                                )}
                            >
                                <div className="flex items-start gap-4">
                                    <div
                                        className={cn(
                                            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                                            isSelected
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground'
                                        )}
                                    >
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-semibold text-foreground">{goal.label}</h4>
                                            {isSelected && (
                                                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">{goal.description}</p>
                                    </div>
                                </div>
                            </Card>
                        </button>
                    );
                })}
            </div>

            {selectedGoals.includes('net_cash') && onTargetCashChange && (
                <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <label className="block text-sm font-medium mb-2">
                        Target Net Cash Amount
                    </label>
                    <input
                        type="number"
                        value={targetCash || ''}
                        onChange={(e) => {
                            const value = e.target.value;
                            onTargetCashChange(value ? parseFloat(value) : undefined);
                        }}
                        className="input w-full"
                        placeholder="e.g., 80000"
                        min="0"
                        step="1000"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                        The amount you want to keep after taxes this year
                    </p>
                </div>
            )}

            {selectedGoals.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                    Select at least one goal to continue
                </div>
            )}
        </div>
    );
};

export default GoalSelector;
