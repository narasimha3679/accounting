import React, { useState, useMemo } from 'react';
import { X, Check, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import Button from './ui/Button';
import { cn, formatLocalDate } from '../lib/utils';
import type { ExpenseCategory } from '../lib/api';

export interface ParsedTransaction {
    date: string;
    description: string;
    amount: number;
    original_amount?: number;
    transaction_type?: string;
    category?: string | null;
    category_id?: number | null;
    hst_paid?: number;
    suggested_description?: string;
    deduction_percentage?: number;
    is_duplicate?: boolean;
}

interface BankStatementReviewProps {
    transactions: ParsedTransaction[];
    categories: ExpenseCategory[];
    onSave: (expenses: ParsedTransaction[]) => Promise<void>;
    onClose: () => void;
    companyId: number;
}

const BankStatementReview: React.FC<BankStatementReviewProps> = ({
    transactions: initialTransactions,
    categories,
    onSave,
    onClose,
    companyId: _companyId,
}) => {
    const [transactions, setTransactions] = useState<ParsedTransaction[]>(initialTransactions);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set(transactions.map((_, i) => i)));
    const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterDuplicate, setFilterDuplicate] = useState<'all' | 'duplicates' | 'non-duplicates'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter transactions
    const filteredTransactions = useMemo(() => {
        return transactions.filter((t) => {
            // Category filter
            if (filterCategory !== 'all') {
                const categoryId = parseInt(filterCategory);
                if (t.category_id !== categoryId) return false;
            }

            // Duplicate filter
            if (filterDuplicate === 'duplicates' && !t.is_duplicate) return false;
            if (filterDuplicate === 'non-duplicates' && t.is_duplicate) return false;

            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesDescription = t.description?.toLowerCase().includes(query);
                const matchesSuggested = t.suggested_description?.toLowerCase().includes(query);
                if (!matchesDescription && !matchesSuggested) return false;
            }

            return true;
        });
    }, [transactions, filterCategory, filterDuplicate, searchQuery]);

    // Calculate totals
    const totals = useMemo(() => {
        const selected = filteredTransactions.filter((_, i) => {
            const originalIndex = transactions.indexOf(filteredTransactions[i]);
            return selectedIds.has(originalIndex);
        });

        const totalAmount = selected.reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalHST = selected.reduce((sum, t) => sum + (t.hst_paid || 0), 0);
        const duplicateCount = selected.filter(t => t.is_duplicate).length;

        return { totalAmount, totalHST, duplicateCount, selectedCount: selected.length };
    }, [filteredTransactions, selectedIds, transactions]);

    const handleCellEdit = (rowIndex: number, field: string, currentValue: any) => {
        setEditingCell({ row: rowIndex, field });
        setEditValue(String(currentValue || ''));
    };

    const handleCellSave = (rowIndex: number, field: string) => {
        if (!editingCell) return;

        const transactionIndex = transactions.indexOf(filteredTransactions[rowIndex]);
        const updated = [...transactions];
        
        let newValue: any = editValue;

        // Type conversion based on field
        if (field === 'amount' || field === 'hst_paid') {
            newValue = parseFloat(editValue) || 0;
        } else if (field === 'category_id') {
            newValue = editValue ? parseInt(editValue) : null;
            // Also update category name
            const category = categories.find(c => c.id === newValue);
            if (category) {
                updated[transactionIndex] = {
                    ...updated[transactionIndex],
                    category_id: newValue,
                    category: category.name,
                };
            } else {
                updated[transactionIndex] = {
                    ...updated[transactionIndex],
                    category_id: null,
                    category: null,
                };
            }
        } else if (field === 'deduction_percentage') {
            newValue = parseFloat(editValue) / 100 || 1.0;
        } else {
            updated[transactionIndex] = {
                ...updated[transactionIndex],
                [field]: newValue,
            };
        }

        if (field !== 'category_id') {
            updated[transactionIndex] = {
                ...updated[transactionIndex],
                [field]: newValue,
            };
        }

        setTransactions(updated);
        setEditingCell(null);
        setEditValue('');
    };

    const handleCellCancel = () => {
        setEditingCell(null);
        setEditValue('');
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredTransactions.length) {
            setSelectedIds(new Set());
        } else {
            const allIds = new Set(filteredTransactions.map((_, i) => transactions.indexOf(filteredTransactions[i])));
            setSelectedIds(allIds);
        }
    };

    const handleSelectRow = (rowIndex: number) => {
        const transactionIndex = transactions.indexOf(filteredTransactions[rowIndex]);
        const newSelected = new Set(selectedIds);
        if (newSelected.has(transactionIndex)) {
            newSelected.delete(transactionIndex);
        } else {
            newSelected.add(transactionIndex);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkCategory = (categoryId: number) => {
        const updated = transactions.map((t, i) => {
            if (selectedIds.has(i)) {
                const category = categories.find(c => c.id === categoryId);
                return {
                    ...t,
                    category_id: categoryId,
                    category: category?.name || null,
                };
            }
            return t;
        });
        setTransactions(updated);
    };

    const handleDeleteSelected = () => {
        const updated = transactions.filter((_, i) => !selectedIds.has(i));
        setTransactions(updated);
        setSelectedIds(new Set());
    };

    const handleSave = async () => {
        const selectedTransactions = transactions.filter((_, i) => selectedIds.has(i));
        
        if (selectedTransactions.length === 0) {
            alert('Please select at least one transaction to create.');
            return;
        }

        setIsSaving(true);
        try {
            await onSave(selectedTransactions);
        } catch (error) {
            console.error('Failed to save expenses:', error);
            alert('Failed to create expenses. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return formatLocalDate(dateString);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="relative w-full max-w-7xl max-h-[90vh] overflow-hidden rounded-lg border border-white/10 bg-card shadow-lg flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div>
                        <h3 className="text-2xl font-bold tracking-tight text-white">Review Bank Statement</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            {transactions.length} transactions found • {totals.selectedCount} selected
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 rounded-full"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Filters and Actions */}
                <div className="p-4 border-b border-white/10 bg-muted/30">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 flex flex-col sm:flex-row gap-2">
                            <input
                                type="text"
                                placeholder="Search transactions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input flex-1"
                            />
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="input w-full sm:w-48"
                            >
                                <option value="all">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                            <select
                                value={filterDuplicate}
                                onChange={(e) => setFilterDuplicate(e.target.value as any)}
                                className="input w-full sm:w-48"
                            >
                                <option value="all">All Transactions</option>
                                <option value="duplicates">Duplicates Only</option>
                                <option value="non-duplicates">Non-Duplicates</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handleSelectAll}
                                size="sm"
                            >
                                {selectedIds.size === filteredTransactions.length ? 'Deselect All' : 'Select All'}
                            </Button>
                            {selectedIds.size > 0 && (
                                <>
                                    <select
                                        onChange={(e) => handleBulkCategory(parseInt(e.target.value))}
                                        className="input"
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Apply Category...</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                    <Button
                                        variant="outline"
                                        onClick={handleDeleteSelected}
                                        size="sm"
                                        icon={Trash2}
                                    >
                                        Delete Selected
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Totals Summary */}
                <div className="p-4 border-b border-white/10 bg-muted/20">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-xs text-muted-foreground">Selected</p>
                            <p className="text-lg font-bold text-white">{totals.selectedCount}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Amount</p>
                            <p className="text-lg font-bold text-white">{formatCurrency(totals.totalAmount)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total HST</p>
                            <p className="text-lg font-bold text-white">{formatCurrency(totals.totalHST)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Grand Total</p>
                            <p className="text-lg font-bold text-neon-emerald">
                                {formatCurrency(totals.totalAmount + totals.totalHST)}
                            </p>
                        </div>
                    </div>
                    {totals.duplicateCount > 0 && (
                        <div className="mt-2 flex items-center gap-2 text-yellow-400">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm">
                                {totals.duplicateCount} potential duplicate(s) selected
                            </span>
                        </div>
                    )}
                </div>

                {/* Transactions Table */}
                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                                        onChange={handleSelectAll}
                                        className="rounded border-white/20"
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-muted-foreground uppercase text-xs font-semibold">Date</th>
                                <th className="px-4 py-3 text-left text-muted-foreground uppercase text-xs font-semibold">Description</th>
                                <th className="px-4 py-3 text-left text-muted-foreground uppercase text-xs font-semibold">Category</th>
                                <th className="px-4 py-3 text-right text-muted-foreground uppercase text-xs font-semibold">Amount</th>
                                <th className="px-4 py-3 text-right text-muted-foreground uppercase text-xs font-semibold">HST</th>
                                <th className="px-4 py-3 text-right text-muted-foreground uppercase text-xs font-semibold">Deduction %</th>
                                <th className="px-4 py-3 text-right text-muted-foreground uppercase text-xs font-semibold">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredTransactions.map((transaction, rowIndex) => {
                                const transactionIndex = transactions.indexOf(transaction);
                                const isSelected = selectedIds.has(transactionIndex);
                                const isEditing = editingCell?.row === rowIndex;

                                return (
                                    <tr
                                        key={rowIndex}
                                        className={cn(
                                            "hover:bg-muted/50 transition-colors",
                                            isSelected && "bg-primary/10",
                                            transaction.is_duplicate && "bg-yellow-900/20"
                                        )}
                                    >
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleSelectRow(rowIndex)}
                                                className="rounded border-white/20"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            {isEditing && editingCell?.field === 'date' ? (
                                                <input
                                                    type="date"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={() => handleCellSave(rowIndex, 'date')}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleCellSave(rowIndex, 'date');
                                                        if (e.key === 'Escape') handleCellCancel();
                                                    }}
                                                    className="input w-32"
                                                    autoFocus
                                                />
                                            ) : (
                                                <span
                                                    className="cursor-pointer hover:text-neon-emerald"
                                                    onClick={() => handleCellEdit(rowIndex, 'date', transaction.date)}
                                                >
                                                    {formatDate(transaction.date)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {isEditing && editingCell?.field === 'description' ? (
                                                <input
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={() => handleCellSave(rowIndex, 'description')}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleCellSave(rowIndex, 'description');
                                                        if (e.key === 'Escape') handleCellCancel();
                                                    }}
                                                    className="input w-full"
                                                    autoFocus
                                                />
                                            ) : (
                                                <span
                                                    className="cursor-pointer hover:text-neon-emerald"
                                                    onClick={() => handleCellEdit(rowIndex, 'description', transaction.description)}
                                                >
                                                    {transaction.description}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {isEditing && editingCell?.field === 'category_id' ? (
                                                <select
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={() => handleCellSave(rowIndex, 'category_id')}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Escape') handleCellCancel();
                                                    }}
                                                    className="input w-full"
                                                    autoFocus
                                                >
                                                    <option value="">Uncategorized</option>
                                                    {categories.map(cat => (
                                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span
                                                    className="cursor-pointer hover:text-neon-emerald"
                                                    onClick={() => handleCellEdit(rowIndex, 'category_id', transaction.category_id)}
                                                >
                                                    {transaction.category || 'Uncategorized'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {isEditing && editingCell?.field === 'amount' ? (
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={() => handleCellSave(rowIndex, 'amount')}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleCellSave(rowIndex, 'amount');
                                                        if (e.key === 'Escape') handleCellCancel();
                                                    }}
                                                    className="input w-24 text-right"
                                                    autoFocus
                                                />
                                            ) : (
                                                <span
                                                    className="cursor-pointer hover:text-neon-emerald"
                                                    onClick={() => handleCellEdit(rowIndex, 'amount', transaction.amount)}
                                                >
                                                    {formatCurrency(transaction.amount || 0)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {isEditing && editingCell?.field === 'hst_paid' ? (
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={() => handleCellSave(rowIndex, 'hst_paid')}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleCellSave(rowIndex, 'hst_paid');
                                                        if (e.key === 'Escape') handleCellCancel();
                                                    }}
                                                    className="input w-24 text-right"
                                                    autoFocus
                                                />
                                            ) : (
                                                <span
                                                    className="cursor-pointer hover:text-neon-emerald"
                                                    onClick={() => handleCellEdit(rowIndex, 'hst_paid', transaction.hst_paid || 0)}
                                                >
                                                    {formatCurrency(transaction.hst_paid || 0)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {isEditing && editingCell?.field === 'deduction_percentage' ? (
                                                <input
                                                    type="number"
                                                    step="1"
                                                    min="0"
                                                    max="100"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={() => handleCellSave(rowIndex, 'deduction_percentage')}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleCellSave(rowIndex, 'deduction_percentage');
                                                        if (e.key === 'Escape') handleCellCancel();
                                                    }}
                                                    className="input w-20 text-right"
                                                    autoFocus
                                                />
                                            ) : (
                                                <span
                                                    className="cursor-pointer hover:text-neon-emerald"
                                                    onClick={() => handleCellEdit(rowIndex, 'deduction_percentage', (transaction.deduction_percentage || 1.0) * 100)}
                                                >
                                                    {((transaction.deduction_percentage || 1.0) * 100).toFixed(0)}%
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-neon-emerald">
                                            {formatCurrency((transaction.amount || 0) + (transaction.hst_paid || 0))}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredTransactions.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">No transactions match your filters</p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-white/10 flex justify-between items-center">
                    <Button
                        variant="outline"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <div className="flex gap-3">
                        <div className="text-right mr-4">
                            <p className="text-sm text-muted-foreground">
                                {totals.selectedCount} selected • {formatCurrency(totals.totalAmount + totals.totalHST)} total
                            </p>
                        </div>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || totals.selectedCount === 0}
                            icon={isSaving ? Loader2 : Check}
                        >
                            {isSaving ? 'Creating Expenses...' : `Create ${totals.selectedCount} Expense(s)`}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BankStatementReview;
