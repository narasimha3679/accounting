import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { useQuery } from '@tanstack/react-query';
import {
    Calculator,
    AlertCircle,
    CheckCircle,
    Info,
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

const SalaryDividendOptimizer: React.FC = () => {
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
    const [selectedScenario, setSelectedScenario] = useState<CompensationScenario | null>(null);

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

    // Set selected scenario to recommended one
    useEffect(() => {
        if (recommendation && !selectedScenario) {
            setSelectedScenario(recommendation.recommended);
        }
    }, [recommendation, selectedScenario]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Calculator className="h-8 w-8 text-neon-emerald" />
                        Salary vs Dividend Optimizer
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Find the optimal mix of salary and dividends to minimize your tax burden
                    </p>
                </div>
            </div>

            {/* Input Section */}
            <Card className="space-y-6">
                <h2 className="text-xl font-semibold text-foreground">Input Parameters</h2>

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

            {/* Results Section */}
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

                    {/* Detailed Breakdown */}
                    {selectedScenario && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <h3 className="text-lg font-semibold text-foreground mb-4">
                                    Corporate Impact
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Corporate Tax</span>
                                        <span className="text-foreground font-medium tabular-nums">
                                            {formatCurrency(selectedScenario.corporateTax)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">RDTOH Refund</span>
                                        <span className="text-neon-emerald font-medium tabular-nums">
                                            {formatCurrency(selectedScenario.rdtohRefund)}
                                        </span>
                                    </div>
                                </div>
                            </Card>

                            <Card>
                                <h3 className="text-lg font-semibold text-foreground mb-4">
                                    Personal Impact
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">CPP Contributions</span>
                                        <span className="text-foreground font-medium tabular-nums">
                                            {formatCurrency(selectedScenario.cppContributions)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Federal Tax</span>
                                        <span className="text-foreground font-medium tabular-nums">
                                            {formatCurrency(selectedScenario.federalTax)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Provincial Tax</span>
                                        <span className="text-foreground font-medium tabular-nums">
                                            {formatCurrency(selectedScenario.provincialTax)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Total Personal Tax</span>
                                        <span className="text-foreground font-medium tabular-nums">
                                            {formatCurrency(selectedScenario.totalPersonalTax)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">RRSP Room Generated</span>
                                        <span className="text-golden-hour font-medium tabular-nums">
                                            {formatCurrency(selectedScenario.rrspRoomGenerated)}
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {selectedScenario && (
                        <Card>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground mb-2">
                                        Apply This Plan
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Create salary and dividend entries based on the selected scenario
                                    </p>
                                </div>
                                <Button onClick={handleApplyPlan} icon={CheckCircle}>
                                    Apply Plan
                                </Button>
                            </div>
                        </Card>
                    )}
                </>
            )}

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
                const hasMissingData = 
                    (!taxConstants && !taxConstantsError) ||
                    (!provincialConstants && !provincialConstantsError) ||
                    (federalBrackets && federalBrackets.length === 0 && !federalBracketsError) ||
                    (provincialBrackets && provincialBrackets.length === 0 && !provincialBracketsError);

                // Don't show anything while loading
                if (isLoading) return null;

                // Show error message if there are any errors
                if (hasErrors) {
                    const permissionError = 
                        (taxConstantsError instanceof Error && (taxConstantsError as any).isPermissionError ? taxConstantsError : null) ||
                        (provincialConstantsError instanceof Error && (provincialConstantsError as any).isPermissionError ? provincialConstantsError : null) ||
                        (federalBracketsError instanceof Error && (federalBracketsError as any).isPermissionError ? federalBracketsError : null) ||
                        (provincialBracketsError instanceof Error && (provincialBracketsError as any).isPermissionError ? provincialBracketsError : null);

                    if (permissionError) {
                        return (
                            <Card>
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <AlertCircle className="h-5 w-5" />
                                    <span>{permissionError.message}</span>
                                </div>
                            </Card>
                        );
                    }

                    // Generic error message
                    return (
                        <Card>
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <AlertCircle className="h-5 w-5" />
                                <span>
                                    Error loading tax rate data for {formatFiscalYear(selectedFiscalYear)}. Please try again or select a different year.
                                </span>
                            </div>
                        </Card>
                    );
                }

                // Show missing data message if data is missing
                if (hasMissingData && corporateNetIncome > 0) {
                    return (
                        <Card>
                            <div className="flex items-center gap-3 text-muted-foreground">
                                <AlertCircle className="h-5 w-5" />
                                <span>
                                    Tax rate data for {formatFiscalYear(selectedFiscalYear)} is not available. Please select a different year.
                                </span>
                            </div>
                        </Card>
                    );
                }

                return null;
            })()}

            {/* No Data State */}
            {!isLoadingTaxConstants && !isLoadingProvincialConstants && scenarios.length === 0 && corporateNetIncome > 0 && taxConstants !== null && provincialConstants !== null && (
                <Card>
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <AlertCircle className="h-5 w-5" />
                        <span>Unable to calculate scenarios. Please check your tax rate data.</span>
                    </div>
                </Card>
            )}

            {corporateNetIncome <= 0 && (
                <Card>
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <Info className="h-5 w-5" />
                        <span>
                            No corporate net income found for the selected fiscal year. Please ensure you have
                            income and expense data.
                        </span>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default SalaryDividendOptimizer;
