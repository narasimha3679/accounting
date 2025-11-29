import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { useQuery } from '@tanstack/react-query';
import { Calendar, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Card from '../components/ui/Card';

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

    // Calculate date range based on time period
    const { startDate, endDate, fiscalYear } = useMemo(() => {
        let start: Date;
        let end: Date;

        if (timePeriod === 'month') {
            start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        } else {
            start = new Date(selectedDate.getFullYear(), 0, 1);
            end = new Date(selectedDate.getFullYear(), 11, 31);
        }

        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            fiscalYear: selectedDate.getFullYear(),
        };
    }, [timePeriod, selectedDate]);

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

    // Calculate tax data
    const taxData = useMemo(() => {
        if (!invoicesResponse || !expensesResponse || !incomeResponse || !hstPaymentsResponse || !capitalAssetsResponse) {
            return null;
        }

        const invoices = invoicesResponse.data;
        const expenses = expensesResponse.data;
        const incomeEntries = incomeResponse.data;
        const hstPayments = hstPaymentsResponse.data;
        const capitalAssets = capitalAssetsResponse.data;

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

        // Calculate Total Expenses
        const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

        // Calculate Depreciation (CCA) for the fiscal year
        const depreciationEntries = capitalAssets
            .flatMap(asset => asset.depreciation_entries || [])
            .filter(entry => entry.fiscal_year === fiscalYear);
        const totalDepreciation = depreciationEntries.reduce((sum, entry) => sum + entry.depreciation_amount, 0);

        // Calculate Taxable Income
        const taxableIncome = Math.max(0, grossRevenue + otherIncome - totalExpenses - totalDepreciation);

        // Calculate Corporate Tax
        const smallBusinessTaxRate = user?.company?.small_business_rate || 0.125;
        const corporateTaxOwed = taxableIncome * smallBusinessTaxRate;

        // Calculate Total Taxes Owed
        const totalTaxesOwed = hstOwed + corporateTaxOwed;

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
            
            // Income Tax Data
            grossRevenue,
            invoiceRevenue,
            clientIncome,
            otherIncome,
            totalExpenses,
            totalDepreciation,
            taxableIncome,
            smallBusinessTaxRate,
            corporateTaxOwed,
            filteredExpenses,
            depreciationEntries,
            capitalAssetsWithDepreciation: capitalAssets.filter(asset => 
                asset.depreciation_entries?.some(entry => entry.fiscal_year === fiscalYear)
            ),
            
            // Summary
            totalTaxesOwed,
        };
    }, [invoicesResponse, expensesResponse, incomeResponse, hstPaymentsResponse, capitalAssetsResponse, startDate, endDate, fiscalYear, user?.company]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-CA');
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h1 className="heading-1">Tax Calculator</h1>
                    <p className="text-gray-600 mt-2">Calculate taxes owed to CRA for Ontario small corporations</p>
                </div>

                {/* Time Period Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <div className="flex rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setTimePeriod('month')}
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
                            onClick={() => setTimePeriod('year')}
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

            {/* Total Taxes Owed Summary */}
            <Card gradient={taxData.totalTaxesOwed > 0 ? 'red' : 'green'} className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Total Taxes Owed to CRA</h2>
                        <p className="text-sm text-gray-600">
                            {timePeriod === 'month' 
                                ? `For ${selectedDate.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}`
                                : `For fiscal year ${fiscalYear}`
                            }
                        </p>
                    </div>
                    <div className="text-right">
                        <div className={`text-4xl font-bold ${taxData.totalTaxesOwed > 0 ? 'text-red-800' : 'text-green-800'}`}>
                            {formatCurrency(taxData.totalTaxesOwed)}
                        </div>
                        {taxData.totalTaxesOwed < 0 && (
                            <p className="text-sm text-green-600 mt-1">Refund/Credit</p>
                        )}
                    </div>
                </div>
            </Card>

            {/* HST Remittance Section */}
            <div className="space-y-4">
                <Card gradient="orange" className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">HST Remittance</h2>
                        <button
                            onClick={() => toggleSection('hst')}
                            className="text-gray-600 hover:text-gray-900"
                        >
                            {expandedSections.hst ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-white rounded-lg p-4 border border-orange-200">
                            <div className="text-sm text-gray-600 mb-1">HST Collected</div>
                            <div className="text-2xl font-bold text-gray-900">{formatCurrency(taxData.hstCollected)}</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-orange-200">
                            <div className="text-sm text-gray-600 mb-1">HST Input Tax Credits</div>
                            <div className="text-2xl font-bold text-green-600">
                                {taxData.isHSTRegistered ? formatCurrency(taxData.hstInputTaxCredits) : '$0.00 (Not HST Registered)'}
                            </div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-orange-200">
                            <div className="text-sm text-gray-600 mb-1">HST Already Paid to CRA</div>
                            <div className="text-2xl font-bold text-blue-600">{formatCurrency(taxData.hstAlreadyPaid)}</div>
                        </div>
                        <div className={`bg-white rounded-lg p-4 border-2 ${taxData.hstOwed > 0 ? 'border-red-300' : 'border-green-300'}`}>
                            <div className="text-sm text-gray-600 mb-1">Net HST Owed</div>
                            <div className={`text-2xl font-bold ${taxData.hstOwed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(taxData.hstOwed)}
                            </div>
                        </div>
                    </div>

                    {expandedSections.hst && (
                        <div className="mt-4 space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">HST Collected Breakdown</h3>
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm text-gray-600">From Invoices ({taxData.paidInvoices.length} invoices)</span>
                                        <span className="text-sm font-medium">{formatCurrency(taxData.hstFromInvoices)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">From Client Income ({taxData.clientIncomeEntries.length} entries)</span>
                                        <span className="text-sm font-medium">{formatCurrency(taxData.hstFromClientIncome)}</span>
                                    </div>
                                </div>
                            </div>

                            {taxData.paidInvoices.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Paid Invoices</h3>
                                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">HST</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {taxData.paidInvoices.map((invoice) => (
                                                    <tr key={invoice.id}>
                                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{invoice.invoice_number}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(invoice.issue_date)}</td>
                                                        <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(invoice.subtotal)}</td>
                                                        <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(invoice.hst_amount)}</td>
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
                <Card gradient="blue" className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Corporate Income Tax</h2>
                        <button
                            onClick={() => toggleSection('income')}
                            className="text-gray-600 hover:text-gray-900"
                        >
                            {expandedSections.income ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                            <div className="text-sm text-gray-600 mb-1">Gross Revenue</div>
                            <div className="text-2xl font-bold text-gray-900">{formatCurrency(taxData.grossRevenue)}</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                                <div className="text-sm text-gray-600 mb-1">Other Income</div>
                                <div className="text-xl font-bold text-gray-900">{formatCurrency(taxData.otherIncome)}</div>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-red-200">
                                <div className="text-sm text-gray-600 mb-1">Total Expenses</div>
                                <div className="text-xl font-bold text-red-600">-{formatCurrency(taxData.totalExpenses)}</div>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-purple-200">
                                <div className="text-sm text-gray-600 mb-1">Depreciation (CCA)</div>
                                <div className="text-xl font-bold text-purple-600">-{formatCurrency(taxData.totalDepreciation)}</div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-300">
                            <div className="flex justify-between items-center mb-2">
                                <div className="text-sm text-gray-600">Taxable Income</div>
                                <div className="text-sm text-gray-600">Tax Rate: {formatPercentage(taxData.smallBusinessTaxRate)}</div>
                            </div>
                            <div className="text-2xl font-bold text-blue-900">{formatCurrency(taxData.taxableIncome)}</div>
                        </div>

                        <div className={`bg-white rounded-lg p-4 border-2 ${taxData.corporateTaxOwed > 0 ? 'border-red-300' : 'border-green-300'}`}>
                            <div className="text-sm text-gray-600 mb-1">Corporate Income Tax Owed</div>
                            <div className={`text-3xl font-bold ${taxData.corporateTaxOwed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(taxData.corporateTaxOwed)}
                            </div>
                        </div>
                    </div>

                    {expandedSections.income && (
                        <div className="mt-4 space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Revenue Breakdown</h3>
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm text-gray-600">Invoice Revenue ({taxData.paidInvoices.length} invoices)</span>
                                        <span className="text-sm font-medium">{formatCurrency(taxData.invoiceRevenue)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Client Income ({taxData.clientIncomeEntries.length} entries)</span>
                                        <span className="text-sm font-medium">{formatCurrency(taxData.clientIncome)}</span>
                                    </div>
                                </div>
                            </div>

                            {taxData.filteredExpenses.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Expenses ({taxData.filteredExpenses.length} items)</h3>
                                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden max-h-64 overflow-y-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {taxData.filteredExpenses.map((expense) => (
                                                    <tr key={expense.id}>
                                                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(expense.expense_date)}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-900">{expense.description}</td>
                                                        <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(expense.amount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {taxData.depreciationEntries.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Depreciation (CCA) for {fiscalYear}</h3>
                                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CCA Class</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Depreciation</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {taxData.depreciationEntries.map((entry) => {
                                                    const asset = taxData.capitalAssetsWithDepreciation.find(a => 
                                                        a.depreciation_entries?.some(e => e.id === entry.id)
                                                    );
                                                    return (
                                                        <tr key={entry.id}>
                                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                                {asset?.description || 'Unknown Asset'}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                                Class {asset?.cca_class || 'N/A'} ({(asset?.cca_rate || 0) * 100}%)
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-right text-gray-900">
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
                </Card>
            </div>

            {/* Information Card */}
            <Card gradient="none" className="p-6 border-2 border-blue-200">
                <div className="flex items-start">
                    <AlertCircle className="h-6 w-6 text-blue-600 mr-3 mt-0.5" />
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Important Notes</h3>
                        <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
                            <li>HST Input Tax Credits (ITCs) are only available if your company is HST registered.</li>
                            <li>Capital contributions are not included in taxable income.</li>
                            <li>Depreciation (CCA) reduces taxable income and is calculated based on fiscal year.</li>
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

