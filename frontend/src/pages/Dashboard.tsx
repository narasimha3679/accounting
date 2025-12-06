import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import api, { type Invoice, type Expense, type IncomeEntry, type HSTPayment, type Dividend, type OwnerPayment, type Salary } from '../lib/api';
import { loadDashboardPreferences, updateDashboardPreference } from '../lib/preferences';
import {
    DollarSign,
    Receipt,
    TrendingUp,
    AlertCircle,
    Calendar,
    CreditCard,
    Check,
    Percent,
    Banknote,
    FileText,
    Building2,
    Calculator
} from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import { cn } from '../lib/utils';
import { staggerContainer, staggerItem } from '../lib/animations';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalExpenses: 0,
        netIncome: 0,
        outstandingInvoices: 0,
        overdueInvoices: 0,
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
    const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
    const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
    const [recentIncomeEntries, setRecentIncomeEntries] = useState<IncomeEntry[]>([]);
    const [recentHSTPayments, setRecentHSTPayments] = useState<HSTPayment[]>([]);
    const [allDividends, setAllDividends] = useState<Dividend[]>([]);
    const [, setOwnerPayments] = useState<OwnerPayment[]>([]);
    const [recentSalaries, setRecentSalaries] = useState<Salary[]>([]);
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

            // Calculate date range based on time period
            let startDate: Date;
            let endDate: Date;

            if (timePeriod === 'month') {
                startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
            } else {
                startDate = new Date(selectedDate.getFullYear(), 0, 1);
                endDate = new Date(selectedDate.getFullYear(), 11, 31);
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
                salariesResponse
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
                // Fetch capital assets (no date filtering needed - all assets)
                api.getCapitalAssets({
                    company_id: companyId,
                    limit: 1000
                }),
                // Fetch owner payments with date filtering
                api.getOwnerPayments({
                    company_id: companyId,
                    start_date: startDateStr,
                    end_date: endDateStr,
                    limit: 1000
                }),
                // Fetch salaries with date filtering
                api.getSalaries({
                    company_id: companyId,
                    start_date: startDateStr,
                    end_date: endDateStr,
                    limit: 1000
                })
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

            // Data is already filtered by date from the API
            const expenses = expensesResponse.data;
            const incomeEntries = incomeEntriesResponse.data;
            const hstPayments = hstPaymentsResponse.data;
            const dividends = dividendsResponse.data;
            const capitalAssets = capitalAssetsResponse.data;
            const ownerPayments = ownerPaymentsResponse.data;
            const salaries = salariesResponse.data;

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
            const totalSalaries = salaries.reduce((sum, salary) => sum + salary.amount, 0);
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
            const hstPaid = isHSTRegistered ? hstPaidToCRA : hstPaidFromExpenses + hstPaidToCRA;
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

            // Extract recent items from already-fetched data (sorted by date, take first 5)
            // Recent invoices - all invoices sorted by issue_date descending
            const sortedInvoices = [...allInvoices].sort((a, b) =>
                new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime()
            );
            setRecentInvoices(sortedInvoices.slice(0, 5));

            // Recent expenses - already sorted by expense_date descending from API
            setRecentExpenses(expenses.slice(0, 5));

            // Recent income entries - already sorted by income_date descending from API
            setRecentIncomeEntries(incomeEntries.slice(0, 5));

            // Recent HST payments - already sorted by payment_date descending from API
            setRecentHSTPayments(hstPayments.slice(0, 5));

            // Recent salaries - already sorted by payment_date descending from API
            setRecentSalaries(salaries.slice(0, 5));

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

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-CA');
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
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
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
                        <input
                            type={timePeriod === 'month' ? 'month' : 'number'}
                            value={timePeriod === 'month'
                                ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`
                                : selectedDate.getFullYear()
                            }
                            onChange={(e) => {
                                if (timePeriod === 'month') {
                                    const [year, month] = e.target.value.split('-');
                                    setSelectedDate(new Date(parseInt(year), parseInt(month) - 1, 1));
                                } else {
                                    setSelectedDate(new Date(parseInt(e.target.value), 0, 1));
                                }
                            }}
                            className="input"
                        />
                    </div>
                </div>
            </motion.div>

            {/* Financial Overview Section */}
            <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="space-y-6"
            >
                <h2 className="text-2xl font-semibold tracking-tight text-foreground border-b border-border pb-3">Financial Overview</h2>

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
                            title="Total Expenses"
                            value={formatCurrency(stats.totalExpenses)}
                            subtitle="Money spent on business"
                            icon={Receipt}
                            gradient="red"
                            accent="default"
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
                            title="Dividends Available to Pay"
                            value={formatCurrency(stats.availableDividends)}
                            subtitle="Available to pay to owners"
                            icon={Banknote}
                            gradient="amber"
                            accent="golden"
                        />
                    </motion.div>
                </motion.div>

                {/* Owner Balance Section */}
                {Math.abs(stats.netOwnerBalance) > 0.01 && (
                    <motion.div
                        variants={staggerItem}
                        className="relative"
                    >
                        <Card
                            glass={stats.netOwnerBalance > 0 ? 'golden' : stats.netOwnerBalance < 0 ? 'emerald' : 'default'}
                            className={cn(
                                "relative overflow-hidden",
                                stats.netOwnerBalance > 0 && "border-l-4 border-l-golden-hour glow-golden",
                                stats.netOwnerBalance < 0 && "border-l-4 border-l-neon-emerald glow-emerald"
                            )}
                            padding="lg"
                        >
                            {/* Decorative gradient overlay */}
                            <div className={cn(
                                "absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20 -z-0",
                                stats.netOwnerBalance > 0 ? "bg-golden-hour" :
                                    stats.netOwnerBalance < 0 ? "bg-neon-emerald" :
                                        "bg-white/10"
                            )} />

                            <div className="relative z-10">
                                {/* Header Section */}
                                <div className="flex items-start gap-4 mb-6">
                                    <div className={cn(
                                        "flex-shrink-0 p-3 rounded-xl border",
                                        stats.netOwnerBalance > 0 ? "bg-golden-hour/20 border-golden-hour/30" :
                                            stats.netOwnerBalance < 0 ? "bg-neon-emerald/20 border-neon-emerald/30" :
                                                "bg-muted/50 border-border"
                                    )}>
                                        {stats.netOwnerBalance > 0 ? (
                                            <AlertCircle className={cn("h-6 w-6", stats.netOwnerBalance > 0 ? "text-golden-hour" : "text-foreground")} />
                                        ) : stats.netOwnerBalance < 0 ? (
                                            <Check className="h-6 w-6 text-neon-emerald" />
                                        ) : (
                                            <Banknote className="h-6 w-6 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className={cn(
                                            "text-2xl font-bold tracking-tight mb-2",
                                            stats.netOwnerBalance > 0 ? 'text-golden-hour' :
                                                stats.netOwnerBalance < 0 ? 'text-neon-emerald' :
                                                    'text-foreground'
                                        )}>
                                            {stats.netOwnerBalance > 0
                                                ? 'Owner Reimbursement Required'
                                                : stats.netOwnerBalance < 0
                                                    ? 'Owner Overpaid'
                                                    : 'Owner Balance Settled'
                                            }
                                        </h3>
                                        {stats.netOwnerBalance > 0 && (
                                            <p className="text-muted-foreground text-base leading-relaxed">
                                                The corporation owes the owner <span className="font-bold text-foreground tabular-nums">{formatCurrency(stats.netOwnerBalance)}</span> for business expenses paid personally.
                                            </p>
                                        )}
                                        {stats.netOwnerBalance < 0 && (
                                            <p className="text-muted-foreground text-base leading-relaxed">
                                                The corporation has overpaid the owner by <span className="font-bold text-foreground tabular-nums">{formatCurrency(Math.abs(stats.netOwnerBalance))}</span>.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Metrics Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                    {/* Owner Paid Card */}
                                    <motion.div
                                        whileHover={{ scale: 1.02 }}
                                        transition={{ duration: 0.2 }}
                                        className={cn(
                                            "glass-golden border border-golden-hour/30 p-5 rounded-xl relative overflow-hidden"
                                        )}
                                    >
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-golden-hour/10 rounded-full blur-2xl -z-0" />
                                        <div className="relative z-10">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-sm font-semibold text-golden-hour uppercase tracking-wide">Owner Paid</span>
                                                <div className="p-2 rounded-lg bg-golden-hour/20 border border-golden-hour/30">
                                                    <AlertCircle className="h-5 w-5 text-golden-hour" />
                                                </div>
                                            </div>
                                            <div className="text-3xl font-bold text-foreground tabular-nums mb-1">
                                                {formatCurrency(stats.ownerReimbursementOwed)}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {stats.ownerExpenseCount} {stats.ownerExpenseCount === 1 ? 'expense' : 'expenses'}
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Corp Paid Back Card */}
                                    <motion.div
                                        whileHover={{ scale: 1.02 }}
                                        transition={{ duration: 0.2 }}
                                        className="glass border border-border p-5 rounded-xl relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-neon-emerald/10 rounded-full blur-2xl -z-0" />
                                        <div className="relative z-10">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-sm font-semibold text-foreground uppercase tracking-wide">Corp Paid Back</span>
                                                <div className="p-2 rounded-lg bg-neon-emerald/20 border border-neon-emerald/30">
                                                    <Banknote className="h-5 w-5 text-neon-emerald" />
                                                </div>
                                            </div>
                                            <div className="text-3xl font-bold text-foreground tabular-nums mb-1">
                                                {formatCurrency(stats.ownerPaymentsTotal)}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {stats.ownerPaymentsTotal > 0 ? 'payments made' : 'no payments yet'}
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Net Balance Card */}
                                    <motion.div
                                        whileHover={{ scale: 1.02 }}
                                        transition={{ duration: 0.2 }}
                                        className={cn(
                                            "border p-5 rounded-xl relative overflow-hidden",
                                            stats.netOwnerBalance > 0 ? 'glass-golden border-golden-hour/30' :
                                                stats.netOwnerBalance < 0 ? 'glass-emerald border-neon-emerald/30' :
                                                    'glass border-border'
                                        )}
                                    >
                                        <div className={cn(
                                            "absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -z-0",
                                            stats.netOwnerBalance > 0 ? "bg-golden-hour/20" :
                                                stats.netOwnerBalance < 0 ? "bg-neon-emerald/20" :
                                                    "bg-white/5"
                                        )} />
                                        <div className="relative z-10">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className={cn(
                                                    "text-sm font-semibold uppercase tracking-wide",
                                                    stats.netOwnerBalance > 0 ? 'text-golden-hour' :
                                                        stats.netOwnerBalance < 0 ? 'text-neon-emerald' :
                                                            'text-foreground'
                                                )}>
                                                    Net Balance
                                                </span>
                                                <div className={cn(
                                                    "p-2 rounded-lg border",
                                                    stats.netOwnerBalance > 0 ? 'bg-golden-hour/20 border-golden-hour/30' :
                                                        stats.netOwnerBalance < 0 ? 'bg-neon-emerald/20 border-neon-emerald/30' :
                                                            'bg-muted/50 border-border'
                                                )}>
                                                    {stats.netOwnerBalance > 0 ? (
                                                        <AlertCircle className={cn("h-5 w-5", stats.netOwnerBalance > 0 ? "text-golden-hour" : "text-foreground")} />
                                                    ) : stats.netOwnerBalance < 0 ? (
                                                        <Check className="h-5 w-5 text-neon-emerald" />
                                                    ) : (
                                                        <Banknote className="h-5 w-5 text-muted-foreground" />
                                                    )}
                                                </div>
                                            </div>
                                            <div className={cn(
                                                "text-3xl font-bold tabular-nums mb-1",
                                                stats.netOwnerBalance > 0 ? 'text-golden-hour' :
                                                    stats.netOwnerBalance < 0 ? 'text-neon-emerald' :
                                                        'text-foreground'
                                            )}>
                                                {formatCurrency(stats.netOwnerBalance)}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {stats.netOwnerBalance > 0 ? 'owed to owner' : stats.netOwnerBalance < 0 ? 'overpaid' : 'settled'}
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Info Note */}
                                <div className={cn(
                                    "glass border p-4 rounded-lg",
                                    stats.netOwnerBalance > 0 ? 'border-golden-hour/30 glass-golden' :
                                        'border-border'
                                )}>
                                    <p className={cn(
                                        "text-sm leading-relaxed",
                                        stats.netOwnerBalance > 0 ? 'text-golden-hour' : 'text-muted-foreground'
                                    )}>
                                        <strong className="text-foreground">Note:</strong> Owner reimbursement includes both the expense amount and HST paid on owner-funded expenses.
                                        {stats.netOwnerBalance > 0 && ' This amount should be paid to the owner to reimburse their personal funds used for business expenses.'}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Dividend Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <StatCard
                        title="Dividends Paid"
                        value={formatCurrency(allDividends.filter((d: Dividend) => d.status === 'paid').reduce((sum: number, dividend: Dividend) => sum + dividend.amount, 0))}
                        icon={Check}
                        gradient="emerald"
                        accent="emerald"
                    />
                    <StatCard
                        title="Announced (Not Paid Yet)"
                        value={formatCurrency(allDividends.filter((d: Dividend) => d.status === 'declared').reduce((sum: number, dividend: Dividend) => sum + dividend.amount, 0))}
                        icon={AlertCircle}
                        gradient="amber"
                        accent="golden"
                    />
                </div>
            </motion.div>

            {/* Tax & Compliance Section */}
            <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="space-y-6"
            >
                <h2 className="text-2xl font-semibold tracking-tight text-foreground border-b border-border pb-3">Tax & Compliance</h2>

                <motion.div
                    variants={staggerContainer}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
                >
                    <motion.div variants={staggerItem}>
                        <StatCard
                            title="HST Owed"
                            value={formatCurrency(stats.hstOwed)}
                            subtitle="To CRA"
                            icon={AlertCircle}
                            gradient="red"
                            accent="default"
                        />
                    </motion.div>
                    <motion.div variants={staggerItem}>
                        <StatCard
                            title="HST Paid"
                            value={formatCurrency(stats.hstPaid)}
                            subtitle="To CRA"
                            icon={Check}
                            gradient="emerald"
                            accent="emerald"
                        />
                    </motion.div>
                    {user?.company?.hst_registered && stats.inputTaxCredits > 0 && (
                        <motion.div variants={staggerItem}>
                            <StatCard
                                title="HST Credits from Expenses"
                                value={formatCurrency(stats.inputTaxCredits)}
                                subtitle="HST on expenses"
                                icon={Percent}
                                gradient="cyan"
                                accent="default"
                                helpText="HST you paid on business expenses that you can claim back as a credit against HST you collected. This reduces the amount of HST you owe to the government."
                            />
                        </motion.div>
                    )}
                </motion.div>
            </motion.div>

            {/* Capital Assets Section */}
            {stats.totalCapitalAssets > 0 && (
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={staggerContainer}
                    className="space-y-6"
                >
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground border-b border-border pb-3">Capital Assets</h2>

                    <motion.div
                        variants={staggerContainer}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
                    >
                        <motion.div variants={staggerItem}>
                            <StatCard
                                title="Total Assets"
                                value={stats.totalCapitalAssets}
                                subtitle="Capital assets"
                                icon={Building2}
                                gradient="cyan"
                                accent="default"
                            />
                        </motion.div>
                        <motion.div variants={staggerItem}>
                            <StatCard
                                title="Total Cost"
                                value={formatCurrency(stats.totalAssetCost)}
                                subtitle="Original cost"
                                icon={DollarSign}
                                gradient="amber"
                                accent="golden"
                            />
                        </motion.div>
                        <motion.div variants={staggerItem}>
                            <StatCard
                                title="Total Depreciation Taken"
                                value={formatCurrency(stats.totalAccumulatedDepreciation)}
                                subtitle="Accumulated"
                                icon={Calculator}
                                gradient="amber"
                                accent="default"
                                helpText="The total amount of depreciation claimed on all capital assets over time"
                            />
                        </motion.div>
                        <motion.div variants={staggerItem}>
                            <StatCard
                                title="Book Value"
                                value={formatCurrency(stats.totalAssetBookValue)}
                                subtitle="Current value"
                                icon={TrendingUp}
                                gradient="amber"
                                accent="golden"
                                helpText="The current value of an asset after subtracting depreciation"
                            />
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}

            {/* Alerts & Notifications Section */}
            {(stats.outstandingInvoices > 0 || stats.overdueInvoices > 0) && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-4"
                >
                    <h2 className="text-xl font-semibold tracking-tight text-foreground border-b border-border pb-2">Alerts & Notifications</h2>
                    <Card className="p-6 border-l-4 border-l-golden-hour glass-golden" padding="lg">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 p-3 rounded-xl bg-golden-hour/20 border border-golden-hour/30">
                                <AlertCircle className="h-6 w-6 text-golden-hour" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-golden-hour mb-3">
                                    Invoice Alerts
                                </h3>
                                <div className="text-muted-foreground">
                                    <ul className="list-disc pl-5 space-y-2">
                                        {stats.outstandingInvoices > 0 && (
                                            <li><strong className="text-foreground">{stats.outstandingInvoices}</strong> outstanding invoices need attention</li>
                                        )}
                                        {stats.overdueInvoices > 0 && (
                                            <li><strong className="text-foreground">{stats.overdueInvoices}</strong> overdue invoices require immediate action</li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            )}


            {/* Recent Activity Section */}
            <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="space-y-6"
            >
                <h2 className="text-2xl font-semibold tracking-tight text-foreground border-b border-border pb-3">Recent Activity</h2>
                <motion.div
                    variants={staggerContainer}
                    className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                    {/* Recent Invoices */}
                    <motion.div variants={staggerItem}>
                        <Card>
                            <div className="flex items-center mb-4">
                                <div className="bg-neon-emerald/20 border border-neon-emerald/30 p-2 rounded-lg mr-3">
                                    <FileText className="h-5 w-5 text-neon-emerald" />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground">Recent Invoices</h3>
                            </div>
                            <div className="space-y-3">
                                {recentInvoices.map((invoice) => (
                                    <div key={invoice.id} className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {invoice.invoice_number}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {invoice.client?.name || 'Unknown Client'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-foreground tabular-nums">
                                                {formatCurrency(invoice.total)}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(invoice.issue_date)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Recent Expenses */}
                    <motion.div variants={staggerItem}>
                        <Card>
                            <div className="flex items-center mb-4">
                                <div className="bg-red-500/20 border border-red-500/30 p-2 rounded-lg mr-3">
                                    <Receipt className="h-5 w-5 text-red-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground">Recent Expenses</h3>
                            </div>
                            <div className="space-y-3">
                                {recentExpenses.map((expense) => (
                                    <div key={expense.id} className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {expense.description}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {expense.category?.name || 'Uncategorized'} • {expense.paid_by}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-foreground tabular-nums">
                                                {formatCurrency(expense.amount)}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(expense.expense_date)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Recent Income Entries */}
                    <motion.div variants={staggerItem}>
                        <Card>
                            <div className="flex items-center mb-4">
                                <div className="bg-neon-emerald/20 border border-neon-emerald/30 p-2 rounded-lg mr-3">
                                    <DollarSign className="h-5 w-5 text-neon-emerald" />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground">Recent Income Entries</h3>
                            </div>
                            <div className="space-y-3">
                                {recentIncomeEntries.map((entry) => (
                                    <div key={entry.id} className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {entry.description}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {entry.income_type} {entry.client ? `• ${entry.client.name}` : ''}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-foreground tabular-nums">
                                                {formatCurrency(entry.amount)}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(entry.income_date)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Recent HST Payments */}
                    <motion.div variants={staggerItem}>
                        <Card>
                            <div className="flex items-center mb-4">
                                <div className="bg-neon-emerald/20 border border-neon-emerald/30 p-2 rounded-lg mr-3">
                                    <CreditCard className="h-5 w-5 text-neon-emerald" />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground">Recent HST Payments</h3>
                            </div>
                            <div className="space-y-3">
                                {recentHSTPayments.map((payment) => (
                                    <div key={payment.id} className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                HST Payment
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {payment.reference ? `Ref: ${payment.reference}` : 'No reference'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-foreground tabular-nums">
                                                {formatCurrency(payment.amount)}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(payment.payment_date)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Recent Salaries */}
                    <motion.div variants={staggerItem}>
                        <Card>
                            <div className="flex items-center mb-4">
                                <div className="bg-blue-500/20 border border-blue-500/30 p-2 rounded-lg mr-3">
                                    <DollarSign className="h-5 w-5 text-blue-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground">Recent Salaries</h3>
                            </div>
                            <div className="space-y-3">
                                {recentSalaries.map((salary) => (
                                    <div key={salary.id} className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {salary.employee_name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(salary.period_start)} - {formatDate(salary.period_end)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-foreground tabular-nums">
                                                {formatCurrency(salary.amount)}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(salary.payment_date)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default Dashboard;
