import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { useQuery } from '@tanstack/react-query';
import {
    AlertCircle,
    CheckCircle,
    Info,
    Target,
    TrendingUp,
    ArrowRight,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import HelpIcon from '../components/ui/HelpIcon';
import {
    findOptimalMix,
    getRecommendation,
    type OptimizerInputs,
    type CompensationScenario,
} from '../lib/salaryDividendOptimizer';
import { getFiscalYear, getFiscalYearRange, formatFiscalYear } from '../lib/fiscalYear';
import { cn } from '../lib/utils';

// Persistence key
const STRATEGY_STORAGE_KEY = 'compensation_strategy_scenario';

const CompensationStrategy: React.FC = () => {
    const { user } = useAuth();
    const [selectedFiscalYear, setSelectedFiscalYear] = useState(() => {
        if (user?.company?.fiscal_year_end) {
            return getFiscalYear(new Date(), user.company.fiscal_year_end);
        }
        return new Date().getFullYear();
    });
    const [otherPersonalIncome, setOtherPersonalIncome] = useState(0);
    const [desiredPersonalCash, setDesiredPersonalCash] = useState<number | undefined>(undefined);
    const [maximizeCPP, setMaximizeCPP] = useState(false);
    const [prioritizeRRSPRoom, setPrioritizeRRSPRoom] = useState(false);

    // Initialize from local storage if available
    const [selectedScenario, setSelectedScenario] = useState<CompensationScenario | null>(() => {
        try {
            const saved = localStorage.getItem(STRATEGY_STORAGE_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    });

    // Save to local storage whenever it changes
    useEffect(() => {
        if (selectedScenario) {
            localStorage.setItem(STRATEGY_STORAGE_KEY, JSON.stringify(selectedScenario));
        }
    }, [selectedScenario]);

    // Calculate date range for fiscal year
    const { startDate, endDate } = useMemo(() => {
        const fiscalYearEnd = user?.company?.fiscal_year_end;
        if (fiscalYearEnd) {
            const range = getFiscalYearRange(selectedFiscalYear, fiscalYearEnd);
            return {
                startDate: range.start.toISOString().split('T')[0],
                endDate: range.end.toISOString().split('T')[0],
            };
        }
        return {
            startDate: `${selectedFiscalYear}-01-01`,
            endDate: `${selectedFiscalYear}-12-31`,
        };
    }, [selectedFiscalYear, user?.company?.fiscal_year_end]);

    // Fetch data for tax calculations
    const { data: invoicesResponse } = useQuery({
        queryKey: ['invoices_optimizer', user?.company_id],
        queryFn: async () => {
            return api.getInvoices({
                company_id: user?.company_id,
                limit: 1000,
            });
        },
        enabled: !!user?.company_id,
    });

    const { data: expensesResponse } = useQuery({
        queryKey: ['expenses_optimizer', user?.company_id, startDate, endDate],
        queryFn: async () => {
            return api.getExpenses({
                company_id: user?.company_id,
                start_date: startDate,
                end_date: endDate,
                limit: 1000,
            });
        },
        enabled: !!user?.company_id,
    });

    const { data: incomeResponse } = useQuery({
        queryKey: ['income_optimizer', user?.company_id, startDate, endDate],
        queryFn: async () => {
            return api.getIncomeEntries({
                company_id: user?.company_id,
                start_date: startDate,
                end_date: endDate,
                limit: 1000,
            });
        },
        enabled: !!user?.company_id,
    });

    const { data: salariesResponse } = useQuery({
        queryKey: ['salaries_optimizer', user?.company_id, startDate, endDate],
        queryFn: async () => {
            return api.getSalaries({
                company_id: user?.company_id,
                start_date: startDate,
                end_date: endDate,
                limit: 1000,
            });
        },
        enabled: !!user?.company_id,
    });

    const { data: capitalAssetsResponse } = useQuery({
        queryKey: ['capital_assets_optimizer', user?.company_id],
        queryFn: async () => {
            return api.getCapitalAssets({
                company_id: user?.company_id,
                limit: 1000,
            });
        },
        enabled: !!user?.company_id,
    });

    const { data: dividendsResponse } = useQuery({
        queryKey: ['dividends_optimizer', user?.company_id, startDate, endDate],
        queryFn: async () => {
            return api.getDividends({
                company_id: user?.company_id,
                start_date: startDate,
                end_date: endDate,
                limit: 1000,
            });
        },
        enabled: !!user?.company_id,
    });

    // Fetch payroll settings for province
    const { data: payrollSettings } = useQuery({
        queryKey: ['payrollSettings', user?.company_id],
        queryFn: async () => {
            if (!user?.company_id) return null;
            return api.getPayrollSettings(user.company_id);
        },
        enabled: !!user?.company_id,
    });

    // Get province from payroll settings, default to 'ON'
    const province = payrollSettings?.province || 'ON';

    // Fetch tax rates and constants
    const { data: taxConstants, isLoading: isLoadingTaxConstants, error: taxConstantsError } = useQuery({
        queryKey: ['tax_constants', selectedFiscalYear],
        queryFn: async () => {
            return api.getTaxConstants(selectedFiscalYear);
        },
        enabled: !!selectedFiscalYear,
        retry: false, // Don't retry on error
    });

    const { data: federalBrackets, error: federalBracketsError } = useQuery({
        queryKey: ['federal_brackets', selectedFiscalYear],
        queryFn: async () => {
            return api.getTaxRates(selectedFiscalYear, 'federal');
        },
        enabled: !!selectedFiscalYear,
        retry: false, // Don't retry on error
    });

    const { data: provincialBrackets, error: provincialBracketsError } = useQuery({
        queryKey: ['provincial_brackets', selectedFiscalYear, province],
        queryFn: async () => {
            return api.getTaxRates(selectedFiscalYear, province);
        },
        enabled: !!selectedFiscalYear,
        retry: false, // Don't retry on error
    });

    const { data: provincialConstants, isLoading: isLoadingProvincialConstants, error: provincialConstantsError } = useQuery({
        queryKey: ['provincial_constants', selectedFiscalYear, province],
        queryFn: async () => {
            return api.getProvincialTaxConstants(selectedFiscalYear, province);
        },
        enabled: !!selectedFiscalYear,
        retry: false, // Don't retry on error
    });

    // Calculate corporate net income
    const corporateNetIncome = useMemo(() => {
        if (
            !invoicesResponse ||
            !expensesResponse ||
            !incomeResponse ||
            !salariesResponse ||
            !capitalAssetsResponse
        ) {
            return 0;
        }

        const invoices = invoicesResponse.data;
        const expenses = expensesResponse.data;
        const incomeEntries = incomeResponse.data;
        const salaries = salariesResponse.data;
        const capitalAssets = capitalAssetsResponse.data;

        // Filter by date
        const paidInvoices = invoices.filter((invoice) => {
            if (invoice.status !== 'paid') return false;
            const invoiceDate = new Date(invoice.issue_date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            return invoiceDate >= start && invoiceDate <= end;
        });

        const filteredIncomeEntries = incomeEntries.filter((entry) => {
            const entryDate = new Date(entry.income_date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            return entryDate >= start && entryDate <= end;
        });

        const filteredExpenses = expenses.filter((expense) => {
            const expenseDate = new Date(expense.expense_date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            return expenseDate >= start && expenseDate <= end;
        });

        const filteredSalaries = salaries.filter((salary) => {
            const salaryDate = new Date(salary.payment_date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            return salaryDate >= start && salaryDate <= end;
        });

        // Calculate revenue
        const invoiceRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        const clientIncome = filteredIncomeEntries
            .filter((entry) => entry.income_type === 'client')
            .reduce((sum, entry) => sum + entry.amount, 0);
        const otherIncome = filteredIncomeEntries
            .filter((entry) => entry.income_type !== 'client')
            .reduce((sum, entry) => sum + entry.amount, 0);
        const grossRevenue = invoiceRevenue + clientIncome + otherIncome;

        // Calculate expenses
        const totalDeductibleExpenses = filteredExpenses.reduce((sum, expense) => {
            const deductionPercentage = expense.deduction_percentage ?? 1.0;
            return sum + expense.amount * deductionPercentage;
        }, 0);

        const totalSalaries = filteredSalaries.reduce((sum, salary) => sum + salary.amount, 0);

        // Calculate depreciation
        const depreciationEntries = capitalAssets
            .flatMap((asset) => asset.depreciation_entries || [])
            .filter((entry) => entry.fiscal_year === selectedFiscalYear);
        const totalDepreciation = depreciationEntries.reduce(
            (sum, entry) => sum + entry.depreciation_amount,
            0
        );

        // Active Business Income
        return Math.max(
            0,
            grossRevenue - totalDeductibleExpenses - totalSalaries - totalDepreciation
        );
    }, [
        invoicesResponse,
        expensesResponse,
        incomeResponse,
        salariesResponse,
        capitalAssetsResponse,
        startDate,
        endDate,
        selectedFiscalYear,
    ]);

    // Calculate YTD values
    const { ytdSalary, ytdDividends, ytdTotal } = useMemo(() => {
        if (!salariesResponse?.data || !dividendsResponse?.data) {
            return { ytdSalary: 0, ytdDividends: 0, ytdTotal: 0 };
        }

        const salaries = salariesResponse.data;
        const dividends = dividendsResponse.data;

        // Filter by date range (fiscal year)
        const salarySum = salaries
            .filter((s) => {
                const d = new Date(s.payment_date);
                return d >= new Date(startDate) && d <= new Date(endDate);
            })
            .reduce((sum, s) => sum + s.amount, 0);

        const dividendSum = dividends
            .filter((d) => {
                const date = new Date(d.declaration_date);
                return date >= new Date(startDate) && date <= new Date(endDate);
            })
            .reduce((sum, d) => sum + d.amount, 0);

        return {
            ytdSalary: salarySum,
            ytdDividends: dividendSum,
            ytdTotal: salarySum + dividendSum,
        };
    }, [salariesResponse, dividendsResponse, startDate, endDate]);

    // Calculate scenarios
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
            rdtohBalance: user?.company?.rdtoh_balance || 0,
            otherPersonalIncome,
            province,
            desiredPersonalCash,
            maximizeCPP,
            prioritizeRRSPRoom,
            fiscalYear: selectedFiscalYear,
            smallBusinessTaxRate: user?.company?.small_business_rate || 0.125,
            federalBrackets,
            provincialBrackets,
            taxConstants,
            provincialConstants: provincialConstants || undefined,
        };

        return findOptimalMix(inputs);
    }, [
        corporateNetIncome,
        taxConstants,
        federalBrackets,
        provincialBrackets,
        provincialConstants,
        otherPersonalIncome,
        desiredPersonalCash,
        maximizeCPP,
        prioritizeRRSPRoom,
        selectedFiscalYear,
        user?.company,
        province,
    ]);

    // Get recommendation
    const recommendation = useMemo(() => {
        if (scenarios.length === 0) return null;
        try {
            return getRecommendation(scenarios);
        } catch {
            return null;
        }
    }, [scenarios]);



    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const handleApplyPlan = async () => {
        if (!selectedScenario || !user?.company_id) return;

        try {
            // Create salary entry if salary > 0
            if (selectedScenario.salary > 0) {
                // Find owner employee or create a placeholder
                const employees = await api.getEmployees({
                    company_id: user.company_id,
                    limit: 1000,
                });
                const ownerEmployee = employees.data.find((e) => e.email === user.email) || employees.data[0];

                if (ownerEmployee) {
                    await api.createSalary({
                        company_id: user.company_id,
                        employee_id: ownerEmployee.id,
                        amount: selectedScenario.salary,
                        payment_date: new Date().toISOString().split('T')[0],
                        period_start: startDate,
                        period_end: endDate,
                        status: 'pending',
                        notes: 'Created from Salary vs Dividend Optimizer',
                    });
                }
            }

            // Create dividend entries
            if (selectedScenario.nonEligibleDividends > 0) {
                await api.createDividend({
                    company_id: user.company_id,
                    amount: selectedScenario.nonEligibleDividends,
                    declaration_date: new Date().toISOString().split('T')[0],
                    dividend_type: 'non_eligible',
                    fiscal_year: selectedFiscalYear,
                    status: 'declared',
                    notes: 'Created from Salary vs Dividend Optimizer',
                });
            }

            if (selectedScenario.eligibleDividends > 0) {
                await api.createDividend({
                    company_id: user.company_id,
                    amount: selectedScenario.eligibleDividends,
                    declaration_date: new Date().toISOString().split('T')[0],
                    dividend_type: 'eligible',
                    fiscal_year: selectedFiscalYear,
                    status: 'declared',
                    notes: 'Created from Salary vs Dividend Optimizer',
                });
            }

            alert('Compensation plan applied successfully!');
        } catch (error) {
            console.error('Error applying plan:', error);
            alert('Error applying plan. Please try again.');
        }
    };

    const getScenarioLabel = (scenario: CompensationScenario, index: number): string => {
        if (scenario.salary > 0 && scenario.eligibleDividends === 0 && scenario.nonEligibleDividends === 0) {
            return 'All Salary';
        }
        if (scenario.salary === 0 && scenario.nonEligibleDividends > 0 && scenario.eligibleDividends === 0) {
            return 'All Non-Eligible Dividends';
        }
        if (scenario.salary === 0 && scenario.eligibleDividends > 0 && scenario.nonEligibleDividends === 0) {
            return 'All Eligible Dividends';
        }
        if (index === 0) {
            return 'Optimal Mix';
        }
        return `Mix ${index + 1}`;
    };

    const [viewMode, setViewMode] = useState<'strategy' | 'calculator'>('strategy');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Target className="h-6 w-6 lg:h-8 lg:w-8 text-neon-emerald" />
                        Compensation Strategy
                    </h1>
                    <p className="text-sm lg:text-base text-muted-foreground mt-2">
                        Strategic planning for your annual owner compensation
                    </p>
                </div>
                <div className="flex bg-muted/30 p-1 rounded-lg border border-border/50 shrink-0">
                    <button
                        onClick={() => setViewMode('strategy')}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all",
                            viewMode === 'strategy'
                                ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Active Strategy
                    </button>
                    <button
                        onClick={() => setViewMode('calculator')}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all",
                            viewMode === 'calculator'
                                ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Calculator
                    </button>
                </div>
            </div>

            {/* Strategy Dashboard View */}
            {viewMode === 'strategy' && selectedScenario && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Main Progress Card */}
                    <Card className="col-span-1 lg:col-span-2 space-y-8 p-8 border-2 border-primary/20">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-foreground mb-2">Year-End Target</h2>
                                <p className="text-muted-foreground">Based on your {selectedFiscalYear} Optimal Mix</p>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold text-foreground">
                                    {formatCurrency(ytdTotal)}
                                    <span className="text-muted-foreground text-lg font-normal"> / {formatCurrency(selectedScenario.netCashToOwner)} (Net)</span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {Math.round((ytdTotal / selectedScenario.netCashToOwner) * 100)}% of annual target withdrawn
                                </div>
                            </div>
                        </div>

                        {/* Progress Bars */}
                        <div className="space-y-6">
                            {/* Salary Progress */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium">
                                    <span className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        Salary
                                    </span>
                                    <span>{formatCurrency(ytdSalary)} / {formatCurrency(selectedScenario.salary)}</span>
                                </div>
                                <div className="h-4 bg-muted/50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${Math.min(100, (ytdSalary / (selectedScenario.salary || 1)) * 100)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground text-right">
                                    {selectedScenario.salary > ytdSalary
                                        ? `${formatCurrency(selectedScenario.salary - ytdSalary)} remaining to optimize CPP/RRSP`
                                        : "Target reached"
                                    }
                                </p>
                            </div>

                            {/* Dividends Progress */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium">
                                    <span className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                                        Dividends
                                    </span>
                                    <span>
                                        {formatCurrency(ytdDividends)} / {formatCurrency(selectedScenario.nonEligibleDividends + selectedScenario.eligibleDividends)}
                                    </span>
                                </div>
                                <div className="h-4 bg-muted/50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${Math.min(100, (ytdDividends / ((selectedScenario.nonEligibleDividends + selectedScenario.eligibleDividends) || 1)) * 100)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground text-right">
                                    {selectedScenario.nonEligibleDividends + selectedScenario.eligibleDividends > ytdDividends
                                        ? `${formatCurrency((selectedScenario.nonEligibleDividends + selectedScenario.eligibleDividends) - ytdDividends)} remaining`
                                        : "Target reached"
                                    }
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Recommendation Action Card */}
                    <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
                        <div className="flex flex-col h-full justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                                    <TrendingUp className="w-5 h-5 text-primary" />
                                    Next Best Move
                                </h3>

                                {selectedScenario.salary > ytdSalary ? (
                                    <div className="space-y-4">
                                        <p className="text-foreground">
                                            To stay on track with your strategy, your next withdrawal should be <span className="font-bold text-blue-500">Salary</span>.
                                        </p>
                                        <div className="bg-background/50 p-3 rounded-lg text-sm text-muted-foreground">
                                            Taking salary now ensures you hit your CPP contribution goals and generate RRSP room before year-end.
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-foreground">
                                            You have met your salary quota! Future withdrawals should be <span className="font-bold text-amber-500">Dividends</span>.
                                        </p>
                                        <div className="bg-background/50 p-3 rounded-lg text-sm text-muted-foreground">
                                            Dividends are now the most tax-efficient way to take money out for the rest of the year.
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Button className="w-full mt-6" variant="default" onClick={() => window.location.hash = '#calculator'}>
                                Adjust Strategy <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </Card>

                    {/* Quick Stats */}
                    <Card>
                        <h3 className="text-lg font-semibold text-foreground mb-4">Projected Efficiency</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                                <span className="text-muted-foreground">Effective Tax Rate</span>
                                <span className="font-mono font-bold text-foreground">{selectedScenario.effectiveTaxRate.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                                <span className="text-muted-foreground">Projected Personal Tax</span>
                                <span className="font-mono font-bold text-foreground">{formatCurrency(selectedScenario.totalPersonalTax)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-muted-foreground">Projected Corp Tax</span>
                                <span className="font-mono font-bold text-foreground">{formatCurrency(selectedScenario.corporateTax)}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Welcome / Onboarding Hero */}
            {viewMode === 'strategy' && !selectedScenario && (
                <div className="py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-emerald/10 text-neon-emerald text-sm font-medium">
                                <Target className="w-4 h-4" />
                                <span>New Feature</span>
                            </div>
                            <h1 className="text-3xl lg:text-5xl font-bold tracking-tight text-foreground">
                                Master Your <span className="text-neon-emerald">Annual Compensation</span>
                            </h1>
                            <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed">
                                Don't just withdraw money blindly. Create a tax-efficient strategy that tells you exactly
                                <span className="text-foreground font-semibold"> when</span> to take Salary vs Dividends to maximize your wealth.
                            </p>

                            <div className="space-y-4 pt-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 bg-blue-500/10 p-2 rounded-lg">
                                        <TrendingUp className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-foreground">Next Best Move Engine</h3>
                                        <p className="text-sm text-muted-foreground">Real-time recommendations on your next withdrawal type.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 bg-amber-500/10 p-2 rounded-lg">
                                        <Target className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-foreground">Year-End Goals</h3>
                                        <p className="text-sm text-muted-foreground">Track your progress towards optimal CPP and RRSP targets.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 flex flex-col sm:flex-row gap-4">
                                <Button size="lg" onClick={() => setViewMode('calculator')} className="w-full sm:w-auto text-lg px-8">
                                    Create My Strategy <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Visual Preview / Illustration */}
                        <div className="hidden lg:block relative">
                            <div className="absolute inset-0 bg-neon-emerald/20 blur-3xl rounded-full opacity-20" />
                            <Card className="relative border-2 border-border/50 backdrop-blur-sm bg-background/50">
                                <div className="space-y-6 p-2">
                                    <div className="flex justify-between items-center border-b border-border pb-4">
                                        <div>
                                            <div className="text-sm text-muted-foreground">Year-End Target</div>
                                            <div className="text-2xl font-bold text-foreground">$85,000</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded-full">On Track</div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Salary Progress</span>
                                            <span className="text-foreground font-medium">65%</span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full w-[65%] bg-blue-500 rounded-full" />
                                        </div>
                                    </div>
                                    <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                                        <div className="flex items-center gap-2 mb-2 text-primary font-medium">
                                            <TrendingUp className="w-4 h-4" />
                                            Recommendation
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            "Take <span className="font-semibold text-foreground">Dividend</span> for your next withdrawal to stay tax efficient."
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            )}

            {/* Calculator Section (Collapsible/Tabbed) */}
            <div className={cn("space-y-6 transition-all", viewMode === 'calculator' ? "opacity-100" : "hidden h-0 overflow-hidden")}>

                {/* Input Section */}
                <Card className="space-y-6">
                    <h2 className="text-xl font-semibold text-foreground">Configuration & Inputs</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Fiscal Year
                            </label>
                            <select
                                className="input w-full"
                                value={selectedFiscalYear}
                                onChange={(e) => setSelectedFiscalYear(parseInt(e.target.value))}
                            >
                                {Array.from({ length: 5 }, (_, i) => {
                                    const year = new Date().getFullYear() - 2 + i;
                                    return (
                                        <option key={year} value={year}>
                                            {formatFiscalYear(year)}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                                Corporate Net Income
                                <HelpIcon
                                    content="Your company's net income after all expenses, salaries, and depreciation for the selected fiscal year. This is auto-calculated from your financial data."
                                />
                            </label>
                            <input
                                type="text"
                                className="input w-full"
                                value={formatCurrency(corporateNetIncome)}
                                readOnly
                                disabled
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                                RDTOH Balance
                                <HelpIcon
                                    content="Refundable Dividend Tax on Hand balance. This is a refundable tax account that prevents double taxation. When you pay non-eligible dividends, you can claim a refund from this balance."
                                />
                            </label>
                            <input
                                type="text"
                                className="input w-full"
                                value={formatCurrency(user?.company?.rdtoh_balance || 0)}
                                readOnly
                                disabled
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                                Other Personal Income
                                <HelpIcon
                                    content="Any other personal income you expect to receive this year (employment income, investment income, etc.). This affects your personal tax bracket."
                                />
                            </label>
                            <input
                                type="number"
                                className="input w-full"
                                value={otherPersonalIncome}
                                onChange={(e) => setOtherPersonalIncome(parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                step="100"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                                Desired Personal Cash (Optional)
                                <HelpIcon
                                    content="If you have a specific cash amount you need to take out of the company, the optimizer will try to match this amount."
                                />
                            </label>
                            <input
                                type="number"
                                className="input w-full"
                                value={desiredPersonalCash || ''}
                                onChange={(e) =>
                                    setDesiredPersonalCash(
                                        e.target.value ? parseFloat(e.target.value) : undefined
                                    )
                                }
                                placeholder="Leave blank for optimization"
                                step="1000"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                                Province
                            </label>
                            <input
                                type="text"
                                className="input w-full"
                                value={province}
                                readOnly
                                disabled
                            />
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border">
                        <h3 className="text-lg font-semibold text-foreground">Optimization Strategy</h3>

                        <div className="space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={maximizeCPP}
                                    onChange={(e) => {
                                        setMaximizeCPP(e.target.checked);
                                        if (e.target.checked) setPrioritizeRRSPRoom(false);
                                    }}
                                    className="w-5 h-5 rounded border-border bg-background text-neon-emerald focus:ring-2 focus:ring-neon-emerald"
                                />
                                <div>
                                    <span className="text-foreground font-medium">Maximize CPP Contributions</span>
                                    <HelpIcon
                                        content="Prioritize taking salary up to the CPP maximum ($68,500 for 2024) to maximize your CPP contributions and future CPP benefits."
                                        position="right"
                                    />
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={prioritizeRRSPRoom}
                                    onChange={(e) => {
                                        setPrioritizeRRSPRoom(e.target.checked);
                                        if (e.target.checked) setMaximizeCPP(false);
                                    }}
                                    className="w-5 h-5 rounded border-border bg-background text-neon-emerald focus:ring-2 focus:ring-neon-emerald"
                                />
                                <div>
                                    <span className="text-foreground font-medium">Prioritize RRSP Room</span>
                                    <HelpIcon
                                        content="Maximize salary to generate RRSP contribution room (18% of earned income). This is useful if you want to maximize retirement savings."
                                        position="right"
                                    />
                                </div>
                            </label>
                        </div>
                    </div>
                </Card>

                {/* Results Section for Calculator */}
                {scenarios.length > 0 && (
                    <>
                        {/* Recommendation Card */}
                        {recommendation && (
                            <Card glass="emerald" className="border-2 border-neon-emerald/50">
                                <div className="flex items-start gap-4">
                                    <CheckCircle className="h-6 w-6 text-neon-emerald flex-shrink-0 mt-1" />
                                    <div className="flex-1">
                                        <h3 className="text-xl font-semibold text-foreground mb-2">
                                            Recommended Plan
                                        </h3>
                                        <p className="text-foreground mb-4">{recommendation.explanation}</p>
                                        {recommendation.considerations.length > 0 && (
                                            <div className="space-y-2">
                                                <h4 className="font-medium text-foreground">Key Considerations:</h4>
                                                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                                    {recommendation.considerations.map((consideration, idx) => (
                                                        <li key={idx}>{consideration}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Comparison Table */}
                        <Card>
                            <h2 className="text-xl font-semibold text-foreground mb-4">Scenario Comparison</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="text-left p-3 text-sm font-medium text-foreground">Scenario</th>
                                            <th className="text-right p-3 text-sm font-medium text-foreground">Salary</th>
                                            <th className="text-right p-3 text-sm font-medium text-foreground">
                                                Non-Eligible Dividends
                                            </th>
                                            <th className="text-right p-3 text-sm font-medium text-foreground">
                                                Eligible Dividends
                                            </th>
                                            <th className="text-right p-3 text-sm font-medium text-foreground">
                                                Total Tax Burden
                                            </th>
                                            <th className="text-right p-3 text-sm font-medium text-foreground">
                                                Net Cash
                                            </th>
                                            <th className="text-right p-3 text-sm font-medium text-foreground">
                                                Effective Rate
                                            </th>
                                            <th className="text-center p-3 text-sm font-medium text-foreground">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scenarios.map((scenario, index) => {
                                            const isSelected = selectedScenario === scenario;
                                            const isRecommended = recommendation?.recommended === scenario;
                                            return (
                                                <tr
                                                    key={index}
                                                    className={cn(
                                                        'border-b border-border/50 hover:bg-white/5 transition-colors',
                                                        isSelected && 'bg-neon-emerald/10',
                                                        isRecommended && 'ring-2 ring-neon-emerald/50'
                                                    )}
                                                >
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-foreground font-medium">
                                                                {getScenarioLabel(scenario, index)}
                                                            </span>
                                                            {isRecommended && (
                                                                <span className="text-xs bg-neon-emerald/20 text-neon-emerald px-2 py-1 rounded">
                                                                    Recommended
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-right tabular-nums text-foreground">
                                                        {formatCurrency(scenario.salary)}
                                                    </td>
                                                    <td className="p-3 text-right tabular-nums text-foreground">
                                                        {formatCurrency(scenario.nonEligibleDividends)}
                                                    </td>
                                                    <td className="p-3 text-right tabular-nums text-foreground">
                                                        {formatCurrency(scenario.eligibleDividends)}
                                                    </td>
                                                    <td className="p-3 text-right tabular-nums text-foreground">
                                                        {formatCurrency(scenario.totalTaxBurden)}
                                                    </td>
                                                    <td className="p-3 text-right tabular-nums text-foreground">
                                                        {formatCurrency(scenario.netCashToOwner)}
                                                    </td>
                                                    <td className="p-3 text-right tabular-nums text-foreground">
                                                        {scenario.effectiveTaxRate.toFixed(2)}%
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <Button
                                                            size="sm"
                                                            variant={isSelected ? 'default' : 'outline'}
                                                            onClick={() => setSelectedScenario(scenario)}
                                                        >
                                                            {isSelected ? 'Selected' : 'Select'}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* Implementation Button for Calculator View */}
                        {selectedScenario && (
                            <Card>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-foreground mb-2">
                                            Lock in this Strategy
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Visualize this plan in the Strategy Dashboard.
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={handleApplyPlan}
                                            title="Creates draft Salary/Dividend records for the entire year"
                                        >
                                            Generate Records
                                        </Button>
                                        <Button onClick={() => setViewMode('strategy')} icon={CheckCircle}>
                                            View Dashboard
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </>
                )}
            </div>

            {/* Loading State */}
            {(isLoadingTaxConstants || isLoadingProvincialConstants) && (
                <Card>
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <Info className="h-5 w-5" />
                        <span>Loading tax rate data...</span>
                    </div>
                </Card>
            )}

            {/* Consolidated Error/Missing Data State */}
            {(() => {
                const isLoading = isLoadingTaxConstants || isLoadingProvincialConstants;
                const hasErrors = taxConstantsError || provincialConstantsError || federalBracketsError || provincialBracketsError;

                // Don't show anything while loading
                if (isLoading) return null;

                // Show error message if there are any errors
                if (hasErrors) {
                    return (
                        <Card className="border-red-500/50 bg-red-500/10">
                            <div className="flex items-start gap-4">
                                <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                                <div>
                                    <h3 className="text-lg font-semibold text-red-500 mb-2">Error Loading Tax Data</h3>
                                    <p className="text-sm text-red-500/80">
                                        Unable to load the necessary tax rates for optimization. Please check your internet connection or try again later.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    );
                }
                return null;
            })()}
        </div>
    );
};


export default CompensationStrategy;
