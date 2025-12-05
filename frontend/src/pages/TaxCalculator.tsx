import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { useQuery } from '@tanstack/react-query';
import { Calendar, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Card from '../components/ui/Card';
import HelpIcon from '../components/ui/HelpIcon';
import { cn } from '../lib/utils';

const TaxCalculator: React.FC = () => {
    const { user } = useAuth();
    const [timePeriod, setTimePeriod] = useState<'month' | 'year'>('year');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [expandedSections, setExpandedSections] = useState<{
        hst: boolean;
        income: boolean;
        expenses: boolean;
        depreciation: boolean;
        investments: boolean;
    }>({
        hst: false,
        income: false,
        expenses: false,
        depreciation: false,
        investments: false,
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

    // Fetch salaries
    const { data: salariesResponse } = useQuery({
        queryKey: ['salaries_tax', user?.company_id, startDate, endDate],
        queryFn: async () => {
            return api.getSalaries({
                company_id: user?.company_id,
                start_date: startDate,
                end_date: endDate,
                limit: 1000,
            });
        },
        enabled: !!user?.company_id,
    });

    // Fetch investment income
    const { data: investmentIncomeResponse } = useQuery({
        queryKey: ['investment_income_tax', user?.company_id, fiscalYear],
        queryFn: async () => {
            return api.getInvestmentIncome({
                company_id: user?.company_id,
                fiscal_year: fiscalYear,
                limit: 1000,
            });
        },
        enabled: !!user?.company_id,
    });

    // Fetch investment sales
    const { data: investmentSalesResponse } = useQuery({
        queryKey: ['investment_sales_tax', user?.company_id, fiscalYear],
        queryFn: async () => {
            return api.getInvestmentSales({
                company_id: user?.company_id,
                fiscal_year: fiscalYear,
                limit: 1000,
            });
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

    // Fetch all investments for breakdown
    const { data: investmentsResponse } = useQuery({
        queryKey: ['investments_tax', user?.company_id],
        queryFn: async () => {
            return api.getInvestments({
                company_id: user?.company_id,
                limit: 1000,
            });
        },
        enabled: !!user?.company_id,
    });

    // Fetch investment transactions to identify reinvested vs non-reinvested income
    const { data: investmentTransactionsResponse } = useQuery({
        queryKey: ['investment_transactions_tax', user?.company_id],
        queryFn: async () => {
            return api.getInvestmentTransactions({
                company_id: user?.company_id,
                limit: 10000,
            });
        },
        enabled: !!user?.company_id,
    });

    // Calculate tax data
    const taxData = useMemo(() => {
        if (!invoicesResponse || !expensesResponse || !incomeResponse || !hstPaymentsResponse || !capitalAssetsResponse || !salariesResponse || !investmentIncomeResponse || !investmentSalesResponse || !dividendsResponse || !investmentsResponse || !investmentTransactionsResponse) {
            return null;
        }

        // Validation: Check for fiscal year alignment issues
        const validationWarnings: string[] = [];

        const invoices = invoicesResponse.data;
        const expenses = expensesResponse.data;
        const incomeEntries = incomeResponse.data;
        const hstPayments = hstPaymentsResponse.data;
        const capitalAssets = capitalAssetsResponse.data;
        const salaries = salariesResponse.data;
        const investmentIncome = investmentIncomeResponse.data;
        const investmentSales = investmentSalesResponse.data;
        const dividends = dividendsResponse.data;
        const investments = investmentsResponse.data;
        const investmentTransactions = investmentTransactionsResponse.data;

        // Check if investment income/sales fiscal_year matches selected fiscal year
        const mismatchedFiscalYears = [
            ...investmentIncome.filter(inc => inc.fiscal_year !== fiscalYear).map(inc => `Investment income entry (ID: ${inc.id}) has fiscal_year ${inc.fiscal_year}, expected ${fiscalYear}`),
            ...investmentSales.filter(sale => sale.fiscal_year !== fiscalYear).map(sale => `Investment sale (ID: ${sale.id}) has fiscal_year ${sale.fiscal_year}, expected ${fiscalYear}`)
        ];

        if (mismatchedFiscalYears.length > 0) {
            validationWarnings.push(`Fiscal year mismatch: ${mismatchedFiscalYears.length} investment entries have different fiscal_year than selected year.`);
        }

        // Validation: Check for missing linked_income_id in reinvestment transactions
        const interestTransactions = investmentTransactions.filter(txn => txn.transaction_type === 'interest');
        const dividendReinvestedTransactions = investmentTransactions.filter(txn => txn.transaction_type === 'dividend_reinvested');
        const missingLinkedIncomeId = [
            ...interestTransactions.filter(txn => !txn.linked_income_id).map(txn => `Interest transaction (ID: ${txn.id}) missing linked_income_id`),
            ...dividendReinvestedTransactions.filter(txn => !txn.linked_income_id).map(txn => `Dividend reinvested transaction (ID: ${txn.id}) missing linked_income_id`)
        ];

        if (missingLinkedIncomeId.length > 0) {
            validationWarnings.push(`Missing linked_income_id: ${missingLinkedIncomeId.length} reinvestment transactions are not linked to income entries. This may affect accuracy.`);
        }

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

        // Filter salaries by date
        const filteredSalaries = salaries.filter(salary => {
            const salaryDate = new Date(salary.payment_date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            return salaryDate >= start && salaryDate <= end;
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
        const totalSalaries = filteredSalaries.reduce((sum, salary) => sum + salary.amount, 0);

        // Calculate Depreciation (CCA) for the fiscal year
        const depreciationEntries = capitalAssets
            .flatMap(asset => asset.depreciation_entries || [])
            .filter(entry => entry.fiscal_year === fiscalYear);
        const totalDepreciation = depreciationEntries.reduce((sum, entry) => sum + entry.depreciation_amount, 0);

        // ===== SEPARATE ACTIVE BUSINESS INCOME FROM INVESTMENT INCOME =====

        // Active Business Income (excludes investment income)
        const activeBusinessIncome = Math.max(0, grossRevenue + otherIncome - totalDeductibleExpenses - totalSalaries - totalDepreciation);

        // Active Business Tax (small business rate)
        const smallBusinessTaxRate = user?.company?.small_business_rate || 0.125;
        const activeBusinessTax = activeBusinessIncome * smallBusinessTaxRate;

        // ===== INVESTMENT INCOME CALCULATIONS =====

        // Interest income - 100% taxable
        const investmentInterestBase = investmentIncome
            .filter(inc => inc.income_type === 'interest')
            .reduce((sum, inc) => sum + Number(inc.amount), 0);

        // Dividend income - eligible dividends get gross-up treatment
        // Canadian tax law: Eligible dividends receive a 38% gross-up (multiply by 1.38)
        // This gross-up reflects the corporate tax already paid by the distributing corporation
        // Non-eligible dividends do not receive a gross-up
        // Note: Gross-up rate is set by CRA and may change by tax year
        const eligibleDividendGrossUp = 1.38; // 38% gross-up for eligible dividends (2024 rate)
        const eligibleDividendsBase = investmentIncome
            .filter(inc => inc.income_type === 'dividend' && inc.is_eligible_dividend)
            .reduce((sum, inc) => sum + Number(inc.amount), 0);
        const nonEligibleDividendsBase = investmentIncome
            .filter(inc => inc.income_type === 'dividend' && !inc.is_eligible_dividend)
            .reduce((sum, inc) => sum + Number(inc.amount), 0);

        // Gross-up eligible dividends
        const eligibleDividendsGrossedUp = eligibleDividendsBase * eligibleDividendGrossUp;
        const investmentDividendsTaxable = eligibleDividendsGrossedUp + nonEligibleDividendsBase;

        // Capital gains and losses - calculate separately first, then net them
        // Note: Each sale's realized_gain_loss is the full gain/loss, we apply 50% inclusion rate
        const totalCapitalGains = investmentSales
            .filter(sale => Number(sale.realized_gain_loss) > 0)
            .reduce((sum, sale) => sum + Number(sale.realized_gain_loss), 0);

        const totalCapitalLosses = Math.abs(investmentSales
            .filter(sale => Number(sale.realized_gain_loss) < 0)
            .reduce((sum, sale) => sum + Number(sale.realized_gain_loss), 0));

        // Get capital loss carryforward from previous years (already at 50% inclusion rate)
        // Note: Carryforward is stored as the 50% included amount (taxable portion)
        const previousCapitalLossCarryforward = user?.company?.capital_loss_carryforward ?? 0;

        // Net capital gains/losses within the current year (losses offset gains in same year)
        // Apply 50% inclusion rate to current year amounts
        const currentYearCapitalGains50 = totalCapitalGains * 0.5;
        const currentYearCapitalLosses50 = totalCapitalLosses * 0.5;
        const currentYearNet = currentYearCapitalGains50 - currentYearCapitalLosses50;

        // Apply carryforward from previous years to current year net gains
        // If current year has net gains, carryforward offsets those gains
        // If current year has net losses, they add to carryforward
        let realizedCapitalGains = 0;
        let realizedCapitalLosses = 0;
        let newCapitalLossCarryforward = 0;

        if (currentYearNet > 0) {
            // Current year has net gains - apply carryforward to offset
            const gainsAfterCarryforward = Math.max(0, currentYearNet - previousCapitalLossCarryforward);
            realizedCapitalGains = gainsAfterCarryforward;
            // Unused carryforward (if any) remains in carryforward
            const unusedCarryforward = Math.max(0, previousCapitalLossCarryforward - currentYearNet);
            newCapitalLossCarryforward = unusedCarryforward;
        } else if (currentYearNet < 0) {
            // Current year has net losses - add to carryforward
            realizedCapitalLosses = currentYearNet;
            // New carryforward = previous carryforward + current year losses (both already at 50% rate)
            newCapitalLossCarryforward = previousCapitalLossCarryforward + Math.abs(currentYearNet);
        } else {
            // Current year is exactly zero - carryforward remains unchanged
            newCapitalLossCarryforward = previousCapitalLossCarryforward;
        }

        // For display purposes, show the net before carryforward
        const netCapitalGainLoss = totalCapitalGains - totalCapitalLosses;

        // Total investment income for display (before tax)
        const totalInvestmentIncome = investmentInterestBase + eligibleDividendsBase + nonEligibleDividendsBase + realizedCapitalGains + realizedCapitalLosses;

        // Investment income tax rates (configurable, with defaults for Ontario 2024)
        // Note: These rates are for Ontario corporations. Rates may vary by province and tax year.
        // Default rates are based on 2024 Ontario combined federal/provincial rates:
        // - Interest: 50.17% (fully taxable)
        // - Eligible dividends: 39.34% (on grossed-up amount)
        // - Non-eligible dividends: 47.74% (on actual amount)
        // - Capital gains: 25.09% (on 50% included amount)
        const investmentInterestTaxRate = user?.company?.investment_interest_tax_rate ?? 0.5017;
        const investmentEligibleDividendTaxRate = user?.company?.investment_eligible_dividend_tax_rate ?? 0.3934;
        const investmentNonEligibleDividendTaxRate = user?.company?.investment_noneligible_dividend_tax_rate ?? 0.4774;
        const investmentCapitalGainTaxRate = user?.company?.investment_capital_gain_tax_rate ?? 0.2509;

        // Validation: Check tax rates are reasonable (0-1 range)
        if (investmentInterestTaxRate < 0 || investmentInterestTaxRate > 1) {
            validationWarnings.push(`Investment interest tax rate (${(investmentInterestTaxRate * 100).toFixed(2)}%) is outside valid range (0-100%)`);
        }
        if (investmentEligibleDividendTaxRate < 0 || investmentEligibleDividendTaxRate > 1) {
            validationWarnings.push(`Eligible dividend tax rate (${(investmentEligibleDividendTaxRate * 100).toFixed(2)}%) is outside valid range (0-100%)`);
        }
        if (investmentNonEligibleDividendTaxRate < 0 || investmentNonEligibleDividendTaxRate > 1) {
            validationWarnings.push(`Non-eligible dividend tax rate (${(investmentNonEligibleDividendTaxRate * 100).toFixed(2)}%) is outside valid range (0-100%)`);
        }
        if (investmentCapitalGainTaxRate < 0 || investmentCapitalGainTaxRate > 1) {
            validationWarnings.push(`Capital gain tax rate (${(investmentCapitalGainTaxRate * 100).toFixed(2)}%) is outside valid range (0-100%)`);
        }

        // Calculate investment income tax separately
        const investmentInterestTax = investmentInterestBase * investmentInterestTaxRate;
        const investmentEligibleDividendTax = eligibleDividendsGrossedUp * investmentEligibleDividendTaxRate;
        const investmentNonEligibleDividendTax = nonEligibleDividendsBase * investmentNonEligibleDividendTaxRate;
        // Tax is only applied to net capital gains (after losses offset gains)
        const investmentCapitalGainTax = Math.max(0, realizedCapitalGains * investmentCapitalGainTaxRate);

        const totalInvestmentIncomeTax = investmentInterestTax + investmentEligibleDividendTax + investmentNonEligibleDividendTax + investmentCapitalGainTax;

        // ===== RDTOH (Refundable Dividend Tax on Hand) CALCULATIONS =====
        // RDTOH is a refundable tax account that prevents double taxation of investment income
        // When a corporation pays tax on investment income, 30.67% of that tax is added to RDTOH
        // When dividends are paid, the corporation can claim a refund from RDTOH
        // Refund rate: $1 refund per $2.61 of dividends paid (as of 2024)
        // Reference: Income Tax Act section 129

        // RDTOH addition: 30.67% of investment income tax is added to RDTOH
        const rdtohRate = 0.3067; // 30.67% (2024 rate, may vary by tax year)
        const rdtohAddition = totalInvestmentIncomeTax * rdtohRate;

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

        // Total corporate tax (active business + investment income)
        const totalCorporateTax = activeBusinessTax + totalInvestmentIncomeTax;

        // Calculate Total Taxes Owed (HST + Corporate Tax - RDTOH refund)
        const totalTaxesOwed = hstOwed + totalCorporateTax - rdtohRefundable;

        // ===== INVESTMENT BREAKDOWN CALCULATIONS =====

        // Filter investment income and sales by fiscal year
        const fiscalYearInvestmentIncome = investmentIncome.filter(inc => inc.fiscal_year === fiscalYear);
        const fiscalYearInvestmentSales = investmentSales.filter(sale => sale.fiscal_year === fiscalYear);

        // Calculate investment-by-investment breakdown
        const investmentBreakdowns = investments.map(investment => {
            // Get income for this investment
            const investmentIncomeForThis = fiscalYearInvestmentIncome.filter(inc => inc.investment_id === investment.id);

            // Get transactions for this investment
            const transactionsForThis = investmentTransactions.filter(txn => txn.investment_id === investment.id);

            // Get sales for this investment
            const salesForThis = fiscalYearInvestmentSales.filter(sale => sale.investment_id === investment.id);

            // Interest income breakdown
            const interestIncome = investmentIncomeForThis
                .filter(inc => inc.income_type === 'interest')
                .reduce((sum, inc) => sum + Number(inc.amount), 0);

            // Reinvested interest - use linked_income_id for accurate matching
            // First, find all interest transactions with linked_income_id
            const reinvestedInterestFromLinked = transactionsForThis
                .filter(txn => txn.transaction_type === 'interest' && txn.linked_income_id)
                .reduce((sum, txn) => sum + Number(txn.amount), 0);

            // Fallback: if no linked_income_id, use transaction type matching (for backward compatibility)
            const reinvestedInterestFromType = transactionsForThis
                .filter(txn => txn.transaction_type === 'interest' && !txn.linked_income_id)
                .reduce((sum, txn) => sum + Number(txn.amount), 0);

            const reinvestedInterest = reinvestedInterestFromLinked + reinvestedInterestFromType;
            const nonReinvestedInterest = interestIncome - reinvestedInterest;

            // Dividend income breakdown
            const totalDividends = investmentIncomeForThis
                .filter(inc => inc.income_type === 'dividend')
                .reduce((sum, inc) => sum + Number(inc.amount), 0);

            const eligibleDividends = investmentIncomeForThis
                .filter(inc => inc.income_type === 'dividend' && inc.is_eligible_dividend)
                .reduce((sum, inc) => sum + Number(inc.amount), 0);

            const nonEligibleDividends = investmentIncomeForThis
                .filter(inc => inc.income_type === 'dividend' && !inc.is_eligible_dividend)
                .reduce((sum, inc) => sum + Number(inc.amount), 0);

            // Reinvested dividends - use linked_income_id for accurate matching
            // First, find all dividend_reinvested transactions with linked_income_id
            const reinvestedDividendsFromLinked = transactionsForThis
                .filter(txn => txn.transaction_type === 'dividend_reinvested' && txn.linked_income_id)
                .reduce((sum, txn) => sum + Number(txn.amount), 0);

            // Fallback: if no linked_income_id, use transaction type matching (for backward compatibility)
            const reinvestedDividendsFromType = transactionsForThis
                .filter(txn => txn.transaction_type === 'dividend_reinvested' && !txn.linked_income_id)
                .reduce((sum, txn) => sum + Number(txn.amount), 0);

            const reinvestedDividends = reinvestedDividendsFromLinked + reinvestedDividendsFromType;
            const nonReinvestedDividends = totalDividends - reinvestedDividends;

            // Capital gains/losses from sales
            const capitalGains = salesForThis
                .filter(sale => Number(sale.realized_gain_loss) > 0)
                .reduce((sum, sale) => sum + Number(sale.realized_gain_loss), 0);

            const capitalLosses = salesForThis
                .filter(sale => Number(sale.realized_gain_loss) < 0)
                .reduce((sum, sale) => sum + Number(sale.realized_gain_loss), 0);

            // Calculate cost basis for sales (if any sales exist)
            // For multiple sales, calculate cost basis per sale chronologically
            let costBasisBreakdown = null;
            if (salesForThis.length > 0) {
                // Sort sales by date to calculate cost basis chronologically
                const sortedSales = [...salesForThis].sort((a, b) => {
                    const dateA = new Date(a.sale_date).getTime();
                    const dateB = new Date(b.sale_date).getTime();
                    if (dateA !== dateB) return dateA - dateB;
                    return a.id - b.id;
                });

                // Calculate cost basis for each sale chronologically
                const salesWithCostBasis = sortedSales.map((sale, index) => {
                    const saleDate = new Date(sale.sale_date);

                    // Get all transactions up to and including this sale date
                    const transactionsUpToSale = transactionsForThis.filter(txn => {
                        const txnDate = new Date(txn.transaction_date);
                        return txnDate <= saleDate;
                    });

                    // Calculate cost basis components up to this sale
                    const contributions = transactionsUpToSale
                        .filter(txn => txn.transaction_type === 'contribution')
                        .reduce((sum, txn) => sum + Number(txn.amount), 0);

                    const reinvestedInterest = transactionsUpToSale
                        .filter(txn => txn.transaction_type === 'interest')
                        .reduce((sum, txn) => sum + Number(txn.amount), 0);

                    const reinvestedDividends = transactionsUpToSale
                        .filter(txn => txn.transaction_type === 'dividend_reinvested')
                        .reduce((sum, txn) => sum + Number(txn.amount), 0);

                    const withdrawals = Math.abs(transactionsUpToSale
                        .filter(txn => txn.transaction_type === 'withdrawal')
                        .reduce((sum, txn) => sum + Number(txn.amount), 0));

                    // Subtract cost basis from previous sales (for partial sales)
                    const previousSalesCostBasis = sortedSales
                        .slice(0, index)
                        .reduce((sum, prevSale) => sum + Number(prevSale.cost_basis), 0);

                    const calculatedCostBasis = contributions + reinvestedInterest + reinvestedDividends - withdrawals - previousSalesCostBasis;

                    return {
                        sale,
                        contributions,
                        reinvestedInterest,
                        reinvestedDividends,
                        withdrawals,
                        previousSalesCostBasis,
                        calculatedCostBasis,
                        actualCostBasis: Number(sale.cost_basis),
                    };
                });

                // For summary, calculate total cost basis components across all sales
                const totalContributions = transactionsForThis
                    .filter(txn => txn.transaction_type === 'contribution')
                    .reduce((sum, txn) => sum + Number(txn.amount), 0);

                const totalReinvestedInterest = transactionsForThis
                    .filter(txn => txn.transaction_type === 'interest')
                    .reduce((sum, txn) => sum + Number(txn.amount), 0);

                const totalReinvestedDividends = transactionsForThis
                    .filter(txn => txn.transaction_type === 'dividend_reinvested')
                    .reduce((sum, txn) => sum + Number(txn.amount), 0);

                const totalWithdrawals = Math.abs(transactionsForThis
                    .filter(txn => txn.transaction_type === 'withdrawal')
                    .reduce((sum, txn) => sum + Number(txn.amount), 0));

                const totalActualCostBasis = salesForThis.reduce((sum, sale) => sum + Number(sale.cost_basis), 0);
                const totalCalculatedCostBasis = totalContributions + totalReinvestedInterest + totalReinvestedDividends - totalWithdrawals;

                costBasisBreakdown = {
                    contributions: totalContributions,
                    reinvestedInterest: totalReinvestedInterest,
                    reinvestedDividends: totalReinvestedDividends,
                    withdrawals: totalWithdrawals,
                    calculatedCostBasis: totalCalculatedCostBasis,
                    actualCostBasis: totalActualCostBasis,
                    salesBreakdown: salesWithCostBasis, // Per-sale breakdown for detailed view
                };
            }

            return {
                investment,
                interestIncome,
                reinvestedInterest,
                nonReinvestedInterest,
                totalDividends,
                eligibleDividends,
                nonEligibleDividends,
                reinvestedDividends,
                nonReinvestedDividends,
                capitalGains,
                capitalLosses,
                sales: salesForThis,
                costBasisBreakdown,
            };
        });

        // Calculate total reinvested amounts
        const totalReinvestedInterest = investmentBreakdowns.reduce((sum, breakdown) => sum + breakdown.reinvestedInterest, 0);
        const totalReinvestedDividends = investmentBreakdowns.reduce((sum, breakdown) => sum + breakdown.reinvestedDividends, 0);

        // Calculate reinvestment summary
        const reinvestmentSummary = {
            totalReinvestedInterest,
            totalReinvestedDividends,
            totalReinvested: totalReinvestedInterest + totalReinvestedDividends,
            // Compound interest effect: reinvested amounts will earn future returns
            // This is informational - the actual tax impact is already captured in current year income
        };

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

            // Investment Income Data
            investmentInterest: investmentInterestBase,
            investmentDividends: eligibleDividendsBase + nonEligibleDividendsBase,
            eligibleDividendsBase,
            nonEligibleDividendsBase,
            eligibleDividendsGrossedUp,
            investmentDividendsTaxable,
            totalCapitalGains,
            totalCapitalLosses,
            netCapitalGainLoss,
            previousCapitalLossCarryforward,
            newCapitalLossCarryforward,
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

            // Investment Breakdown Data
            investmentBreakdowns,
            reinvestmentSummary,

            // Summary
            totalTaxesOwed,

            // Validation warnings
            validationWarnings,
        };
    }, [invoicesResponse, expensesResponse, incomeResponse, hstPaymentsResponse, capitalAssetsResponse, salariesResponse, investmentIncomeResponse, investmentSalesResponse, dividendsResponse, investmentsResponse, investmentTransactionsResponse, startDate, endDate, fiscalYear, user?.company]);

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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Tax Calculator</h1>
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
                            className="flex h-10 w-auto rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                    </div>
                </div>
            </div>

            {/* Total Taxes Owed Summary */}
            <Card className={cn(
                "p-6",
                taxData.totalTaxesOwed > 0
                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                    : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
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
                                ? "text-red-600 dark:text-red-400"
                                : "text-green-600 dark:text-green-400"
                        )}>
                            {formatCurrency(taxData.totalTaxesOwed)}
                        </div>
                        {taxData.totalTaxesOwed < 0 && (
                            <p className="text-sm text-green-600 dark:text-green-400 mt-1">Refund/Credit</p>
                        )}
                    </div>
                </div>
            </Card>

            {/* HST to Pay Section */}
            <div className="space-y-4">
                <Card className="p-6 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
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
                        <div className="bg-background rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                            <div className="text-sm text-slate-muted mb-1">HST Collected</div>
                            <div className="text-2xl font-bold text-white">{formatCurrency(taxData.hstCollected)}</div>
                        </div>
                        <div className="bg-background rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="text-sm text-slate-muted">HST Credits from Expenses</div>
                                <HelpIcon
                                    content="HST you paid on business expenses that you can claim back as a credit against HST you collected. This reduces the amount of HST you owe to the government."
                                    size="sm"
                                />
                            </div>
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {taxData.isHSTRegistered ? formatCurrency(taxData.hstInputTaxCredits) : '$0.00 (Not HST Registered)'}
                            </div>
                        </div>
                        <div className="bg-background rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                            <div className="text-sm text-slate-muted mb-1">HST Already Paid to CRA</div>
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(taxData.hstAlreadyPaid)}</div>
                        </div>
                        <div className={cn(
                            "bg-background rounded-lg p-4 border-2",
                            taxData.hstOwed > 0
                                ? "border-red-300 dark:border-red-700"
                                : "border-green-300 dark:border-green-700"
                        )}>
                            <div className="text-sm text-slate-muted mb-1">Net HST Owed</div>
                            <div className={cn(
                                "text-2xl font-bold",
                                taxData.hstOwed > 0
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-green-600 dark:text-green-400"
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
                <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
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
                        <div className="bg-background rounded-lg p-4 border-2 border-blue-300 dark:border-blue-700">
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
                                        <div className="text-lg font-bold text-red-600 dark:text-red-400">-{formatCurrency(taxData.totalDeductibleExpenses)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-slate-muted mb-1">Salaries</div>
                                        <div className="text-lg font-bold text-red-600 dark:text-red-400">-{formatCurrency(taxData.totalSalaries)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-slate-muted mb-1">Depreciation (CCA)</div>
                                        <div className="text-lg font-bold text-red-600 dark:text-red-400">-{formatCurrency(taxData.totalDepreciation)}</div>
                                    </div>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="text-sm font-medium text-white">Active Business Income</div>
                                        <div className="text-sm text-slate-muted">Tax Rate: {formatPercentage(taxData.smallBusinessTaxRate)}</div>
                                    </div>
                                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(taxData.activeBusinessIncome)}</div>
                                    <div className="text-sm text-slate-muted mt-1">Tax: {formatCurrency(taxData.activeBusinessTax)}</div>
                                </div>
                            </div>
                        </div>

                        {/* Investment Income Section */}
                        {taxData.totalInvestmentIncome !== 0 && (
                            <div className="bg-background rounded-lg p-4 border-2 border-green-300 dark:border-green-700">
                                <h3 className="text-lg font-semibold text-white mb-3">Investment Income</h3>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                        {taxData.investmentInterest > 0 && (
                                            <div>
                                                <div className="text-sm text-slate-muted mb-1">Interest Income</div>
                                                <div className="text-lg font-bold text-white">{formatCurrency(taxData.investmentInterest)}</div>
                                                <div className="text-xs text-slate-muted">Tax: {formatCurrency(taxData.investmentInterestTax)} ({formatPercentage(taxData.investmentInterestTaxRate)})</div>
                                            </div>
                                        )}
                                        {(taxData.eligibleDividendsBase > 0 || taxData.nonEligibleDividendsBase > 0) && (
                                            <div>
                                                <div className="text-sm text-slate-muted mb-1">Dividend Income</div>
                                                <div className="text-lg font-bold text-white">{formatCurrency(taxData.eligibleDividendsBase + taxData.nonEligibleDividendsBase)}</div>
                                                {taxData.eligibleDividendsBase > 0 && (
                                                    <div className="text-xs text-slate-muted">Eligible: {formatCurrency(taxData.eligibleDividendsBase)} (grossed-up: {formatCurrency(taxData.eligibleDividendsGrossedUp)})</div>
                                                )}
                                                {taxData.nonEligibleDividendsBase > 0 && (
                                                    <div className="text-xs text-slate-muted">Non-eligible: {formatCurrency(taxData.nonEligibleDividendsBase)}</div>
                                                )}
                                                <div className="text-xs text-slate-muted mt-1">Tax: {formatCurrency(taxData.investmentEligibleDividendTax + taxData.investmentNonEligibleDividendTax)}</div>
                                            </div>
                                        )}
                                        {(taxData.realizedCapitalGains !== 0 || taxData.realizedCapitalLosses < 0 || taxData.previousCapitalLossCarryforward > 0) && (
                                            <div>
                                                <div className="text-sm text-slate-muted mb-1">Net Capital Gains/Losses</div>
                                                {taxData.totalCapitalGains > 0 && (
                                                    <div className="text-xs text-slate-muted mb-1">
                                                        Total Gains: {formatCurrency(taxData.totalCapitalGains)} •
                                                        Total Losses: {formatCurrency(taxData.totalCapitalLosses)}
                                                    </div>
                                                )}
                                                {taxData.previousCapitalLossCarryforward > 0 && (
                                                    <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                                                        Previous Year Carryforward: {formatCurrency(taxData.previousCapitalLossCarryforward)}
                                                    </div>
                                                )}
                                                <div className={`text-lg font-bold ${taxData.netCapitalGainLoss >= 0 ? 'text-white' : 'text-red-600 dark:text-red-400'}`}>
                                                    {taxData.realizedCapitalGains > 0
                                                        ? `Net Gain (after carryforward): ${formatCurrency(taxData.realizedCapitalGains)} (50% taxable)`
                                                        : taxData.realizedCapitalLosses < 0
                                                            ? `Net Loss: ${formatCurrency(taxData.realizedCapitalLosses)} (50% deductible)`
                                                            : `Net: ${formatCurrency(taxData.netCapitalGainLoss)}`
                                                    }
                                                </div>
                                                {taxData.realizedCapitalGains > 0 && (
                                                    <div className="text-xs text-slate-muted mt-1">Tax: {formatCurrency(taxData.investmentCapitalGainTax)} ({formatPercentage(taxData.investmentCapitalGainTaxRate)})</div>
                                                )}
                                                {taxData.newCapitalLossCarryforward > 0 && (
                                                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                        New Carryforward Balance: {formatCurrency(taxData.newCapitalLossCarryforward)} (available for future years)
                                                    </div>
                                                )}
                                                {taxData.netCapitalGainLoss < 0 && taxData.newCapitalLossCarryforward === 0 && (
                                                    <div className="text-xs text-slate-muted mt-1">Note: Capital losses offset gains in the same year. Unused losses can be carried forward.</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-muted/50 rounded-lg p-3 border border-green-200 dark:border-green-800">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="text-sm font-medium text-white">Total Investment Income Tax</div>
                                        </div>
                                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(taxData.totalInvestmentIncomeTax)}</div>
                                    </div>

                                    {/* Reinvestment Summary */}
                                    {taxData.reinvestmentSummary.totalReinvested > 0 && (
                                        <div className="bg-muted/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
                                            <div className="text-sm font-medium text-white mb-2">Reinvestment Summary</div>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <div className="text-xs text-slate-muted">Reinvested Interest</div>
                                                    <div className="text-base font-semibold text-green-600 dark:text-green-400">
                                                        {formatCurrency(taxData.reinvestmentSummary.totalReinvestedInterest)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-slate-muted">Reinvested Dividends</div>
                                                    <div className="text-base font-semibold text-green-600 dark:text-green-400">
                                                        {formatCurrency(taxData.reinvestmentSummary.totalReinvestedDividends)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-slate-muted mt-2">
                                                Note: Reinvested income is still fully taxable in the year earned, but increases cost basis for future sales.
                                            </div>
                                        </div>
                                    )}

                                    {/* Expandable Investment Breakdown */}
                                    {taxData.investmentBreakdowns.length > 0 && (
                                        <div className="mt-4">
                                            <button
                                                onClick={() => toggleSection('investments')}
                                                className="flex items-center justify-between w-full text-left text-sm font-semibold text-white hover:text-green-400 transition-colors mb-2"
                                            >
                                                <span>Investment-by-Investment Breakdown</span>
                                                {expandedSections.investments ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </button>
                                            {expandedSections.investments && (
                                                <div className="space-y-3 mt-2">
                                                    {taxData.investmentBreakdowns
                                                        .filter(breakdown =>
                                                            breakdown.interestIncome > 0 ||
                                                            breakdown.totalDividends > 0 ||
                                                            breakdown.capitalGains !== 0 ||
                                                            breakdown.capitalLosses !== 0
                                                        )
                                                        .map((breakdown) => (
                                                            <Card key={breakdown.investment.id} className="p-4 bg-background border border-green-200 dark:border-green-800">
                                                                <div className="mb-3">
                                                                    <div className="font-semibold text-white">{breakdown.investment.description}</div>
                                                                    <div className="text-xs text-slate-muted">
                                                                        {breakdown.investment.symbol && `${breakdown.investment.symbol} • `}
                                                                        {breakdown.investment.investment_type === 'stock' ? 'Stock' : 'GIC / Savings Account'}
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    {/* Interest Income */}
                                                                    {breakdown.interestIncome > 0 && (
                                                                        <div className="text-sm">
                                                                            <div className="text-slate-muted mb-1">Interest Income</div>
                                                                            <div className="font-medium text-white">{formatCurrency(breakdown.interestIncome)}</div>
                                                                            {breakdown.reinvestedInterest > 0 && (
                                                                                <div className="text-xs text-slate-muted mt-1">
                                                                                    Reinvested: {formatCurrency(breakdown.reinvestedInterest)} •
                                                                                    Non-reinvested: {formatCurrency(breakdown.nonReinvestedInterest)}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* Dividend Income */}
                                                                    {breakdown.totalDividends > 0 && (
                                                                        <div className="text-sm">
                                                                            <div className="text-slate-muted mb-1">Dividend Income</div>
                                                                            <div className="font-medium text-white">{formatCurrency(breakdown.totalDividends)}</div>
                                                                            {breakdown.eligibleDividends > 0 && (
                                                                                <div className="text-xs text-slate-muted">Eligible: {formatCurrency(breakdown.eligibleDividends)}</div>
                                                                            )}
                                                                            {breakdown.nonEligibleDividends > 0 && (
                                                                                <div className="text-xs text-slate-muted">Non-eligible: {formatCurrency(breakdown.nonEligibleDividends)}</div>
                                                                            )}
                                                                            {breakdown.reinvestedDividends > 0 && (
                                                                                <div className="text-xs text-slate-muted mt-1">
                                                                                    Reinvested: {formatCurrency(breakdown.reinvestedDividends)} •
                                                                                    Non-reinvested: {formatCurrency(breakdown.nonReinvestedDividends)}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* Capital Gains/Losses */}
                                                                    {(breakdown.capitalGains > 0 || breakdown.capitalLosses < 0) && (
                                                                        <div className="text-sm">
                                                                            <div className="text-slate-muted mb-1">Capital Gains/Losses</div>
                                                                            {breakdown.capitalGains > 0 && (
                                                                                <div className="font-medium text-green-600 dark:text-green-400">
                                                                                    Gains: {formatCurrency(breakdown.capitalGains)} (50% taxable: {formatCurrency(breakdown.capitalGains * 0.5)})
                                                                                </div>
                                                                            )}
                                                                            {breakdown.capitalLosses < 0 && (
                                                                                <div className="font-medium text-red-600 dark:text-red-400">
                                                                                    Losses: {formatCurrency(breakdown.capitalLosses)} (50% deductible: {formatCurrency(breakdown.capitalLosses * 0.5)})
                                                                                </div>
                                                                            )}

                                                                            {/* Cost Basis Breakdown */}
                                                                            {breakdown.costBasisBreakdown && (
                                                                                <div className="mt-2 pt-2 border-t border-border">
                                                                                    <div className="text-xs text-slate-muted mb-1">Cost Basis Breakdown</div>
                                                                                    <div className="text-xs space-y-1">
                                                                                        <div className="flex justify-between">
                                                                                            <span className="text-slate-muted">Contributions:</span>
                                                                                            <span className="text-white">{formatCurrency(breakdown.costBasisBreakdown.contributions)}</span>
                                                                                        </div>
                                                                                        {breakdown.costBasisBreakdown.reinvestedInterest > 0 && (
                                                                                            <div className="flex justify-between">
                                                                                                <span className="text-slate-muted">+ Reinvested Interest:</span>
                                                                                                <span className="text-green-600 dark:text-green-400">{formatCurrency(breakdown.costBasisBreakdown.reinvestedInterest)}</span>
                                                                                            </div>
                                                                                        )}
                                                                                        {breakdown.costBasisBreakdown.reinvestedDividends > 0 && (
                                                                                            <div className="flex justify-between">
                                                                                                <span className="text-slate-muted">+ Reinvested Dividends:</span>
                                                                                                <span className="text-green-600 dark:text-green-400">{formatCurrency(breakdown.costBasisBreakdown.reinvestedDividends)}</span>
                                                                                            </div>
                                                                                        )}
                                                                                        {breakdown.costBasisBreakdown.withdrawals > 0 && (
                                                                                            <div className="flex justify-between">
                                                                                                <span className="text-slate-muted">- Withdrawals:</span>
                                                                                                <span className="text-red-600 dark:text-red-400">{formatCurrency(breakdown.costBasisBreakdown.withdrawals)}</span>
                                                                                            </div>
                                                                                        )}
                                                                                        <div className="flex justify-between font-medium pt-1 border-t border-border">
                                                                                            <span className="text-white">Total Calculated Cost Basis:</span>
                                                                                            <span className="text-white">{formatCurrency(breakdown.costBasisBreakdown.calculatedCostBasis)}</span>
                                                                                        </div>
                                                                                        <div className="flex justify-between font-medium">
                                                                                            <span className="text-white">Total Actual Cost Basis (from sales):</span>
                                                                                            <span className="text-white">{formatCurrency(breakdown.costBasisBreakdown.actualCostBasis)}</span>
                                                                                        </div>
                                                                                        {Math.abs(breakdown.costBasisBreakdown.calculatedCostBasis - breakdown.costBasisBreakdown.actualCostBasis) > 0.01 && (
                                                                                            <div className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">
                                                                                                ⚠️ Discrepancy detected. Verify cost basis calculations.
                                                                                            </div>
                                                                                        )}
                                                                                        {breakdown.costBasisBreakdown.salesBreakdown && breakdown.costBasisBreakdown.salesBreakdown.length > 1 && (
                                                                                            <div className="mt-2 pt-2 border-t border-border">
                                                                                                <div className="text-xs text-slate-muted mb-1">Per-Sale Cost Basis:</div>
                                                                                                {breakdown.costBasisBreakdown.salesBreakdown.map((saleBreakdown, idx) => (
                                                                                                    <div key={idx} className="text-xs mb-2 pl-2 border-l-2 border-border">
                                                                                                        <div className="font-medium text-white mb-1">
                                                                                                            Sale {idx + 1}: {formatDate(saleBreakdown.sale.sale_date)} - {formatCurrency(saleBreakdown.sale.sale_amount)}
                                                                                                        </div>
                                                                                                        <div className="text-slate-muted">
                                                                                                            Cost Basis: {formatCurrency(saleBreakdown.actualCostBasis)} |
                                                                                                            Calculated: {formatCurrency(saleBreakdown.calculatedCostBasis)}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </Card>
                                                        ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* RDTOH Section */}
                        {(taxData.totalInvestmentIncomeTax > 0 || taxData.rdtohBalance > 0 || taxData.dividendsPaid > 0) && (
                            <div className="bg-background rounded-lg p-4 border-2 border-purple-300 dark:border-purple-700">
                                <div className="flex items-center gap-2 mb-3">
                                    <h3 className="text-lg font-semibold text-white">Refundable Tax Account</h3>
                                    <HelpIcon
                                        content="RDTOH (Refundable Dividend Tax on Hand) is a tax account that accumulates when you pay tax on investment income. When you pay dividends, you can get a refund from this account ($1 refund per $2.61 of dividends paid). This helps prevent double taxation of investment income."
                                        size="sm"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {taxData.totalInvestmentIncomeTax > 0 && (
                                            <div>
                                                <div className="text-sm text-slate-muted mb-1">RDTOH Addition (30.67% of investment tax)</div>
                                                <div className="text-lg font-bold text-green-600 dark:text-green-400">+{formatCurrency(taxData.rdtohAddition)}</div>
                                            </div>
                                        )}
                                        {taxData.dividendsPaid > 0 && (
                                            <div>
                                                <div className="text-sm text-slate-muted mb-1">Dividends Paid</div>
                                                <div className="text-lg font-bold text-white">{formatCurrency(taxData.dividendsPaid)}</div>
                                                <div className="text-xs text-slate-muted">RDTOH Refund: {formatCurrency(taxData.rdtohRefund)} ($1 per $2.61 dividend)</div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-muted/50 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="text-sm font-medium text-white">RDTOH Balance</div>
                                        </div>
                                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(taxData.rdtohBalance)}</div>
                                        {taxData.rdtohRefundable > 0 && (
                                            <div className="text-sm text-green-600 dark:text-green-400 mt-1">Refundable: {formatCurrency(taxData.rdtohRefundable)}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Total Corporate Tax */}
                        <div className={cn(
                            "bg-background rounded-lg p-4 border-2",
                            taxData.totalCorporateTax > 0
                                ? "border-red-300 dark:border-red-700"
                                : "border-green-300 dark:border-green-700"
                        )}>
                            <div className="text-sm text-slate-muted mb-1">Total Corporate Income Tax</div>
                            <div className="text-3xl font-bold text-white mb-2">{formatCurrency(taxData.totalCorporateTax)}</div>
                            <div className="text-sm text-slate-muted">
                                Active Business: {formatCurrency(taxData.activeBusinessTax)} + Investment: {formatCurrency(taxData.totalInvestmentIncomeTax)}
                                {taxData.rdtohRefundable > 0 && (
                                    <span className="text-green-600 dark:text-green-400"> - RDTOH Refund: {formatCurrency(taxData.rdtohRefundable)}</span>
                                )}
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
                                    <h3 className="text-sm font-semibold text-white mb-2">Salaries ({taxData.filteredSalaries.length} items)</h3>
                                    <div className="bg-background rounded-lg border border-white/10 overflow-hidden max-h-64 overflow-y-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-3">Date</th>
                                                    <th className="px-4 py-3">Employee</th>
                                                    <th className="px-4 py-3 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {taxData.filteredSalaries.map((salary) => (
                                                    <tr key={salary.id} className="hover:bg-muted/50 transition-colors">
                                                        <td className="px-4 py-3 text-slate-muted">{formatDate(salary.payment_date)}</td>
                                                        <td className="px-4 py-3 text-white">{salary.employee_name}</td>
                                                        <td className="px-4 py-3 text-right text-white">{formatCurrency(salary.amount)}</td>
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
                </Card>
            </div>

            {/* Validation Warnings */}
            {taxData.validationWarnings && taxData.validationWarnings.length > 0 && (
                <Card className="p-6 border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
                    <div className="flex items-start">
                        <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
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
            <Card className="p-6 border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-start">
                    <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Important Notes</h3>
                        <ul className="text-sm text-slate-muted space-y-2 list-disc list-inside">
                            <li>HST Input Tax Credits (ITCs) are only available if your company is HST registered.</li>
                            <li>Capital contributions are not included in taxable income.</li>
                            <li>Depreciation (CCA) reduces taxable income and is calculated based on fiscal year.</li>
                            <li><strong>Active business income</strong> is taxed at the small business rate (12.5% default).</li>
                            <li><strong>Investment income</strong> (interest, dividends, capital gains) is taxed at higher rates and tracked separately.</li>
                            <li><strong>RDTOH (Refundable Dividend Tax on Hand)</strong>: 30.67% of investment income tax is added to RDTOH, which becomes refundable when dividends are paid ($1 refund per $2.61 of dividends). Reference: Income Tax Act section 129.</li>
                            <li>Eligible dividends receive a 38% gross-up before tax calculation (2024 rate, set by CRA).</li>
                            <li>Capital gains and losses are netted in the same year (losses offset gains). Capital gains are included at 50% (half the gain is taxable).</li>
                            <li>Unused capital losses can be carried forward indefinitely to offset future capital gains. The carryforward balance is stored and applied automatically.</li>
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
