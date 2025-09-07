import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type Invoice, type Expense, type Dividend } from '../lib/api';
import { Calendar, TrendingUp, DollarSign, Receipt, FileText, FileSpreadsheet } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const Reports: React.FC = () => {
    const { user } = useAuth();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedReport, setSelectedReport] = useState<'pl' | 'hst' | 'retained' | 'comprehensive'>('pl');
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    // Fetch tax return data for the selected year
    const { data: _taxReturn } = useQuery({
        queryKey: ['tax_return', user?.company_id, selectedYear],
        queryFn: async () => {
            try {
                const result = await api.getTaxReturns({
                    company_id: user?.company_id,
                    fiscal_year: selectedYear,
                    limit: 1
                });
                return result.data[0] || null;
            } catch (error) {
                return null;
            }
        },
        enabled: !!user?.company_id,
    });

    // Fetch invoices for the selected year
    const { data: invoices } = useQuery({
        queryKey: ['invoices_report', user?.company_id, selectedYear],
        queryFn: async () => {
            const result = await api.getInvoices({
                company_id: user?.company_id,
                limit: 1000
            });
            // Filter by year on the client side
            return result.data.filter(invoice => {
                const year = new Date(invoice.issue_date).getFullYear();
                return year === selectedYear;
            });
        },
        enabled: !!user?.company_id,
    });

    // Fetch expenses for the selected year
    const { data: expenses } = useQuery({
        queryKey: ['expenses_report', user?.company_id, selectedYear],
        queryFn: async () => {
            const result = await api.getExpenses({
                company_id: user?.company_id,
                limit: 1000
            });
            // Filter by year on the client side
            return result.data.filter(expense => {
                const year = new Date(expense.expense_date).getFullYear();
                return year === selectedYear;
            });
        },
        enabled: !!user?.company_id,
    });

    // Fetch dividends for the selected year
    const { data: dividends } = useQuery({
        queryKey: ['dividends_report', user?.company_id, selectedYear],
        queryFn: async () => {
            const result = await api.getDividends({
                company_id: user?.company_id,
                limit: 1000
            });
            // Filter by year on the client side
            return result.data.filter(dividend => {
                const year = new Date(dividend.declaration_date).getFullYear();
                return year === selectedYear;
            });
        },
        enabled: !!user?.company_id,
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-CA');
    };

    // Calculate report data
    const reportData = React.useMemo(() => {
        if (!invoices || !expenses || !dividends) return null;

        const paidInvoices = invoices.filter(inv => inv.status === 'paid');
        const grossIncome = paidInvoices.reduce((sum, inv) => sum + inv.subtotal, 0);
        const hstCollected = paidInvoices.reduce((sum, inv) => sum + inv.hst_amount, 0);

        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const hstPaid = expenses.reduce((sum, exp) => sum + exp.hst_paid, 0);

        const totalDividends = dividends.reduce((sum, div) => sum + div.amount, 0);

        const netIncomeBeforeTax = grossIncome - totalExpenses;
        const smallBusinessTaxRate = user?.company?.small_business_rate || 0.125; // Use company rate, fallback to 12.5%
        const smallBusinessTax = Math.max(0, netIncomeBeforeTax * smallBusinessTaxRate);
        const netIncomeAfterTax = netIncomeBeforeTax - smallBusinessTax;
        const hstRemittance = hstCollected - hstPaid;
        const retainedEarnings = netIncomeAfterTax - totalDividends;

        return {
            grossIncome,
            totalExpenses,
            netIncomeBeforeTax,
            smallBusinessTax,
            netIncomeAfterTax,
            hstCollected,
            hstPaid,
            hstRemittance,
            totalDividends,
            retainedEarnings,
            paidInvoices,
            expenses,
            dividends,
        };
    }, [invoices, expenses, dividends]);

    const generateReport = () => {
        if (!reportData) return;

        let reportContent = '';

        switch (selectedReport) {
            case 'pl':
                reportContent = generatePandLReport(reportData);
                break;
            case 'hst':
                reportContent = generateHSTReport(reportData);
                break;
            case 'retained':
                reportContent = generateRetainedEarningsReport(reportData);
                break;
        }

        // Create and download the report
        const blob = new Blob([reportContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedReport.toUpperCase()}_Report_${selectedYear}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const generatePDFReport = async () => {
        if (!user?.company_id) return;

        setIsGeneratingPDF(true);
        try {
            const blob = await api.generateTaxReport({
                company_id: user.company_id,
                fiscal_year: selectedYear,
                report_type: selectedReport === 'pl' ? 'pandl' : selectedReport === 'hst' ? 'hst' : selectedReport === 'retained' ? 'retained' : 'comprehensive'
            });

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${selectedReport.toUpperCase()}_Tax_Report_${selectedYear}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to generate PDF report:', error);
            alert('Failed to generate PDF report. Please try again.');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const generatePandLReport = (data: any) => {
        return `
PROFIT & LOSS STATEMENT
${user?.company_id ? 'Company: ' + user.company_id : ''}
Year: ${selectedYear}
Generated: ${new Date().toLocaleDateString('en-CA')}

INCOME
Gross Revenue: ${formatCurrency(data.grossIncome)}

EXPENSES
Total Business Expenses: ${formatCurrency(data.totalExpenses)}

NET INCOME BEFORE TAX
${formatCurrency(data.netIncomeBeforeTax)}

TAXES
Small Business Tax (12.5%): ${formatCurrency(data.smallBusinessTax)}

NET INCOME AFTER TAX
${formatCurrency(data.netIncomeAfterTax)}

DIVIDENDS PAID
Total Dividends: ${formatCurrency(data.totalDividends)}

RETAINED EARNINGS
${formatCurrency(data.retainedEarnings)}

DETAILED INCOME BREAKDOWN
${data.paidInvoices.map((inv: Invoice) =>
            `${inv.invoice_number} - ${inv.client?.name || 'Unknown'} - ${formatCurrency(inv.subtotal)}`
        ).join('\n')}

DETAILED EXPENSE BREAKDOWN
${data.expenses.map((exp: Expense) =>
            `${formatDate(exp.expense_date)} - ${exp.description} - ${formatCurrency(exp.amount)}`
        ).join('\n')}
`;
    };

    const generateHSTReport = (data: any) => {
        return `
HST REPORT
${user?.company_id ? 'Company: ' + user.company_id : ''}
Year: ${selectedYear}
Generated: ${new Date().toLocaleDateString('en-CA')}

HST COLLECTED
Total HST Collected: ${formatCurrency(data.hstCollected)}

HST PAID (INPUT TAX CREDITS)
Total HST Paid: ${formatCurrency(data.hstPaid)}

HST REMITTANCE
Amount Owed to CRA: ${formatCurrency(data.hstRemittance)}

MONTHLY BREAKDOWN
${generateMonthlyBreakdown(data.paidInvoices, data.expenses)}

DETAILED HST COLLECTED
${data.paidInvoices.map((inv: Invoice) =>
            `${inv.invoice_number} - ${formatDate(inv.issue_date)} - ${formatCurrency(inv.hst_amount)}`
        ).join('\n')}

DETAILED HST PAID
${data.expenses.map((exp: Expense) =>
            `${formatDate(exp.expense_date)} - ${exp.description} - ${formatCurrency(exp.hst_paid)}`
        ).join('\n')}
`;
    };

    const generateRetainedEarningsReport = (data: any) => {
        return `
RETAINED EARNINGS REPORT
${user?.company_id ? 'Company: ' + user.company_id : ''}
Year: ${selectedYear}
Generated: ${new Date().toLocaleDateString('en-CA')}

NET INCOME AFTER TAX
${formatCurrency(data.netIncomeAfterTax)}

DIVIDENDS DECLARED
${data.dividends.map((div: Dividend) =>
            `${formatDate(div.declaration_date)} - ${formatCurrency(div.amount)} - ${div.status}`
        ).join('\n')}

TOTAL DIVIDENDS PAID
${formatCurrency(data.totalDividends)}

RETAINED EARNINGS
${formatCurrency(data.retainedEarnings)}

AVAILABLE FOR DISTRIBUTION
${formatCurrency(data.retainedEarnings)}
`;
    };

    const generateMonthlyBreakdown = (invoices: Invoice[], expenses: Expense[]) => {
        const months = Array.from({ length: 12 }, (_, i) => i + 1);
        let breakdown = '';

        months.forEach(month => {
            const monthInvoices = invoices.filter(inv =>
                new Date(inv.issue_date).getMonth() + 1 === month
            );
            const monthExpenses = expenses.filter(exp =>
                new Date(exp.expense_date).getMonth() + 1 === month
            );

            const hstCollected = monthInvoices.reduce((sum, inv) => sum + inv.hst_amount, 0);
            const hstPaid = monthExpenses.reduce((sum, exp) => sum + exp.hst_paid, 0);

            breakdown += `${month.toString().padStart(2, '0')}/2024: Collected ${formatCurrency(hstCollected)}, Paid ${formatCurrency(hstPaid)}, Net ${formatCurrency(hstCollected - hstPaid)}\n`;
        });

        return breakdown;
    };

    if (!reportData) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
                    <p className="text-gray-600">Generate financial reports for your business and tax submission</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={generateReport}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <FileText className="h-4 w-4" />
                        Download TXT
                    </button>
                    <button
                        onClick={generatePDFReport}
                        disabled={isGeneratingPDF}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        {isGeneratingPDF ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                            <FileSpreadsheet className="h-4 w-4" />
                        )}
                        {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
                    </button>
                </div>
            </div>

            {/* Report Controls */}
            <div className="card">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <label className="text-sm font-medium text-gray-700">Year:</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="input w-auto"
                        >
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Report Type:</label>
                        <select
                            value={selectedReport}
                            onChange={(e) => setSelectedReport(e.target.value as 'pl' | 'hst' | 'retained' | 'comprehensive')}
                            className="input w-auto"
                        >
                            <option value="pl">Profit & Loss</option>
                            <option value="hst">HST Report</option>
                            <option value="retained">Retained Earnings</option>
                            <option value="comprehensive">Comprehensive Tax Report</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Comprehensive Tax Report Info */}
            {selectedReport === 'comprehensive' && (
                <div className="card bg-blue-50 border-blue-200">
                    <div className="flex items-start gap-3">
                        <FileSpreadsheet className="h-6 w-6 text-blue-600 mt-1" />
                        <div>
                            <h3 className="text-lg font-semibold text-blue-900 mb-2">Comprehensive Tax Report</h3>
                            <p className="text-blue-800 mb-3">
                                This comprehensive report includes all financial data needed for tax submission to your accountant:
                            </p>
                            <ul className="text-blue-800 text-sm space-y-1 ml-4">
                                <li>• Complete Profit & Loss Statement</li>
                                <li>• Detailed HST Summary with monthly breakdown</li>
                                <li>• Capital Assets and Depreciation (CCA)</li>
                                <li>• Dividend distributions</li>
                                <li>• Retained earnings calculation</li>
                                <li>• All supporting transaction details</li>
                            </ul>
                            <p className="text-blue-800 text-sm mt-3 font-medium">
                                Perfect for providing to your tax accountant - includes everything they need to complete your tax return.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Summary */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Profit & Loss Summary */}
                <div className="card">
                    <div className="flex items-center mb-4">
                        <TrendingUp className="h-6 w-6 text-green-600 mr-2" />
                        <h3 className="text-lg font-medium text-gray-900">Profit & Loss</h3>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Gross Income:</span>
                            <span className="font-medium">{formatCurrency(reportData.grossIncome)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Total Expenses:</span>
                            <span className="font-medium text-red-600">{formatCurrency(reportData.totalExpenses)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                            <span className="text-sm font-medium">Net Income (Pre-tax):</span>
                            <span className={`font-bold ${reportData.netIncomeBeforeTax >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(reportData.netIncomeBeforeTax)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Small Business Tax:</span>
                            <span className="font-medium text-red-600">{formatCurrency(reportData.smallBusinessTax)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                            <span className="text-sm font-bold">Net Income (Post-tax):</span>
                            <span className={`font-bold text-lg ${reportData.netIncomeAfterTax >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(reportData.netIncomeAfterTax)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* HST Summary */}
                <div className="card">
                    <div className="flex items-center mb-4">
                        <Receipt className="h-6 w-6 text-blue-600 mr-2" />
                        <h3 className="text-lg font-medium text-gray-900">HST Summary</h3>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">HST Collected:</span>
                            <span className="font-medium text-green-600">{formatCurrency(reportData.hstCollected)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">HST Paid:</span>
                            <span className="font-medium text-blue-600">{formatCurrency(reportData.hstPaid)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                            <span className="text-sm font-bold">HST Remittance:</span>
                            <span className={`font-bold text-lg ${reportData.hstRemittance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(reportData.hstRemittance)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Retained Earnings Summary */}
                <div className="card">
                    <div className="flex items-center mb-4">
                        <DollarSign className="h-6 w-6 text-purple-600 mr-2" />
                        <h3 className="text-lg font-medium text-gray-900">Retained Earnings</h3>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Net Income (Post-tax):</span>
                            <span className="font-medium">{formatCurrency(reportData.netIncomeAfterTax)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Dividends Paid:</span>
                            <span className="font-medium text-red-600">{formatCurrency(reportData.totalDividends)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                            <span className="text-sm font-bold">Retained Earnings:</span>
                            <span className={`font-bold text-lg ${reportData.retainedEarnings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(reportData.retainedEarnings)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Tables */}
            {selectedReport === 'pl' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="card">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Invoices</h3>
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Invoice #</th>
                                        <th>Client</th>
                                        <th>Amount</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.paidInvoices.slice(0, 10).map((invoice) => (
                                        <tr key={invoice.id}>
                                            <td className="font-medium">{invoice.invoice_number}</td>
                                            <td>{invoice.client?.name || 'Unknown'}</td>
                                            <td>{formatCurrency(invoice.subtotal)}</td>
                                            <td>{formatDate(invoice.issue_date)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Expenses</h3>
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th>Category</th>
                                        <th>Amount</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.expenses.slice(0, 10).map((expense) => (
                                        <tr key={expense.id}>
                                            <td className="font-medium">{expense.description}</td>
                                            <td>{expense.category?.name || 'Uncategorized'}</td>
                                            <td>{formatCurrency(expense.amount)}</td>
                                            <td>{formatDate(expense.expense_date)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
