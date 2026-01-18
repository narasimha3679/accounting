import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api, { type Investment } from '../lib/api';
import { Plus, Edit, Trash2, DollarSign, X, TrendingUp, Building2, Coins, RefreshCw } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { cn } from '../lib/utils';
import { getFiscalYear, getCurrentFiscalYear } from '../lib/fiscalYear';
import { getStockPrices } from '../lib/stockApi';

const Investments: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
    const [updatingPrices, setUpdatingPrices] = useState(false);

    // Fetch investments
    const { data: investments, isLoading } = useQuery({
        queryKey: ['investments', user?.company_id],
        queryFn: async () => {
            const result = await api.getInvestments({
                company_id: user?.company_id,
                limit: 1000
            });
            return result.data;
        },
        enabled: !!user?.company_id,
    });

    // Fetch investment income
    const { data: investmentIncome } = useQuery({
        queryKey: ['investment_income', user?.company_id],
        queryFn: async () => {
            const result = await api.getInvestmentIncome({
                company_id: user?.company_id,
                limit: 1000
            });
            return result.data;
        },
        enabled: !!user?.company_id,
    });

    // Fetch investment sales
    const { data: investmentSales } = useQuery({
        queryKey: ['investment_sales', user?.company_id],
        queryFn: async () => {
            const result = await api.getInvestmentSales({
                company_id: user?.company_id,
                limit: 1000
            });
            return result.data;
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

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this investment?')) {
            try {
                await api.deleteInvestment(id);
                queryClient.invalidateQueries({ queryKey: ['investments'] });
            } catch (error) {
                console.error('Error deleting investment:', error);
                alert('Failed to delete investment');
            }
        }
    };

    const updateStockPrices = async () => {
        if (!investments) return;
        const stockInvestments = investments.filter(
            (inv) => inv.investment_type === 'stock' && inv.symbol && inv.status === 'active'
        );
        if (stockInvestments.length === 0) return;

        setUpdatingPrices(true);
        try {
            const normalizedSymbols = Array.from(new Set(
                stockInvestments
                    .map(inv => inv.symbol?.trim())
                    .filter((symbol): symbol is string => Boolean(symbol))
                    .map(symbol => symbol.toUpperCase())
            ));
            const prices = await getStockPrices(normalizedSymbols);

            const updates = stockInvestments.map(async (investment) => {
                const symbol = investment.symbol?.trim().toUpperCase();
                if (!symbol) return;
                const priceData = prices[symbol];
                if (!priceData || Number.isNaN(priceData.price)) return;
                await api.updateInvestment(investment.id, { current_value: priceData.price });
            });

            await Promise.all(updates);
            queryClient.invalidateQueries({ queryKey: ['investments'] });
        } catch (error) {
            console.error('Error updating stock prices:', error);
            alert('Failed to update stock prices');
        } finally {
            setUpdatingPrices(false);
        }
    };

    // Calculate investment statistics
    const investmentStats = useMemo(() => {
        if (!investments || !investmentIncome || !investmentSales) return null;

        const activeInvestments = investments.filter(inv => inv.status === 'active');
        const totalInvested = activeInvestments.reduce((sum, inv) => sum + Number(inv.purchase_amount), 0);

        const fiscalYearEnd = user?.company?.fiscal_year_end;
        const currentFiscalYear = fiscalYearEnd ? getCurrentFiscalYear(fiscalYearEnd) : new Date().getFullYear();
        const yearIncome = investmentIncome
            .filter(inc => {
                if (fiscalYearEnd) {
                    return getFiscalYear(new Date(inc.income_date), fiscalYearEnd) === currentFiscalYear;
                } else {
                    return new Date(inc.income_date).getFullYear() === currentFiscalYear;
                }
            })
            .reduce((sum, inc) => sum + Number(inc.amount), 0);

        const yearSales = investmentSales
            .filter(sale => {
                if (fiscalYearEnd) {
                    return getFiscalYear(new Date(sale.sale_date), fiscalYearEnd) === currentFiscalYear;
                } else {
                    return new Date(sale.sale_date).getFullYear() === currentFiscalYear;
                }
            })
            .reduce((sum, sale) => sum + Number(sale.realized_gain_loss), 0);

        // Calculate unrealized gains for stocks
        const stocks = activeInvestments.filter(inv => inv.investment_type === 'stock');
        const unrealizedGains = stocks.reduce((sum, stock) => {
            const currentValue = stock.current_value || stock.purchase_amount;
            return sum + (currentValue - stock.purchase_amount);
        }, 0);

        const totalReturn = yearIncome + yearSales + unrealizedGains;
        const returnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

        return {
            totalInvested,
            yearIncome,
            unrealizedGains,
            totalReturn,
            returnPercentage,
            activeCount: activeInvestments.length,
        };
    }, [investments, investmentIncome, investmentSales]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 px-1 sm:px-0">
            <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Investments</h1>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1.5 sm:mt-2">Track corporate investments in stocks and GICs</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    {investments && investments.some(inv => inv.investment_type === 'stock' && inv.symbol && inv.status === 'active') && (
                        <Button
                            onClick={updateStockPrices}
                            icon={RefreshCw}
                            variant="outline"
                            disabled={updatingPrices}
                            className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
                        >
                            {updatingPrices ? 'Updating...' : 'Refresh Prices'}
                        </Button>
                    )}
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        icon={Plus}
                        className="w-full sm:w-auto min-h-[44px] sm:min-h-0"
                    >
                        Add Investment
                    </Button>
                </div>
            </div>

            {/* Investment Statistics */}
            {investmentStats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <Card className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Invested</p>
                                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mt-0.5 sm:mt-1 tabular-nums break-words">{formatCurrency(investmentStats.totalInvested)}</p>
                            </div>
                            <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        </div>
                    </Card>
                    <Card className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">YTD Income</p>
                                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 dark:text-green-400 mt-0.5 sm:mt-1 tabular-nums break-words">{formatCurrency(investmentStats.yearIncome)}</p>
                            </div>
                            <Coins className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400 flex-shrink-0" />
                        </div>
                    </Card>
                    <Card className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">Unrealized Gains</p>
                                <p className={cn("text-lg sm:text-xl lg:text-2xl font-bold mt-0.5 sm:mt-1 tabular-nums break-words", investmentStats.unrealizedGains >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                    {formatCurrency(investmentStats.unrealizedGains)}
                                </p>
                            </div>
                            <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        </div>
                    </Card>
                    <Card className="p-3 sm:p-4 col-span-2 lg:col-span-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Return</p>
                                <p className={cn("text-lg sm:text-xl lg:text-2xl font-bold mt-0.5 sm:mt-1 tabular-nums break-words", investmentStats.returnPercentage >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                    {formatCurrency(investmentStats.totalReturn)}
                                </p>
                                <p className={cn("text-xs sm:text-sm font-medium mt-0.5", investmentStats.returnPercentage >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                    ({investmentStats.returnPercentage.toFixed(2)}%)
                                </p>
                            </div>
                            <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-golden-hour flex-shrink-0" />
                        </div>
                    </Card>
                </div>
            )}

            {/* Investments List */}
            <Card className="overflow-hidden">
                <div className="p-3 sm:p-4 md:p-6">
                    <div className="mb-3 sm:mb-4">
                        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">Investments</h2>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">All corporate investments</p>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3 sm:space-y-4">
                        {investments && investments.length > 0 ? (
                            investments.map((investment) => {
                                const currentValue = investment.current_value || investment.purchase_amount;
                                const unrealizedGain = currentValue - investment.purchase_amount;

                                return (
                                    <div
                                        key={investment.id}
                                        onClick={() => navigate(`/investments/${investment.id}`)}
                                        className="cursor-pointer"
                                    >
                                        <Card
                                            className="p-4 sm:p-5 space-y-3 sm:space-y-4 hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-foreground text-base sm:text-lg break-words">{investment.description}</div>
                                                    {investment.symbol && (
                                                        <div className="text-xs sm:text-sm text-muted-foreground mt-1">{investment.symbol}</div>
                                                    )}
                                                    {investment.institution && (
                                                        <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">{investment.institution}</div>
                                                    )}
                                                </div>
                                                <span className={cn(
                                                    "inline-flex px-2.5 py-1 text-xs font-medium rounded-full flex-shrink-0",
                                                    investment.investment_type === 'stock'
                                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                                        : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                                                )}>
                                                    {investment.investment_type === 'stock' ? 'Stock' : 'GIC'}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-3 border-t border-border">
                                                <div>
                                                    <div className="text-xs text-muted-foreground mb-1">Purchase Date</div>
                                                    <div className="text-sm font-medium text-foreground">{formatDate(investment.purchase_date)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted-foreground mb-1">Status</div>
                                                    <span className={cn(
                                                        "inline-flex px-2 py-0.5 text-xs font-medium rounded-full",
                                                        investment.status === 'active'
                                                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                            : investment.status === 'sold'
                                                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                                                : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
                                                    )}>
                                                        {investment.status}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted-foreground mb-1">Purchase Amount</div>
                                                    <div className="text-sm sm:text-base font-semibold text-foreground tabular-nums">{formatCurrency(investment.purchase_amount)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted-foreground mb-1">Current Value</div>
                                                    <div className="text-sm sm:text-base font-semibold text-foreground tabular-nums">{formatCurrency(currentValue)}</div>
                                                    {investment.investment_type === 'stock' && (
                                                        <div className={cn(
                                                            "text-xs font-medium mt-0.5 tabular-nums",
                                                            unrealizedGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                                        )}>
                                                            {unrealizedGain >= 0 ? '+' : ''}{formatCurrency(unrealizedGain)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="col-span-2 pt-2 border-t border-border">
                                                    <div className="text-xs text-muted-foreground mb-1">Where the money came from</div>
                                                    <div className="text-sm text-foreground">{investment.funding_source === 'retained_earnings' ? 'From Business Profits' : 'From Business Cash'}</div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 sm:gap-3 pt-3 border-t border-border" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setEditingInvestment(investment)}
                                                    className="flex-1 min-h-[44px] sm:min-h-0"
                                                    icon={Edit}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDelete(investment.id)}
                                                    className="flex-1 text-destructive border-destructive/20 hover:bg-destructive/10 min-h-[44px] sm:min-h-0"
                                                    icon={Trash2}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </Card>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-12 sm:py-16 text-muted-foreground">
                                <p className="text-sm sm:text-base">No investments recorded yet</p>
                            </div>
                        )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Purchase Date</th>
                                    <th className="px-6 py-4 text-right">Purchase Amount</th>
                                    <th className="px-6 py-4 text-right">Current Value</th>
                                    <th className="px-6 py-4">Where the money came from</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {investments && investments.length > 0 ? (
                                    investments.map((investment) => {
                                        const currentValue = investment.current_value || investment.purchase_amount;
                                        const unrealizedGain = currentValue - investment.purchase_amount;

                                        return (
                                            <tr
                                                key={investment.id}
                                                className="hover:bg-muted/50 transition-colors cursor-pointer"
                                                onClick={() => navigate(`/investments/${investment.id}`)}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-white">{investment.description}</div>
                                                    {investment.symbol && (
                                                        <div className="text-xs text-slate-muted">{investment.symbol}</div>
                                                    )}
                                                    {investment.institution && (
                                                        <div className="text-xs text-slate-muted">{investment.institution}</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        "inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full",
                                                        investment.investment_type === 'stock'
                                                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                                            : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                                                    )}>
                                                        {investment.investment_type === 'stock' ? 'Stock' : 'GIC'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-muted">
                                                    {formatDate(investment.purchase_date)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-white">
                                                    {formatCurrency(investment.purchase_amount)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="font-medium text-white">{formatCurrency(currentValue)}</div>
                                                    {investment.investment_type === 'stock' && (
                                                        <div className={cn(
                                                            "text-xs",
                                                            unrealizedGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                                        )}>
                                                            {unrealizedGain >= 0 ? '+' : ''}{formatCurrency(unrealizedGain)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-slate-muted">
                                                    {investment.funding_source === 'retained_earnings' ? 'From Business Profits' : 'From Business Cash'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        "inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full",
                                                        investment.status === 'active'
                                                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                            : investment.status === 'sold'
                                                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                                                : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
                                                    )}>
                                                        {investment.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setEditingInvestment(investment)}
                                                            className="h-9 w-9"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(investment.id)}
                                                            className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-8 text-center text-slate-muted">
                                            No investments recorded yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>

            {/* Create/Edit Investment Modal */}
            {(showCreateModal || editingInvestment) && (
                <InvestmentModal
                    investment={editingInvestment}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingInvestment(null);
                    }}
                    onSave={(createdInvestmentId) => {
                        queryClient.invalidateQueries({ queryKey: ['investments'] });
                        setShowCreateModal(false);
                        if (createdInvestmentId) {
                            navigate(`/investments/${createdInvestmentId}`);
                        } else {
                            setEditingInvestment(null);
                        }
                    }}
                />
            )}

        </div>
    );
};

// Investment Modal Component
interface InvestmentModalProps {
    investment?: Investment | null;
    onClose: () => void;
    onSave: (createdInvestmentId?: number) => void;
}

const InvestmentModal: React.FC<InvestmentModalProps> = ({ investment, onClose, onSave }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        investment_type: investment?.investment_type || 'stock',
        description: investment?.description || '',
        symbol: investment?.symbol || '',
        institution: investment?.institution || '',
        purchase_date: investment?.purchase_date ? investment.purchase_date.split('T')[0] : new Date().toISOString().split('T')[0],
        purchase_amount: investment?.purchase_amount || 0,
        funding_source: investment?.funding_source || 'retained_earnings',
        current_value: investment?.current_value || '',
        maturity_date: investment?.maturity_date ? investment.maturity_date.split('T')[0] : '',
        notes: investment?.notes || '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const investmentData = {
                company_id: user?.company_id!,
                investment_type: formData.investment_type as 'stock' | 'gic',
                description: formData.description,
                symbol: formData.symbol || undefined,
                institution: formData.institution || undefined,
                purchase_date: formData.purchase_date,
                purchase_amount: formData.purchase_amount,
                funding_source: formData.funding_source as 'retained_earnings' | 'total_cash',
                current_value: formData.current_value ? parseFloat(formData.current_value.toString()) : undefined,
                maturity_date: formData.maturity_date || undefined,
                notes: formData.notes || undefined,
            };

            if (investment) {
                await api.updateInvestment(investment.id, investmentData);

                // If purchase_amount changed, update the initial contribution transaction
                if (investmentData.purchase_amount !== undefined &&
                    investmentData.purchase_amount !== investment.purchase_amount) {
                    try {
                        // Find the initial contribution transaction
                        const transactionsResult = await api.getInvestmentTransactions({
                            investment_id: investment.id,
                            limit: 1000
                        });
                        const transactions = transactionsResult.data;

                        // Find the initial contribution (first one with "Initial investment" note or first contribution)
                        const initialTransaction = transactions.find(t =>
                            t.transaction_type === 'contribution' &&
                            (t.notes === 'Initial investment' || t.notes?.includes('Initial'))
                        ) || transactions.find(t =>
                            t.transaction_type === 'contribution'
                        );

                        if (initialTransaction) {
                            // Calculate the difference
                            const oldAmount = Number(initialTransaction.amount);
                            const newAmount = Number(investmentData.purchase_amount);
                            const difference = newAmount - oldAmount;

                            // Calculate new balance_after for initial transaction
                            const newInitialBalance = Number(initialTransaction.balance_after) + difference;

                            // Update the transaction amount and balance
                            await api.updateInvestmentTransaction(initialTransaction.id, {
                                amount: newAmount,
                                balance_after: newInitialBalance,
                            });

                            // Recalculate all subsequent transaction balances
                            const sortedTransactions = transactions
                                .filter(t => t.id !== initialTransaction.id)
                                .sort((a, b) => {
                                    const dateA = new Date(a.transaction_date).getTime();
                                    const dateB = new Date(b.transaction_date).getTime();
                                    if (dateA !== dateB) return dateA - dateB;
                                    return a.id - b.id;
                                });

                            // Start from the updated initial balance
                            let runningBalance = newInitialBalance;
                            for (const txn of sortedTransactions) {
                                const txnDate = new Date(txn.transaction_date).getTime();
                                const initialDate = new Date(initialTransaction.transaction_date).getTime();

                                // Only update transactions that come after the initial transaction
                                if (txnDate >= initialDate) {
                                    runningBalance += Number(txn.amount);
                                    await api.updateInvestmentTransaction(txn.id, {
                                        balance_after: runningBalance,
                                    });
                                }
                            }
                        } else if (transactions.length === 0) {
                            // No transactions exist, create initial one
                            await api.createInvestmentTransaction({
                                investment_id: investment.id,
                                company_id: investment.company_id,
                                transaction_type: 'contribution',
                                amount: Number(investmentData.purchase_amount),
                                transaction_date: investmentData.purchase_date || investment.purchase_date,
                                balance_after: Number(investmentData.purchase_amount),
                                notes: 'Initial investment',
                            });
                        }
                    } catch (error) {
                        console.error('Error updating initial transaction:', error);
                        // Don't fail the investment update if transaction update fails
                    }
                }

                // Invalidate queries to refresh the detail page if it's open
                queryClient.invalidateQueries({ queryKey: ['investment_detail', investment.id] });
                queryClient.invalidateQueries({ queryKey: ['investments'] });

                onSave();
            } else {
                const created = await api.createInvestment(investmentData);

                // Create initial contribution transaction for the purchase amount
                if (created.purchase_amount > 0) {
                    try {
                        await api.createInvestmentTransaction({
                            investment_id: created.id,
                            company_id: created.company_id,
                            transaction_type: 'contribution',
                            amount: created.purchase_amount,
                            transaction_date: created.purchase_date,
                            balance_after: created.purchase_amount,
                            notes: 'Initial investment',
                        });
                    } catch (error) {
                        console.error('Error creating initial transaction:', error);
                        // Don't fail the investment creation if transaction creation fails
                    }
                }

                onSave(created.id);
            }
        } catch (error: any) {
            console.error('Error saving investment:', error);
            setError(error.message || 'Failed to save investment');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-0 sm:p-4 sm:p-6">
            <div className="bg-card border border-border rounded-none sm:rounded-xl shadow-lg w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto">
                <div className="p-4 sm:p-5 md:p-6">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <h3 className="text-lg sm:text-xl font-semibold text-foreground">
                            {investment ? 'Edit Investment' : 'Add Investment'}
                        </h3>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 sm:h-9 sm:w-9">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {error && (
                        <div className="mb-6 rounded-md bg-destructive/10 p-4 border border-destructive/20">
                            <div className="text-sm text-destructive">{error}</div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                        <div className="space-y-2">
                            <label htmlFor="investment_type" className="text-sm font-medium text-foreground">
                                Investment Type
                            </label>
                            <select
                                id="investment_type"
                                value={formData.investment_type}
                                onChange={(e) => setFormData(prev => ({ ...prev, investment_type: e.target.value as 'stock' | 'gic' }))}
                                className="input"
                                required
                            >
                                <option value="stock">Stock</option>
                                <option value="gic">GIC / Savings Account</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="description" className="text-sm font-medium text-foreground">
                                Description *
                            </label>
                            <input
                                type="text"
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                className="input"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="symbol" className="text-sm font-medium text-foreground">
                                    Symbol (Optional)
                                </label>
                                <input
                                    type="text"
                                    id="symbol"
                                    value={formData.symbol}
                                    onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
                                    className="input"
                                    placeholder="e.g., AAPL"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="institution" className="text-sm font-medium text-foreground">
                                    Institution (Optional)
                                </label>
                                <input
                                    type="text"
                                    id="institution"
                                    value={formData.institution}
                                    onChange={(e) => setFormData(prev => ({ ...prev, institution: e.target.value }))}
                                    className="input"
                                    placeholder="e.g., TD Bank"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="purchase_date" className="text-sm font-medium text-foreground">
                                    Purchase Date *
                                </label>
                                <input
                                    type="date"
                                    id="purchase_date"
                                    value={formData.purchase_date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
                                    className="input"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="purchase_amount" className="text-sm font-medium text-foreground">
                                    Purchase Amount *
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <input
                                        type="number"
                                        id="purchase_amount"
                                        step="0.01"
                                        min="0"
                                        value={formData.purchase_amount}
                                        onChange={(e) => setFormData(prev => ({ ...prev, purchase_amount: parseFloat(e.target.value) || 0 }))}
                                        className="input pl-9"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {formData.investment_type === 'gic' && (
                            <div className="space-y-2">
                                <label htmlFor="maturity_date" className="text-sm font-medium text-foreground">
                                    Maturity Date (Optional)
                                </label>
                                <input
                                    type="date"
                                    id="maturity_date"
                                    value={formData.maturity_date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, maturity_date: e.target.value }))}
                                    className="input"
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="funding_source" className="text-sm font-medium text-foreground">
                                    Where the money came from *
                                </label>
                                <select
                                    id="funding_source"
                                    value={formData.funding_source}
                                    onChange={(e) => setFormData(prev => ({ ...prev, funding_source: e.target.value as 'retained_earnings' | 'total_cash' }))}
                                    className="input"
                                    required
                                >
                                    <option value="retained_earnings">From Business Profits</option>
                                    <option value="total_cash">From Business Cash</option>
                                </select>
                            </div>
                            {formData.investment_type === 'stock' && (
                                <div className="space-y-2">
                                    <label htmlFor="current_value" className="text-sm font-medium text-foreground">
                                        Current Value (Optional)
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <input
                                            type="number"
                                            id="current_value"
                                            step="0.01"
                                            min="0"
                                            value={formData.current_value}
                                            onChange={(e) => setFormData(prev => ({ ...prev, current_value: e.target.value }))}
                                            className="input pl-9"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="notes" className="text-sm font-medium text-foreground">
                                Notes (Optional)
                            </label>
                            <textarea
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                className="input min-h-[80px]"
                                rows={3}
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Saving...' : (investment ? 'Update' : 'Create')}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Investments;
