import React from 'react';
import { Star, CheckCircle, X } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { cn } from '../../lib/utils';
import type { StrategyOption } from '../../lib/salaryDividendOptimizer';

interface StrategyPresetsProps {
    options: StrategyOption[];
    recommended: string;
    onSelect: (optionId: string) => void;
    selectedOptionId?: string;
}

const StrategyPresets: React.FC<StrategyPresetsProps> = ({
    options,
    recommended,
    onSelect,
    selectedOptionId,
}) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-xl font-semibold mb-2">Explore Your Options</h3>
                <p className="text-sm text-muted-foreground">
                    Compare different strategies side-by-side. Click "Select This Strategy" to customize it further.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {options.map((option) => {
                    const isRecommended = option.id === recommended;
                    const isSelected = option.id === selectedOptionId;
                    const scenario = option.scenario;

                    return (
                        <Card
                            key={option.id}
                            className={cn(
                                'relative transition-all duration-200',
                                isRecommended && 'border-2 border-primary',
                                isSelected && 'ring-2 ring-primary ring-offset-2',
                                !isSelected && 'hover:border-primary/50'
                            )}
                        >
                            {isRecommended && (
                                <div className="absolute top-3 right-3 flex items-center gap-1 text-primary">
                                    <Star className="w-4 h-4 fill-primary" />
                                    <span className="text-xs font-semibold">BEST</span>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-lg font-semibold mb-1">{option.name}</h4>
                                    <p className="text-sm text-muted-foreground">{option.description}</p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Net Cash:</span>
                                        <span className="font-semibold">{formatCurrency(scenario.netCashToOwner)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total Tax:</span>
                                        <span className="font-semibold">{formatCurrency(scenario.totalTaxBurden)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Salary:</span>
                                        <span className="font-semibold">{formatCurrency(scenario.salary)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Dividends:</span>
                                        <span className="font-semibold">
                                            {formatCurrency(scenario.nonEligibleDividends + scenario.eligibleDividends)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">RRSP Room:</span>
                                        <span className="font-semibold">{formatCurrency(scenario.rrspRoomGenerated)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">CPP Contributions:</span>
                                        <span className="font-semibold">{formatCurrency(scenario.cppContributions)}</span>
                                    </div>
                                </div>

                                {option.pros.length > 0 && (
                                    <div className="space-y-1">
                                        <div className="text-xs font-semibold text-foreground">Pros:</div>
                                        <ul className="space-y-1">
                                            {option.pros.map((pro, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                                                    <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                                                    <span>{pro}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {option.cons.length > 0 && (
                                    <div className="space-y-1">
                                        <div className="text-xs font-semibold text-foreground">Cons:</div>
                                        <ul className="space-y-1">
                                            {option.cons.map((con, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                                                    <X className="w-3 h-3 text-orange-500 mt-0.5 flex-shrink-0" />
                                                    <span>{con}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <Button
                                    variant={isSelected ? 'default' : 'outline'}
                                    className="w-full"
                                    onClick={() => onSelect(option.id)}
                                >
                                    {isSelected ? 'Selected' : 'Select This Strategy'}
                                </Button>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default StrategyPresets;
