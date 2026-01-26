import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowLeft, CheckCircle, Loader2, Info, Edit2 } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import GoalSelector, { type GoalType } from './GoalSelector';
import StrategyPresets from './StrategyPresets';
import StrategyPreview from './StrategyPreview';
import StrategyComparison from './StrategyComparison';
import HelpTooltip from './HelpTooltip';
import {
    generateStrategyOptions,
    calculateScenario,
    type StrategyOption,
    type CompensationScenario,
} from '../../lib/salaryDividendOptimizer';
import { cn } from '../../lib/utils';
import type { OptimizerInputs } from '../../lib/salaryDividendOptimizer';

interface InteractiveStrategyBuilderProps {
    fiscalYear: number;
    onComplete: () => void;
    onCancel?: () => void;
}

const InteractiveStrategyBuilder: React.FC<InteractiveStrategyBuilderProps> = ({
    fiscalYear,
    onComplete,
    onCancel,
}) => {
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [selectedGoals, setSelectedGoals] = useState<GoalType[]>(['minimize_tax']);
    const [targetCash, setTargetCash] = useState<number | undefined>(undefined);
    const [corporateNetIncome, setCorporateNetIncome] = useState(0);
    const [rdtohBalance, setRDTOHBalance] = useState(0);
    const [otherPersonalIncome, setOtherPersonalIncome] = useState(0);
    const [province, setProvince] = useState('ON');
    const [selectedOptionId, setSelectedOptionId] = useState<string | undefined>(undefined);
    const [customSalary, setCustomSalary] = useState<number | undefined>(undefined);
    const [customNonEligibleDividends, setCustomNonEligibleDividends] = useState<number | undefined>(undefined);
    // Eligible dividends are rarely used by small businesses - only show if explicitly needed
    const [customEligibleDividends, setCustomEligibleDividends] = useState<number | undefined>(undefined);
    const [isSaving, setIsSaving] = useState(false);
    const [showComparison, setShowComparison] = useState(false);
    
    // Override flags for auto-populated fields
    const [overrideCorporateNetIncome, setOverrideCorporateNetIncome] = useState(false);
    const [overrideRDTOHBalance, setOverrideRDTOHBalance] = useState(false);
    const [netIncomeBreakdown, setNetIncomeBreakdown] = useState<{
        invoiceRevenue: number;
        clientIncome: number;
        otherIncome: number;
        totalRevenue: number;
        totalDeductibleExpenses: number;
        totalSalaries: number;
    } | null>(null);

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

    // Auto-populate RDTOH Balance from company record
    useEffect(() => {
        if (user?.company?.rdtoh_balance !== undefined && !overrideRDTOHBalance) {
            setRDTOHBalance(user.company.rdtoh_balance);
        }
    }, [user?.company?.rdtoh_balance, overrideRDTOHBalance]);

    // Auto-populate Corporate Net Income
    const { data: calculatedNetIncome, isLoading: isLoadingNetIncomeCalc } = useQuery({
        queryKey: ['corporateNetIncome', user?.company_id, fiscalYear],
        queryFn: async () => {
            if (!user?.company_id) throw new Error('No company selected');
            return await api.calculateCorporateNetIncome(user.company_id, fiscalYear);
        },
        enabled: !!user?.company_id && !!fiscalYear && !overrideCorporateNetIncome,
    });

    useEffect(() => {
        if (calculatedNetIncome && !overrideCorporateNetIncome) {
            setCorporateNetIncome(calculatedNetIncome.netIncome);
            setNetIncomeBreakdown(calculatedNetIncome.breakdown);
        }
    }, [calculatedNetIncome, overrideCorporateNetIncome]);

    // Generate strategy options
    const strategyOptionsResult = useMemo(() => {
        if (
            !taxConstants ||
            !federalBrackets ||
            federalBrackets.length === 0 ||
            !provincialBrackets ||
            provincialBrackets.length === 0 ||
            corporateNetIncome <= 0 ||
            selectedGoals.length === 0
        ) {
            return null;
        }

        const inputs: OptimizerInputs = {
            corporateNetIncome,
            rdtohBalance,
            otherPersonalIncome,
            province,
            desiredPersonalCash: selectedGoals.includes('net_cash') ? targetCash : undefined,
            maximizeCPP: selectedGoals.includes('maximize_cpp'),
            prioritizeRRSPRoom: selectedGoals.includes('maximize_rrsp'),
            fiscalYear,
            smallBusinessTaxRate: user?.company?.small_business_rate || 0.125,
            federalBrackets,
            provincialBrackets,
            taxConstants,
            provincialConstants: provincialConstants || undefined,
        };

        return generateStrategyOptions(inputs, selectedGoals);
    }, [
        corporateNetIncome,
        rdtohBalance,
        otherPersonalIncome,
        province,
        selectedGoals,
        targetCash,
        fiscalYear,
        taxConstants,
        federalBrackets,
        provincialBrackets,
        provincialConstants,
        user?.company,
    ]);

    // Calculate custom scenario when user adjusts sliders
    const customScenario = useMemo(() => {
        if (
            !taxConstants ||
            !federalBrackets ||
            federalBrackets.length === 0 ||
            !provincialBrackets ||
            provincialBrackets.length === 0 ||
            corporateNetIncome <= 0 ||
            (customSalary === undefined && customNonEligibleDividends === undefined)
        ) {
            return null;
        }

        const salary = customSalary ?? 0;
        const eligibleDividends = customEligibleDividends ?? 0; // Usually 0 for small businesses
        const nonEligibleDividends = customNonEligibleDividends ?? 0;

        const inputs: OptimizerInputs = {
            corporateNetIncome,
            rdtohBalance,
            otherPersonalIncome,
            province,
            fiscalYear,
            smallBusinessTaxRate: user?.company?.small_business_rate || 0.125,
            federalBrackets,
            provincialBrackets,
            taxConstants,
            provincialConstants: provincialConstants || undefined,
        };

        try {
            return calculateScenario(inputs, salary, eligibleDividends, nonEligibleDividends);
        } catch (error) {
            console.error('Error calculating custom scenario:', error);
            return null;
        }
    }, [
        customSalary,
        customEligibleDividends,
        customNonEligibleDividends,
        corporateNetIncome,
        rdtohBalance,
        otherPersonalIncome,
        province,
        fiscalYear,
        taxConstants,
        federalBrackets,
        provincialBrackets,
        provincialConstants,
        user?.company,
    ]);

    // Get the selected scenario
    const selectedScenario = useMemo(() => {
        if (selectedOptionId && strategyOptionsResult) {
            const option = strategyOptionsResult.options.find((o) => o.id === selectedOptionId);
            if (option) {
                return option.scenario;
            }
        }
        if (customScenario) {
            return customScenario;
        }
        return null;
    }, [selectedOptionId, strategyOptionsResult, customScenario]);

    const handleNext = () => {
        if (step === 1) {
            if (selectedGoals.length === 0) {
                alert('Please select at least one goal');
                return;
            }
            if (selectedGoals.includes('net_cash') && (!targetCash || targetCash <= 0)) {
                alert('Please enter a target cash amount');
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (corporateNetIncome <= 0) {
                alert('Please enter corporate net income');
                return;
            }
            setStep(3);
        } else if (step === 3) {
            if (!selectedOptionId && !customScenario) {
                alert('Please select a strategy or customize your plan');
                return;
            }
            setStep(4);
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
            // Determine primary goal type
            let goalType: GoalType = 'minimize_tax';
            if (selectedGoals.includes('net_cash')) {
                goalType = 'net_cash';
            } else if (selectedGoals.includes('maximize_rrsp')) {
                goalType = 'maximize_rrsp';
            } else if (selectedGoals.includes('maximize_cpp')) {
                goalType = 'maximize_cpp';
            }

            await api.createCompensationStrategy({
                company_id: user.company_id,
                fiscal_year: fiscalYear,
                goal_type: goalType,
                target_net_cash: selectedGoals.includes('net_cash') ? targetCash : undefined,
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

    const handleOptionSelect = (optionId: string) => {
        setSelectedOptionId(optionId);
        const option = strategyOptionsResult?.options.find((o) => o.id === optionId);
        if (option) {
            setCustomSalary(option.scenario.salary);
            // For small businesses, focus on non-eligible dividends
            setCustomNonEligibleDividends(option.scenario.nonEligibleDividends);
            // Eligible dividends are rarely used - only set if the strategy explicitly uses them
            setCustomEligibleDividends(option.scenario.eligibleDividends > 0 ? option.scenario.eligibleDividends : 0);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
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
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold mb-2">Let's find the best way to pay yourself</h2>
                            <p className="text-muted-foreground">
                                Start by telling us what matters most to you. You can select multiple goals.
                            </p>
                        </div>
                        <GoalSelector
                            selectedGoals={selectedGoals}
                            onGoalsChange={setSelectedGoals}
                            targetCash={targetCash}
                            onTargetCashChange={setTargetCash}
                        />
                    </div>
                )}

                {/* Step 2: Business Situation */}
                {step === 2 && (
                    <div>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold mb-2">Your Business Situation</h2>
                            <p className="text-muted-foreground">
                                Help us understand your company's financial situation for accurate calculations.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium flex items-center gap-2">
                                        Corporate Net Income
                                        <HelpTooltip topic="corporateNetIncome" />
                                    </label>
                                    {!overrideCorporateNetIncome && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1">
                                                <Info className="w-3 h-3" />
                                                Auto-calculated
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setOverrideCorporateNetIncome(true)}
                                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                                            >
                                                <Edit2 className="w-3 h-3" />
                                                Override
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {isLoadingNetIncomeCalc && !overrideCorporateNetIncome ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Calculating from your records...
                                    </div>
                                ) : (
                                    <>
                                        <input
                                            type="number"
                                            value={corporateNetIncome || ''}
                                            onChange={(e) =>
                                                setCorporateNetIncome(parseFloat(e.target.value) || 0)
                                            }
                                            className="input w-full"
                                            placeholder="Expected corporate net income for the year"
                                            min="0"
                                            step="1000"
                                            disabled={!overrideCorporateNetIncome && !isLoadingNetIncomeCalc}
                                        />
                                        {!overrideCorporateNetIncome && netIncomeBreakdown && (
                                            <div className="mt-2 text-xs text-muted-foreground">
                                                Based on: Revenue ${netIncomeBreakdown.totalRevenue.toLocaleString('en-CA', { maximumFractionDigits: 0 })} - Expenses ${netIncomeBreakdown.totalDeductibleExpenses.toLocaleString('en-CA', { maximumFractionDigits: 0 })} - Salaries ${netIncomeBreakdown.totalSalaries.toLocaleString('en-CA', { maximumFractionDigits: 0 })}
                                            </div>
                                        )}
                                        {overrideCorporateNetIncome && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setOverrideCorporateNetIncome(false);
                                                    if (calculatedNetIncome) {
                                                        setCorporateNetIncome(calculatedNetIncome.netIncome);
                                                    }
                                                }}
                                                className="mt-2 text-xs text-muted-foreground hover:text-foreground"
                                            >
                                                Use auto-calculated value
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium flex items-center gap-2">
                                        RDTOH Balance
                                        <HelpTooltip topic="rdtohBalance" />
                                    </label>
                                    {!overrideRDTOHBalance && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1">
                                                <Info className="w-3 h-3" />
                                                From company records
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setOverrideRDTOHBalance(true)}
                                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                                            >
                                                <Edit2 className="w-3 h-3" />
                                                Override
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="number"
                                    value={rdtohBalance || ''}
                                    onChange={(e) => setRDTOHBalance(parseFloat(e.target.value) || 0)}
                                    className="input w-full"
                                    placeholder="Current RDTOH balance"
                                    min="0"
                                    step="100"
                                    disabled={!overrideRDTOHBalance}
                                />
                                {!overrideRDTOHBalance && (
                                    <div className="mt-2 text-xs text-muted-foreground">
                                        This is your current RDTOH balance. It gets reduced when you pay non-eligible dividends.
                                        {rdtohBalance === 0 && (
                                            <span className="block mt-1 text-orange-500">
                                                You have no RDTOH balance. Non-eligible dividends won't trigger refunds.
                                            </span>
                                        )}
                                    </div>
                                )}
                                {overrideRDTOHBalance && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOverrideRDTOHBalance(false);
                                            if (user?.company?.rdtoh_balance !== undefined) {
                                                setRDTOHBalance(user.company.rdtoh_balance);
                                            }
                                        }}
                                        className="mt-2 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        Use value from company records
                                    </button>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                    Other Personal Income
                                    <HelpTooltip topic="otherPersonalIncome" />
                                </label>
                                <input
                                    type="number"
                                    value={otherPersonalIncome || ''}
                                    onChange={(e) =>
                                        setOtherPersonalIncome(parseFloat(e.target.value) || 0)
                                    }
                                    className="input w-full"
                                    placeholder="Other personal income (outside this company)"
                                    min="0"
                                    step="1000"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                    Province
                                    <HelpTooltip topic="province" />
                                </label>
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

                {/* Step 3: Explore Options */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Explore Your Options</h2>
                            <p className="text-muted-foreground">
                                {strategyOptionsResult?.explanation || 'Calculating optimal strategies...'}
                            </p>
                        </div>

                        {strategyOptionsResult && strategyOptionsResult.options.length > 0 && (
                            <>
                                <div className="flex items-center justify-between">
                                    <div></div>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowComparison(!showComparison)}
                                    >
                                        {showComparison ? 'Hide' : 'Show'} Comparison Table
                                    </Button>
                                </div>

                                {showComparison && (
                                    <StrategyComparison
                                        options={strategyOptionsResult.options}
                                        recommended={strategyOptionsResult.recommended}
                                    />
                                )}

                                <StrategyPresets
                                    options={strategyOptionsResult.options}
                                    recommended={strategyOptionsResult.recommended}
                                    onSelect={handleOptionSelect}
                                    selectedOptionId={selectedOptionId}
                                />

                                <div className="pt-6 border-t border-border">
                                    <h3 className="text-lg font-semibold mb-4">Customize Your Plan</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Adjust the amounts below to fine-tune your strategy. The preview updates in
                                        real-time.
                                    </p>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">
                                                Salary
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max={corporateNetIncome}
                                                step="1000"
                                                value={customSalary ?? 0}
                                                onChange={(e) =>
                                                    setCustomSalary(parseFloat(e.target.value))
                                                }
                                                className="w-full"
                                            />
                                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                                <span>$0</span>
                                                <span className="font-semibold">
                                                    ${((customSalary ?? 0) / 1000).toFixed(0)}k
                                                </span>
                                                <span>${(corporateNetIncome / 1000).toFixed(0)}k</span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-2">
                                                Dividends
                                                <span className="ml-2 text-xs text-muted-foreground font-normal">
                                                    (Non-eligible - most small businesses use this)
                                                </span>
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max={corporateNetIncome * 0.7}
                                                step="1000"
                                                value={customNonEligibleDividends ?? 0}
                                                onChange={(e) =>
                                                    setCustomNonEligibleDividends(parseFloat(e.target.value))
                                                }
                                                className="w-full"
                                            />
                                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                                <span>$0</span>
                                                <span className="font-semibold">
                                                    ${((customNonEligibleDividends ?? 0) / 1000).toFixed(0)}k
                                                </span>
                                                <span>${((corporateNetIncome * 0.7) / 1000).toFixed(0)}k</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                Non-eligible dividends are what most small businesses use. They can trigger RDTOH refunds.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <StrategyPreview
                                            scenario={customScenario}
                                            corporateNetIncome={corporateNetIncome}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {!strategyOptionsResult && (
                            <div className="text-center py-8 text-muted-foreground">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                                <p>Calculating optimal strategies...</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 4: Review & Save */}
                {step === 4 && (
                    <div>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold mb-2">Review Your Strategy</h2>
                            <p className="text-muted-foreground">
                                Review your compensation plan for {fiscalYear}. You can track your progress
                                throughout the year.
                            </p>
                        </div>

                        {selectedScenario && (
                            <div className="space-y-6">
                                <Card className="p-6 bg-primary/10 border-primary/20">
                                    <h3 className="font-semibold mb-4">Your {fiscalYear} Compensation Plan</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <div>
                                            <div className="text-sm text-muted-foreground">Salary</div>
                                            <div className="text-xl font-bold">
                                                ${(selectedScenario.salary / 1000).toFixed(0)}k
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-muted-foreground">Dividends</div>
                                            <div className="text-xl font-bold">
                                                ${((selectedScenario.nonEligibleDividends + selectedScenario.eligibleDividends) / 1000).toFixed(0)}k
                                            </div>
                                            {selectedScenario.eligibleDividends > 0 && (
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    ({selectedScenario.eligibleDividends > 0 ? `${(selectedScenario.eligibleDividends / 1000).toFixed(0)}k eligible, ` : ''}
                                                    {selectedScenario.nonEligibleDividends > 0 ? `${(selectedScenario.nonEligibleDividends / 1000).toFixed(0)}k non-eligible` : ''})
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-sm text-muted-foreground">Net Cash</div>
                                            <div className="text-xl font-bold">
                                                ${(selectedScenario.netCashToOwner / 1000).toFixed(0)}k
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                <StrategyPreview
                                    scenario={selectedScenario}
                                    corporateNetIncome={corporateNetIncome}
                                />

                                <div className="bg-muted/50 rounded-lg p-4">
                                    <p className="text-sm text-muted-foreground">
                                        This strategy will be saved and you'll be able to track your progress
                                        throughout the year. You can update it at any time.
                                    </p>
                                </div>
                            </div>
                        )}
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
                            <Button onClick={handleNext}>
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
                                        Save Strategy
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

export default InteractiveStrategyBuilder;
