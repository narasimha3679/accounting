import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import api, { type Dividend, type OwnerPayment } from '../lib/api';
import { loadDashboardPreferences, updateDashboardPreference } from '../lib/preferences';
import {
    DollarSign,
    TrendingUp,
    Calendar,
    Check,
    Percent,
    Banknote,
    Building2,
    Calculator
} from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import { cn } from '../lib/utils';
import { staggerContainer, staggerItem } from '../lib/animations';
import { getFiscalYearRange, getFiscalYear, formatFiscalYear, getCurrentFiscalYear } from '../lib/fiscalYear';
import { SafeToSpendWidget } from '../components/dashboard/SafeToSpendWidget';
import { PayMyselfSlider } from '../components/dashboard/PayMyselfSlider';
import { ActionCenter } from '../components/dashboard/ActionCenter';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalExpenses: 0,
        netIncome: 0,
        outstandingInvoices: 0,
        overdueInvoices: 0,
        overdueInvoicesTotal: 0,
        hstOwed: 0,
        hstPaid: 0,
        inputTaxCredits: 0,
        availableDividends: 0,
        totalIncome: 0,
        ownerReimbursementOwed: 0,
        ownerExpenseCount: 0,
        corporateExpenseTotal: 0,
        corporateExpenseCount: 0,
        ownerPaymentsTotal: 0,
        netOwnerBalance: 0,
        // Tax information
        taxableIncome: 0,
        smallBusinessTaxOwed: 0,
        smallBusinessTaxPaid: 0,
        taxDeductibleExpenses: 0,
        netIncomeAfterTax: 0,
        // Capital asset information
        totalCapitalAssets: 0,
        totalAssetCost: 0,
        totalAccumulatedDepreciation: 0,
        totalAssetBookValue: 0,
    });
    const [allDividends, setAllDividends] = useState<Dividend[]>([]);
    const [, setOwnerPayments] = useState<OwnerPayment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [timePeriod, setTimePeriod] = useState<'month' | 'year'>(() => {
        // Load saved preference on component mount
        const preferences = loadDashboardPreferences();
        return preferences.timePeriod;
    });
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        if (user) {
            loadDashboardData();
        }
    }, [user, timePeriod, selectedDate]);

    const loadDashboardData = async () => {
        try {
            const companyId = user?.company_id;
            if (companyId == null) {
                setIsLoading(false);
                return;
            }
            const fiscalYearEnd = user?.company?.fiscal_year_end;

            // Calculate date range based on time period and fiscal year
            let startDate: Date;
            let endDate: Date;

            if (timePeriod === 'month') {
                // For monthly view, use calendar month
                startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
            } else {
                // For yearly view, use fiscal year
                if (fiscalYearEnd) {
                    const fiscalYear = getFiscalYear(selectedDate, fiscalYearEnd);
                    const fiscalYearRange = getFiscalYearRange(fiscalYear, fiscalYearEnd);
                    startDate = fiscalYearRange.start;
                    endDate = fiscalYearRange.end;
                } else {
                    // Fallback to calendar year if no fiscal year end is set
                    startDate = new Date(selectedDate.getFullYear(), 0, 1);
                    endDate = new Date(selectedDate.getFullYear(), 11, 31);
                }
            }

            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            // Fetch all data in parallel for better performance
            const [
                allInvoicesResponse,
                expensesResponse,
                incomeEntriesResponse,
                hstPaymentsResponse,
                dividendsResponse,
                capitalAssetsResponse,
                ownerPaymentsResponse,
                payrollExpense
            ] = await Promise.all([
                // Fetch all invoices once (we'll filter by status and date client-side)
                api.getInvoices({
                    company_id: companyId,
                    limit: 1000
                }),
                // Fetch expenses with date filtering
                api.getExpenses({
                    company_id: companyId,
                    start_date: startDateStr,
                    end_date: endDateStr,
                    limit: 1000
                }),
                // Fetch income entries with date filtering
                api.getIncomeEntries({
                    company_id: companyId,
                    start_date: startDateStr,
                    end_date: endDateStr,
                    limit: 1000
                }),
                // Fetch HST payments with date filtering
                api.getHSTPayments({
                    company_id: companyId,
                    start_date: startDateStr,
                    end_date: endDateStr,
                    limit: 1000
                }),
                // Fetch dividends with date filtering
                api.getDividends({
                    company_id: companyId,
                    start_date: startDateStr,
                    end_date: endDateStr,
                    limit: 1000
                }),
                // Fetch capital assets with date filtering
                api.getCapitalAssets({
                    company_id: companyId,
                    start_date: startDateStr,
                    end_date: endDateStr,
                    limit: 1000
                }),
                // Fetch owner payments with date filtering
                api.getOwnerPayments({
                    company_id: companyId,
                    start_date: startDateStr,
                    end_date: endDateStr,
                    limit: 1000
                }),
                // Payroll expense from finalized pay runs
                api.getPayrollExpenseForPeriod(companyId, startDateStr, endDateStr)
            ]);

            // Filter invoices by status and date
            const allInvoices = allInvoicesResponse.data;
            const paidInvoices = allInvoices.filter(invoice => {
                if (invoice.status !== 'paid') return false;
                const invoiceDate = new Date(invoice.issue_date);
                return invoiceDate >= startDate && invoiceDate <= endDate;
            });
            const outstandingInvoices = allInvoices.filter(invoice => invoice.status === 'sent');
            const overdueInvoices = allInvoices.filter(invoice => invoice.status === 'overdue');
            const overdueInvoicesTotal = overdueInvoices.reduce((sum, inv) => sum + inv.total, 0);

            // Data is already filtered by date from the API
            const expenses = expensesResponse.data;
            const incomeEntries = incomeEntriesResponse.data;
            const hstPayments = hstPaymentsResponse.data;
            const dividends = dividendsResponse.data;
            const capitalAssets = capitalAssetsResponse.data;
            const ownerPayments = ownerPaymentsResponse.data;
            const totalSalaries = payrollExpense.totalEmployerCost;

            // Calculate stats
            const invoiceRevenue = paidInvoices.reduce((sum, invoice) => sum + invoice.subtotal, 0);
            const clientIncome = incomeEntries
                .filter(entry => entry.income_type === 'client')
                .reduce((sum, entry) => sum + entry.amount, 0);
            const otherIncome = incomeEntries
                .filter(entry => entry.income_type !== 'client')
                .reduce((sum, entry) => sum + entry.amount, 0);
            const totalRevenue = invoiceRevenue + clientIncome;
            const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
            // Calculate deductible expenses using deduction percentage
            const totalDeductibleExpenses = expenses.reduce((sum, expense) => {
                const deductionPercentage = expense.deduction_percentage ?? 1.0;
                return sum + (expense.amount * deductionPercentage);
            }, 0);
            const netIncome = totalRevenue + otherIncome - totalDeductibleExpenses - totalSalaries;

            // Calculate owner reimbursement owed (expenses and capital assets paid by owner that need to be reimbursed)
            const ownerExpenses = expenses.filter(expense => expense.paid_by === 'owner');
            const ownerExpensesOwed = ownerExpenses
                .reduce((sum, expense) => sum + expense.amount + expense.hst_paid, 0);

            const ownerCapitalAssets = capitalAssets.filter(asset => asset.paid_by === 'owner');
            const ownerCapitalAssetsOwed = ownerCapitalAssets
                .reduce((sum, asset) => sum + asset.total_cost, 0);

            const ownerReimbursementOwed = ownerExpensesOwed + ownerCapitalAssetsOwed;

            // Calculate corporate expenses (for comparison)
            const corporateExpenses = expenses.filter(expense => expense.paid_by === 'corp');
            const corporateExpenseTotal = corporateExpenses
                .reduce((sum, expense) => sum + expense.amount + expense.hst_paid, 0);

            // Calculate owner payments made by corporation
            const ownerPaymentsTotal = ownerPayments.reduce((sum, payment) => sum + payment.amount, 0);

            // Calculate net owner balance (amount owed to owner - amount paid to owner)
            const netOwnerBalance = ownerReimbursementOwed - ownerPaymentsTotal;

            // Calculate HST collected from invoices and income entries
            const hstFromInvoices = paidInvoices.reduce((sum, invoice) => sum + invoice.hst_amount, 0);
            const hstFromIncome = incomeEntries
                .filter(entry => entry.income_type === 'client')
                .reduce((sum, entry) => sum + entry.hst_amount, 0);
            const hstCollected = hstFromInvoices + hstFromIncome;

            // Calculate HST paid from expenses and HST payments to CRA
            const hstPaidFromExpenses = expenses.reduce((sum, expense) => sum + expense.hst_paid, 0);
            const hstPaidToCRA = hstPayments.reduce((sum, payment) => sum + payment.amount, 0);

            // If company is HST registered, they can claim Input Tax Credits (ITCs) for HST paid on expenses
            // This reduces the HST they owe to the government
            const isHSTRegistered = user?.company?.hst_registered || false;
            // HST Paid for the purpose of the 'Owed' calculation is just what we've remitted to CRA.
            // ITCs are handled separately.
            const hstPaid = hstPaidToCRA;
            const inputTaxCredits = isHSTRegistered ? hstPaidFromExpenses : 0;

            // Calculate HST owed (collected - paid - ITCs)
            const hstOwed = hstCollected - hstPaid - inputTaxCredits;

            // Calculate tax information
            const smallBusinessTaxRate = user?.company?.small_business_rate || 0.125;

            // Taxable income = Total Revenue + Other Income - Deductible Business Expenses - Salaries
            const taxableIncome = totalRevenue + otherIncome - totalDeductibleExpenses - totalSalaries;
            const smallBusinessTaxOwed = Math.max(0, taxableIncome * smallBusinessTaxRate);

            // Tax paid through dividends (dividends are paid from after-tax income)
            const totalDividendsPaid = dividends.reduce((sum, dividend) => sum + dividend.amount, 0);
            const smallBusinessTaxPaid = totalDividendsPaid; // Dividends represent tax already paid

            // Net income after tax
            const netIncomeAfterTax = taxableIncome - smallBusinessTaxOwed;
            const availableDividends = Math.max(0, netIncomeAfterTax - totalDividendsPaid);

            // Tax deductible expenses (using deduction percentages)
            const taxDeductibleExpenses = totalDeductibleExpenses + totalSalaries;

            // Calculate capital asset stats
            const totalAssetCost = capitalAssets.reduce((sum, asset) => sum + asset.total_cost, 0);
            const totalAccumulatedDepreciation = capitalAssets.reduce((sum, asset) => sum + asset.accumulated_depreciation, 0);
            const totalAssetBookValue = capitalAssets.reduce((sum, asset) => sum + asset.book_value, 0);

            setStats({
                totalRevenue,
                totalExpenses,
                netIncome,
                outstandingInvoices: outstandingInvoices.length,
                overdueInvoices: overdueInvoices.length,
                overdueInvoicesTotal,
                hstOwed,
                hstPaid: hstPaidToCRA, // Only show HST payments to CRA in the stats
                inputTaxCredits, // Add ITCs to stats
                availableDividends,
                totalIncome: otherIncome,
                ownerReimbursementOwed,
                ownerExpenseCount: ownerExpenses.length,
                corporateExpenseTotal,
                corporateExpenseCount: corporateExpenses.length,
                ownerPaymentsTotal,
                netOwnerBalance,
                // Tax information
                taxableIncome,
                smallBusinessTaxOwed,
                smallBusinessTaxPaid,
                taxDeductibleExpenses,
                netIncomeAfterTax,
                // Capital asset information
                totalCapitalAssets: capitalAssets.length,
                totalAssetCost,
                totalAccumulatedDepreciation,
                totalAssetBookValue,
            });



            setAllDividends(dividends);
            setOwnerPayments(ownerPayments);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };



    // Hooks must be called before any early returns
    // Note: Removed scroll reveal hooks as they were causing content to be hidden
    // Content will animate on mount instead

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0"
            >
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Cockpit</h1>
                    <p className="text-muted-foreground mt-2">Welcome back, {user?.name}</p>
                </div>

                {/* Time Period Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <div className="flex rounded-lg glass border border-white/10 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => {
                                setTimePeriod('month');
                                updateDashboardPreference('timePeriod', 'month');
                            }}
                            className={cn(
                                "px-4 py-2 text-sm font-medium transition-all duration-200",
                                timePeriod === 'month'
                                    ? 'bg-primary/20 text-primary border-r border-border'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                        >
                            Month
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setTimePeriod('year');
                                updateDashboardPreference('timePeriod', 'year');
                            }}
                            className={cn(
                                "px-4 py-2 text-sm font-medium transition-all duration-200",
                                timePeriod === 'year'
                                    ? 'bg-primary/20 text-primary'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                        >
                            Year
                        </button>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        {timePeriod === 'month' ? (
                            <input
                                type="month"
                                value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`}
                                onChange={(e) => {
                                    const [year, month] = e.target.value.split('-');
                                    setSelectedDate(new Date(parseInt(year), parseInt(month) - 1, 1));
                                }}
                                className="input"
                            />
                        ) : (
                            <div className="flex items-center gap-2">
                                <select
                                    value={user?.company?.fiscal_year_end ? getFiscalYear(selectedDate, user.company.fiscal_year_end) : selectedDate.getFullYear()}
                                    onChange={(e) => {
                                        const fiscalYear = parseInt(e.target.value);
                                        if (user?.company?.fiscal_year_end) {
                                            const range = getFiscalYearRange(fiscalYear, user.company.fiscal_year_end);
                                            setSelectedDate(range.start);
                                        } else {
                                            setSelectedDate(new Date(fiscalYear, 0, 1));
                                        }
                                    }}
                                    className="input"
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
                                        ({formatFiscalYear(getFiscalYear(selectedDate, user.company.fiscal_year_end))})
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* --- DASHBOARD 2.0 OWNER'S COCKPIT --- */}
            <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
                {/* Hero: Safe To Spend (Spans 2 cols on Desktop) */}
                <motion.div variants={staggerItem} className="lg:col-span-2">
                    <SafeToSpendWidget
                        hstOwed={stats.hstOwed}
                        corpTaxOwed={stats.smallBusinessTaxOwed}
                        availableCash={(stats.totalRevenue + stats.totalIncome + stats.hstOwed) - (stats.totalExpenses + stats.ownerPaymentsTotal + stats.smallBusinessTaxPaid)}
                    />
                </motion.div>

                {/* Sidebar: Action Center */}
                <motion.div variants={staggerItem} className="lg:col-span-1">
                    <ActionCenter
                        overdueCount={stats.overdueInvoices}
                        overdueTotal={stats.overdueInvoicesTotal}
                        hstFilingDue={user?.company?.hst_filing_period_start ? undefined : undefined} // TODO: Calculate actual deadline
                    />
                </motion.div>

                {/* Simulator: Pay Myself (Full Width) */}
                <motion.div variants={staggerItem} className="lg:col-span-3">
                    <PayMyselfSlider
                        availableDividends={stats.availableDividends}
                        reimbursementsOwed={stats.ownerReimbursementOwed} // Using gross owed
                    />
                </motion.div>
            </motion.div>

            {/* --- DETAILED ANALYTICS (Legacy Dashboard) --- */}
            <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="space-y-6 pt-8 border-t border-border"
            >
                <div className="flex items-center justify-between cursor-pointer group" onClick={() => {
                    const el = document.getElementById('detailed-financials');
                    if (el) el.classList.toggle('hidden');
                }}>
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground/80 group-hover:text-foreground transition-colors">
                        Detailed Financials
                    </h2>
                    <span className="text-sm text-muted-foreground group-hover:text-primary">Toggle View</span>
                </div>

                <div id="detailed-financials" className="space-y-6">
                    {/* Key Metrics Row */}
                    <motion.div
                        variants={staggerContainer}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
                    >
                        <motion.div variants={staggerItem}>
                            <StatCard
                                title="Total Revenue"
                                value={formatCurrency(stats.totalRevenue)}
                                subtitle="Money received from clients"
                                icon={DollarSign}
                                gradient="emerald"
                                accent="emerald"
                            />
                        </motion.div>
                        <motion.div variants={staggerItem}>
                            <StatCard
                                title="Net Income"
                                value={formatCurrency(stats.netIncome)}
                                subtitle="Profit after all expenses"
                                icon={TrendingUp}
                                gradient={stats.netIncome >= 0 ? "emerald" : "red"}
                                accent={stats.netIncome >= 0 ? "emerald" : "default"}
                            />
                        </motion.div>
                        <motion.div variants={staggerItem}>
                            <StatCard
                                title="Taxable Income"
                                value={formatCurrency(stats.taxableIncome)}
                                subtitle="Before tax"
                                icon={Calculator}
                                gradient="blue"
                                accent="default"
                            />
                        </motion.div>
                        <motion.div variants={staggerItem}>
                            <StatCard
                                title="HST Collected"
                                value={formatCurrency(stats.hstOwed + stats.hstPaid)} // Roughly collected
                                subtitle="Not your money!"
                                icon={Banknote}
                                gradient="red"
                                accent="default"
                            />
                        </motion.div>
                    </motion.div>

                    {/* Owner Balance Section - KEEPING FOR DATA RECONCILIATION */}
                    {Math.abs(stats.netOwnerBalance) > 0.01 && (
                        <motion.div
                            variants={staggerItem}
                            className="relative opacity-80 hover:opacity-100 transition-opacity"
                        >
                            <Card className="p-4 bg-muted/20 border-border border-dashed">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-sm font-semibold uppercase text-muted-foreground">Reconciliation Status</h3>
                                    <span className="text-lg font-mono">
                                        Net Balance: {formatCurrency(stats.netOwnerBalance)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        (This is the formal accounting view of what you owe/are owed)
                                    </span>
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {/* Dividend Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <StatCard
                            title="Dividends Paid YTD"
                            value={formatCurrency(allDividends.filter((d: Dividend) => d.status === 'paid').reduce((sum: number, dividend: Dividend) => sum + dividend.amount, 0))}
                            icon={Check}
                            gradient="emerald"
                            accent="emerald"
                        />
                        <StatCard
                            title="Corporate Tax Est."
                            value={formatCurrency(stats.smallBusinessTaxOwed)}
                            icon={Calculator}
                            gradient="red"
                            accent="default"
                        />
                    </div>
                </div>
            </motion.div>

            {/* Tax & Compliance Section */}
            <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="space-y-6 opacity-60 hover:opacity-100 transition-opacity"
            >
                <h2 className="text-xl font-semibold tracking-tight text-foreground border-b border-border pb-3">Compliance & Assets</h2>

                <motion.div
                    variants={staggerContainer}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
                >
                    <motion.div variants={staggerItem}>
                        <StatCard
                            title="Input Tax Credits"
                            value={formatCurrency(stats.inputTaxCredits)}
                            subtitle="HST on expenses"
                            icon={Percent}
                            gradient="cyan"
                            accent="default"
                        />
                    </motion.div>
                    <motion.div variants={staggerItem}>
                        <StatCard
                            title="Total Capital Assets"
                            value={stats.totalCapitalAssets.toString()}
                            subtitle={`Book Value: ${formatCurrency(stats.totalAssetBookValue)}`}
                            icon={Building2}
                            gradient="purple"
                            accent="default"
                        />
                    </motion.div>
                </motion.div>
            </motion.div>
        </div>
    );

};

export default Dashboard;
