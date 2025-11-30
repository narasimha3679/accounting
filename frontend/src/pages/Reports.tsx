import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type Invoice, type Expense, type Dividend, type IncomeEntry, type OwnerPayment, type HSTPayment, type DepreciationEntry } from '../lib/api';
import { Calendar, TrendingUp, DollarSign, Receipt, FileText, FileSpreadsheet } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
    const { user } = useAuth();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
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

    // Fetch income entries for the selected year
    const { data: incomeEntries } = useQuery({
        queryKey: ['income_entries_report', user?.company_id, selectedYear],
        queryFn: async () => {
            const result = await api.getIncomeEntries({
                company_id: user?.company_id,
                limit: 1000
            });
            // Filter by year on the client side
            return result.data.filter(entry => {
                const year = new Date(entry.income_date).getFullYear();
                return year === selectedYear;
            });
        },
        enabled: !!user?.company_id,
    });

    // Fetch owner payments for the selected year
    const { data: ownerPayments } = useQuery({
        queryKey: ['owner_payments_report', user?.company_id, selectedYear],
        queryFn: async () => {
            const result = await api.getOwnerPayments({
                company_id: user?.company_id,
                limit: 1000
            });
            // Filter by year on the client side
            return result.data.filter(payment => {
                const year = new Date(payment.payment_date).getFullYear();
                return year === selectedYear;
            });
        },
        enabled: !!user?.company_id,
    });

    // Fetch HST payments for the selected year
    const { data: hstPayments } = useQuery({
        queryKey: ['hst_payments_report', user?.company_id, selectedYear],
        queryFn: async () => {
            const result = await api.getHSTPayments({
                company_id: user?.company_id,
                limit: 1000
            });
            // Filter by year on the client side
            return result.data.filter(payment => {
                const year = new Date(payment.payment_date).getFullYear();
                return year === selectedYear;
            });
        },
        enabled: !!user?.company_id,
    });

    // Fetch capital assets for the selected year
    const { data: capitalAssets } = useQuery({
        queryKey: ['capital_assets_report', user?.company_id, selectedYear],
        queryFn: async () => {
            const result = await api.getCapitalAssets({
                company_id: user?.company_id,
                limit: 1000
            });
            // Filter by purchase date within the selected year and include depreciation entries for the year
            return result.data.map(asset => {
                const purchaseYear = new Date(asset.purchase_date).getFullYear();
                const yearDepreciationEntries = asset.depreciation_entries?.filter(entry => entry.fiscal_year === selectedYear) || [];
                return {
                    ...asset,
                    depreciation_entries: asset.depreciation_entries || [],
                    yearDepreciationEntries,
                    isInYear: purchaseYear === selectedYear || yearDepreciationEntries.length > 0
                };
            }).filter(asset => asset.isInYear);
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
        if (!invoices || !expenses || !dividends || !incomeEntries || !ownerPayments || !hstPayments || !capitalAssets) return null;

        const paidInvoices = invoices.filter(inv => inv.status === 'paid');

        // Calculate revenue from invoices
        const invoiceRevenue = paidInvoices.reduce((sum, inv) => sum + inv.subtotal, 0);

        // Calculate revenue from client income entries
        const clientIncomeEntries = incomeEntries.filter(entry => entry.income_type === 'client');
        const clientIncome = clientIncomeEntries.reduce((sum, entry) => sum + entry.amount, 0);

        // Calculate other income (taxable income that's not from clients)
        const otherIncomeEntries = incomeEntries.filter(entry => entry.income_type === 'other');
        const otherIncome = otherIncomeEntries.reduce((sum, entry) => sum + entry.amount, 0);

        // Total gross income includes invoices, client income, and other income
        const grossIncome = invoiceRevenue + clientIncome + otherIncome;

        // Calculate HST collected from invoices
        const hstFromInvoices = paidInvoices.reduce((sum, inv) => sum + inv.hst_amount, 0);

        // Calculate HST collected from client income entries
        const hstFromClientIncome = clientIncomeEntries.reduce((sum, entry) => sum + entry.hst_amount, 0);

        // Total HST collected includes both invoices and client income entries
        const hstCollected = hstFromInvoices + hstFromClientIncome;

        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

        // Calculate HST paid from expenses (Input Tax Credits)
        const isHSTRegistered = user?.company?.hst_registered || false;
        const hstPaidFromExpenses = expenses.reduce((sum, exp) => sum + exp.hst_paid, 0);
        const hstInputTaxCredits = isHSTRegistered ? hstPaidFromExpenses : 0;

        // Calculate HST already paid to CRA
        const hstAlreadyPaid = hstPayments.reduce((sum, payment) => sum + payment.amount, 0);

        // Calculate HST remittance (what's owed after accounting for ITCs and payments made)
        const hstRemittance = hstCollected - hstInputTaxCredits - hstAlreadyPaid;

        const totalDividends = dividends.reduce((sum, div) => sum + div.amount, 0);

        // Calculate total owner payments
        const totalOwnerPayments = ownerPayments.reduce((sum, payment) => sum + payment.amount, 0);

        // Calculate capital assets and depreciation for the year
        const totalDepreciationForYear = capitalAssets.reduce((sum, asset: any) => {
            const yearDepreciation = asset.yearDepreciationEntries?.reduce((depSum: number, entry: DepreciationEntry) => depSum + Number(entry.depreciation_amount), 0) || 0;
            return sum + yearDepreciation;
        }, 0);

        const totalCapitalAssetCost = capitalAssets.reduce((sum, asset) => sum + Number(asset.total_cost), 0);
        const totalAccumulatedDepreciation = capitalAssets.reduce((sum, asset) => sum + Number(asset.accumulated_depreciation), 0);

        // Net income before tax should include depreciation as an expense
        const netIncomeBeforeTax = grossIncome - totalExpenses - totalDepreciationForYear;
        const smallBusinessTaxRate = user?.company?.small_business_rate || 0.125; // Use company rate, fallback to 12.5%
        const smallBusinessTax = Math.max(0, netIncomeBeforeTax * smallBusinessTaxRate);
        const netIncomeAfterTax = netIncomeBeforeTax - smallBusinessTax;

        // Retained earnings = Net Income After Tax - Dividends - Owner Payments
        const retainedEarnings = netIncomeAfterTax - totalDividends - totalOwnerPayments;

        return {
            grossIncome,
            invoiceRevenue,
            clientIncome,
            otherIncome,
            totalExpenses,
            totalDepreciationForYear,
            netIncomeBeforeTax,
            smallBusinessTax,
            netIncomeAfterTax,
            hstCollected,
            hstFromInvoices,
            hstFromClientIncome,
            hstPaidFromExpenses,
            hstInputTaxCredits,
            hstAlreadyPaid,
            hstRemittance,
            isHSTRegistered,
            totalDividends,
            totalOwnerPayments,
            retainedEarnings,
            paidInvoices,
            clientIncomeEntries,
            otherIncomeEntries,
            expenses,
            dividends,
            ownerPayments,
            hstPayments,
            capitalAssets,
            totalCapitalAssetCost,
            totalAccumulatedDepreciation,
        };
    }, [invoices, expenses, dividends, incomeEntries, ownerPayments, hstPayments, capitalAssets, user?.company?.small_business_rate, user?.company?.hst_registered]);

    const generateReport = () => {
        if (!reportData) return;

        const reportContent = generateComprehensiveReport(reportData);

        // Create and download the report
        const blob = new Blob([reportContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Comprehensive_Tax_Report_${selectedYear}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const generatePDFFromData = (data: NonNullable<typeof reportData>) => {
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        let yPosition = margin;

        // Helper function to add a new page if needed
        const checkPageBreak = (requiredHeight: number) => {
            if (yPosition + requiredHeight > pageHeight - margin) {
                pdf.addPage();
                yPosition = margin;
                return true;
            }
            return false;
        };

        // Helper function to add text with word wrap
        const addText = (text: string, fontSize: number, isBold = false, color: [number, number, number] = [0, 0, 0]) => {
            pdf.setFontSize(fontSize);
            pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
            pdf.setTextColor(color[0], color[1], color[2]);
            
            const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);
            lines.forEach((line: string) => {
                checkPageBreak(fontSize * 0.5);
                pdf.text(line, margin, yPosition);
                yPosition += fontSize * 0.5;
            });
            yPosition += 3;
        };

        // Header
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('COMPREHENSIVE TAX REPORT', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 10;

        // Company Information
        addText(`Company: ${user?.company?.name || 'N/A'}`, 12, true);
        addText(`Business Number: ${user?.company?.business_number || 'N/A'}`, 10);
        addText(`HST Number: ${user?.company?.hst_number || 'Not Registered'}`, 10);
        addText(`Fiscal Year: ${selectedYear}`, 10);
        addText(`Report Generated: ${new Date().toLocaleDateString('en-CA')}`, 10);
        yPosition += 5;

        // Profit & Loss Summary
        addText('PROFIT & LOSS SUMMARY', 14, true);
        autoTable(pdf, {
            startY: yPosition,
            head: [['Item', 'Amount']],
            body: [
                ['Gross Income', formatCurrency(data.grossIncome)],
                ['Total Expenses', formatCurrency(data.totalExpenses)],
                ...(data.totalDepreciationForYear > 0 ? [['Depreciation (CCA)', formatCurrency(data.totalDepreciationForYear)]] : []),
                ['Net Income (Pre-tax)', formatCurrency(data.netIncomeBeforeTax)],
                [`Small Business Tax (${((user?.company?.small_business_rate || 0.125) * 100).toFixed(2)}%)`, formatCurrency(data.smallBusinessTax)],
                ['Net Income (Post-tax)', formatCurrency(data.netIncomeAfterTax)],
            ],
            theme: 'striped',
            headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 9 },
            margin: { left: margin, right: margin },
        });
        yPosition = (pdf as any).lastAutoTable.finalY + 10;

        // HST Summary
        checkPageBreak(30);
        addText('HST SUMMARY', 14, true);
        autoTable(pdf, {
            startY: yPosition,
            head: [['Item', 'Amount']],
            body: [
                ['HST Collected', formatCurrency(data.hstCollected)],
                ...(data.isHSTRegistered ? [['HST Input Tax Credits', formatCurrency(data.hstInputTaxCredits)]] : []),
                ...(data.hstAlreadyPaid > 0 ? [['HST Already Paid to CRA', formatCurrency(data.hstAlreadyPaid)]] : []),
                ['HST Remittance', formatCurrency(data.hstRemittance)],
            ],
            theme: 'striped',
            headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 9 },
            margin: { left: margin, right: margin },
        });
        yPosition = (pdf as any).lastAutoTable.finalY + 10;

        // Retained Earnings Summary
        checkPageBreak(30);
        addText('RETAINED EARNINGS', 14, true);
        autoTable(pdf, {
            startY: yPosition,
            head: [['Item', 'Amount']],
            body: [
                ['Net Income (Post-tax)', formatCurrency(data.netIncomeAfterTax)],
                ['Dividends Paid', formatCurrency(data.totalDividends)],
                ...(data.totalOwnerPayments > 0 ? [['Owner Payments', formatCurrency(data.totalOwnerPayments)]] : []),
                ['Retained Earnings', formatCurrency(data.retainedEarnings)],
            ],
            theme: 'striped',
            headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 9 },
            margin: { left: margin, right: margin },
        });
        yPosition = (pdf as any).lastAutoTable.finalY + 10;

        // Expense Breakdown by Category
        if (data.expenses && data.expenses.length > 0) {
            checkPageBreak(30);
            addText('EXPENSE BREAKDOWN BY CATEGORY', 14, true);
            const categoryTotals: { [key: string]: { name: string; total: number; count: number } } = {};
            data.expenses.forEach((exp: Expense) => {
                const categoryName = exp.category?.name || 'Uncategorized';
                if (!categoryTotals[categoryName]) {
                    categoryTotals[categoryName] = { name: categoryName, total: 0, count: 0 };
                }
                categoryTotals[categoryName].total += exp.amount;
                categoryTotals[categoryName].count += 1;
            });
            const categoryRows = Object.values(categoryTotals)
                .sort((a, b) => b.total - a.total)
                .map(cat => [cat.name, cat.count.toString(), formatCurrency(cat.total)]);
            
            autoTable(pdf, {
                startY: yPosition,
                head: [['Category', 'Count', 'Total Amount']],
                body: categoryRows,
                theme: 'striped',
                headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9 },
                margin: { left: margin, right: margin },
            });
            yPosition = (pdf as any).lastAutoTable.finalY + 10;
        }

        // Capital Assets and Depreciation
        if (data.capitalAssets && data.capitalAssets.length > 0) {
            checkPageBreak(30);
            addText('CAPITAL ASSETS AND DEPRECIATION (CCA)', 14, true);
            addText(`Total Capital Asset Cost: ${formatCurrency(data.totalCapitalAssetCost || 0)}`, 10);
            addText(`Total Accumulated Depreciation: ${formatCurrency(data.totalAccumulatedDepreciation || 0)}`, 10);
            addText(`Depreciation for ${selectedYear}: ${formatCurrency(data.totalDepreciationForYear || 0)}`, 10);
            yPosition += 5;

            const assetRows = data.capitalAssets.map((asset: any) => {
                const yearDepreciation = asset.yearDepreciationEntries?.reduce((sum: number, entry: DepreciationEntry) => sum + Number(entry.depreciation_amount), 0) || 0;
                return [
                    asset.description,
                    formatDate(asset.purchase_date),
                    formatCurrency(asset.total_cost),
                    asset.cca_class,
                    formatCurrency(yearDepreciation),
                    formatCurrency(asset.book_value),
                ];
            });

            autoTable(pdf, {
                startY: yPosition,
                head: [['Asset', 'Purchase Date', 'Total Cost', 'CCA Class', `Depreciation (${selectedYear})`, 'Book Value']],
                body: assetRows,
                theme: 'striped',
                headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 8 },
                margin: { left: margin, right: margin },
            });
            yPosition = (pdf as any).lastAutoTable.finalY + 10;
        }

        // Monthly HST Breakdown
        checkPageBreak(30);
        addText('MONTHLY HST BREAKDOWN', 14, true);
        const monthlyRows: string[][] = [];
        Array.from({ length: 12 }, (_, i) => i + 1).forEach(month => {
            const monthInvoices = data.paidInvoices.filter((inv: Invoice) =>
                new Date(inv.issue_date).getMonth() + 1 === month
            );
            const monthExpenses = data.expenses.filter((exp: Expense) =>
                new Date(exp.expense_date).getMonth() + 1 === month
            );
            const monthClientIncome = (data.clientIncomeEntries || []).filter((entry: IncomeEntry) =>
                new Date(entry.income_date).getMonth() + 1 === month
            );

            const hstCollectedFromInvoices = monthInvoices.reduce((sum: number, inv: Invoice) => sum + inv.hst_amount, 0);
            const hstCollectedFromIncome = monthClientIncome.reduce((sum: number, entry: IncomeEntry) => sum + entry.hst_amount, 0);
            const hstCollected = hstCollectedFromInvoices + hstCollectedFromIncome;
            const hstPaid = monthExpenses.reduce((sum: number, exp: Expense) => sum + exp.hst_paid, 0);
            const netHST = hstCollected - hstPaid;

            const monthName = new Date(selectedYear, month - 1).toLocaleString('en-CA', { month: 'long' });
            monthlyRows.push([
                monthName,
                formatCurrency(hstCollectedFromInvoices),
                formatCurrency(hstCollectedFromIncome),
                formatCurrency(hstCollected),
                formatCurrency(hstPaid),
                formatCurrency(netHST),
            ]);
        });

        autoTable(pdf, {
            startY: yPosition,
            head: [['Month', 'HST Collected (Invoices)', 'HST Collected (Income)', 'Total HST Collected', 'HST Paid (ITC)', 'Net HST']],
            body: monthlyRows,
            theme: 'striped',
            headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8 },
            margin: { left: margin, right: margin },
        });
        yPosition = (pdf as any).lastAutoTable.finalY + 10;

        // Invoice Summary by Client
        if (data.paidInvoices && data.paidInvoices.length > 0) {
            checkPageBreak(30);
            addText('INVOICE SUMMARY BY CLIENT', 14, true);
            const clientTotals: { [key: string]: { name: string; total: number; count: number; hst: number } } = {};
            data.paidInvoices.forEach((inv: Invoice) => {
                const clientName = inv.client?.name || 'Unknown';
                if (!clientTotals[clientName]) {
                    clientTotals[clientName] = { name: clientName, total: 0, count: 0, hst: 0 };
                }
                clientTotals[clientName].total += inv.subtotal;
                clientTotals[clientName].hst += inv.hst_amount;
                clientTotals[clientName].count += 1;
            });
            const clientRows = Object.values(clientTotals)
                .sort((a, b) => b.total - a.total)
                .map(client => [client.name, client.count.toString(), formatCurrency(client.total), formatCurrency(client.hst)]);

            autoTable(pdf, {
                startY: yPosition,
                head: [['Client', 'Invoice Count', 'Total Revenue', 'HST Collected']],
                body: clientRows,
                theme: 'striped',
                headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9 },
                margin: { left: margin, right: margin },
            });
            yPosition = (pdf as any).lastAutoTable.finalY + 10;
        }

        // Expense Summary by Payment Method
        if (data.expenses && data.expenses.length > 0) {
            checkPageBreak(30);
            addText('EXPENSE SUMMARY BY PAYMENT METHOD', 14, true);
            const paidByTotals: { [key: string]: { total: number; count: number; hst: number } } = {};
            data.expenses.forEach((exp: Expense) => {
                if (!paidByTotals[exp.paid_by]) {
                    paidByTotals[exp.paid_by] = { total: 0, count: 0, hst: 0 };
                }
                paidByTotals[exp.paid_by].total += exp.amount;
                paidByTotals[exp.paid_by].hst += exp.hst_paid;
                paidByTotals[exp.paid_by].count += 1;
            });
            const paidByRows = Object.entries(paidByTotals)
                .map(([paidBy, totals]) => [
                    paidBy === 'corp' ? 'Corporation' : 'Owner',
                    totals.count.toString(),
                    formatCurrency(totals.total),
                    formatCurrency(totals.hst),
                ]);

            autoTable(pdf, {
                startY: yPosition,
                head: [['Payment Method', 'Count', 'Total Amount', 'HST Paid']],
                body: paidByRows,
                theme: 'striped',
                headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9 },
                margin: { left: margin, right: margin },
            });
            yPosition = (pdf as any).lastAutoTable.finalY + 10;
        }

        // Dividends
        if (data.dividends && data.dividends.length > 0) {
            checkPageBreak(30);
            addText('DIVIDEND DISTRIBUTIONS', 14, true);
            const dividendRows = data.dividends.map((div: Dividend) => [
                formatDate(div.declaration_date),
                formatCurrency(div.amount),
                div.status,
            ]);

            autoTable(pdf, {
                startY: yPosition,
                head: [['Date', 'Amount', 'Status']],
                body: dividendRows,
                theme: 'striped',
                headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9 },
                margin: { left: margin, right: margin },
            });
            yPosition = (pdf as any).lastAutoTable.finalY + 10;
        }

        // Owner Payments
        if (data.ownerPayments && data.ownerPayments.length > 0) {
            checkPageBreak(30);
            addText('OWNER PAYMENTS', 14, true);
            const ownerPaymentRows = data.ownerPayments.map((payment: OwnerPayment) => [
                formatDate(payment.payment_date),
                payment.description,
                payment.payment_type,
                formatCurrency(payment.amount),
            ]);

            autoTable(pdf, {
                startY: yPosition,
                head: [['Date', 'Description', 'Type', 'Amount']],
                body: ownerPaymentRows,
                theme: 'striped',
                headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9 },
                margin: { left: margin, right: margin },
            });
            yPosition = (pdf as any).lastAutoTable.finalY + 10;
        }

        return pdf;
    };

    const generatePDFReport = async () => {
        if (!user?.company_id || !reportData) return;

        setIsGeneratingPDF(true);
        try {
            const pdf = generatePDFFromData(reportData);
            pdf.save(`Comprehensive_Tax_Report_${selectedYear}.pdf`);
        } catch (error) {
            console.error('Failed to generate PDF report:', error);
            alert('Failed to generate PDF report. Please try again.');
        } finally {
            setIsGeneratingPDF(false);
        }
    };


    const generateMonthlyBreakdown = (invoices: Invoice[], expenses: Expense[], clientIncomeEntries: IncomeEntry[]) => {
        const months = Array.from({ length: 12 }, (_, i) => i + 1);
        let breakdown = '';

        months.forEach(month => {
            const monthInvoices = invoices.filter(inv =>
                new Date(inv.issue_date).getMonth() + 1 === month
            );
            const monthExpenses = expenses.filter(exp =>
                new Date(exp.expense_date).getMonth() + 1 === month
            );
            const monthClientIncome = clientIncomeEntries.filter(entry =>
                new Date(entry.income_date).getMonth() + 1 === month
            );

            const hstCollectedFromInvoices = monthInvoices.reduce((sum, inv) => sum + inv.hst_amount, 0);
            const hstCollectedFromIncome = monthClientIncome.reduce((sum, entry) => sum + entry.hst_amount, 0);
            const hstCollected = hstCollectedFromInvoices + hstCollectedFromIncome;
            const hstPaid = monthExpenses.reduce((sum, exp) => sum + exp.hst_paid, 0);

            const monthName = new Date(selectedYear, month - 1).toLocaleString('en-CA', { month: 'long' });
            breakdown += `${monthName} ${selectedYear}:\n`;
            breakdown += `  HST Collected: ${formatCurrency(hstCollected)} (Invoices: ${formatCurrency(hstCollectedFromInvoices)}, Income: ${formatCurrency(hstCollectedFromIncome)})\n`;
            breakdown += `  HST Paid (ITC): ${formatCurrency(hstPaid)}\n`;
            breakdown += `  Net HST: ${formatCurrency(hstCollected - hstPaid)}\n\n`;
        });

        return breakdown;
    };

    const generateComprehensiveReport = (data: any) => {
        const companyName = user?.company?.name || 'Company';
        const businessNumber = user?.company?.business_number || 'N/A';
        const hstNumber = user?.company?.hst_number || 'N/A';

        return `
================================================================================
COMPREHENSIVE TAX REPORT
================================================================================

COMPANY INFORMATION
Company Name: ${companyName}
Business Number: ${businessNumber}
HST Number: ${hstNumber || 'Not Registered'}
Fiscal Year: ${selectedYear}
Report Generated: ${new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}

================================================================================
1. COMPLETE PROFIT & LOSS STATEMENT
================================================================================

INCOME
Invoice Revenue: ${formatCurrency(data.invoiceRevenue)}
Client Income: ${formatCurrency(data.clientIncome)}
Other Income: ${formatCurrency(data.otherIncome || 0)}
────────────────────────────────────────────────────────────────────────────
Gross Revenue: ${formatCurrency(data.grossIncome)}

EXPENSES
Total Business Expenses: ${formatCurrency(data.totalExpenses)}
${data.totalDepreciationForYear > 0 ? `Depreciation (CCA): ${formatCurrency(data.totalDepreciationForYear)}` : ''}
────────────────────────────────────────────────────────────────────────────
Total Expenses (including Depreciation): ${formatCurrency(data.totalExpenses + (data.totalDepreciationForYear || 0))}

EXPENSE BREAKDOWN BY CATEGORY
${(() => {
                const categoryTotals: { [key: string]: { name: string; total: number; count: number } } = {};
                data.expenses.forEach((exp: Expense) => {
                    const categoryName = exp.category?.name || 'Uncategorized';
                    if (!categoryTotals[categoryName]) {
                        categoryTotals[categoryName] = { name: categoryName, total: 0, count: 0 };
                    }
                    categoryTotals[categoryName].total += exp.amount;
                    categoryTotals[categoryName].count += 1;
                });
                return Object.values(categoryTotals)
                    .sort((a, b) => b.total - a.total)
                    .map(cat => `  ${cat.name}: ${formatCurrency(cat.total)} (${cat.count} ${cat.count === 1 ? 'expense' : 'expenses'})`)
                    .join('\n') || '  No expenses by category';
            })()}

────────────────────────────────────────────────────────────────────────────
NET INCOME BEFORE TAX: ${formatCurrency(data.netIncomeBeforeTax)}

TAXES
Small Business Tax (${((user?.company?.small_business_rate || 0.125) * 100).toFixed(2)}%): ${formatCurrency(data.smallBusinessTax)}

────────────────────────────────────────────────────────────────────────────
NET INCOME AFTER TAX: ${formatCurrency(data.netIncomeAfterTax)}

DIVIDENDS PAID
Total Dividends: ${formatCurrency(data.totalDividends)}

OWNER PAYMENTS
Total Owner Payments: ${formatCurrency(data.totalOwnerPayments || 0)}

────────────────────────────────────────────────────────────────────────────
RETAINED EARNINGS: ${formatCurrency(data.retainedEarnings)}

================================================================================
2. DETAILED HST SUMMARY WITH MONTHLY BREAKDOWN
================================================================================

HST COLLECTED
Total HST Collected: ${formatCurrency(data.hstCollected)}
  From Invoices: ${formatCurrency(data.hstFromInvoices)}
  From Client Income: ${formatCurrency(data.hstFromClientIncome)}

HST INPUT TAX CREDITS
${data.isHSTRegistered
                ? `Total HST Input Tax Credits: ${formatCurrency(data.hstInputTaxCredits)}`
                : 'Company is not HST registered - no Input Tax Credits available'}

HST ALREADY PAID TO CRA
Total HST Already Paid: ${formatCurrency(data.hstAlreadyPaid || 0)}

────────────────────────────────────────────────────────────────────────────
HST REMITTANCE
Amount Owed to CRA: ${formatCurrency(data.hstRemittance)}

MONTHLY BREAKDOWN
${generateMonthlyBreakdown(data.paidInvoices, data.expenses, data.clientIncomeEntries || [])}

================================================================================
3. CAPITAL ASSETS AND DEPRECIATION (CCA)
================================================================================

SUMMARY
Total Capital Asset Cost: ${formatCurrency(data.totalCapitalAssetCost || 0)}
Total Accumulated Depreciation: ${formatCurrency(data.totalAccumulatedDepreciation || 0)}
Depreciation for ${selectedYear}: ${formatCurrency(data.totalDepreciationForYear || 0)}

DETAILED CAPITAL ASSETS
${data.capitalAssets && data.capitalAssets.length > 0
                ? data.capitalAssets.map((asset: any) => {
                    const yearDepreciation = asset.yearDepreciationEntries?.reduce((sum: number, entry: DepreciationEntry) => sum + Number(entry.depreciation_amount), 0) || 0;
                    const depreciationEntries = asset.yearDepreciationEntries || [];
                    return `
Asset: ${asset.description}
  Category: ${asset.category?.name || 'Uncategorized'}
  Purchase Date: ${formatDate(asset.purchase_date)}
  Purchase Amount: ${formatCurrency(asset.purchase_amount)}
  HST Paid: ${formatCurrency(asset.hst_paid)}
  Total Cost: ${formatCurrency(asset.total_cost)}
  CCA Class: ${asset.cca_class}
  CCA Rate: ${(Number(asset.cca_rate) * 100).toFixed(2)}%
  Depreciable Amount: ${formatCurrency(asset.depreciable_amount)}
  Depreciation for ${selectedYear}: ${formatCurrency(yearDepreciation)}
  ${depreciationEntries.length > 0 ? depreciationEntries.map((entry: DepreciationEntry) =>
                        `    - ${formatDate(entry.entry_date)}: ${formatCurrency(entry.depreciation_amount)}${entry.is_half_year_rule ? ' (Half-Year Rule Applied)' : ''}`
                    ).join('\n') : `    No depreciation entries for ${selectedYear}`}
  Accumulated Depreciation: ${formatCurrency(asset.accumulated_depreciation)}
  Book Value: ${formatCurrency(asset.book_value)}
  Paid By: ${asset.paid_by}
  ${asset.disposal_date ? `Disposal Date: ${formatDate(asset.disposal_date)} | Disposal Amount: ${formatCurrency(asset.disposal_amount || 0)}` : ''}
`;
                }).join('\n')
                : 'No capital assets recorded for this year'}

CAPITAL ASSETS BY CCA CLASS
${(() => {
                const classTotals: { [key: string]: { cost: number; depreciation: number; count: number } } = {};
                data.capitalAssets.forEach((asset: any) => {
                    const yearDepreciation = asset.yearDepreciationEntries?.reduce((sum: number, entry: DepreciationEntry) => sum + Number(entry.depreciation_amount), 0) || 0;
                    if (!classTotals[asset.cca_class]) {
                        classTotals[asset.cca_class] = { cost: 0, depreciation: 0, count: 0 };
                    }
                    classTotals[asset.cca_class].cost += Number(asset.total_cost);
                    classTotals[asset.cca_class].depreciation += yearDepreciation;
                    classTotals[asset.cca_class].count += 1;
                });
                return Object.entries(classTotals)
                    .map(([ccaClass, totals]) =>
                        `  CCA Class ${ccaClass}: ${formatCurrency(totals.cost)} cost, ${formatCurrency(totals.depreciation)} depreciation (${totals.count} ${totals.count === 1 ? 'asset' : 'assets'})`
                    )
                    .join('\n') || '  No capital assets by CCA class';
            })()}

================================================================================
4. DIVIDEND DISTRIBUTIONS
================================================================================

DIVIDENDS DECLARED
${data.dividends && data.dividends.length > 0
                ? data.dividends.map((div: Dividend) =>
                    `${formatDate(div.declaration_date)} - ${formatCurrency(div.amount)} - Status: ${div.status}${div.payment_date ? ` - Paid: ${formatDate(div.payment_date)}` : ''}${div.notes ? ` - Notes: ${div.notes}` : ''}`
                ).join('\n')
                : 'No dividends declared'}

────────────────────────────────────────────────────────────────────────────
TOTAL DIVIDENDS PAID: ${formatCurrency(data.totalDividends)}

================================================================================
5. RETAINED EARNINGS CALCULATION
================================================================================

NET INCOME AFTER TAX: ${formatCurrency(data.netIncomeAfterTax)}

LESS:
  Dividends Paid: ${formatCurrency(data.totalDividends)}
  Owner Payments: ${formatCurrency(data.totalOwnerPayments || 0)}
  ────────────────────────────────────────────────────────────────────────────
  Total Distributions: ${formatCurrency(data.totalDividends + (data.totalOwnerPayments || 0))}

────────────────────────────────────────────────────────────────────────────
RETAINED EARNINGS: ${formatCurrency(data.retainedEarnings)}

AVAILABLE FOR DISTRIBUTION: ${formatCurrency(data.retainedEarnings)}

================================================================================
6. ALL SUPPORTING TRANSACTION DETAILS
================================================================================

DETAILED INCOME BREAKDOWN

INVOICES:
${data.paidInvoices && data.paidInvoices.length > 0
                ? data.paidInvoices
                    .sort((a: Invoice, b: Invoice) => new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime())
                    .map((inv: Invoice) =>
                        `${inv.invoice_number} - ${inv.client?.name || 'Unknown'} - ${formatDate(inv.issue_date)} - Subtotal: ${formatCurrency(inv.subtotal)} - HST: ${formatCurrency(inv.hst_amount)} - Total: ${formatCurrency(inv.total)}${inv.paid_date ? ` - Paid: ${formatDate(inv.paid_date)}` : ''}`
                    ).join('\n')
                : 'No paid invoices'}

INVOICE SUMMARY BY CLIENT
${(() => {
                const clientTotals: { [key: string]: { name: string; total: number; count: number; hst: number } } = {};
                data.paidInvoices.forEach((inv: Invoice) => {
                    const clientName = inv.client?.name || 'Unknown';
                    if (!clientTotals[clientName]) {
                        clientTotals[clientName] = { name: clientName, total: 0, count: 0, hst: 0 };
                    }
                    clientTotals[clientName].total += inv.subtotal;
                    clientTotals[clientName].hst += inv.hst_amount;
                    clientTotals[clientName].count += 1;
                });
                return Object.values(clientTotals)
                    .sort((a, b) => b.total - a.total)
                    .map(client =>
                        `  ${client.name}: ${formatCurrency(client.total)} (${client.count} ${client.count === 1 ? 'invoice' : 'invoices'}) - HST: ${formatCurrency(client.hst)}`
                    )
                    .join('\n') || '  No invoices by client';
            })()}

CLIENT INCOME ENTRIES:
${data.clientIncomeEntries && data.clientIncomeEntries.length > 0
                ? data.clientIncomeEntries.map((entry: IncomeEntry) =>
                    `${formatDate(entry.income_date)} - ${entry.description} - Amount: ${formatCurrency(entry.amount)} - HST: ${formatCurrency(entry.hst_amount)} - Total: ${formatCurrency(entry.total)}`
                ).join('\n')
                : 'No client income entries'}

OTHER INCOME ENTRIES:
${data.otherIncomeEntries && data.otherIncomeEntries.length > 0
                ? data.otherIncomeEntries.map((entry: IncomeEntry) =>
                    `${formatDate(entry.income_date)} - ${entry.description} - Amount: ${formatCurrency(entry.amount)}`
                ).join('\n')
                : 'No other income entries'}

DETAILED EXPENSE BREAKDOWN
${data.expenses && data.expenses.length > 0
                ? data.expenses
                    .sort((a: Expense, b: Expense) => new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime())
                    .map((exp: Expense) =>
                        `${formatDate(exp.expense_date)} - ${exp.description} - Category: ${exp.category?.name || 'Uncategorized'} - Amount: ${formatCurrency(exp.amount)} - HST Paid: ${formatCurrency(exp.hst_paid)} - Paid By: ${exp.paid_by}${exp.receipt_attached ? ' - Receipt Attached' : ''}`
                    ).join('\n')
                : 'No expenses recorded'}

EXPENSE SUMMARY BY PAYMENT METHOD
${(() => {
                const paidByTotals: { [key: string]: { total: number; count: number; hst: number } } = {};
                data.expenses.forEach((exp: Expense) => {
                    if (!paidByTotals[exp.paid_by]) {
                        paidByTotals[exp.paid_by] = { total: 0, count: 0, hst: 0 };
                    }
                    paidByTotals[exp.paid_by].total += exp.amount;
                    paidByTotals[exp.paid_by].hst += exp.hst_paid;
                    paidByTotals[exp.paid_by].count += 1;
                });
                return Object.entries(paidByTotals)
                    .map(([paidBy, totals]) =>
                        `  ${paidBy === 'corp' ? 'Corporation' : 'Owner'}: ${formatCurrency(totals.total)} (${totals.count} ${totals.count === 1 ? 'expense' : 'expenses'}) - HST: ${formatCurrency(totals.hst)}`
                    )
                    .join('\n') || '  No expenses by payment method';
            })()}

OWNER PAYMENTS
${data.ownerPayments && data.ownerPayments.length > 0
                ? data.ownerPayments.map((payment: OwnerPayment) =>
                    `${formatDate(payment.payment_date)} - ${payment.description} - Amount: ${formatCurrency(payment.amount)} - Type: ${payment.payment_type}${payment.reference ? ` - Reference: ${payment.reference}` : ''}${payment.notes ? ` - Notes: ${payment.notes}` : ''}`
                ).join('\n')
                : 'No owner payments recorded'}

HST PAYMENTS TO CRA
${data.hstPayments && data.hstPayments.length > 0
                ? data.hstPayments.map((payment: HSTPayment) =>
                    `${formatDate(payment.payment_date)} - Amount: ${formatCurrency(payment.amount)} - Period: ${formatDate(payment.period_start)} to ${formatDate(payment.period_end)}${payment.reference ? ` - Reference: ${payment.reference}` : ''}${payment.notes ? ` - Notes: ${payment.notes}` : ''}`
                ).join('\n')
                : 'No HST payments recorded'}

================================================================================
END OF COMPREHENSIVE TAX REPORT
================================================================================

This report includes all financial data needed for tax submission to your accountant.
Perfect for providing to your tax accountant - includes everything they need to complete your tax return.

Generated on: ${new Date().toLocaleString('en-CA')}
`;
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
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Comprehensive Tax Report</h1>
                    <p className="text-muted-foreground mt-2">Generate a comprehensive tax report with all financial data needed for tax submission</p>
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
                        <label className="text-sm font-medium text-foreground">Fiscal Year:</label>
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
                </div>
            </Card>

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
                        {reportData.totalDepreciationForYear > 0 && (
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Depreciation (CCA):</span>
                                <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(reportData.totalDepreciationForYear)}</span>
                            </div>
                        )}
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
                        {reportData.isHSTRegistered && (
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">HST Input Tax Credits:</span>
                                <span className="font-medium text-blue-600 dark:text-blue-400">{formatCurrency(reportData.hstInputTaxCredits)}</span>
                            </div>
                        )}
                        {reportData.hstAlreadyPaid > 0 && (
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">HST Already Paid to CRA:</span>
                                <span className="font-medium text-blue-600 dark:text-blue-400">{formatCurrency(reportData.hstAlreadyPaid)}</span>
                            </div>
                        )}
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
                        {reportData.totalOwnerPayments > 0 && (
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Owner Payments:</span>
                                <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(reportData.totalOwnerPayments)}</span>
                            </div>
                        )}
                        <div className="flex justify-between border-t border-border pt-2">
                            <span className="text-sm font-bold text-foreground">Retained Earnings:</span>
                            <span className={`font-bold text-lg ${reportData.retainedEarnings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {formatCurrency(reportData.retainedEarnings)}
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Detailed Sections */}
            <div className="space-y-6">
                {/* Expense Breakdown by Category */}
                <Card className="overflow-hidden">
                    <div className="p-6 border-b border-border">
                        <h2 className="text-xl font-semibold tracking-tight text-foreground">Expense Breakdown by Category</h2>
                        <p className="text-sm text-muted-foreground mt-1">Total expenses organized by category</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-3">Category</th>
                                    <th className="px-6 py-3 text-right">Count</th>
                                    <th className="px-6 py-3 text-right">Total Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {(() => {
                                    const categoryTotals: { [key: string]: { name: string; total: number; count: number } } = {};
                                    reportData.expenses.forEach((exp: Expense) => {
                                        const categoryName = exp.category?.name || 'Uncategorized';
                                        if (!categoryTotals[categoryName]) {
                                            categoryTotals[categoryName] = { name: categoryName, total: 0, count: 0 };
                                        }
                                        categoryTotals[categoryName].total += exp.amount;
                                        categoryTotals[categoryName].count += 1;
                                    });
                                    return Object.values(categoryTotals)
                                        .sort((a, b) => b.total - a.total)
                                        .map(cat => (
                                            <tr key={cat.name} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-foreground">{cat.name}</td>
                                                <td className="px-6 py-4 text-right text-muted-foreground">{cat.count}</td>
                                                <td className="px-6 py-4 text-right font-medium text-foreground">{formatCurrency(cat.total)}</td>
                                            </tr>
                                        ));
                                })()}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Capital Assets and Depreciation */}
                <Card className="overflow-hidden">
                    <div className="p-6 border-b border-border">
                        <h2 className="text-xl font-semibold tracking-tight text-foreground">Capital Assets and Depreciation (CCA)</h2>
                        <p className="text-sm text-muted-foreground mt-1">Capital assets with depreciation details for {selectedYear}</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-muted/50 p-4 rounded-lg">
                                <div className="text-sm text-muted-foreground">Total Capital Asset Cost</div>
                                <div className="text-2xl font-bold text-foreground mt-1">{formatCurrency(reportData.totalCapitalAssetCost || 0)}</div>
                            </div>
                            <div className="bg-muted/50 p-4 rounded-lg">
                                <div className="text-sm text-muted-foreground">Total Accumulated Depreciation</div>
                                <div className="text-2xl font-bold text-foreground mt-1">{formatCurrency(reportData.totalAccumulatedDepreciation || 0)}</div>
                            </div>
                            <div className="bg-muted/50 p-4 rounded-lg">
                                <div className="text-sm text-muted-foreground">Depreciation for {selectedYear}</div>
                                <div className="text-2xl font-bold text-foreground mt-1">{formatCurrency(reportData.totalDepreciationForYear || 0)}</div>
                            </div>
                        </div>
                        {reportData.capitalAssets && reportData.capitalAssets.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                                        <tr>
                                            <th className="px-6 py-3">Asset</th>
                                            <th className="px-6 py-3">Purchase Date</th>
                                            <th className="px-6 py-3">Total Cost</th>
                                            <th className="px-6 py-3">CCA Class</th>
                                            <th className="px-6 py-3 text-right">Depreciation ({selectedYear})</th>
                                            <th className="px-6 py-3 text-right">Book Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {reportData.capitalAssets.map((asset: any) => {
                                            const yearDepreciation = asset.yearDepreciationEntries?.reduce((sum: number, entry: DepreciationEntry) => sum + Number(entry.depreciation_amount), 0) || 0;
                                            return (
                                                <tr key={asset.id} className="hover:bg-muted/50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-foreground">{asset.description}</td>
                                                    <td className="px-6 py-4 text-muted-foreground">{formatDate(asset.purchase_date)}</td>
                                                    <td className="px-6 py-4 text-foreground">{formatCurrency(asset.total_cost)}</td>
                                                    <td className="px-6 py-4 text-muted-foreground">{asset.cca_class} ({(Number(asset.cca_rate) * 100).toFixed(2)}%)</td>
                                                    <td className="px-6 py-4 text-right text-foreground">{formatCurrency(yearDepreciation)}</td>
                                                    <td className="px-6 py-4 text-right font-medium text-foreground">{formatCurrency(asset.book_value)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-8">No capital assets recorded for this year</p>
                        )}
                    </div>
                </Card>

                {/* Monthly HST Breakdown */}
                <Card className="overflow-hidden">
                    <div className="p-6 border-b border-border">
                        <h2 className="text-xl font-semibold tracking-tight text-foreground">Monthly HST Breakdown</h2>
                        <p className="text-sm text-muted-foreground mt-1">HST collected and paid by month for {selectedYear}</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-3">Month</th>
                                    <th className="px-6 py-3 text-right">HST Collected (Invoices)</th>
                                    <th className="px-6 py-3 text-right">HST Collected (Income)</th>
                                    <th className="px-6 py-3 text-right">Total HST Collected</th>
                                    <th className="px-6 py-3 text-right">HST Paid (ITC)</th>
                                    <th className="px-6 py-3 text-right">Net HST</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                                    const monthInvoices = reportData.paidInvoices.filter((inv: Invoice) =>
                                        new Date(inv.issue_date).getMonth() + 1 === month
                                    );
                                    const monthExpenses = reportData.expenses.filter((exp: Expense) =>
                                        new Date(exp.expense_date).getMonth() + 1 === month
                                    );
                                    const monthClientIncome = (reportData.clientIncomeEntries || []).filter((entry: IncomeEntry) =>
                                        new Date(entry.income_date).getMonth() + 1 === month
                                    );

                                    const hstCollectedFromInvoices = monthInvoices.reduce((sum: number, inv: Invoice) => sum + inv.hst_amount, 0);
                                    const hstCollectedFromIncome = monthClientIncome.reduce((sum: number, entry: IncomeEntry) => sum + entry.hst_amount, 0);
                                    const hstCollected = hstCollectedFromInvoices + hstCollectedFromIncome;
                                    const hstPaid = monthExpenses.reduce((sum: number, exp: Expense) => sum + exp.hst_paid, 0);
                                    const netHST = hstCollected - hstPaid;

                                    const monthName = new Date(selectedYear, month - 1).toLocaleString('en-CA', { month: 'long' });
                                    return (
                                        <tr key={month} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-foreground">{monthName}</td>
                                            <td className="px-6 py-4 text-right text-muted-foreground">{formatCurrency(hstCollectedFromInvoices)}</td>
                                            <td className="px-6 py-4 text-right text-muted-foreground">{formatCurrency(hstCollectedFromIncome)}</td>
                                            <td className="px-6 py-4 text-right font-medium text-foreground">{formatCurrency(hstCollected)}</td>
                                            <td className="px-6 py-4 text-right text-muted-foreground">{formatCurrency(hstPaid)}</td>
                                            <td className={`px-6 py-4 text-right font-bold ${netHST >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                                {formatCurrency(netHST)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Invoice Summary by Client */}
                <Card className="overflow-hidden">
                    <div className="p-6 border-b border-border">
                        <h2 className="text-xl font-semibold tracking-tight text-foreground">Invoice Summary by Client</h2>
                        <p className="text-sm text-muted-foreground mt-1">Total revenue and HST collected per client</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-3">Client</th>
                                    <th className="px-6 py-3 text-right">Invoice Count</th>
                                    <th className="px-6 py-3 text-right">Total Revenue</th>
                                    <th className="px-6 py-3 text-right">HST Collected</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {(() => {
                                    const clientTotals: { [key: string]: { name: string; total: number; count: number; hst: number } } = {};
                                    reportData.paidInvoices.forEach((inv: Invoice) => {
                                        const clientName = inv.client?.name || 'Unknown';
                                        if (!clientTotals[clientName]) {
                                            clientTotals[clientName] = { name: clientName, total: 0, count: 0, hst: 0 };
                                        }
                                        clientTotals[clientName].total += inv.subtotal;
                                        clientTotals[clientName].hst += inv.hst_amount;
                                        clientTotals[clientName].count += 1;
                                    });
                                    return Object.values(clientTotals)
                                        .sort((a, b) => b.total - a.total)
                                        .map(client => (
                                            <tr key={client.name} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-foreground">{client.name}</td>
                                                <td className="px-6 py-4 text-right text-muted-foreground">{client.count}</td>
                                                <td className="px-6 py-4 text-right font-medium text-foreground">{formatCurrency(client.total)}</td>
                                                <td className="px-6 py-4 text-right text-muted-foreground">{formatCurrency(client.hst)}</td>
                                            </tr>
                                        ));
                                })()}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Expense Summary by Payment Method */}
                <Card className="overflow-hidden">
                    <div className="p-6 border-b border-border">
                        <h2 className="text-xl font-semibold tracking-tight text-foreground">Expense Summary by Payment Method</h2>
                        <p className="text-sm text-muted-foreground mt-1">Expenses categorized by who paid (Corporation vs Owner)</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-3">Payment Method</th>
                                    <th className="px-6 py-3 text-right">Count</th>
                                    <th className="px-6 py-3 text-right">Total Amount</th>
                                    <th className="px-6 py-3 text-right">HST Paid</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {(() => {
                                    const paidByTotals: { [key: string]: { total: number; count: number; hst: number } } = {};
                                    reportData.expenses.forEach((exp: Expense) => {
                                        if (!paidByTotals[exp.paid_by]) {
                                            paidByTotals[exp.paid_by] = { total: 0, count: 0, hst: 0 };
                                        }
                                        paidByTotals[exp.paid_by].total += exp.amount;
                                        paidByTotals[exp.paid_by].hst += exp.hst_paid;
                                        paidByTotals[exp.paid_by].count += 1;
                                    });
                                    return Object.entries(paidByTotals)
                                        .map(([paidBy, totals]) => (
                                            <tr key={paidBy} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-foreground">{paidBy === 'corp' ? 'Corporation' : 'Owner'}</td>
                                                <td className="px-6 py-4 text-right text-muted-foreground">{totals.count}</td>
                                                <td className="px-6 py-4 text-right font-medium text-foreground">{formatCurrency(totals.total)}</td>
                                                <td className="px-6 py-4 text-right text-muted-foreground">{formatCurrency(totals.hst)}</td>
                                            </tr>
                                        ));
                                })()}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Dividends and Owner Payments */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Card className="overflow-hidden">
                        <div className="p-6 border-b border-border">
                            <h2 className="text-xl font-semibold tracking-tight text-foreground">Dividend Distributions</h2>
                            <p className="text-sm text-muted-foreground mt-1">All dividends declared and paid</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                                    <tr>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Amount</th>
                                        <th className="px-6 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {reportData.dividends && reportData.dividends.length > 0 ? (
                                        reportData.dividends.map((div: Dividend) => (
                                            <tr key={div.id} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-6 py-4 text-muted-foreground">{formatDate(div.declaration_date)}</td>
                                                <td className="px-6 py-4 font-medium text-foreground">{formatCurrency(div.amount)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${div.status === 'paid'
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                        }`}>
                                                        {div.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">No dividends declared</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card className="overflow-hidden">
                        <div className="p-6 border-b border-border">
                            <h2 className="text-xl font-semibold tracking-tight text-foreground">Owner Payments</h2>
                            <p className="text-sm text-muted-foreground mt-1">Payments made to owners</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                                    <tr>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Description</th>
                                        <th className="px-6 py-3">Type</th>
                                        <th className="px-6 py-3 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {reportData.ownerPayments && reportData.ownerPayments.length > 0 ? (
                                        reportData.ownerPayments.map((payment: OwnerPayment) => (
                                            <tr key={payment.id} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-6 py-4 text-muted-foreground">{formatDate(payment.payment_date)}</td>
                                                <td className="px-6 py-4 text-foreground">{payment.description}</td>
                                                <td className="px-6 py-4 text-muted-foreground">{payment.payment_type}</td>
                                                <td className="px-6 py-4 text-right font-medium text-foreground">{formatCurrency(payment.amount)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No owner payments recorded</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Comprehensive Tax Report Info */}
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
        </div>
    );
};

export default Reports;
