import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { useQuery } from '@tanstack/react-query';
import {
    Loader2,
    DollarSign,
    PiggyBank,
    Info,
    ArrowRight,
    AlertTriangle,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { cn } from '../../lib/utils';
import {
    calculateScenario,
    type OptimizerInputs,
    findOptimalMix
} from '../../lib/salaryDividendOptimizer';

interface PayMyselfOptimizerProps {
    fiscalYear: number;
    onComplete: () => void;
}

const PayMyselfOptimizer: React.FC<PayMyselfOptimizerProps> = ({
    fiscalYear,
    onComplete,
}) => {
    const { user } = useAuth();

    // Core inputs
    const [corporateNetIncome, setCorporateNetIncome] = useState<number>(0);
    const [province, setProvince] = useState('ON');
    const [otherPersonalIncome, setOtherPersonalIncome] = useState<number>(0);
    const [isSaving, setIsSaving] = useState(false);
    const [showTaxDetails, setShowTaxDetails] = useState(false);

    // UI States
    const [sliderValue, setSliderValue] = useState(50); // 0 = All Divs, 100 = All Salary
    const [manualOverride, setManualOverride] = useState(false);

    // Fetch necessary data
    const { data: taxConstants } = useQuery({
        queryKey: ['taxConstants', fiscalYear],
        queryFn: async () => await api.getTaxConstants(fiscalYear),
        enabled: !!fiscalYear,
    });

    const { data: federalBrackets } = useQuery({
        queryKey: ['federalBrackets', fiscalYear],
        queryFn: async () => await api.getTaxRates(fiscalYear, 'federal'),
        enabled: !!fiscalYear,
    });

    const { data: provincialBrackets } = useQuery({
        queryKey: ['provincialBrackets', fiscalYear, province],
        queryFn: async () => await api.getTaxRates(fiscalYear, province),
        enabled: !!fiscalYear && !!province,
    });

    const { data: provincialConstants } = useQuery({
        queryKey: ['provincialConstants', fiscalYear, province],
        queryFn: async () => await api.getProvincialTaxConstants(fiscalYear, province),
        enabled: !!fiscalYear && !!province,
    });

    // Auto-populate Corporate Net Income
    const { data: calculatedNetIncome, isLoading: isLoadingNetIncome } = useQuery({
        queryKey: ['corporateNetIncome', user?.company_id, fiscalYear],
        queryFn: async () => {
            if (!user?.company_id) throw new Error('No company selected');
            return await api.calculateCorporateNetIncome(user.company_id, fiscalYear);
        },
        enabled: !!user?.company_id && !!fiscalYear,
    });

    useEffect(() => {
        if (calculatedNetIncome && !manualOverride) {
            setCorporateNetIncome(calculatedNetIncome.netIncome);
        }
    }, [calculatedNetIncome, manualOverride]);

    // Calculate Scenario based on Slider
    const currentScenario = useMemo(() => {
        if (
            !taxConstants ||
            !federalBrackets ||
            !provincialBrackets ||
            corporateNetIncome <= 0
        ) {
            return null;
        }

        // Slider logic:
        const maxPossibleSalary = corporateNetIncome * 0.95; // Safety buffer for employer taxes
        const salaryAmount = (sliderValue / 100) * maxPossibleSalary;

        const inputs: OptimizerInputs = {
            corporateNetIncome,
            rdtohBalance: user?.company?.rdtoh_balance || 0, // Default to 0 or company record
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
            // Calculate employer taxes to estimate available dividends
            // Note: calculateScenario will recalculate these internally, but we need them
            // to determine how much is left for dividends
            const employerCPPRate = taxConstants.cpp_employer_rate || taxConstants.cpp_rate || 0.0595;
            const employerCPP = Math.min(
                Math.max(0, salaryAmount - (taxConstants.cpp_basic_exemption || 3500)) * employerCPPRate,
                taxConstants.cpp_max_contribution || 3867
            );
            const employerEIRate = (taxConstants.ei_employee_rate || 0.0166) * (taxConstants.ei_employer_multiplier || 1.4);
            const employerEI = Math.min(
                salaryAmount * employerEIRate,
                (taxConstants.ei_max_premium || 1049) * (taxConstants.ei_employer_multiplier || 1.4)
            );

            const remaining = corporateNetIncome - salaryAmount - employerCPP - employerEI;
            const corpTax = Math.max(0, remaining) * (user?.company?.small_business_rate || 0.125);
            const avail = Math.max(0, remaining - corpTax);

            // Pass the available after-tax funds as non-eligible dividends (default for small biz)
            return calculateScenario(inputs, salaryAmount, 0, avail);

        } catch (error) {
            console.error(error);
            return null;
        }
    }, [
        sliderValue,
        corporateNetIncome,
        otherPersonalIncome,
        fiscalYear,
        taxConstants,
        federalBrackets,
        provincialBrackets,
        provincialConstants,
        user?.company,
        province
    ]);

    // Optimal Spot Calculation
    const optimalScenario = useMemo(() => {
        if (!taxConstants || !federalBrackets || !provincialBrackets || corporateNetIncome <= 0) return null;

        const inputs: OptimizerInputs = {
            corporateNetIncome,
            rdtohBalance: user?.company?.rdtoh_balance || 0,
            otherPersonalIncome,
            province,
            fiscalYear,
            smallBusinessTaxRate: user?.company?.small_business_rate || 0.125,
            federalBrackets,
            provincialBrackets,
            taxConstants,
            provincialConstants: provincialConstants || undefined,
            maximizeCPP: false,
            prioritizeRRSPRoom: false
        };

        const results = findOptimalMix(inputs);
        // findOptimalMix returns scenarios sorted by lowest tax burden first
        return results.length > 0 ? results[0] : null;
    }, [corporateNetIncome, otherPersonalIncome, taxConstants, federalBrackets, provincialBrackets, provincialConstants, user?.company, province, fiscalYear]);

    // Auto-set slider to optimal on load
    useEffect(() => {
        if (optimalScenario && corporateNetIncome > 0 && !manualOverride) {
            const maxPossibleSalary = corporateNetIncome * 0.95;
            if (maxPossibleSalary > 0) {
                const optimalSalaryPercent = Math.min(100, (optimalScenario.salary / maxPossibleSalary) * 100);
                if (Math.abs(sliderValue - 50) < 1) { // Only if hasn't been touched much
                    setSliderValue(optimalSalaryPercent);
                }
            }
        }
    }, [optimalScenario, corporateNetIncome]);

    const handleSave = async () => {
        if (!currentScenario || !user?.company_id) return;

        setIsSaving(true);
        try {
            await api.createCompensationStrategy({
                company_id: user.company_id,
                fiscal_year: fiscalYear,
                goal_type: 'minimize_tax', // Defaulting for now since we are optimizing
                planned_salary: currentScenario.salary,
                planned_eligible_dividends: currentScenario.eligibleDividends,
                planned_non_eligible_dividends: currentScenario.nonEligibleDividends,
                projected_net_cash: currentScenario.netCashToOwner,
                projected_total_tax: currentScenario.totalTaxBurden,
                projected_rrsp_room: currentScenario.rrspRoomGenerated,
                projected_cpp_contributions: currentScenario.cppContributions,
                projected_effective_tax_rate: currentScenario.effectiveTaxRate,
                corporate_net_income: corporateNetIncome,
                rdtoh_balance: user?.company?.rdtoh_balance || 0,
                other_personal_income: otherPersonalIncome,
                province,
            });
            onComplete();
        } catch (error: any) {
            console.error('Error saving strategy:', error);
            // alert(error.message || 'Failed to save strategy'); 
        } finally {
            setIsSaving(false);
        }
    };

    const formatMoney = (val: number) =>
        new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(val);

    if (isLoadingNetIncome || !taxConstants) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Analyzing your corporate finances...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                    Pay Myself Optimizer
                </h1>
                <p className="text-lg text-muted-foreground">
                    Find the perfect balance between Salary and Dividends to maximize your wealth.
                </p>
            </div>

            <Card className="p-8 border-2 border-border/50 shadow-xl bg-card/50 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Left: Inputs */}
                    <div className="w-full md:w-1/3 space-y-6">
                        <div>
                            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                Available Profit
                            </label>
                            <div className="relative mt-2">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <input
                                    type="number"
                                    value={corporateNetIncome || ''}
                                    onChange={(e) => {
                                        setCorporateNetIncome(parseFloat(e.target.value) || 0);
                                        setManualOverride(true);
                                    }}
                                    className="w-full pl-8 pr-4 py-3 bg-background border rounded-xl text-xl font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                                    placeholder="0"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                We estimated this from your records. Feel free to adjust.
                            </p>
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                Other Personal Income
                            </label>
                            <div className="relative mt-2">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <input
                                    type="number"
                                    value={otherPersonalIncome || ''}
                                    onChange={(e) => setOtherPersonalIncome(parseFloat(e.target.value) || 0)}
                                    className="w-full pl-8 pr-4 py-3 bg-background border rounded-xl text-lg font-medium outline-none focus:ring-2 ring-primary/20 transition-all"
                                    placeholder="0"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Income from other sources (e.g. spouse, investments). Affects your tax brackets.
                            </p>
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                Province
                            </label>
                            <select
                                value={province}
                                onChange={(e) => setProvince(e.target.value)}
                                className="w-full mt-2 p-3 bg-background border rounded-xl font-medium outline-none"
                            >
                                <option value="ON">Ontario</option>
                                <option value="BC">British Columbia</option>
                                <option value="AB">Alberta</option>
                                <option value="QC">Quebec</option>
                            </select>
                        </div>

                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                            <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                Did you know?
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                Paying yourself a salary builds RRSP room and CPP, while dividends are taxed at a lower rate initially.
                            </p>
                        </div>
                    </div>

                    {/* Right: The Playground */}
                    <div className="w-full md:w-2/3 space-y-8">
                        {currentScenario ? (
                            <>
                                {/* Big Metric Cards */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                                        <div className="text-sm font-medium text-green-600 mb-1 flex items-center gap-2">
                                            <DollarSign className="w-4 h-4" /> Your Take Home
                                        </div>
                                        <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                                            {formatMoney(currentScenario.netCashToOwner)}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                                        <div className="text-sm font-medium text-blue-600 mb-1 flex items-center gap-2">
                                            <PiggyBank className="w-4 h-4" /> RRSP Room Added
                                        </div>
                                        <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                                            {formatMoney(currentScenario.rrspRoomGenerated)}
                                        </div>
                                    </div>
                                </div>

                                {/* The Slider */}
                                <div className="py-8 px-4 bg-muted/30 rounded-2xl">
                                    <div className="flex justify-between mb-4 text-sm font-semibold">
                                        <span className={cn("transition-colors", sliderValue < 50 ? "text-primary" : "text-muted-foreground")}>
                                            More Dividends
                                        </span>
                                        <span className={cn("transition-colors", sliderValue > 50 ? "text-primary" : "text-muted-foreground")}>
                                            More Salary
                                        </span>
                                    </div>

                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={sliderValue}
                                        onChange={(e) => {
                                            setSliderValue(parseInt(e.target.value));
                                            setManualOverride(true);
                                        }}
                                        className="w-full h-4 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary/80 transition-all"
                                    />

                                    <div className="flex justify-between mt-4 text-xs text-muted-foreground">
                                        <div className="text-center">
                                            <div className="font-bold text-lg text-foreground">
                                                {formatMoney(currentScenario.nonEligibleDividends + currentScenario.eligibleDividends)}
                                            </div>
                                            <div>Dividends</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-bold text-lg text-foreground">
                                                {formatMoney(currentScenario.salary)}
                                            </div>
                                            <div>Salary</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Analysis / Tax Impact */}
                                <div className="grid grid-cols-2 gap-8 pt-4">
                                    <div>
                                        <button
                                            onClick={() => setShowTaxDetails(!showTaxDetails)}
                                            className="w-full text-left group"
                                        >
                                            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2 group-hover:text-primary transition-colors">
                                                Total Taxes & Deductions
                                                {showTaxDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                            </div>
                                            <div className="text-xl font-semibold">
                                                {formatMoney(currentScenario.totalTaxBurden)}
                                            </div>
                                        </button>

                                        {showTaxDetails && (
                                            <div className="mt-3 p-3 bg-muted rounded-lg text-sm space-y-2 animate-in fade-in slide-in-from-top-2 border border-border">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Corporate Tax:</span>
                                                    <span>{formatMoney(currentScenario.corporateTax)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Personal Tax:</span>
                                                    <span>{formatMoney(currentScenario.totalPersonalTax)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">CPP & EI (Total):</span>
                                                    <span>{formatMoney(currentScenario.cppContributions + currentScenario.employerCPP + currentScenario.employerEI)}</span>
                                                </div>
                                                {currentScenario.rdtohRefund > 0 && (
                                                    <div className="flex justify-between text-green-600 font-medium">
                                                        <span>RDTOH Refund:</span>
                                                        <span>-{formatMoney(currentScenario.rdtohRefund)}</span>
                                                    </div>
                                                )}
                                                <div className="pt-2 border-t border-border/50 flex justify-between font-semibold">
                                                    <span>Total Outflow:</span>
                                                    <span>{formatMoney(currentScenario.totalTaxBurden)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground mb-1">Effective Tax Rate</div>
                                        <div className="text-xl font-semibold">
                                            {currentScenario.effectiveTaxRate.toFixed(1)}%
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Income Tax Only
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="w-full py-6 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            Look's Good! Lock This Plan
                                            <ArrowRight className="w-5 h-5 ml-2" />
                                        </>
                                    )}
                                </Button>
                            </>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    <p>Enter your corporate income to start optimizing.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default PayMyselfOptimizer;
