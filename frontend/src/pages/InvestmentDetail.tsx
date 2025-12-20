import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { type Investment, type InvestmentTransaction } from '../lib/api';
import { ArrowLeft, Plus, Edit, DollarSign, TrendingUp, Coins, Building2, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import BalanceChart from '../components/investments/BalanceChart';
import { cn } from '../lib/utils';
import { getFiscalYear } from '../lib/fiscalYear';
import { useAuth } from '../contexts/AuthContext';

const InvestmentDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [transactionType, setTransactionType] = useState<'contribution' | 'interest' | 'withdrawal' | 'dividend_reinvested' | 'price_update' | null>(null);
    const [editingTransaction, setEditingTransaction] = useState<InvestmentTransaction | null>(null);
    const [showBalanceEdit, setShowBalanceEdit] = useState(false);

    // Fetch investment detail
    const { data: investmentDetail, isLoading, error } = useQuery({
        queryKey: ['investment_detail', id],
        queryFn: async () => {
            if (!id) throw new Error('Investment ID is required');
            return await api.getInvestmentDetail(parseInt(id));
        },
        enabled: !!id,
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


    // Calculate total return percentage
    const totalReturnPercentage = useMemo(() => {
        if (!investmentDetail || investmentDetail.totalInvested === 0) return 0;
        const totalReturn = investmentDetail.currentBalance - investmentDetail.totalInvested;
        return (totalReturn / investmentDetail.totalInvested) * 100;
    }, [investmentDetail]);

    // Helper function to recalculate all transaction balances
    const recalculateAllBalances = async () => {
        if (!id || !investmentDetail) return;

        const allTransactionsResult = await api.getInvestmentTransactions({
            investment_id: parseInt(id),
            limit: 10000
        });
        const allTransactions = allTransactionsResult.data;

        // Sort all transactions chronologically
        const sortedTransactions = [...allTransactions].sort((a, b) => {
            const dateA = new Date(a.transaction_date).getTime();
            const dateB = new Date(b.transaction_date).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return a.id - b.id;
        });

        // Recalculate balances from the start (starting from 0)
        let runningBalance = 0;
        for (const txn of sortedTransactions) {
            const txnAmount = Number(txn.amount);
            runningBalance += txnAmount;

            // Only update if the balance has changed (with small tolerance for floating point)
            if (Math.abs(Number(txn.balance_after) - runningBalance) > 0.01) {
                await api.updateInvestmentTransaction(txn.id, {
                    balance_after: runningBalance,
                });
            }
        }
    };

    const handleDeleteTransaction = async (transactionId: number) => {
        if (window.confirm('Are you sure you want to delete this transaction?')) {
            try {
                await api.deleteInvestmentTransaction(transactionId);
                // Recalculate all balances after deletion
                await recalculateAllBalances();
                queryClient.invalidateQueries({ queryKey: ['investment_detail', id] });
            } catch (error) {
                console.error('Error deleting transaction:', error);
                alert('Failed to delete transaction');
            }
        }
    };

    const handleUpdateBalance = async (newBalance: number) => {
        if (!id) return;
        try {
            await api.updateInvestment(parseInt(id), { current_balance: newBalance });
            queryClient.invalidateQueries({ queryKey: ['investment_detail', id] });
            setShowBalanceEdit(false);
        } catch (error) {
            console.error('Error updating balance:', error);
            alert('Failed to update balance');
        }
    };

    const handleRecalculateBalance = async () => {
        if (!id) return;
        try {
            await api.calculateInvestmentBalance(parseInt(id));
            await api.updateInvestment(parseInt(id), { current_balance: null }); // Clear manual override
            queryClient.invalidateQueries({ queryKey: ['investment_detail', id] });
        } catch (error) {
            console.error('Error recalculating balance:', error);
            alert('Failed to recalculate balance');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    if (error || !investmentDetail) {
        return (
            <div className="space-y-4">
                <Button variant="outline" onClick={() => navigate('/investments')} icon={ArrowLeft}>
                    Back to Investments
                </Button>
                <Card className="p-6">
                    <p className="text-destructive">Investment not found or error loading investment.</p>
                </Card>
            </div>
        );
    }

    const { investment, transactions, totalInvested, currentBalance, totalInterest, totalDividends, totalContributions, totalWithdrawals } = investmentDetail;
    const isSavingsAccount = investment.investment_type === 'gic';
    const isStock = investment.investment_type === 'stock';

    return (
        <div className="space-y-4 sm:space-y-6 px-1 sm:px-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => navigate('/investments')} icon={ArrowLeft} size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{investment.description}</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {investment.institution && `${investment.institution} • `}
                            {investment.symbol && `${investment.symbol} • `}
                            {investment.investment_type === 'stock' ? 'Stock' : 'Savings Account / GIC'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="col-span-1">
                    <StatCard
                        title="Current Balance"
                        value={formatCurrency(currentBalance)}
                        icon={DollarSign}
                    />
                    {investment.current_balance !== null && (
                        <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Manually set</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowBalanceEdit(true)}
                                className="h-6 px-2 text-xs"
                            >
                                Edit
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleRecalculateBalance}
                                className="h-6 px-2 text-xs"
                            >
                                Recalculate
                            </Button>
                        </div>
                    )}
                </div>
                <StatCard
                    title="Total Invested"
                    value={formatCurrency(totalInvested)}
                    icon={Building2}
                    className="col-span-1"
                />
                <StatCard
                    title={isStock ? "Total Dividend" : "Total Interest"}
                    value={formatCurrency(isStock ? totalDividends : totalInterest)}
                    icon={Coins}
                    className="col-span-1"
                />
                <StatCard
                    title="Total Return"
                    value={formatCurrency(currentBalance - totalInvested)}
                    subtitle={`${totalReturnPercentage >= 0 ? '+' : ''}${totalReturnPercentage.toFixed(2)}%`}
                    icon={TrendingUp}
                    className={cn(
                        "col-span-1",
                        totalReturnPercentage >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}
                />
            </div>

            {/* Breakdown Section */}
            {isSavingsAccount && (
                <Card className="p-4 sm:p-6">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground mb-4">Balance Breakdown</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Principal Invested</p>
                            <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(totalContributions - totalWithdrawals)}</p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Interest Earned</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums">{formatCurrency(totalInterest)}</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Balance Chart */}
            {transactions.length > 0 && (
                <BalanceChart transactions={transactions} />
            )}

            {/* Action Buttons */}
            <Card className="p-4 sm:p-6">
                <div className="flex flex-wrap gap-2 sm:gap-3">
                    {isSavingsAccount ? (
                        <>
                            <Button
                                onClick={() => {
                                    setTransactionType('contribution');
                                    setShowTransactionModal(true);
                                }}
                                icon={Plus}
                            >
                                Add Money
                            </Button>
                            <Button
                                onClick={() => {
                                    setTransactionType('interest');
                                    setShowTransactionModal(true);
                                }}
                                variant="outline"
                                icon={Coins}
                            >
                                Record Interest
                            </Button>
                            <Button
                                onClick={() => {
                                    setTransactionType('withdrawal');
                                    setShowTransactionModal(true);
                                }}
                                variant="outline"
                                icon={DollarSign}
                            >
                                Add Withdrawal
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                onClick={() => {
                                    setTransactionType('dividend_reinvested');
                                    setShowTransactionModal(true);
                                }}
                                variant="outline"
                                icon={Coins}
                            >
                                Add Dividend Payment
                            </Button>
                            <Button
                                onClick={() => {
                                    setTransactionType('price_update');
                                    setShowTransactionModal(true);
                                }}
                                variant="outline"
                                icon={TrendingUp}
                            >
                                Update Price
                            </Button>
                        </>
                    )}
                </div>
            </Card>

            {/* Transaction History */}
            <Card className="overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-border">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">Transaction History</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-4 sm:px-6 py-3">Date</th>
                                <th className="px-4 sm:px-6 py-3">Type</th>
                                <th className="px-4 sm:px-6 py-3 text-right">Amount</th>
                                <th className="px-4 sm:px-6 py-3 text-right">Balance After</th>
                                <th className="px-4 sm:px-6 py-3">Notes</th>
                                <th className="px-4 sm:px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {transactions.length > 0 ? (
                                transactions.map((transaction) => (
                                    <tr key={transaction.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-4 sm:px-6 py-4 text-muted-foreground">
                                            {formatDate(transaction.transaction_date)}
                                        </td>
                                        <td className="px-4 sm:px-6 py-4">
                                            <span className={cn(
                                                "inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full",
                                                transaction.transaction_type === 'contribution' && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                                                transaction.transaction_type === 'interest' && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
                                                transaction.transaction_type === 'withdrawal' && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
                                                transaction.transaction_type === 'dividend_reinvested' && "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
                                                transaction.transaction_type === 'price_update' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                            )}>
                                                {(() => {
                                                    switch (transaction.transaction_type) {
                                                        case 'contribution': return 'Add Money';
                                                        case 'interest': return 'Interest Earned';
                                                        case 'withdrawal': return 'Withdraw Money';
                                                        case 'dividend_reinvested': return 'Dividend (Reinvested)';
                                                        case 'price_update': return 'Update Stock Price';
                                                        default: {
                                                            const typeStr = String(transaction.transaction_type);
                                                            return typeStr.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                                                        }
                                                    }
                                                })()}
                                            </span>
                                        </td>
                                        <td className={cn(
                                            "px-4 sm:px-6 py-4 text-right font-medium tabular-nums",
                                            transaction.amount >= 0 ? "text-foreground" : "text-red-600 dark:text-red-400"
                                        )}>
                                            {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-right font-medium text-foreground tabular-nums">
                                            {formatCurrency(transaction.balance_after)}
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-muted-foreground">
                                            {transaction.notes || '-'}
                                        </td>
                                        <td className="px-4 sm:px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setEditingTransaction(transaction);
                                                        setTransactionType(transaction.transaction_type as any);
                                                        setShowTransactionModal(true);
                                                    }}
                                                    className="h-8 w-8"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteTransaction(transaction.id)}
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-4 sm:px-6 py-8 text-center text-muted-foreground">
                                        No transactions recorded yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Transaction Modal */}
            {showTransactionModal && transactionType && (
                <TransactionModal
                    investment={investment}
                    transaction={editingTransaction}
                    transactionType={transactionType}
                    onClose={() => {
                        setShowTransactionModal(false);
                        setTransactionType(null);
                        setEditingTransaction(null);
                    }}
                    onSave={() => {
                        queryClient.invalidateQueries({ queryKey: ['investment_detail', id] });
                        setShowTransactionModal(false);
                        setTransactionType(null);
                        setEditingTransaction(null);
                    }}
                />
            )}

            {/* Balance Edit Modal */}
            {showBalanceEdit && (
                <BalanceEditModal
                    currentBalance={currentBalance}
                    onClose={() => setShowBalanceEdit(false)}
                    onSave={handleUpdateBalance}
                />
            )}
        </div>
    );
};

// Transaction Modal Component
interface TransactionModalProps {
    investment: Investment;
    transaction: InvestmentTransaction | null;
    transactionType: 'contribution' | 'interest' | 'withdrawal' | 'dividend_reinvested' | 'price_update';
    onClose: () => void;
    onSave: () => void;
}

const TransactionModal: React.FC<TransactionModalProps> = ({
    investment,
    transaction,
    transactionType,
    onClose,
    onSave
}) => {
    const [formData, setFormData] = useState({
        amount: transaction?.amount || 0,
        transaction_date: transaction?.transaction_date ? transaction.transaction_date.split('T')[0] : new Date().toISOString().split('T')[0],
        notes: transaction?.notes || '',
    });
    // For dividends, default to NOT reinvested (user must explicitly select)
    const [isReinvested, setIsReinvested] = useState(
        transaction?.transaction_type === 'dividend_reinvested' ? true : false
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Get all transactions to calculate proper balance
            const transactionsResult = await api.getInvestmentTransactions({
                investment_id: investment.id,
                limit: 10000
            });
            const allTransactions = transactionsResult.data;

            // Filter out the transaction being edited (if updating)
            const transactionsToUse = transaction
                ? allTransactions.filter(t => t.id !== transaction.id)
                : allTransactions;

            // Sort by date ascending, then by id for same dates
            const sortedTransactions = [...transactionsToUse].sort((a, b) => {
                const dateA = new Date(a.transaction_date).getTime();
                const dateB = new Date(b.transaction_date).getTime();
                if (dateA !== dateB) return dateA - dateB;
                return a.id - b.id;
            });

            // Find the most recent transaction before or on the transaction date
            // Use its balance_after as the starting point
            let balanceBefore = Number(investment.purchase_amount); // Default to purchase amount
            const transactionDate = new Date(formData.transaction_date);
            transactionDate.setHours(0, 0, 0, 0); // Start of day for comparison

            // Find the last transaction before or on this date
            for (let i = sortedTransactions.length - 1; i >= 0; i--) {
                const txn = sortedTransactions[i];
                const txnDate = new Date(txn.transaction_date);
                txnDate.setHours(0, 0, 0, 0);

                // If transaction is on or before our date, use its balance_after
                if (txnDate <= transactionDate) {
                    balanceBefore = Number(txn.balance_after);
                    break;
                }
            }

            // For dividends, only create transaction if reinvested
            const shouldCreateTransaction = transactionType !== 'dividend_reinvested' || isReinvested;

            // Calculate new balance (only if creating a transaction)
            const amount = transactionType === 'withdrawal'
                ? -Math.abs(formData.amount)
                : Math.abs(formData.amount);
            const newBalance = shouldCreateTransaction ? balanceBefore + amount : balanceBefore;

            let linkedIncomeId: number | null = null;

            // Always create/update investment_income entry for interest and dividends
            if (transactionType === 'interest' || transactionType === 'dividend_reinvested') {
                const fiscalYearEnd = user?.company?.fiscal_year_end;
                const fiscalYear = fiscalYearEnd 
                    ? getFiscalYear(new Date(formData.transaction_date), fiscalYearEnd)
                    : new Date(formData.transaction_date).getFullYear();
                const incomeType = transactionType === 'interest' ? 'interest' : 'dividend';

                if (transaction && transaction.linked_income_id) {
                    // Update existing income entry
                    await api.updateInvestmentIncome(transaction.linked_income_id, {
                        amount: Math.abs(amount),
                        income_date: formData.transaction_date,
                        fiscal_year: fiscalYear,
                        notes: formData.notes || undefined,
                    });
                    linkedIncomeId = transaction.linked_income_id;
                } else {
                    // Create new income entry
                    const incomeEntry = await api.createInvestmentIncome({
                        investment_id: investment.id,
                        company_id: investment.company_id,
                        income_type: incomeType,
                        amount: Math.abs(amount),
                        income_date: formData.transaction_date,
                        fiscal_year: fiscalYear,
                        is_eligible_dividend: false, // User can set this elsewhere if needed
                        notes: formData.notes || undefined,
                    });
                    linkedIncomeId = incomeEntry.id;
                }
            }

            if (transaction) {
                // Update existing transaction
                if (transactionType === 'dividend_reinvested' && !isReinvested) {
                    // Delete the transaction but keep the income entry
                    await api.deleteInvestmentTransaction(transaction.id);
                } else {
                    // Update the transaction
                    await api.updateInvestmentTransaction(transaction.id, {
                        amount,
                        transaction_date: formData.transaction_date,
                        balance_after: newBalance,
                        linked_income_id: linkedIncomeId,
                        notes: formData.notes || undefined,
                    });
                }
            } else {
                // Create new transaction only if reinvested (for dividends) or for other types
                if (shouldCreateTransaction) {
                    await api.createInvestmentTransaction({
                        investment_id: investment.id,
                        company_id: investment.company_id,
                        transaction_type: transactionType,
                        amount,
                        transaction_date: formData.transaction_date,
                        balance_after: newBalance,
                        linked_income_id: linkedIncomeId,
                        notes: formData.notes || undefined,
                    });
                }
            }

            // Recalculate all transaction balances chronologically
            // This ensures balances are correct even when transactions are added out of order
            const allTransactionsResult = await api.getInvestmentTransactions({
                investment_id: investment.id,
                limit: 10000
            });
            const allTransactionsNow = allTransactionsResult.data;

            // Sort all transactions chronologically
            const allSortedTransactions = [...allTransactionsNow].sort((a, b) => {
                const dateA = new Date(a.transaction_date).getTime();
                const dateB = new Date(b.transaction_date).getTime();
                if (dateA !== dateB) return dateA - dateB;
                return a.id - b.id;
            });

            // Recalculate balances from the start (starting from 0, since first transaction includes initial investment)
            // Each transaction's balance_after should be the cumulative sum of all transactions up to that point
            let runningBalance = 0;
            for (const txn of allSortedTransactions) {
                const txnAmount = Number(txn.amount);
                runningBalance += txnAmount;

                // Only update if the balance has changed (with small tolerance for floating point)
                if (Math.abs(Number(txn.balance_after) - runningBalance) > 0.01) {
                    await api.updateInvestmentTransaction(txn.id, {
                        balance_after: runningBalance,
                    });
                }
            }

            onSave();
        } catch (error: any) {
            console.error('Error saving transaction:', error);
            setError(error.message || 'Couldn\'t save. Please check your information and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const getTransactionTypeLabel = () => {
        switch (transactionType) {
            case 'contribution': return 'Add Money';
            case 'interest': return 'Add Interest Payment';
            case 'withdrawal': return 'Add Withdrawal';
            case 'dividend_reinvested': return 'Add Dividend Payment';
            case 'price_update': return 'Update Stock Price';
            default: return 'Add Transaction';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 sm:p-6">
            <div className="bg-card border border-white/10 rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-foreground">
                            {transaction ? 'Edit Transaction' : getTransactionTypeLabel()}
                        </h3>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {error && (
                        <div className="mb-6 rounded-md bg-destructive/10 p-4 border border-destructive/20">
                            <div className="text-sm text-destructive">{error}</div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="amount" className="text-sm font-medium text-foreground">
                                Amount
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <input
                                    type="number"
                                    id="amount"
                                    step="0.01"
                                    min="0"
                                    value={formData.amount}
                                    onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                                    className="input pl-9"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="transaction_date" className="text-sm font-medium text-foreground">
                                Date
                            </label>
                            <input
                                type="date"
                                id="transaction_date"
                                value={formData.transaction_date}
                                onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
                                className="input"
                                required
                            />
                        </div>

                        {transactionType === 'dividend_reinvested' && (
                            <div className="space-y-2">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isReinvested}
                                        onChange={(e) => setIsReinvested(e.target.checked)}
                                        className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-ring"
                                    />
                                    <span className="text-sm font-medium text-foreground">
                                        Dividend Reinvested
                                    </span>
                                </label>
                                <p className="text-xs text-muted-foreground ml-6">
                                    {isReinvested
                                        ? 'Dividend will be added to investment balance'
                                        : 'Dividend will be recorded as income but not added to balance'}
                                </p>
                            </div>
                        )}

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
                                {isLoading ? 'Saving...' : (transaction ? 'Update' : 'Create')}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// Balance Edit Modal
interface BalanceEditModalProps {
    currentBalance: number;
    onClose: () => void;
    onSave: (balance: number) => void;
}

const BalanceEditModal: React.FC<BalanceEditModalProps> = ({ currentBalance, onClose, onSave }) => {
    const [balance, setBalance] = useState(currentBalance);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            onSave(balance);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 sm:p-6">
            <div className="bg-card border border-white/10 rounded-xl shadow-lg w-full max-w-md">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-foreground">Edit Balance</h3>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="balance" className="text-sm font-medium text-foreground">
                                Current Balance
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <input
                                    type="number"
                                    id="balance"
                                    step="0.01"
                                    min="0"
                                    value={balance}
                                    onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                                    className="input pl-9"
                                    required
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                This will override the auto-calculated balance from transactions.
                            </p>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default InvestmentDetail;

