import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type Invoice, type Expense, type IncomeEntry, type HSTPayment, type Dividend, type CapitalAsset, type OwnerPayment } from '../lib/api';
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
    const [timePeriod, setTimePeriod] = useState<'month' | 'year'>('month');
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

            // Get paid invoices for selected period
            const paidInvoicesResponse = await api.getInvoices({
                company_id: companyId,
                status: 'paid',
                limit: 1000
            });
            const paidInvoices = paidInvoicesResponse.data.filter(invoice => {
                const invoiceDate = new Date(invoice.issue_date);
                return invoiceDate >= startDate && invoiceDate <= endDate;
            });

            // Get all expenses for selected period
            const expensesResponse = await api.getExpenses({
                company_id: companyId,
                limit: 1000
            });
            const expenses = expensesResponse.data.filter(expense => {
                const expenseDate = new Date(expense.expense_date);
                return expenseDate >= startDate && expenseDate <= endDate;
            });

            // Get outstanding invoices
            const outstandingInvoicesResponse = await api.getInvoices({
                company_id: companyId,
                status: 'sent',
                limit: 1000
            });
            const outstandingInvoices = outstandingInvoicesResponse.data;

            // Get overdue invoices
            const overdueInvoicesResponse = await api.getInvoices({
                company_id: companyId,
                status: 'overdue',
                limit: 1000
            });
            const overdueInvoices = overdueInvoicesResponse.data;

            // Get tax return for selected year
            const selectedYear = selectedDate.getFullYear();
            await api.getTaxReturns({
                company_id: companyId,
                fiscal_year: selectedYear,
                limit: 1
            });

            // Get income entries for selected period
            const incomeEntriesResponse = await api.getIncomeEntries({
                company_id: companyId,
                limit: 1000
            });
            const incomeEntries = incomeEntriesResponse.data.filter(entry => {
                const entryDate = new Date(entry.income_date);
                return entryDate >= startDate && entryDate <= endDate;
            });

            // Get HST payments for selected period
            const hstPaymentsResponse = await api.getHSTPayments({
                company_id: companyId,
                limit: 1000
            });
            const hstPayments = hstPaymentsResponse.data.filter(payment => {
                const paymentDate = new Date(payment.payment_date);
                return paymentDate >= startDate && paymentDate <= endDate;
            });

            // Get dividends for selected period
            const dividendsResponse = await api.getDividends({
                company_id: companyId,
                limit: 1000
            });
            const dividends = dividendsResponse.data.filter(dividend => {
                const dividendDate = new Date(dividend.declaration_date);
                return dividendDate >= startDate && dividendDate <= endDate;
            });

            // Get capital assets
            const capitalAssetsResponse = await api.getCapitalAssets({
                company_id: companyId,
                limit: 1000
            });
            const capitalAssets = capitalAssetsResponse.data;

            // Get owner payments
            const ownerPaymentsResponse = await api.getOwnerPayments({
                company_id: companyId,
                limit: 1000,
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0]
            });
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

            // Get recent invoices, expenses, income entries, and HST payments
            const recentInvoicesResponse = await api.getInvoices({
                company_id: companyId,
                limit: 5
            });

            const recentExpensesResponse = await api.getExpenses({
                company_id: companyId,
                limit: 5
            });

            const recentIncomeEntriesResponse = await api.getIncomeEntries({
                company_id: companyId,
                limit: 5
            });

            const recentHSTPaymentsResponse = await api.getHSTPayments({
                company_id: companyId,
                limit: 5
            });

            const recentDividendsResponse = await api.getDividends({
                company_id: companyId,
                limit: 5
            });

            const recentCapitalAssetsResponse = await api.getCapitalAssets({
                company_id: companyId,
                limit: 5
            });

            setRecentInvoices(recentInvoicesResponse.data);
            setRecentExpenses(recentExpensesResponse.data);
            setRecentIncomeEntries(recentIncomeEntriesResponse.data);
            setRecentHSTPayments(recentHSTPaymentsResponse.data);
            setRecentDividends(recentDividendsResponse.data);
            setRecentCapitalAssets(recentCapitalAssetsResponse.data);
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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-600">Welcome back, {user?.name}</p>
                </div>

                {/* Time Period Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <div className="flex rounded-md shadow-sm">
                        <button
                            type="button"
                            onClick={() => setTimePeriod('month')}
                            className={`px-3 py-2 text-sm font-medium border rounded-l-md ${timePeriod === 'month'
                                ? 'bg-primary-600 text-white border-primary-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            Month
                        </button>
                        <button
                            type="button"
                            onClick={() => setTimePeriod('year')}
                            className={`px-3 py-2 text-sm font-medium border rounded-r-md ${timePeriod === 'year'
                                ? 'bg-primary-600 text-white border-primary-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            Year
                        </button>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
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
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                </div>
            </div>

            {/* Financial Overview Section */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900 border-b-2 border-primary-200 pb-3">Financial Overview</h2>

                {/* Key Metrics Row */}
                <div className="grid-mobile-4">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-600 mb-1">Total Revenue</p>
                                <p className="text-2xl font-bold text-green-800">{formatCurrency(stats.totalRevenue)}</p>
                                <p className="text-xs text-green-600 mt-1">From invoices & income</p>
                            </div>
                            <div className="bg-green-200 p-3 rounded-full">
                                <DollarSign className="h-6 w-6 text-green-700" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-rose-100 border border-red-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-red-600 mb-1">Total Expenses</p>
                                <p className="text-2xl font-bold text-red-800">{formatCurrency(stats.totalExpenses)}</p>
                                <p className="text-xs text-red-600 mt-1">Business operations</p>
                            </div>
                            <div className="bg-red-200 p-3 rounded-full">
                                <Receipt className="h-6 w-6 text-red-700" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600 mb-1">Net Income</p>
                                <p className="text-2xl font-bold text-blue-800">{formatCurrency(stats.netIncome)}</p>
                                <p className="text-xs text-blue-600 mt-1">After expenses</p>
                            </div>
                            <div className="bg-blue-200 p-3 rounded-full">
                                <TrendingUp className="h-6 w-6 text-blue-700" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-violet-100 border border-purple-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-purple-600 mb-1">Available Dividends</p>
                                <p className="text-2xl font-bold text-purple-800">{formatCurrency(stats.availableDividends)}</p>
                                <p className="text-xs text-purple-600 mt-1">For distribution</p>
                            </div>
                            <div className="bg-purple-200 p-3 rounded-full">
                                <Banknote className="h-6 w-6 text-purple-700" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Owner Balance Section */}
                {(stats.ownerReimbursementOwed > 0 || stats.ownerPaymentsTotal > 0) && (
                    <div className={`bg-gradient-to-r border rounded-lg p-6 shadow-sm ${stats.netOwnerBalance > 0
                        ? 'from-orange-50 to-amber-50 border-orange-200'
                        : stats.netOwnerBalance < 0
                            ? 'from-green-50 to-emerald-50 border-green-200'
                            : 'from-gray-50 to-slate-50 border-gray-200'
                        }`}>
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
                    </div>
                )}

                {/* Dividend Summary */}
                <div className="grid-mobile-2">
                    <div className="bg-gradient-to-br from-emerald-50 to-green-100 border border-emerald-200 rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-emerald-600 mb-1">Dividends Paid</p>
                                <p className="text-xl font-bold text-emerald-800">
                                    {formatCurrency(allDividends.filter((d: Dividend) => d.status === 'paid').reduce((sum: number, dividend: Dividend) => sum + dividend.amount, 0))}
                                </p>
                            </div>
                            <div className="bg-emerald-200 p-3 rounded-full">
                                <Check className="h-5 w-5 text-emerald-700" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-yellow-100 border border-amber-200 rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-amber-600 mb-1">Declared (Unpaid)</p>
                                <p className="text-xl font-bold text-amber-800">
                                    {formatCurrency(allDividends.filter((d: Dividend) => d.status === 'declared').reduce((sum: number, dividend: Dividend) => sum + dividend.amount, 0))}
                                </p>
                            </div>
                            <div className="bg-amber-200 p-3 rounded-full">
                                <AlertCircle className="h-5 w-5 text-amber-700" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tax & Compliance Section */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900 border-b-2 border-primary-200 pb-3">Tax & Compliance</h2>

                <div className="grid-mobile">
                    <div className="bg-gradient-to-br from-orange-50 to-red-100 border border-orange-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-orange-600 mb-1">HST Owed</p>
                                <p className="text-2xl font-bold text-orange-800">{formatCurrency(stats.hstOwed)}</p>
                                <p className="text-xs text-orange-600 mt-1">To CRA</p>
                            </div>
                            <div className="bg-orange-200 p-3 rounded-full">
                                <AlertCircle className="h-6 w-6 text-orange-700" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-600 mb-1">HST Paid</p>
                                <p className="text-2xl font-bold text-green-800">{formatCurrency(stats.hstPaid)}</p>
                                <p className="text-xs text-green-600 mt-1">To CRA</p>
                            </div>
                            <div className="bg-green-200 p-3 rounded-full">
                                <Check className="h-6 w-6 text-green-700" />
                            </div>
                        </div>
                    </div>

                    {user?.company?.hst_registered && stats.inputTaxCredits > 0 && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-blue-600 mb-1">Input Tax Credits</p>
                                    <p className="text-2xl font-bold text-blue-800">{formatCurrency(stats.inputTaxCredits)}</p>
                                    <p className="text-xs text-blue-600 mt-1">HST on expenses</p>
                                </div>
                                <div className="bg-blue-200 p-3 rounded-full">
                                    <Percent className="h-6 w-6 text-blue-700" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Capital Assets Section */}
            {stats.totalCapitalAssets > 0 && (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900 border-b-2 border-primary-200 pb-3">Capital Assets</h2>

                    <div className="grid-mobile-4">
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-100 border border-indigo-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-indigo-600 mb-1">Total Assets</p>
                                    <p className="text-2xl font-bold text-indigo-800">{stats.totalCapitalAssets}</p>
                                    <p className="text-xs text-indigo-600 mt-1">Capital assets</p>
                                </div>
                                <div className="bg-indigo-200 p-3 rounded-full">
                                    <Building2 className="h-6 w-6 text-indigo-700" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-cyan-50 to-teal-100 border border-cyan-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-cyan-600 mb-1">Total Cost</p>
                                    <p className="text-2xl font-bold text-cyan-800">{formatCurrency(stats.totalAssetCost)}</p>
                                    <p className="text-xs text-cyan-600 mt-1">Original cost</p>
                                </div>
                                <div className="bg-cyan-200 p-3 rounded-full">
                                    <DollarSign className="h-6 w-6 text-cyan-700" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-amber-50 to-orange-100 border border-amber-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-amber-600 mb-1">Depreciation</p>
                                    <p className="text-2xl font-bold text-amber-800">{formatCurrency(stats.totalAccumulatedDepreciation)}</p>
                                    <p className="text-xs text-amber-600 mt-1">Accumulated</p>
                                </div>
                                <div className="bg-amber-200 p-3 rounded-full">
                                    <Calculator className="h-6 w-6 text-amber-700" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-50 to-green-100 border border-emerald-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-emerald-600 mb-1">Book Value</p>
                                    <p className="text-2xl font-bold text-emerald-800">{formatCurrency(stats.totalAssetBookValue)}</p>
                                    <p className="text-xs text-emerald-600 mt-1">Current value</p>
                                </div>
                                <div className="bg-emerald-200 p-3 rounded-full">
                                    <TrendingUp className="h-6 w-6 text-emerald-700" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Alerts & Notifications Section */}
            {(stats.outstandingInvoices > 0 || stats.overdueInvoices > 0) && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Alerts & Notifications</h2>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 shadow-sm">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <AlertCircle className="h-6 w-6 text-yellow-500" />
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                                    Invoice Alerts
                                </h3>
                                <div className="text-yellow-800">
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
                    </div>
                </div>
            )}


            {/* Recent Activity Section */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900 border-b-2 border-primary-200 pb-3">Recent Activity</h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {/* Recent Invoices */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
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
                    </div>

                    {/* Recent Expenses */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
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
                    </div>

                    {/* Recent Income Entries */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
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
                    </div>

                    {/* Recent HST Payments */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
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
                    </div>

                    {/* Recent Dividends */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
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
                    </div>

                    {/* Recent Capital Assets */}
                    {stats.totalCapitalAssets > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
