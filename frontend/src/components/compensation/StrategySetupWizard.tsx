import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { useQuery } from '@tanstack/react-query';
import {
    Target,
    DollarSign,
    TrendingUp,
    ArrowRight,
    ArrowLeft,
    CheckCircle,
    Loader2,
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import {
    findOptimalMix,
    getRecommendation,
    type OptimizerInputs,
    type CompensationScenario,
} from '../../lib/salaryDividendOptimizer';
import { cn } from '../../lib/utils';

interface StrategySetupWizardProps {
    fiscalYear: number;
    onComplete: () => void;
    onCancel?: () => void;
}

type GoalType = 'net_cash' | 'maximize_rrsp' | 'maximize_cpp' | 'minimize_tax';

const StrategySetupWizard: React.FC<StrategySetupWizardProps> = ({
    fiscalYear,
    onComplete,
    onCancel,
}) => {
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [goalType, setGoalType] = useState<GoalType>('minimize_tax');
    const [targetNetCash, setTargetNetCash] = useState<number | undefined>(undefined);
    const [otherPersonalIncome, setOtherPersonalIncome] = useState(0);
    const [corporateNetIncome, setCorporateNetIncome] = useState(0);
    const [rdtohBalance, setRDTOHBalance] = useState(0);
    const [province, setProvince] = useState('ON');
    const [selectedScenario, setSelectedScenario] = useState<CompensationScenario | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch tax constants and brackets
    const { data: taxConstants } = useQuery({
        queryKey: ['taxConstants', fiscalYear],
        queryFn: async () => {
            return await api.getTaxConstants(fiscalYear);
        },
        enabled: !!fiscalYear,
    });

    const { data: federalBrackets } = useQuery({
        queryKey: ['federalBrackets', fiscalYear],
        queryFn: async () => {
            return await api.getTaxRates(fiscalYear, 'federal');
        },
        enabled: !!fiscalYear,
    });

    const { data: provincialBrackets } = useQuery({
        queryKey: ['provincialBrackets', fiscalYear, province],
        queryFn: async () => {
            return await api.getTaxRates(fiscalYear, province);
        },
        enabled: !!fiscalYear && !!province,
    });

    const { data: provincialConstants } = useQuery({
        queryKey: ['provincialConstants', fiscalYear, province],
        queryFn: async () => {
            return await api.getProvincialTaxConstants(fiscalYear, province);
        },
        enabled: !!fiscalYear && !!province,
    });

    // Calculate optimal scenarios
    const scenarios = useMemo(() => {
        if (
            !taxConstants ||
            !federalBrackets ||
            federalBrackets.length === 0 ||
            !provincialBrackets ||
            provincialBrackets.length === 0 ||
            corporateNetIncome <= 0
        ) {
            return [];
        }

        const inputs: OptimizerInputs = {
            corporateNetIncome,
            rdtohBalance,
            otherPersonalIncome,
            province,
            desiredPersonalCash: goalType === 'net_cash' ? targetNetCash : undefined,
            maximizeCPP: goalType === 'maximize_cpp',
            prioritizeRRSPRoom: goalType === 'maximize_rrsp',
            fiscalYear,
            smallBusinessTaxRate: user?.company?.small_business_rate || 0.125,
            federalBrackets,
            provincialBrackets,
            taxConstants,
            provincialConstants: provincialConstants || undefined,
        };

        return findOptimalMix(inputs);
    }, [
        corporateNetIncome,
        rdtohBalance,
        otherPersonalIncome,
        province,
        goalType,
        targetNetCash,
        fiscalYear,
        taxConstants,
        federalBrackets,
        provincialBrackets,
        provincialConstants,
        user?.company,
    ]);

    const recommendation = useMemo(() => {
        if (scenarios.length === 0) return null;
        try {
            return getRecommendation(scenarios);
        } catch {
            return null;
        }
    }, [scenarios]);

    // Auto-select recommended scenario
    React.useEffect(() => {
        if (recommendation && !selectedScenario) {
            setSelectedScenario(recommendation.recommended);
        }
    }, [recommendation, selectedScenario]);

    const handleNext = () => {
        if (step === 1) {
            // Validate goal selection
            if (goalType === 'net_cash' && (!targetNetCash || targetNetCash <= 0)) {
                alert('Please enter a target net cash amount');
                return;
            }
            setStep(2);
        } else if (step === 2) {
            // Validate inputs
            if (corporateNetIncome <= 0) {
                alert('Please enter corporate net income');
                return;
            }
            setStep(3);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const handleSave = async () => {
        if (!selectedScenario || !user?.company_id) return;

        setIsSaving(true);
        try {
            await api.createCompensationStrategy({
                company_id: user.company_id,
                fiscal_year: fiscalYear,
                goal_type: goalType,
                target_net_cash: goalType === 'net_cash' ? targetNetCash : undefined,
                planned_salary: selectedScenario.salary,
                planned_eligible_dividends: selectedScenario.eligibleDividends,
                planned_non_eligible_dividends: selectedScenario.nonEligibleDividends,
                projected_net_cash: selectedScenario.netCashToOwner,
                projected_total_tax: selectedScenario.totalTaxBurden,
                projected_rrsp_room: selectedScenario.rrspRoomGenerated,
                projected_cpp_contributions: selectedScenario.cppContributions,
                projected_effective_tax_rate: selectedScenario.effectiveTaxRate,
                corporate_net_income: corporateNetIncome,
                rdtoh_balance: rdtohBalance,
                other_personal_income: otherPersonalIncome,
                province,
            });
            onComplete();
        } catch (error: any) {
            console.error('Error saving strategy:', error);
            alert(error.message || 'Failed to save strategy');
        } finally {
            setIsSaving(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <Card className="p-6">
                {/* Progress indicator */}
                <div className="flex items-center justify-between mb-8">
                    {[1, 2, 3, 4].map((s) => (
                        <div key={s} className="flex items-center flex-1">
                            <div
                                className={cn(
                                    'w-10 h-10 rounded-full flex items-center justify-center font-semibold',
                                    step >= s
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground'
                                )}
                            >
                                {step > s ? <CheckCircle className="w-6 h-6" /> : s}
                            </div>
                            {s < 4 && (
                                <div
                                    className={cn(
                                        'flex-1 h-1 mx-2',
                                        step > s ? 'bg-primary' : 'bg-muted'
                                    )}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step 1: Goal Selection */}
                {step === 1 && (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Choose Your Goal</h2>
                        <p className="text-muted-foreground mb-6">
                            What do you want to optimize for this year?
                        </p>

                        <div className="space-y-4">
                            <button
                                onClick={() => {
                                    setGoalType('net_cash');
                                    setTargetNetCash(undefined);
                                }}
                                className={cn(
                                    'w-full p-4 rounded-lg border-2 text-left transition-all',
                                    goalType === 'net_cash'
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:border-primary/50'
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <DollarSign className="w-6 h-6 text-primary" />
                                    <div>
                                        <div className="font-semibold">I need a specific amount of cash</div>
                                        <div className="text-sm text-muted-foreground">
                                            Target a specific net cash amount this year
                                        </div>
                                    </div>
                                </div>
                            </button>

                            {goalType === 'net_cash' && (
                                <div className="ml-10">
                                    <label className="block text-sm font-medium mb-2">
                                        Target Net Cash Amount
                                    </label>
                                    <input
                                        type="number"
                                        value={targetNetCash || ''}
                                        onChange={(e) =>
                                            setTargetNetCash(parseFloat(e.target.value) || undefined)
                                        }
                                        className="input w-full"
                                        placeholder="e.g., 80000"
                                    />
                                </div>
                            )}

                            <button
                                onClick={() => setGoalType('maximize_rrsp')}
                                className={cn(
                                    'w-full p-4 rounded-lg border-2 text-left transition-all',
                                    goalType === 'maximize_rrsp'
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:border-primary/50'
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="w-6 h-6 text-primary" />
                                    <div>
                                        <div className="font-semibold">Maximize my RRSP room</div>
                                        <div className="text-sm text-muted-foreground">
                                            Generate maximum RRSP contribution room
                                        </div>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => setGoalType('maximize_cpp')}
                                className={cn(
                                    'w-full p-4 rounded-lg border-2 text-left transition-all',
                                    goalType === 'maximize_cpp'
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:border-primary/50'
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <Target className="w-6 h-6 text-primary" />
                                    <div>
                                        <div className="font-semibold">Maximize CPP contributions</div>
                                        <div className="text-sm text-muted-foreground">
                                            Build CPP benefits for retirement
                                        </div>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => setGoalType('minimize_tax')}
                                className={cn(
                                    'w-full p-4 rounded-lg border-2 text-left transition-all',
                                    goalType === 'minimize_tax'
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:border-primary/50'
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <Target className="w-6 h-6 text-primary" />
                                    <div>
                                        <div className="font-semibold">Minimize total tax</div>
                                        <div className="text-sm text-muted-foreground">
                                            Find the most tax-efficient mix
                                        </div>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Review Inputs */}
                {step === 2 && (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Review Inputs</h2>
                        <p className="text-muted-foreground mb-6">
                            Review and adjust the inputs used for calculation
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Corporate Net Income
                                </label>
                                <input
                                    type="number"
                                    value={corporateNetIncome || ''}
                                    onChange={(e) =>
                                        setCorporateNetIncome(parseFloat(e.target.value) || 0)
                                    }
                                    className="input w-full"
                                    placeholder="Expected corporate net income for the year"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    RDTOH Balance
                                </label>
                                <input
                                    type="number"
                                    value={rdtohBalance || ''}
                                    onChange={(e) =>
                                        setRDTOHBalance(parseFloat(e.target.value) || 0)
                                    }
                                    className="input w-full"
                                    placeholder="Current RDTOH balance"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Other Personal Income
                                </label>
                                <input
                                    type="number"
                                    value={otherPersonalIncome || ''}
                                    onChange={(e) =>
                                        setOtherPersonalIncome(parseFloat(e.target.value) || 0)
                                    }
                                    className="input w-full"
                                    placeholder="Other personal income (outside this company)"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Province</label>
                                <select
                                    value={province}
                                    onChange={(e) => setProvince(e.target.value)}
                                    className="input w-full"
                                >
                                    <option value="ON">Ontario</option>
                                    <option value="BC">British Columbia</option>
                                    <option value="AB">Alberta</option>
                                    <option value="QC">Quebec</option>
                                    <option value="SK">Saskatchewan</option>
                                    <option value="MB">Manitoba</option>
                                    <option value="NB">New Brunswick</option>
                                    <option value="NS">Nova Scotia</option>
                                    <option value="PE">Prince Edward Island</option>
                                    <option value="NL">Newfoundland and Labrador</option>
                                    <option value="YT">Yukon</option>
                                    <option value="NT">Northwest Territories</option>
                                    <option value="NU">Nunavut</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: View Recommended Plan */}
                {step === 3 && (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Recommended Plan</h2>
                        <p className="text-muted-foreground mb-6">
                            Based on your inputs, here's the optimal compensation mix:
                        </p>

                        {selectedScenario && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-3 gap-4">
                                    <Card className="p-4">
                                        <div className="text-sm text-muted-foreground">Salary</div>
                                        <div className="text-2xl font-bold">
                                            {formatCurrency(selectedScenario.salary)}
                                        </div>
                                    </Card>
                                    <Card className="p-4">
                                        <div className="text-sm text-muted-foreground">
                                            Non-Eligible Dividends
                                        </div>
                                        <div className="text-2xl font-bold">
                                            {formatCurrency(selectedScenario.nonEligibleDividends)}
                                        </div>
                                    </Card>
                                    <Card className="p-4">
                                        <div className="text-sm text-muted-foreground">
                                            Eligible Dividends
                                        </div>
                                        <div className="text-2xl font-bold">
                                            {formatCurrency(selectedScenario.eligibleDividends)}
                                        </div>
                                    </Card>
                                </div>

                                <Card className="p-4">
                                    <h3 className="font-semibold mb-3">Projected Outcomes</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Net Cash:</span>{' '}
                                            <span className="font-semibold">
                                                {formatCurrency(selectedScenario.netCashToOwner)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Total Tax:</span>{' '}
                                            <span className="font-semibold">
                                                {formatCurrency(selectedScenario.totalTaxBurden)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">RRSP Room:</span>{' '}
                                            <span className="font-semibold">
                                                {formatCurrency(selectedScenario.rrspRoomGenerated)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">CPP Contributions:</span>{' '}
                                            <span className="font-semibold">
                                                {formatCurrency(selectedScenario.cppContributions)}
                                            </span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-muted-foreground">
                                                Effective Tax Rate:
                                            </span>{' '}
                                            <span className="font-semibold">
                                                {selectedScenario.effectiveTaxRate.toFixed(2)}%
                                            </span>
                                        </div>
                                    </div>
                                </Card>

                                <div className="bg-muted/50 rounded-lg p-4">
                                    <p className="text-sm text-muted-foreground">
                                        You can adjust these amounts manually if needed. The system will
                                        track your progress throughout the year and provide recommendations
                                        for each withdrawal.
                                    </p>
                                </div>
                            </div>
                        )}

                        {!selectedScenario && scenarios.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                Calculating optimal mix...
                            </div>
                        )}
                    </div>
                )}

                {/* Step 4: Commit */}
                {step === 4 && (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Commit to Strategy</h2>
                        <p className="text-muted-foreground mb-6">
                            Lock in this strategy for {fiscalYear}. You can track your progress and get
                            recommendations throughout the year.
                        </p>

                        {selectedScenario && (
                            <div className="bg-primary/10 rounded-lg p-6 mb-6">
                                <div className="font-semibold mb-2">Your {fiscalYear} Strategy:</div>
                                <div className="space-y-1 text-sm">
                                    <div>
                                        Salary: {formatCurrency(selectedScenario.salary)}
                                    </div>
                                    <div>
                                        Non-Eligible Dividends:{' '}
                                        {formatCurrency(selectedScenario.nonEligibleDividends)}
                                    </div>
                                    <div>
                                        Eligible Dividends:{' '}
                                        {formatCurrency(selectedScenario.eligibleDividends)}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-muted/50 rounded-lg p-4 mb-6">
                            <p className="text-sm text-muted-foreground">
                                This strategy will be saved and you'll be able to track your progress
                                throughout the year. You can update it at any time.
                            </p>
                        </div>
                    </div>
                )}

                {/* Navigation buttons */}
                <div className="flex justify-between mt-8">
                    <div>
                        {step > 1 && (
                            <Button variant="outline" onClick={handleBack}>
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                        )}
                        {onCancel && step === 1 && (
                            <Button variant="outline" onClick={onCancel}>
                                Cancel
                            </Button>
                        )}
                    </div>
                    <div>
                        {step < 4 ? (
                            <Button onClick={handleNext} disabled={step === 3 && !selectedScenario}>
                                Next
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button onClick={handleSave} disabled={isSaving || !selectedScenario}>
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Lock in Strategy
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default StrategySetupWizard;
