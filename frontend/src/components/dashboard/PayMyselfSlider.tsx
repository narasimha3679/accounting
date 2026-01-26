import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { DollarSign, Wallet, TrendingUp, Briefcase, Receipt, Info, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import Card from '../ui/Card';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useDebouncedCallback } from 'use-debounce';
import { useAuth } from '../../contexts/AuthContext';

interface PayMyselfSliderProps {
    availableDividends: number;
    reimbursementsOwed: number;
    personalTaxRate?: number;
    province?: string;
    taxYear?: number;
}

export const PayMyselfSlider: React.FC<PayMyselfSliderProps> = ({
    availableDividends,
    reimbursementsOwed,
    province = 'ON',
    taxYear = new Date().getFullYear(),
}) => {
    const { user } = useAuth();
    const maxWithdrawal = availableDividends + reimbursementsOwed;
    const [amount, setAmount] = useState<number>(0);
    const [showDetails, setShowDetails] = useState(false);
    const [optimizeAmount, setOptimizeAmount] = useState<number>(0);
    const [otherPersonalIncome, setOtherPersonalIncome] = useState<number>(0);
    const [selectedProvince, setSelectedProvince] = useState<string>(province);
    const [dividendType, setDividendType] = useState<'eligible' | 'non_eligible'>('non_eligible');

    // Initial default to 50% capacity or $5k
    useEffect(() => {
        if (maxWithdrawal > 0 && amount === 0) {
            const initialAmount = Math.min(maxWithdrawal, 5000);
            setAmount(initialAmount);
            setOptimizeAmount(initialAmount);
        }
    }, [maxWithdrawal]);

    // Debounced optimizer call
    const debouncedOptimize = useDebouncedCallback((value: number) => {
        setOptimizeAmount(value);
    }, 300);

    // Handle amount change
    const handleAmountChange = useCallback((newAmount: number) => {
        const val = Math.min(maxWithdrawal, Math.max(0, newAmount));
        setAmount(val);
        debouncedOptimize(val);
    }, [maxWithdrawal, debouncedOptimize]);

    // Fetch YTD income from platform (salaries + dividends already recorded)
    const { data: platformYtd } = useQuery({
        queryKey: ['platformYtdIncome', user?.company_id, user?.id, taxYear],
        queryFn: async () => {
            if (!user?.company_id || !user?.id) return null;
            return api.getYtdIncome(user.company_id, String(user.id), taxYear);
        },
        enabled: !!user?.company_id && !!user?.id,
        staleTime: 60000, // Cache for 1 minute
    });

    // Combine platform YTD + user-entered other income for total YTD
    const totalYtdIncome = (platformYtd?.total || 0) + otherPersonalIncome;

    // Fetch optimization data from backend
    const { data: optimization, isLoading, error } = useQuery({
        queryKey: ['payMyselfOptimize', optimizeAmount, reimbursementsOwed, selectedProvince, taxYear, totalYtdIncome, dividendType],
        queryFn: async () => {
            if (optimizeAmount <= 0) return null;
            return api.optimizeWithdrawal({
                corporateCost: optimizeAmount,
                owedToOwner: reimbursementsOwed,
                province: selectedProvince,
                taxYear,
                ytdPersonalIncome: totalYtdIncome,
                dividendType
            });
        },
        enabled: optimizeAmount > 0,
        staleTime: 30000,
    });

    // Fallback calculation if API fails
    const fallbackBreakdown = useMemo(() => {
        const reimbursementPart = Math.min(amount, reimbursementsOwed);
        const dividendPart = Math.max(0, amount - reimbursementPart);
        const estimatedTax = dividendPart * 0.15; // Fallback 15%
        return {
            reimbursementPart,
            dividendPart,
            estimatedTax,
            netInPocket: amount - estimatedTax
        };
    }, [amount, reimbursementsOwed]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(val);

    const formatPercent = (val: number) => `${val.toFixed(1)}%`;

    // Determine which option is best
    const getBestOption = () => {
        if (!optimization) return null;
        const { options } = optimization;
        if (options.reimbursement.amount === amount) return 'reimbursement';
        if (options.dividend.netInPocket > options.salary.netInPocket) return 'dividend';
        return 'salary';
    };

    const bestOption = getBestOption();

    return (
        <Card className="p-6 overflow-visible">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-golden-hour" />
                        Pay Myself Optimizer
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Available Capacity: <span className="font-mono text-foreground">{formatCurrency(maxWithdrawal)}</span>
                    </p>
                </div>
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                    {showDetails ? 'Simple' : 'Detailed'}
                    {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </div>

            {/* Slider Section */}
            <div className="mb-6">
                <div className="relative h-12 bg-muted/30 rounded-full flex items-center px-4 border border-input focus-within:ring-2 ring-primary/20 transition-all">
                    <DollarSign className="w-5 h-5 text-muted-foreground mr-2" />
                    <input
                        type="number"
                        value={amount}
                        onChange={e => handleAmountChange(Number(e.target.value))}
                        className="bg-transparent border-none w-full text-2xl font-bold font-mono focus:outline-none"
                    />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-auto">
                        Withdrawal
                    </span>
                </div>

                <input
                    type="range"
                    min="0"
                    max={maxWithdrawal}
                    step={100}
                    value={amount}
                    onChange={e => handleAmountChange(Number(e.target.value))}
                    className="w-full mt-4 accent-golden-hour cursor-pointer"
                />
            </div>

            {/* Detailed Options (shown when showDetails is true) */}
            {showDetails && (
                <div className="mb-6 p-4 bg-muted/20 rounded-lg border border-border/50 space-y-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Advanced Options</h3>

                    {/* YTD Personal Income */}
                    <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                            Income Recorded on Platform
                        </label>
                        <p className="text-xs text-muted-foreground mb-2">
                            Salaries and dividends already recorded for you this year
                        </p>
                        <div className="input w-full bg-muted/50 flex items-center justify-between">
                            <span className="font-mono">
                                {platformYtd ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(platformYtd.total) : '$0'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                (Salaries: {platformYtd ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(platformYtd.ytdSalaries) : '$0'},
                                Dividends: {platformYtd ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(platformYtd.ytdDividends) : '$0'})
                            </span>
                        </div>
                    </div>

                    {/* Other Personal Income (manual entry) */}
                    <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                            Other Personal Income (Optional)
                        </label>
                        <p className="text-xs text-muted-foreground mb-2">
                            Income from sources NOT recorded on this platform (employment, investments, etc.)
                        </p>
                        <input
                            type="number"
                            value={otherPersonalIncome || ''}
                            onChange={e => {
                                const val = Number(e.target.value) || 0;
                                setOtherPersonalIncome(val);
                            }}
                            placeholder="0"
                            min="0"
                            step="100"
                            className="input w-full"
                        />
                    </div>

                    {/* Province Override */}
                    <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                            Province
                        </label>
                        <p className="text-xs text-muted-foreground mb-2">
                            Province for tax calculations (defaults to company province)
                        </p>
                        <select
                            value={selectedProvince}
                            onChange={e => setSelectedProvince(e.target.value)}
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

                    {/* Dividend Type */}
                    <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                            Dividend Type
                        </label>
                        <p className="text-xs text-muted-foreground mb-2">
                            Most CCPCs pay non-eligible dividends. Eligible dividends are typically from public corporations.
                        </p>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="dividendType"
                                    value="non_eligible"
                                    checked={dividendType === 'non_eligible'}
                                    onChange={() => setDividendType('non_eligible')}
                                    className="accent-golden-hour"
                                />
                                <span className="text-sm text-foreground">Non-Eligible (CCPC)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="dividendType"
                                    value="eligible"
                                    checked={dividendType === 'eligible'}
                                    onChange={() => setDividendType('eligible')}
                                    className="accent-golden-hour"
                                />
                                <span className="text-sm text-foreground">Eligible</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                    Calculating optimal strategy...
                </div>
            )}

            {/* 3-Way Comparison Cards */}
            {optimization && !isLoading && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        {/* Reimbursement Card */}
                        {optimization.options.reimbursement.available && (
                            <div className={`rounded-xl p-4 border transition-all ${bestOption === 'reimbursement'
                                ? 'bg-emerald-500/10 border-emerald-500/40 ring-2 ring-emerald-500/20'
                                : 'bg-muted/20 border-border/50'
                                }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Receipt className="w-4 h-4 text-emerald-500" />
                                        <span className="text-sm font-semibold">Reimburse</span>
                                    </div>
                                    {bestOption === 'reimbursement' && (
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                                            ★ BEST
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground mb-1">Amount</div>
                                <div className="text-lg font-bold mb-2">{formatCurrency(optimization.options.reimbursement.amount)}</div>
                                <div className="text-xs text-muted-foreground mb-1">You keep</div>
                                <div className="text-xl font-bold text-emerald-600">{formatCurrency(optimization.options.reimbursement.netInPocket)}</div>
                                <div className="text-xs text-emerald-600 font-semibold">(100% tax-free)</div>
                            </div>
                        )}

                        {/* Dividend Card */}
                        <div className={`rounded-xl p-4 border transition-all ${bestOption === 'dividend'
                            ? 'bg-amber-500/10 border-amber-500/40 ring-2 ring-amber-500/20'
                            : 'bg-muted/20 border-border/50'
                            }`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-amber-500" />
                                    <span className="text-sm font-semibold">Dividend</span>
                                </div>
                                {bestOption === 'dividend' && (
                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-500/20 px-2 py-0.5 rounded-full">
                                        ★ BEST
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-muted-foreground mb-1">Dividend Amount</div>
                            <div className="text-lg font-bold mb-2">{formatCurrency(optimization.options.dividend.amount)}</div>
                            <div className="text-xs text-muted-foreground mb-1">You keep</div>
                            <div className="text-xl font-bold text-amber-600">{formatCurrency(optimization.options.dividend.netInPocket)}</div>
                            <div className="text-xs text-amber-600 font-semibold">
                                ({formatPercent(optimization.options.dividend.trueEfficiency || optimization.options.dividend.efficiency)} true efficiency)
                            </div>
                            {showDetails && (
                                <div className="mt-2 pt-2 border-t border-border/30 text-xs text-muted-foreground space-y-1">
                                    {optimization.options.dividend.grossCorpIncome > 0 && (
                                        <>
                                            <div className="flex justify-between">
                                                <span>Gross Corp Income</span>
                                                <span>{formatCurrency(optimization.options.dividend.grossCorpIncome)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Corp Tax (12.5%)</span>
                                                <span className="text-red-400">-{formatCurrency(optimization.options.dividend.corporateTax)}</span>
                                            </div>
                                            <div className="flex justify-between font-medium">
                                                <span>= Dividend Paid</span>
                                                <span>{formatCurrency(optimization.options.dividend.amount)}</span>
                                            </div>
                                            <div className="h-px bg-border/30 my-1" />
                                        </>
                                    )}
                                    <div className="flex justify-between">
                                        <span>Personal Tax</span>
                                        <span className="text-red-400">-{formatCurrency(optimization.options.dividend.netTax)}</span>
                                    </div>
                                    {optimization.options.dividend.totalTax > 0 && (
                                        <div className="flex justify-between font-medium pt-1 border-t border-border/20">
                                            <span>Total Tax Paid</span>
                                            <span className="text-red-400">-{formatCurrency(optimization.options.dividend.totalTax)}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Salary Card */}
                        <div className={`rounded-xl p-4 border transition-all ${bestOption === 'salary'
                            ? 'bg-blue-500/10 border-blue-500/40 ring-2 ring-blue-500/20'
                            : 'bg-muted/20 border-border/50'
                            }`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm font-semibold">Salary</span>
                                </div>
                                {bestOption === 'salary' && (
                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-500/20 px-2 py-0.5 rounded-full">
                                        ★ BEST
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-muted-foreground mb-1">Corp Cost</div>
                            <div className="text-lg font-bold mb-2">{formatCurrency(optimization.options.salary.corporateCost)}</div>
                            <div className="text-xs text-muted-foreground mb-1">You keep</div>
                            <div className="text-xl font-bold text-blue-600">{formatCurrency(optimization.options.salary.netInPocket)}</div>
                            <div className="text-xs text-blue-600 font-semibold">({formatPercent(optimization.options.salary.efficiency)})</div>
                            {optimization.options.salary.rrspRoomCreated > 0 && (
                                <div className="text-xs text-green-500 mt-1">+{formatCurrency(optimization.options.salary.rrspRoomCreated)} RRSP room</div>
                            )}
                            {showDetails && (
                                <div className="mt-2 pt-2 border-t border-border/30 text-xs text-muted-foreground space-y-1">
                                    <div className="flex justify-between">
                                        <span>Gross</span>
                                        <span>{formatCurrency(optimization.options.salary.grossSalary)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>CPP</span>
                                        <span className="text-red-400">-{formatCurrency(optimization.options.salary.employeeCpp)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>EI</span>
                                        <span className="text-red-400">-{formatCurrency(optimization.options.salary.employeeEi)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Tax</span>
                                        <span className="text-red-400">-{formatCurrency(optimization.options.salary.federalTax + optimization.options.salary.provincialTax)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recommendation Banner */}
                    <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
                        <div className="flex items-start gap-3">
                            <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <div>
                                <div className="font-semibold text-sm mb-1">
                                    Recommendation: {optimization.recommendation.strategy}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                    {optimization.recommendation.explanation}
                                </p>
                                <div className="flex items-center gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Net in pocket: </span>
                                        <span className="font-bold text-foreground">{formatCurrency(optimization.recommendation.totalNetInPocket)}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Efficiency: </span>
                                        <span className="font-bold text-foreground">{optimization.recommendation.totalEfficiency}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                        <Info className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>{optimization.disclaimer}</span>
                    </div>
                </>
            )}

            {/* Fallback View (if API fails) */}
            {(error || !optimization) && !isLoading && amount > 0 && (
                <div>
                    {error && (
                        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <p className="text-sm text-yellow-600">
                                <Info className="w-4 h-4 inline mr-1" />
                                Unable to calculate optimization. Showing simplified breakdown.
                                {error.message && ` Error: ${error.message}`}
                            </p>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-muted/20 rounded-xl p-4 border border-border/50">
                            <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Where it comes from</h3>
                            {fallbackBreakdown.reimbursementPart > 0 && (
                                <div className="flex justify-between items-center mb-2 p-2 bg-emerald-500/10 rounded border border-emerald-500/20">
                                    <span className="text-sm font-medium text-emerald-600">Reimbursement</span>
                                    <span className="text-sm font-bold">{formatCurrency(fallbackBreakdown.reimbursementPart)}</span>
                                </div>
                            )}
                            {fallbackBreakdown.dividendPart > 0 && (
                                <div className="flex justify-between items-center p-2 bg-amber-500/10 rounded border border-amber-500/20">
                                    <span className="text-sm font-medium text-amber-600">Dividend</span>
                                    <span className="text-sm font-bold">{formatCurrency(fallbackBreakdown.dividendPart)}</span>
                                </div>
                            )}
                            <div className="mt-3 pt-3 border-t border-border/30">
                                <p className="text-xs text-muted-foreground">
                                    Note: Full comparison with Salary option requires API connection.
                                </p>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-background to-muted/50 rounded-xl p-4 border border-border/50 flex flex-col justify-between">
                            <div>
                                <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-3">What you keep (Est.)</h3>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm text-foreground">Personal Tax (Est)</span>
                                    <span className="text-sm font-mono text-red-400">-{formatCurrency(fallbackBreakdown.estimatedTax)}</span>
                                </div>
                                <div className="h-px bg-border my-2" />
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-muted-foreground uppercase block mb-1">Net in Pocket</span>
                                <span className="text-3xl font-bold text-foreground tracking-tight">{formatCurrency(fallbackBreakdown.netInPocket)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {amount === 0 && !isLoading && (
                <p className="text-sm text-muted-foreground text-center italic py-4">
                    Move the slider to see your withdrawal options
                </p>
            )}
        </Card>
    );
};
