import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type Invoice, type Expense, type Dividend, type IncomeEntry, type OwnerPayment, type DepreciationEntry, type Salary, type InvestmentIncome, type InvestmentSale } from '../lib/api';
import { Calendar, TrendingUp, DollarSign, Receipt, FileSpreadsheet } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import HelpIcon from '../components/ui/HelpIcon';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getFiscalYearRange, formatFiscalYear, getCurrentFiscalYear, isDateInFiscalYear, getFiscalYearOptions } from '../lib/fiscalYear';
import { getHSTPeriodsForFiscalYear, formatHSTPeriod, type HSTPeriod } from '../lib/hstPeriods';

const Reports: React.FC = () => {
    const { user } = useAuth();
    const fiscalYearEnd = user?.company?.fiscal_year_end;
    const currentFiscalYear = useMemo(() => {
        return fiscalYearEnd ? getCurrentFiscalYear(fiscalYearEnd) : new Date().getFullYear();
    }, [fiscalYearEnd]);
    const [selectedFiscalYear, setSelectedFiscalYear] = useState(currentFiscalYear);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    // Get fiscal year range for filtering
    const fiscalYearRange = useMemo(() => {
        if (fiscalYearEnd) {
            return getFiscalYearRange(selectedFiscalYear, fiscalYearEnd);
        } else {
            // Fallback to calendar year
            return {
                start: new Date(selectedFiscalYear, 0, 1),
                end: new Date(selectedFiscalYear, 11, 31),
                fiscalYear: selectedFiscalYear,
            };
        }
    }, [selectedFiscalYear, fiscalYearEnd]);

    // Fetch tax return data for the selected fiscal year
    const { data: _taxReturn } = useQuery({
        queryKey: ['tax_return', user?.company_id, selectedFiscalYear],
        queryFn: async () => {
            try {
                const result = await api.getTaxReturns({
                    company_id: user?.company_id,
                    fiscal_year: selectedFiscalYear,
                    limit: 1
                });
                return result.data[0] || null;
            } catch (error) {
                return null;
            }
        },
        enabled: !!user?.company_id,
    });

    // Get date range strings for API filtering
    const startDateStr = fiscalYearRange.start.toISOString().split('T')[0];
    const endDateStr = fiscalYearRange.end.toISOString().split('T')[0];

    // Fetch invoices for the selected fiscal year
    // Note: getInvoices doesn't support date filtering, so we filter client-side
    const { data: invoices } = useQuery({
        queryKey: ['invoices_report', user?.company_id, selectedFiscalYear],
        queryFn: async () => {
            const result = await api.getInvoices({
                company_id: user?.company_id,
                limit: 1000
            });
            // Filter by fiscal year on the client side (API doesn't support date filtering)
            return result.data.filter(invoice => {
                if (fiscalYearEnd) {
                    return isDateInFiscalYear(new Date(invoice.issue_date), selectedFiscalYear, fiscalYearEnd);
                } else {
                    return new Date(invoice.issue_date).getFullYear() === selectedFiscalYear;
                }
            });
        },
        enabled: !!user?.company_id,
    });

    // Fetch expenses for the selected fiscal year - use date range filtering in API
    const { data: expenses } = useQuery({
        queryKey: ['expenses_report', user?.company_id, selectedFiscalYear, startDateStr, endDateStr],
        queryFn: async () => {
            const result = await api.getExpenses({
                company_id: user?.company_id,
                start_date: startDateStr,
                end_date: endDateStr,
                limit: 1000
            });
            return result.data;
        },
        enabled: !!user?.company_id,
    });

    // Fetch dividends for the selected fiscal year - use date range filtering in API
    const { data: dividends } = useQuery({
        queryKey: ['dividends_report', user?.company_id, selectedFiscalYear, startDateStr, endDateStr],
        queryFn: async () => {
            const result = await api.getDividends({
                company_id: user?.company_id,
                start_date: startDateStr,
                end_date: endDateStr,
                limit: 1000
            });
            return result.data;
        },
        enabled: !!user?.company_id,
    });

    // Fetch income entries for the selected fiscal year - use date range filtering in API
    const { data: incomeEntries } = useQuery({
        queryKey: ['income_entries_report', user?.company_id, selectedFiscalYear, startDateStr, endDateStr],
        queryFn: async () => {
            const result = await api.getIncomeEntries({
                company_id: user?.company_id,
                start_date: startDateStr,
                end_date: endDateStr,
                limit: 1000
            });
            return result.data;
        },
        enabled: !!user?.company_id,
    });

    // Fetch owner payments for the selected fiscal year - use date range filtering in API
    const { data: ownerPayments } = useQuery({
        queryKey: ['owner_payments_report', user?.company_id, selectedFiscalYear, startDateStr, endDateStr],
        queryFn: async () => {
            const result = await api.getOwnerPayments({
                company_id: user?.company_id,
                start_date: startDateStr,
                end_date: endDateStr,
                limit: 1000
            });
            return result.data;
        },
        enabled: !!user?.company_id,
    });

    // Fetch HST payments for the selected fiscal year - use date range filtering in API
    const { data: hstPayments } = useQuery({
        queryKey: ['hst_payments_report', user?.company_id, selectedFiscalYear, startDateStr, endDateStr],
        queryFn: async () => {
            const result = await api.getHSTPayments({
                company_id: user?.company_id,
                start_date: startDateStr,
                end_date: endDateStr,
                limit: 1000
            });
            return result.data;
        },
        enabled: !!user?.company_id,
    });

    // Fetch capital assets for the selected fiscal year
    const { data: capitalAssets } = useQuery({
        queryKey: ['capital_assets_report', user?.company_id, selectedFiscalYear],
        queryFn: async () => {
            const result = await api.getCapitalAssets({
                company_id: user?.company_id,
                limit: 1000
            });
            // Filter by purchase date within the selected fiscal year and include depreciation entries for the fiscal year
            return result.data.map(asset => {
                const purchaseInFiscalYear = fiscalYearEnd
                    ? isDateInFiscalYear(new Date(asset.purchase_date), selectedFiscalYear, fiscalYearEnd)
                    : new Date(asset.purchase_date).getFullYear() === selectedFiscalYear;
                const yearDepreciationEntries = asset.depreciation_entries?.filter(entry => entry.fiscal_year === selectedFiscalYear) || [];
                return {
                    ...asset,
                    depreciation_entries: asset.depreciation_entries || [],
                    yearDepreciationEntries,
                    isInYear: purchaseInFiscalYear || yearDepreciationEntries.length > 0
                };
            }).filter(asset => asset.isInYear);
        },
        enabled: !!user?.company_id,
    });

    // Fetch salaries for the selected fiscal year - use date range filtering in API
    const { data: salaries } = useQuery({
        queryKey: ['salaries_report', user?.company_id, selectedFiscalYear, startDateStr, endDateStr],
        queryFn: async () => {
            const result = await api.getSalaries({
                company_id: user?.company_id,
                start_date: startDateStr,
                end_date: endDateStr,
                limit: 1000
            });
            return result.data;
        },
        enabled: !!user?.company_id,
    });

    // Fetch investment income for the selected fiscal year
    const { data: investmentIncome } = useQuery({
        queryKey: ['investment_income_report', user?.company_id, selectedFiscalYear],
        queryFn: async () => {
            const result = await api.getInvestmentIncome({
                company_id: user?.company_id,
                fiscal_year: selectedFiscalYear,
                limit: 1000
            });
            return result.data;
        },
        enabled: !!user?.company_id,
    });

    // Fetch investment sales for the selected fiscal year
    const { data: investmentSales } = useQuery({
        queryKey: ['investment_sales_report', user?.company_id, selectedFiscalYear],
        queryFn: async () => {
            const result = await api.getInvestmentSales({
                company_id: user?.company_id,
                fiscal_year: selectedFiscalYear,
                limit: 1000
            });
            return result.data;
        },
        enabled: !!user?.company_id,
    });

    // Get HST periods for the selected fiscal year
    const hstPeriods = useMemo(() => {
        if (!fiscalYearEnd || !user?.company?.hst_filing_frequency) {
            return [];
        }
        return getHSTPeriodsForFiscalYear(
            selectedFiscalYear,
            user.company.hst_filing_frequency,
            fiscalYearEnd
        );
    }, [selectedFiscalYear, fiscalYearEnd, user?.company?.hst_filing_frequency]);

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

    // Calculate report data
    const reportData = React.useMemo(() => {
        if (!invoices || !expenses || !dividends || !incomeEntries || !ownerPayments || !hstPayments || !capitalAssets || !salaries || !investmentIncome || !investmentSales) return null;

        const paidInvoices = invoices.filter(inv => inv.status === 'paid');

        // Calculate revenue from invoices
        const invoiceRevenue = paidInvoices.reduce((sum, inv) => sum + inv.subtotal, 0);

        // Calculate revenue from client income entries
        const clientIncomeEntries = incomeEntries.filter(entry => entry.income_type === 'client');
        const clientIncome = clientIncomeEntries.reduce((sum, entry) => sum + entry.amount, 0);

        // Calculate other income (taxable income that's not from clients)
        const otherIncomeEntries = incomeEntries.filter(entry => entry.income_type === 'other');
        const otherIncome = otherIncomeEntries.reduce((sum, entry) => sum + entry.amount, 0);

        // Calculate expenses, salaries, and depreciation first (needed for active business income calculation)
        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        // Calculate deductible expenses using deduction percentage
        const totalDeductibleExpenses = expenses.reduce((sum, exp) => {
            const deductionPercentage = exp.deduction_percentage ?? 1.0;
            return sum + (exp.amount * deductionPercentage);
        }, 0);
        const totalSalaries = salaries.reduce((sum, sal) => sum + sal.amount, 0);

        // Calculate capital assets and depreciation for the year
        const totalDepreciationForYear = capitalAssets.reduce((sum, asset: any) => {
            const yearDepreciation = asset.yearDepreciationEntries?.reduce((depSum: number, entry: DepreciationEntry) => depSum + Number(entry.depreciation_amount), 0) || 0;
            return sum + yearDepreciation;
        }, 0);

        const totalDividends = dividends.reduce((sum, div) => sum + div.amount, 0);

        // ===== SEPARATE ACTIVE BUSINESS INCOME FROM INVESTMENT INCOME =====

        // Active Business Income (excludes investment income)
        const grossRevenue = invoiceRevenue + clientIncome;
        const activeBusinessIncome = Math.max(0, grossRevenue + otherIncome - totalDeductibleExpenses - totalSalaries - totalDepreciationForYear);

        // Active Business Tax (small business rate)
        const smallBusinessTaxRate = user?.company?.small_business_rate || 0.125;
        const activeBusinessTax = activeBusinessIncome * smallBusinessTaxRate;

        // ===== INVESTMENT INCOME CALCULATIONS =====

        // Interest income - 100% taxable
        const investmentInterestBase = investmentIncome
            .filter(inc => inc.income_type === 'interest')
            .reduce((sum, inc) => sum + Number(inc.amount), 0);

        // Dividend income - eligible dividends get gross-up treatment (38% for Canadian eligible dividends)
        const eligibleDividendGrossUp = 1.38;
        const eligibleDividendsBase = investmentIncome
            .filter(inc => inc.income_type === 'dividend' && inc.is_eligible_dividend)
            .reduce((sum, inc) => sum + Number(inc.amount), 0);
        const nonEligibleDividendsBase = investmentIncome
            .filter(inc => inc.income_type === 'dividend' && !inc.is_eligible_dividend)
            .reduce((sum, inc) => sum + Number(inc.amount), 0);

        // Gross-up eligible dividends
        const eligibleDividendsGrossedUp = eligibleDividendsBase * eligibleDividendGrossUp;
        const investmentDividendsTaxable = eligibleDividendsGrossedUp + nonEligibleDividendsBase;

        // Capital gains - 50% inclusion rate
        const realizedCapitalGains = investmentSales
            .filter(sale => Number(sale.realized_gain_loss) > 0)
            .reduce((sum, sale) => sum + (Number(sale.realized_gain_loss) * 0.5), 0);

        // Capital losses - 50% deductible
        const realizedCapitalLosses = investmentSales
            .filter(sale => Number(sale.realized_gain_loss) < 0)
            .reduce((sum, sale) => sum + (Number(sale.realized_gain_loss) * 0.5), 0);

        // Total investment income for display (before tax)
        const totalInvestmentIncome = investmentInterestBase + eligibleDividendsBase + nonEligibleDividendsBase + realizedCapitalGains + realizedCapitalLosses;

        // Investment income tax rates (configurable, with defaults for Ontario 2024)
        const investmentInterestTaxRate = user?.company?.investment_interest_tax_rate ?? 0.5017;
        const investmentEligibleDividendTaxRate = user?.company?.investment_eligible_dividend_tax_rate ?? 0.3934;
        const investmentNonEligibleDividendTaxRate = user?.company?.investment_noneligible_dividend_tax_rate ?? 0.4774;
        const investmentCapitalGainTaxRate = user?.company?.investment_capital_gain_tax_rate ?? 0.2509;

        // Calculate investment income tax separately
        const investmentInterestTax = investmentInterestBase * investmentInterestTaxRate;
        const investmentEligibleDividendTax = eligibleDividendsGrossedUp * investmentEligibleDividendTaxRate;
        const investmentNonEligibleDividendTax = nonEligibleDividendsBase * investmentNonEligibleDividendTaxRate;
        const investmentCapitalGainTax = Math.max(0, realizedCapitalGains * investmentCapitalGainTaxRate);

        const totalInvestmentIncomeTax = investmentInterestTax + investmentEligibleDividendTax + investmentNonEligibleDividendTax + investmentCapitalGainTax;

        // ===== RDTOH (Refundable Dividend Tax on Hand) CALCULATIONS =====

        // RDTOH addition: 30.67% of investment income tax is added to RDTOH
        const rdtohRate = 0.3067; // 30.67%
        const rdtohAddition = totalInvestmentIncomeTax * rdtohRate;

        // RDTOH refund: $1 refund per $2.61 of dividends paid
        const rdtohRefundRate = 1 / 2.61; // $1 refund per $2.61 dividend
        const rdtohRefund = totalDividends * rdtohRefundRate;

        // RDTOH balance (previous balance + additions - refunds)
        const previousRDTOHBalance = user?.company?.rdtoh_balance ?? 0;
        const rdtohBalance = Math.max(0, previousRDTOHBalance + rdtohAddition - rdtohRefund);
        const rdtohRefundable = Math.min(rdtohRefund, previousRDTOHBalance + rdtohAddition);

        // Total gross income for display (includes both active business and investment income)
        const grossIncome = grossRevenue + otherIncome + totalInvestmentIncome;

        // Total corporate tax (active business + investment income)
        const totalCorporateTax = activeBusinessTax + totalInvestmentIncomeTax;

        // Net income after tax (accounting for RDTOH refund)
        const netIncomeBeforeTax = activeBusinessIncome + totalInvestmentIncome;
        const netIncomeAfterTax = netIncomeBeforeTax - totalCorporateTax + rdtohRefundable;

        // Calculate HST collected from invoices
        const hstFromInvoices = paidInvoices.reduce((sum, inv) => sum + inv.hst_amount, 0);

        // Calculate HST collected from client income entries
        const hstFromClientIncome = clientIncomeEntries.reduce((sum, entry) => sum + entry.hst_amount, 0);

        // Total HST collected includes both invoices and client income entries
        const hstCollected = hstFromInvoices + hstFromClientIncome;

        // Calculate HST paid from expenses (Input Tax Credits)
        const isHSTRegistered = user?.company?.hst_registered || false;
        const hstPaidFromExpenses = expenses.reduce((sum, exp) => sum + exp.hst_paid, 0);
        const hstInputTaxCredits = isHSTRegistered ? hstPaidFromExpenses : 0;

        // Calculate HST already paid to CRA
        const hstAlreadyPaid = hstPayments.reduce((sum, payment) => sum + payment.amount, 0);

        // Calculate HST remittance (what's owed after accounting for ITCs and payments made)
        const hstRemittance = hstCollected - hstInputTaxCredits - hstAlreadyPaid;

        // Calculate total owner payments
        const totalOwnerPayments = ownerPayments.reduce((sum, payment) => sum + payment.amount, 0);

        const totalCapitalAssetCost = capitalAssets.reduce((sum, asset) => sum + Number(asset.total_cost), 0);
        const totalAccumulatedDepreciation = capitalAssets.reduce((sum, asset) => sum + Number(asset.accumulated_depreciation), 0);

        // Retained earnings = Net Income After Tax - Dividends - Owner Payments
        const retainedEarnings = netIncomeAfterTax - totalDividends - totalOwnerPayments;

        return {
            grossIncome,
            grossRevenue,
            invoiceRevenue,
            clientIncome,
            otherIncome,
            // Active Business Income
            activeBusinessIncome,
            activeBusinessTax,
            smallBusinessTaxRate,
            // Investment Income
            investmentInterest: investmentInterestBase,
            investmentDividends: eligibleDividendsBase + nonEligibleDividendsBase,
            eligibleDividendsBase,
            nonEligibleDividendsBase,
            eligibleDividendsGrossedUp,
            investmentDividendsTaxable,
            realizedCapitalGains,
            realizedCapitalLosses,
            totalInvestmentIncome,
            investmentInterestTax,
            investmentEligibleDividendTax,
            investmentNonEligibleDividendTax,
            investmentCapitalGainTax,
            totalInvestmentIncomeTax,
            investmentInterestTaxRate,
            investmentEligibleDividendTaxRate,
            investmentNonEligibleDividendTaxRate,
            investmentCapitalGainTaxRate,
            // RDTOH
            rdtohAddition,
            rdtohRefund,
            rdtohBalance,
            rdtohRefundable,
            previousRDTOHBalance,
            // Combined
            totalCorporateTax,
            totalExpenses,
            totalDeductibleExpenses,
            totalSalaries,
            totalDepreciationForYear,
            netIncomeBeforeTax,
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
            salaries,
            dividends,
            ownerPayments,
            hstPayments,
            capitalAssets,
            totalCapitalAssetCost,
            totalAccumulatedDepreciation,
            investmentIncome,
            investmentSales,
        };
    }, [invoices, expenses, dividends, incomeEntries, ownerPayments, hstPayments, capitalAssets, salaries, investmentIncome, investmentSales, user?.company]);

    // Calculate T5 compliance stats
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const t5ComplianceStats = useMemo(() => {
        if (!dividends || dividends.length === 0) return { totalSlips: 0, missingSIN: 0, eligibleCount: 0, nonEligibleCount: 0 };
        
        let totalSlips = 0;
        let missingSIN = 0;
        let eligibleCount = 0;
        let nonEligibleCount = 0;

        dividends.forEach((div: Dividend) => {
            if (div.dividend_type === 'eligible') {
                eligibleCount++;
            } else {
                nonEligibleCount++;
            }
        });

        // Note: We can't easily get recipient counts here without async calls
        // This is a simplified version - full stats would require loading all recipients
        
        return { totalSlips, missingSIN, eligibleCount, nonEligibleCount };
    }, [dividends]);

    const generatePDFFromData = async (data: NonNullable<typeof reportData>) => {
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
        addText(`Fiscal Year: ${formatFiscalYear(selectedFiscalYear)}`, 10);
        addText(`Report Generated: ${new Date().toLocaleDateString('en-CA')}`, 10);
        yPosition += 5;

        // Profit & Loss Summary
        addText('PROFIT & LOSS SUMMARY', 14, true);
        autoTable(pdf, {
            startY: yPosition,
            head: [['Item', 'Amount']],
            body: [
                ['Gross Revenue', formatCurrency(data.grossRevenue)],
                ['Other Income', formatCurrency(data.otherIncome)],
                ['Total Expenses', formatCurrency(data.totalExpenses)],
                ...(data.totalSalaries > 0 ? [['Total Salaries', formatCurrency(data.totalSalaries)]] : []),
                ...(data.totalDepreciationForYear > 0 ? [['Depreciation (CCA)', formatCurrency(data.totalDepreciationForYear)]] : []),
                ['---', '---'],
                ['Active Business Income', formatCurrency(data.activeBusinessIncome)],
                [`Active Business Tax (${formatPercentage(data.smallBusinessTaxRate)})`, formatCurrency(data.activeBusinessTax)],
                ...(data.totalInvestmentIncome > 0 ? [
                    ['---', '---'],
                    ['Investment Interest', formatCurrency(data.investmentInterest)],
                    ...(data.investmentInterest > 0 ? [[`Investment Interest Tax (${formatPercentage(data.investmentInterestTaxRate)})`, formatCurrency(data.investmentInterestTax)]] : []),
                    ...(data.investmentDividends > 0 ? [['Investment Dividends', formatCurrency(data.investmentDividends)]] : []),
                    ...(data.investmentDividends > 0 ? [[`Investment Dividend Tax`, formatCurrency(data.investmentEligibleDividendTax + data.investmentNonEligibleDividendTax)]] : []),
                    ...(data.realizedCapitalGains !== 0 ? [['Realized Capital Gains (50%)', formatCurrency(data.realizedCapitalGains)]] : []),
                    ...(data.realizedCapitalGains > 0 ? [[`Capital Gains Tax (${formatPercentage(data.investmentCapitalGainTaxRate)})`, formatCurrency(data.investmentCapitalGainTax)]] : []),
                    ['Total Investment Income Tax', formatCurrency(data.totalInvestmentIncomeTax)],
                    ...(data.rdtohAddition > 0 ? [['RDTOH Addition (30.67%)', formatCurrency(data.rdtohAddition)]] : []),
                    ...(data.rdtohRefund > 0 ? [['RDTOH Refund', formatCurrency(data.rdtohRefundable)]] : []),
                    ...(data.rdtohBalance > 0 ? [['RDTOH Balance', formatCurrency(data.rdtohBalance)]] : []),
                ] : []),
                ['---', '---'],
                ['Total Corporate Tax', formatCurrency(data.totalCorporateTax)],
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
                ['HST to Pay', formatCurrency(data.hstRemittance)],
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
            addText(`Depreciation for ${formatFiscalYear(selectedFiscalYear)}: ${formatCurrency(data.totalDepreciationForYear || 0)}`, 10);
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
                head: [['Asset', 'Purchase Date', 'Total Cost', 'CCA Class', `Depreciation (${formatFiscalYear(selectedFiscalYear)})`, 'Book Value']],
                body: assetRows,
                theme: 'striped',
                headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 8 },
                margin: { left: margin, right: margin },
            });
            yPosition = (pdf as any).lastAutoTable.finalY + 10;
        }

        // Investment Income and Sales
        if ((data.investmentIncome && data.investmentIncome.length > 0) || (data.investmentSales && data.investmentSales.length > 0)) {
            checkPageBreak(30);
            addText('INVESTMENT INCOME & SALES', 14, true);

            // Investment Income Summary
            const investmentSummaryRows = [
                ...(data.investmentInterest > 0 ? [['Interest Income', formatCurrency(data.investmentInterest)]] : []),
                ...(data.investmentDividends > 0 ? [['Dividend Income', formatCurrency(data.investmentDividends)]] : []),
                ...(data.realizedCapitalGains !== 0 ? [['Realized Capital Gains (50% taxable)', formatCurrency(data.realizedCapitalGains)]] : []),
                ['Total Investment Income', formatCurrency(data.totalInvestmentIncome || 0)],
            ];

            autoTable(pdf, {
                startY: yPosition,
                head: [['Item', 'Amount']],
                body: investmentSummaryRows,
                theme: 'striped',
                headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9 },
                margin: { left: margin, right: margin },
            });
            yPosition = (pdf as any).lastAutoTable.finalY + 10;

            // Investment Income Details
            if (data.investmentIncome && data.investmentIncome.length > 0) {
                checkPageBreak(30);
                addText('Investment Income Details', 12, true);
                const incomeRows = data.investmentIncome.map((inc: InvestmentIncome) => [
                    inc.investment?.description || 'N/A',
                    inc.income_type,
                    formatDate(inc.income_date),
                    formatCurrency(inc.amount),
                    inc.income_type === 'dividend' ? (inc.is_eligible_dividend ? 'Eligible' : 'Non-eligible') : '-',
                ]);

                autoTable(pdf, {
                    startY: yPosition,
                    head: [['Investment', 'Type', 'Date', 'Amount', 'Eligible Dividend']],
                    body: incomeRows,
                    theme: 'striped',
                    headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
                    styles: { fontSize: 8 },
                    margin: { left: margin, right: margin },
                });
                yPosition = (pdf as any).lastAutoTable.finalY + 10;
            }

            // Investment Sales Details
            if (data.investmentSales && data.investmentSales.length > 0) {
                checkPageBreak(30);
                addText('Investment Sales', 12, true);
                const saleRows = data.investmentSales.map((sale: InvestmentSale) => [
                    sale.investment?.description || 'N/A',
                    formatDate(sale.sale_date),
                    formatCurrency(sale.cost_basis),
                    formatCurrency(sale.sale_amount),
                    formatCurrency(sale.realized_gain_loss),
                    formatCurrency(sale.realized_gain_loss * 0.5),
                ]);

                autoTable(pdf, {
                    startY: yPosition,
                    head: [['Investment', 'Sale Date', 'Cost Basis', 'Sale Proceeds', 'Realized Gain/Loss', 'Taxable (50%)']],
                    body: saleRows,
                    theme: 'striped',
                    headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
                    styles: { fontSize: 8 },
                    margin: { left: margin, right: margin },
                });
                yPosition = (pdf as any).lastAutoTable.finalY + 10;
            }
        }

        // Monthly HST Breakdown (using fiscal year months)
        checkPageBreak(30);
        addText('MONTHLY HST BREAKDOWN', 14, true);
        const monthlyRows: string[][] = [];
        const fyStart = fiscalYearRange.start;
        const fyEnd = fiscalYearRange.end;

        // Generate months within fiscal year
        let currentMonth = new Date(fyStart);
        while (currentMonth <= fyEnd) {
            const month = currentMonth.getMonth() + 1;
            const year = currentMonth.getFullYear();

            const monthInvoices = data.paidInvoices.filter((inv: Invoice) => {
                const invDate = new Date(inv.issue_date);
                return invDate.getMonth() + 1 === month && invDate.getFullYear() === year;
            });
            const monthExpenses = data.expenses.filter((exp: Expense) => {
                const expDate = new Date(exp.expense_date);
                return expDate.getMonth() + 1 === month && expDate.getFullYear() === year;
            });
            const monthClientIncome = (data.clientIncomeEntries || []).filter((entry: IncomeEntry) => {
                const entryDate = new Date(entry.income_date);
                return entryDate.getMonth() + 1 === month && entryDate.getFullYear() === year;
            });

            const hstCollectedFromInvoices = monthInvoices.reduce((sum: number, inv: Invoice) => sum + inv.hst_amount, 0);
            const hstCollectedFromIncome = monthClientIncome.reduce((sum: number, entry: IncomeEntry) => sum + entry.hst_amount, 0);
            const hstCollected = hstCollectedFromInvoices + hstCollectedFromIncome;
            const hstPaid = monthExpenses.reduce((sum: number, exp: Expense) => sum + exp.hst_paid, 0);
            const netHST = hstCollected - hstPaid;

            const monthName = currentMonth.toLocaleString('en-CA', { month: 'long', year: 'numeric' });
            monthlyRows.push([
                monthName,
                formatCurrency(hstCollectedFromInvoices),
                formatCurrency(hstCollectedFromIncome),
                formatCurrency(hstCollected),
                formatCurrency(hstPaid),
                formatCurrency(netHST),
            ]);

            // Move to next month
            currentMonth.setMonth(currentMonth.getMonth() + 1);
        }

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
                div.dividend_type === 'eligible' ? 'Eligible' : 'Non-eligible',
                div.fiscal_year?.toString() || '-',
                div.status,
            ]);

            autoTable(pdf, {
                startY: yPosition,
                head: [['Date', 'Amount', 'Type', 'Fiscal Year', 'Status']],
                body: dividendRows,
                theme: 'striped',
                headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9 },
                margin: { left: margin, right: margin },
            });
            yPosition = (pdf as any).lastAutoTable.finalY + 10;

            // Add T5 Compliance Section
            checkPageBreak(20);
            addText('T5 COMPLIANCE INFORMATION', 12, true);
            yPosition += 8;
            
            let totalT5Slips = 0;
            let missingSINCount = 0;
            
            for (const div of data.dividends) {
                try {
                    const recipients = await api.getDividendRecipients(div.id);
                    totalT5Slips += recipients.length;
                    missingSINCount += recipients.filter(r => r.recipient_type === 'individual' && !r.recipient_sin).length;
                } catch (error) {
                    console.error('Error loading recipients:', error);
                }
            }

            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Total T5 Slips Required: ${totalT5Slips}`, margin, yPosition);
            yPosition += 5;
            if (missingSINCount > 0) {
                pdf.setTextColor(255, 0, 0);
                pdf.text(`Warning: ${missingSINCount} recipient(s) missing SIN numbers`, margin, yPosition);
                pdf.setTextColor(0, 0, 0);
                yPosition += 5;
            }
            pdf.text(`T5 Summary must be filed by February 28 following the tax year.`, margin, yPosition);
            yPosition += 10;
        }

        // Salaries
        if (data.salaries && data.salaries.length > 0) {
            checkPageBreak(30);
            addText('SALARY PAYMENTS', 14, true);
            const salaryRows = data.salaries.map((sal: Salary) => [
                sal.employee ? `${sal.employee.first_name} ${sal.employee.last_name}` : 'Unknown Employee',
                formatDate(sal.payment_date),
                formatDate(sal.period_start) + ' - ' + formatDate(sal.period_end),
                formatCurrency(sal.amount),
                sal.status,
            ]);

            autoTable(pdf, {
                startY: yPosition,
                head: [['Employee', 'Payment Date', 'Period', 'Amount', 'Status']],
                body: salaryRows,
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
            const pdf = await generatePDFFromData(reportData);
            pdf.save(`Comprehensive_Tax_Report_${formatFiscalYear(selectedFiscalYear)}.pdf`);
        } catch (error) {
            console.error('Failed to generate PDF report:', error);
            alert('Failed to generate PDF report. Please try again.');
        } finally {
            setIsGeneratingPDF(false);
        }
    };


    if (!user?.company_id) {
        return (
            <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tight text-white">Reports</h1>
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Comprehensive Tax Report</h1>
                    <p className="text-slate-muted mt-2">Generate a comprehensive tax report with all financial data needed for tax submission</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
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
                        <Calendar className="h-5 w-5 text-slate-muted" />
                        <label className="text-sm font-medium text-white">Fiscal Year:</label>
                        <select
                            value={selectedFiscalYear}
                            onChange={(e) => setSelectedFiscalYear(parseInt(e.target.value))}
                            className="flex h-10 w-auto rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            {fiscalYearEnd ? (
                                getFiscalYearOptions(fiscalYearEnd, 5, 1).map(fy => (
                                    <option key={fy} value={fy}>{formatFiscalYear(fy)}</option>
                                ))
                            ) : (
                                Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))
                            )}
                        </select>
                    </div>
                </div>
            </Card>

            {/* Report Summary */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Income and Expenses */}
                <Card className="p-6">
                    <div className="flex items-center mb-4">
                        <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400 mr-2" />
                        <h3 className="text-lg font-medium text-white">Profit & Loss</h3>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-muted">Gross Income:</span>
                            <span className="font-medium text-white">{formatCurrency(reportData.grossIncome)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-muted">Total Expenses:</span>
                            <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(reportData.totalExpenses)}</span>
                        </div>
                        {reportData.totalSalaries > 0 && (
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-muted">Total Salaries:</span>
                                <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(reportData.totalSalaries)}</span>
                            </div>
                        )}
                        {reportData.totalDepreciationForYear > 0 && (
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-muted">Depreciation:</span>
                                <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(reportData.totalDepreciationForYear)}</span>
                            </div>
                        )}
                        <div className="flex justify-between border-t border-white/10 pt-2">
                            <span className="text-sm font-medium text-white">Active Business Income:</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(reportData.activeBusinessIncome)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-muted">Active Business Tax ({formatPercentage(reportData.smallBusinessTaxRate)}):</span>
                            <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(reportData.activeBusinessTax)}</span>
                        </div>
                        {(reportData.investmentInterest > 0 || reportData.investmentDividends > 0 || reportData.realizedCapitalGains !== 0) && (
                            <>
                                <div className="flex justify-between border-t border-white/10 pt-2">
                                    <span className="text-sm font-medium text-white">Investment Income:</span>
                                    <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(reportData.totalInvestmentIncome)}</span>
                                </div>
                                {reportData.investmentInterest > 0 && (
                                    <div className="flex justify-between ml-4">
                                        <span className="text-sm text-slate-muted">Interest ({formatPercentage(reportData.investmentInterestTaxRate)}):</span>
                                        <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(reportData.investmentInterest)}</span>
                                    </div>
                                )}
                                {reportData.investmentDividends > 0 && (
                                    <div className="flex justify-between ml-4">
                                        <span className="text-sm text-slate-muted">Dividends:</span>
                                        <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(reportData.investmentDividends)}</span>
                                    </div>
                                )}
                                {reportData.realizedCapitalGains !== 0 && (
                                    <div className="flex justify-between ml-4">
                                        <span className="text-sm text-slate-muted">Capital Gains (50%, {formatPercentage(reportData.investmentCapitalGainTaxRate)}):</span>
                                        <span className={`font-medium ${reportData.realizedCapitalGains >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {formatCurrency(reportData.realizedCapitalGains)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-muted">Investment Income Tax:</span>
                                    <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(reportData.totalInvestmentIncomeTax)}</span>
                                </div>
                            </>
                        )}
                        {(reportData.rdtohAddition > 0 || reportData.rdtohRefund > 0 || reportData.rdtohBalance > 0) && (
                            <>
                                <div className="flex justify-between border-t border-white/10 pt-2">
                                    <span className="text-sm font-medium text-white">RDTOH Addition:</span>
                                    <span className="font-bold text-green-600 dark:text-green-400">+{formatCurrency(reportData.rdtohAddition)}</span>
                                </div>
                                {reportData.rdtohRefund > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-slate-muted">RDTOH Refund:</span>
                                        <span className="font-medium text-green-600 dark:text-green-400">-{formatCurrency(reportData.rdtohRefundable)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-muted">RDTOH Balance:</span>
                                    <span className="font-medium text-purple-600 dark:text-purple-400">{formatCurrency(reportData.rdtohBalance)}</span>
                                </div>
                            </>
                        )}
                        <div className="flex justify-between border-t border-white/10 pt-2">
                            <span className="text-sm font-medium text-white">Total Corporate Tax:</span>
                            <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(reportData.totalCorporateTax)}</span>
                        </div>
                        <div className="flex justify-between border-t border-white/10 pt-2">
                            <span className="text-sm font-bold text-white">Net Income (Post-tax):</span>
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
                        <h3 className="text-lg font-medium text-white">HST Summary</h3>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-muted">HST Collected:</span>
                            <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(reportData.hstCollected)}</span>
                        </div>
                        {reportData.isHSTRegistered && (
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-muted">HST Input Tax Credits:</span>
                                <span className="font-medium text-blue-600 dark:text-blue-400">{formatCurrency(reportData.hstInputTaxCredits)}</span>
                            </div>
                        )}
                        {reportData.hstAlreadyPaid > 0 && (
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-muted">HST Already Paid to CRA:</span>
                                <span className="font-medium text-blue-600 dark:text-blue-400">{formatCurrency(reportData.hstAlreadyPaid)}</span>
                            </div>
                        )}
                        <div className="flex justify-between border-t border-white/10 pt-2">
                            <span className="text-sm font-bold text-white">HST to Pay:</span>
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
                        <h3 className="text-lg font-medium text-white">Retained Earnings</h3>
                        <HelpIcon
                            content="Money the business has kept after paying expenses, taxes, and dividends"
                            size="sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-muted">Net Income (Post-tax):</span>
                            <span className="font-medium text-white">{formatCurrency(reportData.netIncomeAfterTax)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-muted">Dividends Paid:</span>
                            <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(reportData.totalDividends)}</span>
                        </div>
                        {reportData.totalOwnerPayments > 0 && (
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-muted">Owner Payments:</span>
                                <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(reportData.totalOwnerPayments)}</span>
                            </div>
                        )}
                        <div className="flex justify-between border-t border-white/10 pt-2">
                            <span className="text-sm font-bold text-white">Retained Earnings:</span>
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
                    <div className="p-6 border-b border-white/10">
                        <h2 className="text-xl font-semibold tracking-tight text-white">Expense Breakdown by Category</h2>
                        <p className="text-sm text-slate-muted mt-1">Total expenses organized by category</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold">
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
                                                <td className="px-6 py-4 font-medium text-white">{cat.name}</td>
                                                <td className="px-6 py-4 text-right text-slate-muted">{cat.count}</td>
                                                <td className="px-6 py-4 text-right font-medium text-white">{formatCurrency(cat.total)}</td>
                                            </tr>
                                        ));
                                })()}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Capital Assets and Depreciation */}
                <Card className="overflow-hidden">
                    <div className="p-6 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold tracking-tight text-white">Capital Assets</h2>
                            <HelpIcon
                                content="CCA (Capital Cost Allowance) is the tax term for depreciation. It's the amount you can deduct each year for the wear and tear of business assets."
                                size="sm"
                            />
                        </div>
                        <p className="text-sm text-slate-muted mt-1">Capital assets with depreciation details for {formatFiscalYear(selectedFiscalYear)}</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-muted/50 p-4 rounded-lg">
                                <div className="text-sm text-slate-muted">Total Capital Asset Cost</div>
                                <div className="text-2xl font-bold text-white mt-1">{formatCurrency(reportData.totalCapitalAssetCost || 0)}</div>
                            </div>
                            <div className="bg-muted/50 p-4 rounded-lg">
                                <div className="text-sm text-slate-muted">Total Accumulated Depreciation</div>
                                <div className="text-2xl font-bold text-white mt-1">{formatCurrency(reportData.totalAccumulatedDepreciation || 0)}</div>
                            </div>
                            <div className="bg-muted/50 p-4 rounded-lg">
                                <div className="text-sm text-slate-muted">Depreciation for {formatFiscalYear(selectedFiscalYear)}</div>
                                <div className="text-2xl font-bold text-white mt-1">{formatCurrency(reportData.totalDepreciationForYear || 0)}</div>
                            </div>
                        </div>
                        {reportData.capitalAssets && reportData.capitalAssets.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold">
                                        <tr>
                                            <th className="px-6 py-3">Asset</th>
                                            <th className="px-6 py-3">Purchase Date</th>
                                            <th className="px-6 py-3">Total Cost</th>
                                            <th className="px-6 py-3">CCA Class</th>
                                            <th className="px-6 py-3 text-right">Depreciation ({formatFiscalYear(selectedFiscalYear)})</th>
                                            <th className="px-6 py-3 text-right">Book Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {reportData.capitalAssets.map((asset: any) => {
                                            const yearDepreciation = asset.yearDepreciationEntries?.reduce((sum: number, entry: DepreciationEntry) => sum + Number(entry.depreciation_amount), 0) || 0;
                                            return (
                                                <tr key={asset.id} className="hover:bg-muted/50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-white">{asset.description}</td>
                                                    <td className="px-6 py-4 text-slate-muted">{formatDate(asset.purchase_date)}</td>
                                                    <td className="px-6 py-4 text-white">{formatCurrency(asset.total_cost)}</td>
                                                    <td className="px-6 py-4 text-slate-muted">{asset.cca_class} ({(Number(asset.cca_rate) * 100).toFixed(2)}%)</td>
                                                    <td className="px-6 py-4 text-right text-white">{formatCurrency(yearDepreciation)}</td>
                                                    <td className="px-6 py-4 text-right font-medium text-white">{formatCurrency(asset.book_value)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-slate-muted text-center py-8">No capital assets recorded for this year</p>
                        )}
                    </div>
                </Card>

                {/* Investment Income */}
                {(reportData.investmentIncome && reportData.investmentIncome.length > 0) || (reportData.investmentSales && reportData.investmentSales.length > 0) ? (
                    <Card className="overflow-hidden">
                        <div className="p-6 border-b border-white/10">
                            <h2 className="text-xl font-semibold tracking-tight text-white">Investment Income & Sales</h2>
                            <p className="text-sm text-slate-muted mt-1">Investment income and realized gains/losses for {formatFiscalYear(selectedFiscalYear)}</p>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-muted/50 p-4 rounded-lg">
                                    <div className="text-sm text-slate-muted">Interest Income</div>
                                    <div className="text-2xl font-bold text-white mt-1">{formatCurrency(reportData.investmentInterest || 0)}</div>
                                </div>
                                <div className="bg-muted/50 p-4 rounded-lg">
                                    <div className="text-sm text-slate-muted">Dividend Income</div>
                                    <div className="text-2xl font-bold text-white mt-1">{formatCurrency(reportData.investmentDividends || 0)}</div>
                                </div>
                                <div className="bg-muted/50 p-4 rounded-lg">
                                    <div className="text-sm text-slate-muted">Realized Capital Gains (50%)</div>
                                    <div className={`text-2xl font-bold mt-1 ${(reportData.realizedCapitalGains || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {formatCurrency(reportData.realizedCapitalGains || 0)}
                                    </div>
                                </div>
                                <div className="bg-muted/50 p-4 rounded-lg">
                                    <div className="text-sm text-slate-muted">Total Investment Income</div>
                                    <div className="text-2xl font-bold text-white mt-1">{formatCurrency(reportData.totalInvestmentIncome || 0)}</div>
                                </div>
                            </div>

                            {reportData.investmentIncome && reportData.investmentIncome.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-4">Investment Income Details</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold">
                                                <tr>
                                                    <th className="px-6 py-3">Investment</th>
                                                    <th className="px-6 py-3">Type</th>
                                                    <th className="px-6 py-3">Date</th>
                                                    <th className="px-6 py-3 text-right">Amount</th>
                                                    <th className="px-6 py-3">Eligible Dividend</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {reportData.investmentIncome.map((inc: InvestmentIncome) => (
                                                    <tr key={inc.id} className="hover:bg-muted/50 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-white">{inc.investment?.description || 'N/A'}</td>
                                                        <td className="px-6 py-4 text-slate-muted capitalize">{inc.income_type}</td>
                                                        <td className="px-6 py-4 text-slate-muted">{formatDate(inc.income_date)}</td>
                                                        <td className="px-6 py-4 text-right font-medium text-white">{formatCurrency(inc.amount)}</td>
                                                        <td className="px-6 py-4">
                                                            {inc.income_type === 'dividend' && (
                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${inc.is_eligible_dividend
                                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                                                                    }`}>
                                                                    {inc.is_eligible_dividend ? 'Eligible' : 'Non-eligible'}
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {reportData.investmentSales && reportData.investmentSales.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-4">Investment Sales</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold">
                                                <tr>
                                                    <th className="px-6 py-3">Investment</th>
                                                    <th className="px-6 py-3">Sale Date</th>
                                                    <th className="px-6 py-3 text-right">Cost Basis</th>
                                                    <th className="px-6 py-3 text-right">Sale Proceeds</th>
                                                    <th className="px-6 py-3 text-right">Realized Gain/Loss</th>
                                                    <th className="px-6 py-3 text-right">Taxable (50%)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {reportData.investmentSales.map((sale: InvestmentSale) => (
                                                    <tr key={sale.id} className="hover:bg-muted/50 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-white">{sale.investment?.description || 'N/A'}</td>
                                                        <td className="px-6 py-4 text-slate-muted">{formatDate(sale.sale_date)}</td>
                                                        <td className="px-6 py-4 text-right text-slate-muted">{formatCurrency(sale.cost_basis)}</td>
                                                        <td className="px-6 py-4 text-right text-white">{formatCurrency(sale.sale_amount)}</td>
                                                        <td className={`px-6 py-4 text-right font-medium ${sale.realized_gain_loss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                            {formatCurrency(sale.realized_gain_loss)}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-white">{formatCurrency(sale.realized_gain_loss * 0.5)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                ) : null}

                {/* HST Period Breakdown (if HST registered and filing frequency is set) */}
                {user?.company?.hst_registered && user?.company?.hst_filing_frequency && hstPeriods.length > 0 && (
                    <Card className="overflow-hidden">
                        <div className="p-6 border-b border-white/10">
                            <h2 className="text-xl font-semibold tracking-tight text-white">HST Filing Period Breakdown</h2>
                            <p className="text-sm text-slate-muted mt-1">
                                HST collected and paid by {user.company.hst_filing_frequency} filing period for {formatFiscalYear(selectedFiscalYear)}
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold">
                                    <tr>
                                        <th className="px-6 py-3">Period</th>
                                        <th className="px-6 py-3">Period Dates</th>
                                        <th className="px-6 py-3 text-right">HST Collected</th>
                                        <th className="px-6 py-3 text-right">HST Paid (ITC)</th>
                                        <th className="px-6 py-3 text-right">Net HST</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {hstPeriods.map((period: HSTPeriod) => {
                                        const periodInvoices = reportData.paidInvoices.filter((inv: Invoice) => {
                                            const invDate = new Date(inv.issue_date);
                                            return invDate >= period.start && invDate <= period.end;
                                        });
                                        const periodExpenses = reportData.expenses.filter((exp: Expense) => {
                                            const expDate = new Date(exp.expense_date);
                                            return expDate >= period.start && expDate <= period.end;
                                        });
                                        const periodClientIncome = (reportData.clientIncomeEntries || []).filter((entry: IncomeEntry) => {
                                            const entryDate = new Date(entry.income_date);
                                            return entryDate >= period.start && entryDate <= period.end;
                                        });

                                        const hstCollectedFromInvoices = periodInvoices.reduce((sum: number, inv: Invoice) => sum + inv.hst_amount, 0);
                                        const hstCollectedFromIncome = periodClientIncome.reduce((sum: number, entry: IncomeEntry) => sum + entry.hst_amount, 0);
                                        const hstCollected = hstCollectedFromInvoices + hstCollectedFromIncome;
                                        const hstPaid = periodExpenses.reduce((sum: number, exp: Expense) => sum + exp.hst_paid, 0);
                                        const netHST = hstCollected - hstPaid;

                                        return (
                                            <tr key={period.period} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-white">
                                                    {formatHSTPeriod(period, user.company!.hst_filing_frequency!)}
                                                </td>
                                                <td className="px-6 py-4 text-slate-muted">
                                                    {formatDate(period.start.toISOString().split('T')[0])} - {formatDate(period.end.toISOString().split('T')[0])}
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-white">{formatCurrency(hstCollected)}</td>
                                                <td className="px-6 py-4 text-right text-slate-muted">{formatCurrency(hstPaid)}</td>
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
                )}

                {/* Monthly HST Breakdown */}
                <Card className="overflow-hidden">
                    <div className="p-6 border-b border-white/10">
                        <h2 className="text-xl font-semibold tracking-tight text-white">Monthly HST Breakdown</h2>
                        <p className="text-sm text-slate-muted mt-1">HST collected and paid by month for {formatFiscalYear(selectedFiscalYear)}</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold">
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
                                {(() => {
                                    const months: Array<{ month: number; year: number; name: string }> = [];
                                    let currentMonth = new Date(fiscalYearRange.start);
                                    while (currentMonth <= fiscalYearRange.end) {
                                        months.push({
                                            month: currentMonth.getMonth() + 1,
                                            year: currentMonth.getFullYear(),
                                            name: currentMonth.toLocaleString('en-CA', { month: 'long', year: 'numeric' }),
                                        });
                                        const nextMonth = new Date(currentMonth);
                                        nextMonth.setMonth(nextMonth.getMonth() + 1);
                                        currentMonth = nextMonth;
                                    }

                                    return months.map(({ month, year, name }) => {
                                        const monthInvoices = reportData.paidInvoices.filter((inv: Invoice) => {
                                            const invDate = new Date(inv.issue_date);
                                            return invDate.getMonth() + 1 === month && invDate.getFullYear() === year;
                                        });
                                        const monthExpenses = reportData.expenses.filter((exp: Expense) => {
                                            const expDate = new Date(exp.expense_date);
                                            return expDate.getMonth() + 1 === month && expDate.getFullYear() === year;
                                        });
                                        const monthClientIncome = (reportData.clientIncomeEntries || []).filter((entry: IncomeEntry) => {
                                            const entryDate = new Date(entry.income_date);
                                            return entryDate.getMonth() + 1 === month && entryDate.getFullYear() === year;
                                        });

                                        const hstCollectedFromInvoices = monthInvoices.reduce((sum: number, inv: Invoice) => sum + inv.hst_amount, 0);
                                        const hstCollectedFromIncome = monthClientIncome.reduce((sum: number, entry: IncomeEntry) => sum + entry.hst_amount, 0);
                                        const hstCollected = hstCollectedFromInvoices + hstCollectedFromIncome;
                                        const hstPaid = monthExpenses.reduce((sum: number, exp: Expense) => sum + exp.hst_paid, 0);
                                        const netHST = hstCollected - hstPaid;

                                        return (
                                            <tr key={`${year}-${month}`} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-white">{name}</td>
                                                <td className="px-6 py-4 text-right text-slate-muted">{formatCurrency(hstCollectedFromInvoices)}</td>
                                                <td className="px-6 py-4 text-right text-slate-muted">{formatCurrency(hstCollectedFromIncome)}</td>
                                                <td className="px-6 py-4 text-right font-medium text-white">{formatCurrency(hstCollected)}</td>
                                                <td className="px-6 py-4 text-right text-slate-muted">{formatCurrency(hstPaid)}</td>
                                                <td className={`px-6 py-4 text-right font-bold ${netHST >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                                    {formatCurrency(netHST)}
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Invoice Summary by Client */}
                <Card className="overflow-hidden">
                    <div className="p-6 border-b border-white/10">
                        <h2 className="text-xl font-semibold tracking-tight text-white">Invoice Summary by Client</h2>
                        <p className="text-sm text-slate-muted mt-1">Total revenue and HST collected per client</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold">
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
                                                <td className="px-6 py-4 font-medium text-white">{client.name}</td>
                                                <td className="px-6 py-4 text-right text-slate-muted">{client.count}</td>
                                                <td className="px-6 py-4 text-right font-medium text-white">{formatCurrency(client.total)}</td>
                                                <td className="px-6 py-4 text-right text-slate-muted">{formatCurrency(client.hst)}</td>
                                            </tr>
                                        ));
                                })()}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Expense Summary by Payment Method */}
                <Card className="overflow-hidden">
                    <div className="p-6 border-b border-white/10">
                        <h2 className="text-xl font-semibold tracking-tight text-white">Expense Summary by Payment Method</h2>
                        <p className="text-sm text-slate-muted mt-1">Expenses categorized by who paid (Corporation vs Owner)</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold">
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
                                                <td className="px-6 py-4 font-medium text-white">{paidBy === 'corp' ? 'Corporation' : 'Owner'}</td>
                                                <td className="px-6 py-4 text-right text-slate-muted">{totals.count}</td>
                                                <td className="px-6 py-4 text-right font-medium text-white">{formatCurrency(totals.total)}</td>
                                                <td className="px-6 py-4 text-right text-slate-muted">{formatCurrency(totals.hst)}</td>
                                            </tr>
                                        ));
                                })()}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Salaries */}
                <Card className="overflow-hidden">
                    <div className="p-6 border-b border-white/10">
                        <h2 className="text-xl font-semibold tracking-tight text-white">Salary Payments</h2>
                        <p className="text-sm text-slate-muted mt-1">All salary payments for {formatFiscalYear(selectedFiscalYear)}</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-3">Employee</th>
                                    <th className="px-6 py-3">Payment Date</th>
                                    <th className="px-6 py-3">Period</th>
                                    <th className="px-6 py-3 text-right">Amount</th>
                                    <th className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {reportData.salaries && reportData.salaries.length > 0 ? (
                                    reportData.salaries.map((sal: Salary) => (
                                        <tr key={sal.id} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-white">{sal.employee ? `${sal.employee.first_name} ${sal.employee.last_name}` : 'Unknown Employee'}</td>
                                            <td className="px-6 py-4 text-slate-muted">{formatDate(sal.payment_date)}</td>
                                            <td className="px-6 py-4 text-slate-muted">{formatDate(sal.period_start)} - {formatDate(sal.period_end)}</td>
                                            <td className="px-6 py-4 text-right font-medium text-white">{formatCurrency(sal.amount)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${sal.status === 'paid'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    }`}>
                                                    {sal.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-muted">No salaries recorded</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Dividends and Owner Payments */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Card className="overflow-hidden">
                        <div className="p-6 border-b border-white/10">
                            <h2 className="text-xl font-semibold tracking-tight text-white">Dividend Distributions</h2>
                            <p className="text-sm text-slate-muted mt-1">All dividends declared and paid</p>
                            {(t5ComplianceStats.eligibleCount > 0 || t5ComplianceStats.nonEligibleCount > 0) && (
                                <div className="mt-2 text-xs text-slate-muted">
                                    Eligible: {t5ComplianceStats.eligibleCount} | Non-eligible: {t5ComplianceStats.nonEligibleCount}
                                </div>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold">
                                    <tr>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Amount</th>
                                        <th className="px-6 py-3">Type</th>
                                        <th className="px-6 py-3">Fiscal Year</th>
                                        <th className="px-6 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {reportData.dividends && reportData.dividends.length > 0 ? (
                                        reportData.dividends.map((div: Dividend) => (
                                            <tr key={div.id} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-6 py-4 text-slate-muted">{formatDate(div.declaration_date)}</td>
                                                <td className="px-6 py-4 font-medium text-white">{formatCurrency(div.amount)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        div.dividend_type === 'eligible'
                                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                            : 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300'
                                                    }`}>
                                                        {div.dividend_type === 'eligible' ? 'Eligible' : 'Non-eligible'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-muted">{div.fiscal_year || '-'}</td>
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
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-muted">No dividends declared</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card className="overflow-hidden">
                        <div className="p-6 border-b border-white/10">
                            <h2 className="text-xl font-semibold tracking-tight text-white">Owner Payments</h2>
                            <p className="text-sm text-slate-muted mt-1">Payments made to owners</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold">
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
                                                <td className="px-6 py-4 text-slate-muted">{formatDate(payment.payment_date)}</td>
                                                <td className="px-6 py-4 text-white">{payment.description}</td>
                                                <td className="px-6 py-4 text-slate-muted">{payment.payment_type}</td>
                                                <td className="px-6 py-4 text-right font-medium text-white">{formatCurrency(payment.amount)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-slate-muted">No owner payments recorded</td>
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
                            <li>• Investment Income and Capital Gains</li>
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
