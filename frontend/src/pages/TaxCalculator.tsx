import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { useQuery } from '@tanstack/react-query';
import { Calendar, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Card from '../components/ui/Card';
import HelpIcon from '../components/ui/HelpIcon';
import { cn, formatLocalDate } from '../lib/utils';
import { getFiscalYearRange, getFiscalYear, formatFiscalYear, getCurrentFiscalYear } from '../lib/fiscalYear';

const TaxCalculator: React.FC = () => {
    const { user } = useAuth();
    const [timePeriod, setTimePeriod] = useState<'month' | 'year'>('year');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [expandedSections, setExpandedSections] = useState<{
        hst: boolean;
        income: boolean;
        expenses: boolean;
        depreciation: boolean;
    }>({
        hst: false,
        income: false,
        expenses: false,
        depreciation: false,
    });

    // Calculate date range based on time period and fiscal year
    const { startDate, endDate, fiscalYear } = useMemo(() => {
        const fiscalYearEnd = user?.company?.fiscal_year_end;
        let start: Date;
        let end: Date;
        let calculatedFiscalYear: number;

        if (timePeriod === 'month') {
            // For monthly view, use calendar month
            start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
            // Calculate fiscal year for the selected date
            calculatedFiscalYear = fiscalYearEnd ? getFiscalYear(selectedDate, fiscalYearEnd) : selectedDate.getFullYear();
        } else {
            // For yearly view, use fiscal year
            if (fiscalYearEnd) {
                calculatedFiscalYear = getFiscalYear(selectedDate, fiscalYearEnd);
                const fiscalYearRange = getFiscalYearRange(calculatedFiscalYear, fiscalYearEnd);
                start = fiscalYearRange.start;
                end = fiscalYearRange.end;
            } else {
                // Fallback to calendar year if no fiscal year end is set
                start = new Date(selectedDate.getFullYear(), 0, 1);
                end = new Date(selectedDate.getFullYear(), 11, 31);
                calculatedFiscalYear = selectedDate.getFullYear();
            }
        }

        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            fiscalYear: calculatedFiscalYear,
        };
    }, [timePeriod, selectedDate, user?.company?.fiscal_year_end]);

    // Fetch invoices
    const { data: invoicesResponse } = useQuery({
        queryKey: ['invoices_tax', user?.company_id],
        queryFn: async () => {
            return api.getInvoices({
                company_id: user?.company_id,
                limit: 1000,
            });
        },
        enabled: !!user?.company_id,
    });

    // Fetch expenses
    const { data: expensesResponse } = useQuery({
        queryKey: ['expenses_tax', user?.company_id, startDate, endDate],
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

    // Fetch income entries
    const { data: incomeResponse } = useQuery({
        queryKey: ['income_tax', user?.company_id, startDate, endDate],
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

    // Fetch HST payments
    const { data: hstPaymentsResponse } = useQuery({
        queryKey: ['hst_payments_tax', user?.company_id, startDate, endDate],
        queryFn: async () => {
            return api.getHSTPayments({
                company_id: user?.company_id,
                start_date: startDate,
                end_date: endDate,
                limit: 1000,
            });
        },
        enabled: !!user?.company_id,
    });

    // Fetch capital assets with depreciation entries
    const { data: capitalAssetsResponse } = useQuery({
        queryKey: ['capital_assets_tax', user?.company_id],
        queryFn: async () => {
            return api.getCapitalAssets({
                company_id: user?.company_id,
                limit: 1000,
            });
        },
        enabled: !!user?.company_id,
    });

    // Payroll expense from finalized pay runs
    const { data: payrollExpense } = useQuery({
        queryKey: ['payroll_expense_tax', user?.company_id, startDate, endDate],
        queryFn: async () => {
            return api.getPayrollExpenseForPeriod(user!.company_id!, startDate, endDate);
        },
        enabled: !!user?.company_id,
    });

    // Fetch dividends for RDTOH calculation
    const { data: dividendsResponse } = useQuery({
        queryKey: ['dividends_tax', user?.company_id, fiscalYear],
        queryFn: async () => {
            return api.getDividends({
                company_id: user?.company_id,
                limit: 1000,
            });
        },
        enabled: !!user?.company_id,
    });

    // Calculate tax data
    const taxData = useMemo(() => {
        if (!invoicesResponse || !expensesResponse || !incomeResponse || !hstPaymentsResponse || !capitalAssetsResponse || !payrollExpense || !dividendsResponse) {
            return null;
        }

        // Validation: Check for fiscal year alignment issues
        const validationWarnings: string[] = [];

        const invoices = invoicesResponse.data;
        const expenses = expensesResponse.data;
        const incomeEntries = incomeResponse.data;
        const hstPayments = hstPaymentsResponse.data;
        const capitalAssets = capitalAssetsResponse.data;
        const filteredSalaries = payrollExpense.lines;
        const dividends = dividendsResponse.data;

        // Validation: Check tax rates are reasonable (0-1 range) - will be checked after rates are declared

        // Filter invoices by date and status
        const paidInvoices = invoices.filter(invoice => {
            if (invoice.status !== 'paid') return false;
            const invoiceDate = new Date(invoice.issue_date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            return invoiceDate >= start && invoiceDate <= end;
        });

        // Filter income entries by date
        const filteredIncomeEntries = incomeEntries.filter(entry => {
            const entryDate = new Date(entry.income_date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            return entryDate >= start && entryDate <= end;
        });

        // Filter expenses by date (already filtered by API, but double-check)
        const filteredExpenses = expenses.filter(expense => {
            const expenseDate = new Date(expense.expense_date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            return expenseDate >= start && expenseDate <= end;
        });

        // Calculate HST Collected
        const hstFromInvoices = paidInvoices.reduce((sum, invoice) => sum + invoice.hst_amount, 0);
        const hstFromClientIncome = filteredIncomeEntries
            .filter(entry => entry.income_type === 'client')
            .reduce((sum, entry) => sum + entry.hst_amount, 0);
        const hstCollected = hstFromInvoices + hstFromClientIncome;

        // Calculate HST Paid (Input Tax Credits)
        const isHSTRegistered = user?.company?.hst_registered || false;
        const hstPaidFromExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.hst_paid, 0);
        const hstInputTaxCredits = isHSTRegistered ? hstPaidFromExpenses : 0;

        // Calculate HST Already Paid to CRA
        const hstAlreadyPaid = hstPayments.reduce((sum, payment) => sum + payment.amount, 0);

        // Calculate HST Owed
        const hstOwed = hstCollected - hstInputTaxCredits - hstAlreadyPaid;

        // Calculate Revenue
        const invoiceRevenue = paidInvoices.reduce((sum, invoice) => sum + invoice.subtotal, 0);
        const clientIncome = filteredIncomeEntries
            .filter(entry => entry.income_type === 'client')
            .reduce((sum, entry) => sum + entry.amount, 0);
        const grossRevenue = invoiceRevenue + clientIncome;

        // Calculate Other Income (capital contributions are NOT taxable, but other income is)
        const otherIncome = filteredIncomeEntries
            .filter(entry => entry.income_type === 'other')
            .reduce((sum, entry) => sum + entry.amount, 0);

        // Calculate Total Expenses (full amount)
        const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        // Calculate Total Deductible Expenses (using deduction percentage)
        const totalDeductibleExpenses = filteredExpenses.reduce((sum, expense) => {
            const deductionPercentage = expense.deduction_percentage ?? 1.0;
            return sum + (expense.amount * deductionPercentage);
        }, 0);
        const totalSalaries = payrollExpense.totalEmployerCost;

        // Calculate Depreciation (CCA) for the fiscal year
        const depreciationEntries = capitalAssets
            .flatMap(asset => asset.depreciation_entries || [])
            .filter(entry => entry.fiscal_year === fiscalYear);
        const totalDepreciation = depreciationEntries.reduce((sum, entry) => sum + entry.depreciation_amount, 0);

        // Active Business Income
        const activeBusinessIncome = Math.max(0, grossRevenue + otherIncome - totalDeductibleExpenses - totalSalaries - totalDepreciation);

        // Active Business Tax (small business rate)
        const smallBusinessTaxRate = user?.company?.small_business_rate || 0.125;
        const activeBusinessTax = activeBusinessIncome * smallBusinessTaxRate;

        // ===== RDTOH (Refundable Dividend Tax on Hand) CALCULATIONS =====
        // RDTOH is a refundable tax account that prevents double taxation of investment income
        // When dividends are paid, the corporation can claim a refund from RDTOH
        // Refund rate: $1 refund per $2.61 of dividends paid (as of 2024)
        // Reference: Income Tax Act section 129

        // RDTOH addition: No investment income tax, so no addition
        const rdtohAddition = 0;

        // RDTOH refund: $1 refund per $2.61 of dividends paid
        const rdtohRefundRate = 1 / 2.61; // $1 refund per $2.61 dividend (2024 rate)
        const dividendsPaid = dividends
            .filter(div => {
                const divDate = new Date(div.declaration_date);
                const start = new Date(startDate);
                const end = new Date(endDate);
                return divDate >= start && divDate <= end;
            })
            .reduce((sum, div) => sum + div.amount, 0);

        const rdtohRefund = dividendsPaid * rdtohRefundRate;

        // RDTOH balance (previous balance + additions - refunds)
        const previousRDTOHBalance = user?.company?.rdtoh_balance ?? 0;
        const rdtohBalance = Math.max(0, previousRDTOHBalance + rdtohAddition - rdtohRefund);
        const rdtohRefundable = Math.min(rdtohRefund, previousRDTOHBalance + rdtohAddition);

        // Total corporate tax (active business only)
        const totalCorporateTax = activeBusinessTax;

        // Calculate Total Taxes Owed (HST + Corporate Tax - RDTOH refund)
        const totalTaxesOwed = hstOwed + totalCorporateTax - rdtohRefundable;


        return {
            // HST Data
            hstCollected,
            hstFromInvoices,
            hstFromClientIncome,
            hstInputTaxCredits,
            hstAlreadyPaid,
            hstOwed,
            isHSTRegistered,
            paidInvoices,
            clientIncomeEntries: filteredIncomeEntries.filter(entry => entry.income_type === 'client'),

            // Income Tax Data - Active Business
            grossRevenue,
            invoiceRevenue,
            clientIncome,
            otherIncome,
            totalExpenses,
            totalDeductibleExpenses,
            totalSalaries,
            totalDepreciation,
            activeBusinessIncome,
            activeBusinessTax,
            smallBusinessTaxRate,

            // RDTOH Data
            rdtohAddition,
            rdtohRefund,
            rdtohBalance,
            rdtohRefundable,
            previousRDTOHBalance,
            dividendsPaid,

            // Combined Tax Data
            totalCorporateTax,
            filteredExpenses,
            filteredSalaries,
            depreciationEntries,
            capitalAssetsWithDepreciation: capitalAssets.filter(asset =>
                asset.depreciation_entries?.some(entry => entry.fiscal_year === fiscalYear)
            ),

            // Summary
            totalTaxesOwed,

            // Validation warnings
            validationWarnings,
        };
    }, [invoicesResponse, expensesResponse, incomeResponse, hstPaymentsResponse, capitalAssetsResponse, payrollExpense, dividendsResponse, startDate, endDate, fiscalYear, user?.company]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return formatLocalDate(dateString);
    };

    const formatPercentage = (rate: number) => {
        return `${(rate * 100).toFixed(2)}%`;
    };

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    if (!taxData) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Tax Summary</h1>
                    <p className="text-slate-muted mt-2">Calculate taxes owed to CRA for Ontario small corporations</p>
                </div>

                {/* Time Period Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <div className="flex rounded-lg shadow-sm border border-white/10 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setTimePeriod('month')}
                            className={cn(
                                "px-4 py-2 text-sm font-semibold transition-all duration-200",
                                timePeriod === 'month'
                                    ? 'bg-primary text-primary-foreground shadow-md'
                                    : 'bg-card text-white hover:bg-muted'
                            )}
                        >
                            Month
                        </button>
                        <button
                            type="button"
                            onClick={() => setTimePeriod('year')}
                            className={cn(
                                "px-4 py-2 text-sm font-semibold transition-all duration-200 border-l border-white/10",
                                timePeriod === 'year'
                                    ? 'bg-primary text-primary-foreground shadow-md'
                                    : 'bg-card text-white hover:bg-muted'
                            )}
                        >
                            Year
                        </button>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5 text-slate-muted" />
                        {timePeriod === 'month' ? (
                            <input
                                type="month"
                                value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`}
                                onChange={(e) => {
                                    const [year, month] = e.target.value.split('-');
                                    setSelectedDate(new Date(parseInt(year), parseInt(month) - 1, 1));
                                }}
                                className="flex h-10 w-auto rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        ) : (
                            <div className="flex items-center gap-2">
                                <select
                                    value={user?.company?.fiscal_year_end ? fiscalYear : selectedDate.getFullYear()}
                                    onChange={(e) => {
                                        const fy = parseInt(e.target.value);
                                        if (user?.company?.fiscal_year_end) {
                                            const range = getFiscalYearRange(fy, user.company.fiscal_year_end);
                                            setSelectedDate(range.start);
                                        } else {
                                            setSelectedDate(new Date(fy, 0, 1));
                                        }
                                    }}
                                    className="flex h-10 w-auto rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    {user?.company?.fiscal_year_end ? (
                                        Array.from({ length: 6 }, (_, i) => {
                                            const currentFY = getCurrentFiscalYear(user.company!.fiscal_year_end);
                                            const fy = currentFY - i;
                                            return (
                                                <option key={fy} value={fy}>
                                                    {formatFiscalYear(fy)}
                                                </option>
                                            );
                                        })
                                    ) : (
                                        Array.from({ length: 6 }, (_, i) => {
                                            const year = new Date().getFullYear() - i;
                                            return (
                                                <option key={year} value={year}>
                                                    {year}
                                                </option>
                                            );
                                        })
                                    )}
                                </select>
                                {user?.company?.fiscal_year_end && (
                                    <span className="text-sm text-muted-foreground">
                                        ({formatFiscalYear(fiscalYear)})
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Total Taxes Owed Summary */}
            <Card className={cn(
                "p-6 border-l-4",
                taxData.totalTaxesOwed > 0
                    ? "border-l-destructive bg-card"
                    : "border-l-primary bg-card"
            )}>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Total Taxes Owed to CRA</h2>
                        <p className="text-sm text-slate-muted">
                            {timePeriod === 'month'
                                ? `For ${selectedDate.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}`
                                : `For fiscal year ${fiscalYear}`
                            }
                        </p>
                    </div>
                    <div className="text-right">
                        <div className={cn(
                            "text-4xl font-bold",
                            taxData.totalTaxesOwed > 0
                                ? "text-destructive"
                                : "text-primary"
                        )}>
                            {formatCurrency(taxData.totalTaxesOwed)}
                        </div>
                        {taxData.totalTaxesOwed < 0 && (
                            <p className="text-sm text-primary mt-1">Refund/Credit</p>
                        )}
                    </div>
                </div>
            </Card>

            {/* HST to Pay Section */}
            <div className="space-y-4">
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white">HST to Pay</h2>
                        <button
                            onClick={() => toggleSection('hst')}
                            className="text-slate-muted hover:text-white"
                        >
                            {expandedSections.hst ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-background rounded-lg p-4 border">
                            <div className="text-sm text-slate-muted mb-1">HST Collected</div>
                            <div className="text-2xl font-bold text-white">{formatCurrency(taxData.hstCollected)}</div>
                        </div>
                        <div className="bg-background rounded-lg p-4 border">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="text-sm text-slate-muted">HST Credits from Expenses</div>
                                <HelpIcon
                                    content="HST you paid on business expenses that you can claim back as a credit against HST you collected. This reduces the amount of HST you owe to the government."
                                    size="sm"
                                />
                            </div>
                            <div className="text-2xl font-bold text-primary">
                                {taxData.isHSTRegistered ? formatCurrency(taxData.hstInputTaxCredits) : '$0.00 (Not HST Registered)'}
                            </div>
                        </div>
                        <div className="bg-background rounded-lg p-4 border">
                            <div className="text-sm text-slate-muted mb-1">HST Already Paid to CRA</div>
                            <div className="text-2xl font-bold text-white">{formatCurrency(taxData.hstAlreadyPaid)}</div>
                        </div>
                        <div className={cn(
                            "bg-background rounded-lg p-4 border-l-4",
                            taxData.hstOwed > 0
                                ? "border-l-destructive"
                                : "border-l-primary"
                        )}>
                            <div className="text-sm text-slate-muted mb-1">Net HST Owed</div>
                            <div className={cn(
                                "text-2xl font-bold",
                                taxData.hstOwed > 0
                                    ? "text-destructive"
                                    : "text-primary"
                            )}>
                                {formatCurrency(taxData.hstOwed)}
                            </div>
                        </div>
                    </div>

                    {expandedSections.hst && (
                        <div className="mt-4 space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-white mb-2">HST Collected Breakdown</h3>
                                <div className="bg-background rounded-lg p-4 border border-white/10">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm text-slate-muted">From Invoices ({taxData.paidInvoices.length} invoices)</span>
                                        <span className="text-sm font-medium text-white">{formatCurrency(taxData.hstFromInvoices)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-slate-muted">From Client Income ({taxData.clientIncomeEntries.length} entries)</span>
                                        <span className="text-sm font-medium text-white">{formatCurrency(taxData.hstFromClientIncome)}</span>
                                    </div>
                                </div>
                            </div>

                            {taxData.paidInvoices.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-white mb-2">Paid Invoices</h3>
                                    <div className="bg-background rounded-lg border border-white/10 overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold">
                                                <tr>
                                                    <th className="px-4 py-3">Invoice</th>
                                                    <th className="px-4 py-3">Date</th>
                                                    <th className="px-4 py-3 text-right">Subtotal</th>
                                                    <th className="px-4 py-3 text-right">HST</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {taxData.paidInvoices.map((invoice) => (
                                                    <tr key={invoice.id} className="hover:bg-muted/50 transition-colors">
                                                        <td className="px-4 py-3 font-medium text-white">{invoice.invoice_number}</td>
                                                        <td className="px-4 py-3 text-slate-muted">{formatDate(invoice.issue_date)}</td>
                                                        <td className="px-4 py-3 text-right text-white">{formatCurrency(invoice.subtotal)}</td>
                                                        <td className="px-4 py-3 text-right text-white">{formatCurrency(invoice.hst_amount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            </div>

            {/* Corporate Income Tax Section */}
            <div className="space-y-4">
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white">Business Income Tax</h2>
                        <button
                            onClick={() => toggleSection('income')}
                            className="text-slate-muted hover:text-white"
                        >
                            {expandedSections.income ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Active Business Income Section */}
                        <div className="bg-background rounded-lg p-4 border">
                            <h3 className="text-lg font-semibold text-white mb-3">Business Income (from operations)</h3>
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <div className="text-sm text-slate-muted mb-1">Gross Revenue</div>
                                        <div className="text-xl font-bold text-white">{formatCurrency(taxData.grossRevenue)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-slate-muted mb-1">Other Income</div>
                                        <div className="text-xl font-bold text-white">{formatCurrency(taxData.otherIncome)}</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <div className="text-sm text-slate-muted mb-1">Deductible Expenses</div>
                                        <div className="text-lg font-bold text-destructive">-{formatCurrency(taxData.totalDeductibleExpenses)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-slate-muted mb-1">Payroll</div>
                                        <div className="text-lg font-bold text-destructive">-{formatCurrency(taxData.totalSalaries)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-slate-muted mb-1">Depreciation (CCA)</div>
                                        <div className="text-lg font-bold text-destructive">-{formatCurrency(taxData.totalDepreciation)}</div>
                                    </div>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-3 border">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="text-sm font-medium text-white">Active Business Income</div>
                                        <div className="text-sm text-slate-muted">Tax Rate: {formatPercentage(taxData.smallBusinessTaxRate)}</div>
                                    </div>
                                    <div className="text-2xl font-bold text-white">{formatCurrency(taxData.activeBusinessIncome)}</div>
                                    <div className="text-sm text-slate-muted mt-1">Tax: {formatCurrency(taxData.activeBusinessTax)}</div>
                                </div>
                            </div>
                        </div>

                        {expandedSections.income && (
                            <div className="mt-4 space-y-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-white mb-2">Revenue Breakdown</h3>
                                    <div className="bg-background rounded-lg p-4 border border-white/10">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm text-slate-muted">Invoice Revenue ({taxData.paidInvoices.length} invoices)</span>
                                            <span className="text-sm font-medium text-white">{formatCurrency(taxData.invoiceRevenue)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-slate-muted">Client Income ({taxData.clientIncomeEntries.length} entries)</span>
                                            <span className="text-sm font-medium text-white">{formatCurrency(taxData.clientIncome)}</span>
                                        </div>
                                    </div>
                                </div>

                                {taxData.filteredExpenses.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-white mb-2">Expenses ({taxData.filteredExpenses.length} items)</h3>
                                        <div className="bg-background rounded-lg border border-white/10 overflow-hidden max-h-64 overflow-y-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold sticky top-0">
                                                    <tr>
                                                        <th className="px-4 py-3">Date</th>
                                                        <th className="px-4 py-3">Description</th>
                                                        <th className="px-4 py-3 text-right">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {taxData.filteredExpenses.map((expense) => (
                                                        <tr key={expense.id} className="hover:bg-muted/50 transition-colors">
                                                            <td className="px-4 py-3 text-slate-muted">{formatDate(expense.expense_date)}</td>
                                                            <td className="px-4 py-3 text-white">{expense.description}</td>
                                                            <td className="px-4 py-3 text-right text-white">{formatCurrency(expense.amount)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {taxData.filteredSalaries.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-white mb-2">Payroll ({taxData.filteredSalaries.length} items)</h3>
                                        <div className="bg-background rounded-lg border border-white/10 overflow-hidden max-h-64 overflow-y-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold sticky top-0">
                                                    <tr>
                                                        <th className="px-4 py-3">Date</th>
                                                        <th className="px-4 py-3">Employee</th>
                                                        <th className="px-4 py-3 text-right">Employer Cost</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {taxData.filteredSalaries.map((salary) => (
                                                        <tr key={salary.id} className="hover:bg-muted/50 transition-colors">
                                                            <td className="px-4 py-3 text-slate-muted">{formatDate(salary.pay_date)}</td>
                                                            <td className="px-4 py-3 text-white">{salary.employee_name}</td>
                                                            <td className="px-4 py-3 text-right text-white">{formatCurrency(salary.employer_total_cost)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {taxData.depreciationEntries.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-white mb-2">Depreciation (CCA) for {fiscalYear}</h3>
                                        <div className="bg-background rounded-lg border border-white/10 overflow-hidden">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold">
                                                    <tr>
                                                        <th className="px-4 py-3">Asset</th>
                                                        <th className="px-4 py-3">CCA Class</th>
                                                        <th className="px-4 py-3 text-right">Depreciation</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {taxData.depreciationEntries.map((entry) => {
                                                        const asset = taxData.capitalAssetsWithDepreciation.find(a =>
                                                            a.depreciation_entries?.some(e => e.id === entry.id)
                                                        );
                                                        return (
                                                            <tr key={entry.id} className="hover:bg-muted/50 transition-colors">
                                                                <td className="px-4 py-3 text-white">
                                                                    {asset?.description || 'Unknown Asset'}
                                                                </td>
                                                                <td className="px-4 py-3 text-slate-muted">
                                                                    Class {asset?.cca_class || 'N/A'} ({(asset?.cca_rate || 0) * 100}%)
                                                                </td>
                                                                <td className="px-4 py-3 text-right text-white">
                                                                    {formatCurrency(entry.depreciation_amount)}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Card>

                {/* RDTOH Section */}
                {(taxData.rdtohBalance > 0 || taxData.dividendsPaid > 0) && (
                    <div className="bg-background rounded-lg p-4 border">
                        <div className="flex items-center gap-2 mb-3">
                            <h3 className="text-lg font-semibold text-white">Refundable Tax Account</h3>
                            <HelpIcon
                                content="RDTOH (Refundable Dividend Tax on Hand) is a tax account. When you pay dividends, you can get a refund from this account ($1 refund per $2.61 of dividends paid)."
                                size="sm"
                            />
                        </div>
                        <div className="space-y-3">
                            {taxData.dividendsPaid > 0 && (
                                <div>
                                    <div className="text-sm text-slate-muted mb-1">Dividends Paid</div>
                                    <div className="text-lg font-bold text-white">{formatCurrency(taxData.dividendsPaid)}</div>
                                    <div className="text-xs text-slate-muted">RDTOH Refund: {formatCurrency(taxData.rdtohRefund)} ($1 per $2.61 dividend)</div>
                                </div>
                            )}
                            <div className="bg-muted/50 rounded-lg p-3 border">
                                <div className="flex justify-between items-center mb-1">
                                    <div className="text-sm font-medium text-white">RDTOH Balance</div>
                                </div>
                                <div className="text-2xl font-bold text-white">{formatCurrency(taxData.rdtohBalance)}</div>
                                {taxData.rdtohRefundable > 0 && (
                                    <div className="text-sm text-primary mt-1">Refundable: {formatCurrency(taxData.rdtohRefundable)}</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Total Corporate Tax */}
                <div className={cn(
                    "bg-background rounded-lg p-4 border-l-4",
                    taxData.totalCorporateTax > 0
                        ? "border-l-destructive"
                        : "border-l-primary"
                )}>
                    <div className="text-sm text-slate-muted mb-1">Total Corporate Income Tax</div>
                    <div className="text-3xl font-bold text-white mb-2">{formatCurrency(taxData.totalCorporateTax)}</div>
                    <div className="text-sm text-slate-muted">
                        Active Business: {formatCurrency(taxData.activeBusinessTax)}
                        {taxData.rdtohRefundable > 0 && (
                            <span className="text-primary"> - RDTOH Refund: {formatCurrency(taxData.rdtohRefundable)}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Validation Warnings */}
            {taxData.validationWarnings && taxData.validationWarnings.length > 0 && (
                <Card className="p-6 border border-accent/50 bg-accent/10">
                    <div className="flex items-start">
                        <AlertCircle className="h-6 w-6 text-accent mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2">Validation Warnings</h3>
                            <ul className="text-sm text-slate-muted space-y-2 list-disc list-inside">
                                {taxData.validationWarnings.map((warning, idx) => (
                                    <li key={idx}>{warning}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Card>
            )}

            {/* Information Card */}
            <Card className="p-6 border bg-card">
                <div className="flex items-start">
                    <AlertCircle className="h-6 w-6 text-primary mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Important Notes</h3>
                        <ul className="text-sm text-slate-muted space-y-2 list-disc list-inside">
                            <li>HST Input Tax Credits (ITCs) are only available if your company is HST registered.</li>
                            <li>Capital contributions are not included in taxable income.</li>
                            <li>Depreciation (CCA) reduces taxable income and is calculated based on fiscal year.</li>
                            <li><strong>Active business income</strong> is taxed at the small business rate (12.5% default).</li>
                            <li><strong>RDTOH (Refundable Dividend Tax on Hand)</strong>: When you pay dividends, you can get a refund from RDTOH ($1 refund per $2.61 of dividends). Reference: Income Tax Act section 129.</li>
                            <li>Tax rates are based on 2024 Ontario combined federal/provincial rates. Rates may vary by province and tax year.</li>
                            <li>These calculations are estimates. Please consult with a tax professional for official tax filings.</li>
                            <li>HST remittance periods may vary based on your filing frequency (monthly, quarterly, or annual).</li>
                        </ul>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default TaxCalculator;
