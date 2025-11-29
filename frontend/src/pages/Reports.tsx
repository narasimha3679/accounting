import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type Invoice, type Expense, type Dividend } from '../lib/api';
import { Calendar, TrendingUp, DollarSign, Receipt, FileText, FileSpreadsheet } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

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

    if (!user?.company_id) {
        return (
            <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Reports</h1>
                <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                        Reports require a company to be configured. Please go to the{' '}
                        <span className="font-semibold">Settings</span> page to set up your company details.
                    </p>
                </Card>
            </div>
        );
    }

    if (!reportData) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Reports</h1>
                    <p className="text-muted-foreground mt-2">Generate financial reports for your business and tax submission</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                        onClick={generateReport}
                        variant="outline"
                        icon={FileText}
                    >
                        Download TXT
                    </Button>
                    <Button
                        onClick={generatePDFReport}
                        disabled={isGeneratingPDF}
                        icon={isGeneratingPDF ? undefined : FileSpreadsheet}
                    >
                        {isGeneratingPDF && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        )}
                        {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
                    </Button>
                </div>
            </div>

            {/* Report Controls */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <label className="text-sm font-medium text-foreground">Year:</label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="flex h-10 w-auto rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-foreground">Report Type:</label>
                        <select
                            value={selectedReport}
                            onChange={(e) => setSelectedReport(e.target.value as 'pl' | 'hst' | 'retained' | 'comprehensive')}
                            className="flex h-10 w-auto rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value="pl">Profit & Loss</option>
                            <option value="hst">HST Report</option>
                            <option value="retained">Retained Earnings</option>
                            <option value="comprehensive">Comprehensive Tax Report</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Comprehensive Tax Report Info */}
            {selectedReport === 'comprehensive' && (
                <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                        <FileSpreadsheet className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                        <div>
                            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">Comprehensive Tax Report</h3>
                            <p className="text-blue-800 dark:text-blue-300 mb-3">
                                This comprehensive report includes all financial data needed for tax submission to your accountant:
                            </p>
                            <ul className="text-blue-800 dark:text-blue-300 text-sm space-y-1 ml-4">
                                <li>• Complete Profit & Loss Statement</li>
                                <li>• Detailed HST Summary with monthly breakdown</li>
                                <li>• Capital Assets and Depreciation (CCA)</li>
                                <li>• Dividend distributions</li>
                                <li>• Retained earnings calculation</li>
                                <li>• All supporting transaction details</li>
                            </ul>
                            <p className="text-blue-800 dark:text-blue-300 text-sm mt-3 font-medium">
                                Perfect for providing to your tax accountant - includes everything they need to complete your tax return.
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Report Summary */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Profit & Loss Summary */}
                <Card className="p-6">
                    <div className="flex items-center mb-4">
                        <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400 mr-2" />
                        <h3 className="text-lg font-medium text-foreground">Profit & Loss</h3>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Gross Income:</span>
                            <span className="font-medium text-foreground">{formatCurrency(reportData.grossIncome)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total Expenses:</span>
                            <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(reportData.totalExpenses)}</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-2">
                            <span className="text-sm font-medium text-foreground">Net Income (Pre-tax):</span>
                            <span className={`font-bold ${reportData.netIncomeBeforeTax >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {formatCurrency(reportData.netIncomeBeforeTax)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Small Business Tax:</span>
                            <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(reportData.smallBusinessTax)}</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-2">
                            <span className="text-sm font-bold text-foreground">Net Income (Post-tax):</span>
                            <span className={`font-bold text-lg ${reportData.netIncomeAfterTax >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {formatCurrency(reportData.netIncomeAfterTax)}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* HST Summary */}
                <Card className="p-6">
                    <div className="flex items-center mb-4">
                        <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
                        <h3 className="text-lg font-medium text-foreground">HST Summary</h3>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">HST Collected:</span>
                            <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(reportData.hstCollected)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">HST Paid:</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">{formatCurrency(reportData.hstPaid)}</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-2">
                            <span className="text-sm font-bold text-foreground">HST Remittance:</span>
                            <span className={`font-bold text-lg ${reportData.hstRemittance >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                {formatCurrency(reportData.hstRemittance)}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* Retained Earnings Summary */}
                <Card className="p-6">
                    <div className="flex items-center mb-4">
                        <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400 mr-2" />
                        <h3 className="text-lg font-medium text-foreground">Retained Earnings</h3>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Net Income (Post-tax):</span>
                            <span className="font-medium text-foreground">{formatCurrency(reportData.netIncomeAfterTax)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Dividends Paid:</span>
                            <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(reportData.totalDividends)}</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-2">
                            <span className="text-sm font-bold text-foreground">Retained Earnings:</span>
                            <span className={`font-bold text-lg ${reportData.retainedEarnings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {formatCurrency(reportData.retainedEarnings)}
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Detailed Tables */}
            {selectedReport === 'pl' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Card className="overflow-hidden">
                        <div className="p-6 border-b border-border">
                            <h3 className="text-lg font-medium text-foreground">Recent Invoices</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                                    <tr>
                                        <th className="px-6 py-3">Invoice #</th>
                                        <th className="px-6 py-3">Client</th>
                                        <th className="px-6 py-3">Amount</th>
                                        <th className="px-6 py-3">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {reportData.paidInvoices.slice(0, 10).map((invoice) => (
                                        <tr key={invoice.id} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-foreground">{invoice.invoice_number}</td>
                                            <td className="px-6 py-4 text-muted-foreground">{invoice.client?.name || 'Unknown'}</td>
                                            <td className="px-6 py-4 text-foreground">{formatCurrency(invoice.subtotal)}</td>
                                            <td className="px-6 py-4 text-muted-foreground">{formatDate(invoice.issue_date)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card className="overflow-hidden">
                        <div className="p-6 border-b border-border">
                            <h3 className="text-lg font-medium text-foreground">Recent Expenses</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                                    <tr>
                                        <th className="px-6 py-3">Description</th>
                                        <th className="px-6 py-3">Category</th>
                                        <th className="px-6 py-3">Amount</th>
                                        <th className="px-6 py-3">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {reportData.expenses.slice(0, 10).map((expense) => (
                                        <tr key={expense.id} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-foreground">{expense.description}</td>
                                            <td className="px-6 py-4 text-muted-foreground">{expense.category?.name || 'Uncategorized'}</td>
                                            <td className="px-6 py-4 text-foreground">{formatCurrency(expense.amount)}</td>
                                            <td className="px-6 py-4 text-muted-foreground">{formatDate(expense.expense_date)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default Reports;
