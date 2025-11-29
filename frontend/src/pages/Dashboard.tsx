import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type Invoice, type Expense, type IncomeEntry, type HSTPayment, type Dividend, type CapitalAsset, type OwnerPayment } from '../lib/api';
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
    const [recentDividends, setRecentDividends] = useState<Dividend[]>([]);
    const [recentCapitalAssets, setRecentCapitalAssets] = useState<CapitalAsset[]>([]);
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
                ownerPaymentsResponse
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
            const netIncome = totalRevenue + otherIncome - totalExpenses;

            // Calculate owner reimbursement owed (expenses paid by owner that need to be reimbursed)
            const ownerExpenses = expenses.filter(expense => expense.paid_by === 'owner');
            const ownerReimbursementOwed = ownerExpenses
                .reduce((sum, expense) => sum + expense.amount + expense.hst_paid, 0);

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

            // Taxable income = Total Revenue + Other Income - Business Expenses
            const taxableIncome = totalRevenue + otherIncome - totalExpenses;
            const smallBusinessTaxOwed = Math.max(0, taxableIncome * smallBusinessTaxRate);

            // Tax paid through dividends (dividends are paid from after-tax income)
            const totalDividendsPaid = dividends.reduce((sum, dividend) => sum + dividend.amount, 0);
            const smallBusinessTaxPaid = totalDividendsPaid; // Dividends represent tax already paid

            // Net income after tax
            const netIncomeAfterTax = taxableIncome - smallBusinessTaxOwed;
            const availableDividends = Math.max(0, netIncomeAfterTax - totalDividendsPaid);

            // Tax deductible expenses (all business expenses reduce taxable income)
            const taxDeductibleExpenses = totalExpenses;

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

            // Recent dividends - already sorted by declaration_date descending from API
            setRecentDividends(dividends.slice(0, 5));

            // Recent capital assets - already sorted by purchase_date descending from API
            setRecentCapitalAssets(capitalAssets.slice(0, 5));

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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h1 className="heading-1">Dashboard</h1>
                    <p className="text-gray-600 mt-2">Welcome back, {user?.name}</p>
                </div>

                {/* Time Period Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <div className="flex rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => {
                                setTimePeriod('month');
                                updateDashboardPreference('timePeriod', 'month');
                            }}
                            className={`px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                                timePeriod === 'month'
                                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            Month
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setTimePeriod('year');
                                updateDashboardPreference('timePeriod', 'year');
                            }}
                            className={`px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                                timePeriod === 'year'
                                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            Year
                        </button>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5 text-gray-400" />
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
            </div>

            {/* Financial Overview Section */}
            <div className="space-y-6">
                <h2 className="heading-2 border-b-2 border-primary-200 pb-3">Financial Overview</h2>

                {/* Key Metrics Row */}
                <div className="grid-mobile-4">
                    <StatCard
                        title="Total Revenue"
                        value={formatCurrency(stats.totalRevenue)}
                        subtitle="From invoices & income"
                        icon={DollarSign}
                        gradient="green"
                    />
                    <StatCard
                        title="Total Expenses"
                        value={formatCurrency(stats.totalExpenses)}
                        subtitle="Business operations"
                        icon={Receipt}
                        gradient="red"
                    />
                    <StatCard
                        title="Net Income"
                        value={formatCurrency(stats.netIncome)}
                        subtitle="After expenses"
                        icon={TrendingUp}
                        gradient="blue"
                    />
                    <StatCard
                        title="Available Dividends"
                        value={formatCurrency(stats.availableDividends)}
                        subtitle="For distribution"
                        icon={Banknote}
                        gradient="purple"
                    />
                </div>

                {/* Owner Balance Section */}
                {(stats.ownerReimbursementOwed > 0 || stats.ownerPaymentsTotal > 0) && (
                    <Card
                        gradient={stats.netOwnerBalance > 0 ? 'orange' : stats.netOwnerBalance < 0 ? 'green' : 'none'}
                        className="p-6"
                    >
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                {stats.netOwnerBalance > 0 ? (
                                    <AlertCircle className="h-6 w-6 text-orange-500" />
                                ) : stats.netOwnerBalance < 0 ? (
                                    <Check className="h-6 w-6 text-green-500" />
                                ) : (
                                    <Banknote className="h-6 w-6 text-gray-500" />
                                )}
                            </div>
                            <div className="ml-4 flex-1">
                                <h3 className={`text-lg font-semibold mb-2 ${stats.netOwnerBalance > 0
                                    ? 'text-orange-900'
                                    : stats.netOwnerBalance < 0
                                        ? 'text-green-900'
                                        : 'text-gray-900'
                                    }`}>
                                    {stats.netOwnerBalance > 0
                                        ? 'Owner Reimbursement Required'
                                        : stats.netOwnerBalance < 0
                                            ? 'Owner Overpaid'
                                            : 'Owner Balance Settled'
                                    }
                                </h3>

                                {stats.netOwnerBalance > 0 && (
                                    <p className="text-orange-800 mb-4">
                                        The corporation owes the owner <span className="font-bold text-orange-900">{formatCurrency(stats.netOwnerBalance)}</span> for business expenses paid personally.
                                    </p>
                                )}

                                {stats.netOwnerBalance < 0 && (
                                    <p className="text-green-800 mb-4">
                                        The corporation has overpaid the owner by <span className="font-bold text-green-900">{formatCurrency(Math.abs(stats.netOwnerBalance))}</span>.
                                    </p>
                                )}

                                {stats.netOwnerBalance === 0 && stats.ownerReimbursementOwed > 0 && (
                                    <p className="text-gray-800 mb-4">
                                        Owner balance is settled. All reimbursements have been paid.
                                    </p>
                                )}

                                <div className="grid-mobile-3 mb-4">
                                    <div className="bg-orange-100 border border-orange-200 p-4 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-semibold text-orange-900">Owner Paid</div>
                                                <div className="text-2xl font-bold text-orange-800">{formatCurrency(stats.ownerReimbursementOwed)}</div>
                                                <div className="text-sm text-orange-600">{stats.ownerExpenseCount} expenses</div>
                                            </div>
                                            <div className="text-orange-500">
                                                <AlertCircle className="h-8 w-8" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-blue-100 border border-blue-200 p-4 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-semibold text-blue-900">Corp Paid Back</div>
                                                <div className="text-2xl font-bold text-blue-800">{formatCurrency(stats.ownerPaymentsTotal)}</div>
                                                <div className="text-sm text-blue-600">payments made</div>
                                            </div>
                                            <div className="text-blue-500">
                                                <Banknote className="h-8 w-8" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`border p-4 rounded-lg ${stats.netOwnerBalance > 0
                                        ? 'bg-orange-100 border-orange-200'
                                        : stats.netOwnerBalance < 0
                                            ? 'bg-green-100 border-green-200'
                                            : 'bg-gray-100 border-gray-200'
                                        }`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className={`font-semibold ${stats.netOwnerBalance > 0
                                                    ? 'text-orange-900'
                                                    : stats.netOwnerBalance < 0
                                                        ? 'text-green-900'
                                                        : 'text-gray-900'
                                                    }`}>Net Balance</div>
                                                <div className={`text-2xl font-bold ${stats.netOwnerBalance > 0
                                                    ? 'text-orange-800'
                                                    : stats.netOwnerBalance < 0
                                                        ? 'text-green-800'
                                                        : 'text-gray-800'
                                                    }`}>{formatCurrency(stats.netOwnerBalance)}</div>
                                                <div className={`text-sm ${stats.netOwnerBalance > 0
                                                    ? 'text-orange-600'
                                                    : stats.netOwnerBalance < 0
                                                        ? 'text-green-600'
                                                        : 'text-gray-600'
                                                    }`}>
                                                    {stats.netOwnerBalance > 0 ? 'owed to owner' : stats.netOwnerBalance < 0 ? 'overpaid' : 'settled'}
                                                </div>
                                            </div>
                                            <div className={`${stats.netOwnerBalance > 0
                                                ? 'text-orange-500'
                                                : stats.netOwnerBalance < 0
                                                    ? 'text-green-500'
                                                    : 'text-gray-500'
                                                }`}>
                                                {stats.netOwnerBalance > 0 ? (
                                                    <AlertCircle className="h-8 w-8" />
                                                ) : stats.netOwnerBalance < 0 ? (
                                                    <Check className="h-8 w-8" />
                                                ) : (
                                                    <Banknote className="h-8 w-8" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className={`border p-3 rounded-lg ${stats.netOwnerBalance > 0
                                    ? 'bg-orange-100 border-orange-200'
                                    : 'bg-gray-100 border-gray-200'
                                    }`}>
                                    <p className={`text-sm ${stats.netOwnerBalance > 0 ? 'text-orange-800' : 'text-gray-800'
                                        }`}>
                                        <strong>Note:</strong> Owner reimbursement includes both the expense amount and HST paid on owner-funded expenses.
                                        {stats.netOwnerBalance > 0 && ' This amount should be paid to the owner to reimburse their personal funds used for business expenses.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Dividend Summary */}
                <div className="grid-mobile-2">
                    <StatCard
                        title="Dividends Paid"
                        value={formatCurrency(allDividends.filter((d: Dividend) => d.status === 'paid').reduce((sum: number, dividend: Dividend) => sum + dividend.amount, 0))}
                        icon={Check}
                        gradient="emerald"
                    />
                    <StatCard
                        title="Declared (Unpaid)"
                        value={formatCurrency(allDividends.filter((d: Dividend) => d.status === 'declared').reduce((sum: number, dividend: Dividend) => sum + dividend.amount, 0))}
                        icon={AlertCircle}
                        gradient="amber"
                    />
                </div>
            </div>

            {/* Tax & Compliance Section */}
            <div className="space-y-6">
                <h2 className="heading-2 border-b-2 border-primary-200 pb-3">Tax & Compliance</h2>

                <div className="grid-mobile">
                    <StatCard
                        title="HST Owed"
                        value={formatCurrency(stats.hstOwed)}
                        subtitle="To CRA"
                        icon={AlertCircle}
                        gradient="orange"
                    />
                    <StatCard
                        title="HST Paid"
                        value={formatCurrency(stats.hstPaid)}
                        subtitle="To CRA"
                        icon={Check}
                        gradient="green"
                    />
                    {user?.company?.hst_registered && stats.inputTaxCredits > 0 && (
                        <StatCard
                            title="Input Tax Credits"
                            value={formatCurrency(stats.inputTaxCredits)}
                            subtitle="HST on expenses"
                            icon={Percent}
                            gradient="blue"
                        />
                    )}
                </div>
            </div>

            {/* Capital Assets Section */}
            {stats.totalCapitalAssets > 0 && (
                <div className="space-y-6">
                    <h2 className="heading-2 border-b-2 border-primary-200 pb-3">Capital Assets</h2>

                    <div className="grid-mobile-4">
                        <StatCard
                            title="Total Assets"
                            value={stats.totalCapitalAssets}
                            subtitle="Capital assets"
                            icon={Building2}
                            gradient="indigo"
                        />
                        <StatCard
                            title="Total Cost"
                            value={formatCurrency(stats.totalAssetCost)}
                            subtitle="Original cost"
                            icon={DollarSign}
                            gradient="cyan"
                        />
                        <StatCard
                            title="Depreciation"
                            value={formatCurrency(stats.totalAccumulatedDepreciation)}
                            subtitle="Accumulated"
                            icon={Calculator}
                            gradient="amber"
                        />
                        <StatCard
                            title="Book Value"
                            value={formatCurrency(stats.totalAssetBookValue)}
                            subtitle="Current value"
                            icon={TrendingUp}
                            gradient="emerald"
                        />
                    </div>
                </div>
            )}

            {/* Alerts & Notifications Section */}
            {(stats.outstandingInvoices > 0 || stats.overdueInvoices > 0) && (
                <div className="space-y-4">
                    <h2 className="heading-3 border-b border-gray-200 pb-2">Alerts & Notifications</h2>
                    <Card gradient="amber" className="p-6">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <AlertCircle className="h-6 w-6 text-amber-600" />
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-amber-900 mb-2">
                                    Invoice Alerts
                                </h3>
                                <div className="text-amber-800">
                                    <ul className="list-disc pl-5 space-y-1">
                                        {stats.outstandingInvoices > 0 && (
                                            <li><strong>{stats.outstandingInvoices}</strong> outstanding invoices need attention</li>
                                        )}
                                        {stats.overdueInvoices > 0 && (
                                            <li><strong>{stats.overdueInvoices}</strong> overdue invoices require immediate action</li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}


            {/* Recent Activity Section */}
            <div className="space-y-6">
                <h2 className="heading-2 border-b-2 border-primary-200 pb-3">Recent Activity</h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {/* Recent Invoices */}
                    <Card>
                        <div className="flex items-center mb-4">
                            <div className="bg-blue-100 p-2 rounded-lg mr-3">
                                <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
                        </div>
                        <div className="space-y-3">
                            {recentInvoices.map((invoice) => (
                                <div key={invoice.id} className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {invoice.invoice_number}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {invoice.client?.name || 'Unknown Client'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-900">
                                            {formatCurrency(invoice.total)}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {formatDate(invoice.issue_date)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Recent Expenses */}
                    <Card>
                        <div className="flex items-center mb-4">
                            <div className="bg-red-100 p-2 rounded-lg mr-3">
                                <Receipt className="h-5 w-5 text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Recent Expenses</h3>
                        </div>
                        <div className="space-y-3">
                            {recentExpenses.map((expense) => (
                                <div key={expense.id} className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {expense.description}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {expense.category?.name || 'Uncategorized'} • {expense.paid_by}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-900">
                                            {formatCurrency(expense.amount)}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {formatDate(expense.expense_date)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Recent Income Entries */}
                    <Card>
                        <div className="flex items-center mb-4">
                            <div className="bg-green-100 p-2 rounded-lg mr-3">
                                <DollarSign className="h-5 w-5 text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Recent Income Entries</h3>
                        </div>
                        <div className="space-y-3">
                            {recentIncomeEntries.map((entry) => (
                                <div key={entry.id} className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {entry.description}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {entry.income_type} {entry.client ? `• ${entry.client.name}` : ''}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-900">
                                            {formatCurrency(entry.amount)}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {formatDate(entry.income_date)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Recent HST Payments */}
                    <Card>
                        <div className="flex items-center mb-4">
                            <div className="bg-orange-100 p-2 rounded-lg mr-3">
                                <CreditCard className="h-5 w-5 text-orange-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Recent HST Payments</h3>
                        </div>
                        <div className="space-y-3">
                            {recentHSTPayments.map((payment) => (
                                <div key={payment.id} className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            HST Payment
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {payment.reference ? `Ref: ${payment.reference}` : 'No reference'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-900">
                                            {formatCurrency(payment.amount)}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {formatDate(payment.payment_date)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Recent Dividends */}
                    <Card>
                        <div className="flex items-center mb-4">
                            <div className="bg-purple-100 p-2 rounded-lg mr-3">
                                <Banknote className="h-5 w-5 text-purple-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Recent Dividends</h3>
                        </div>
                        <div className="space-y-3">
                            {recentDividends.map((dividend) => (
                                <div key={dividend.id} className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            Dividend Payment
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {dividend.status === 'paid' ? 'Paid' : 'Declared'} • {formatDate(dividend.declaration_date)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-900">
                                            {formatCurrency(dividend.amount)}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {dividend.payment_date ? formatDate(dividend.payment_date) : 'Not paid'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Recent Capital Assets */}
                    {stats.totalCapitalAssets > 0 && (
                        <Card>
                            <div className="flex items-center mb-4">
                                <div className="bg-indigo-100 p-2 rounded-lg mr-3">
                                    <Building2 className="h-5 w-5 text-indigo-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Recent Capital Assets</h3>
                            </div>
                            <div className="space-y-3">
                                {recentCapitalAssets.map((asset) => (
                                    <div key={asset.id} className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {asset.description}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                Class {asset.cca_class} • {(asset.cca_rate * 100).toFixed(1)}%
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-gray-900">
                                                {formatCurrency(asset.total_cost)}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {formatDate(asset.purchase_date)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
