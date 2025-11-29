import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type Expense, type ExpenseCategory, type ExpenseFile } from '../lib/api';
import { loadDashboardPreferences, updateDashboardPreference } from '../lib/preferences';
import { Plus, Edit, Trash2, Receipt, Upload, Download, X, FileText, Calendar } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { cn } from '../lib/utils';

const Expenses: React.FC = () => {
    const { user } = useAuth();
    const _queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [timePeriod, setTimePeriod] = useState<'month' | 'year'>(() => {
        // Load saved preference on component mount
        const preferences = loadDashboardPreferences();
        return preferences.timePeriod;
    });
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Calculate date range based on time period
    const getDateRange = () => {
        let startDate: Date;
        let endDate: Date;

        if (timePeriod === 'month') {
            startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        } else {
            startDate = new Date(selectedDate.getFullYear(), 0, 1);
            endDate = new Date(selectedDate.getFullYear(), 11, 31);
        }

        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
        };
    };

    const { startDate, endDate } = getDateRange();

    // Fetch expenses
    const { data: expenses, isLoading } = useQuery({
        queryKey: ['expenses', user?.company_id, timePeriod, startDate, endDate],
        queryFn: async () => {
            const result = await api.getExpenses({
                company_id: user?.company_id,
                start_date: startDate,
                end_date: endDate,
                limit: 1000
            });
            return result.data;
        },
        enabled: !!user?.company_id,
    });

    // Fetch expense categories (global list, shared across companies)
    const { data: categories } = useQuery({
        queryKey: ['expense_categories'],
        queryFn: async () => {
            const result = await api.getExpenseCategories({
                limit: 1000,
            });
            return result.data;
        },
    });

    // Delete expense mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return api.deleteExpense(id);
        },
        onSuccess: () => {
            _queryClient.invalidateQueries({ queryKey: ['expenses'] });
        },
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

    const handleDelete = (expense: Expense) => {
        if (confirm(`Are you sure you want to delete this expense?`)) {
            deleteMutation.mutate(expense.id);
        }
    };

    // Filter expenses by category
    const filteredExpenses = expenses?.filter(expense => {
        if (selectedCategory === 'all') return true;
        return expense.category_id === parseInt(selectedCategory);
    });

    // Calculate totals
    const totalExpenses = filteredExpenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
    const totalHSTPaid = filteredExpenses?.reduce((sum, expense) => sum + expense.hst_paid, 0) || 0;

    if (isLoading) {
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
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Expenses</h1>
                    <p className="text-muted-foreground mt-2">Track your business expenses</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Time Period Selector */}
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                        <div className="flex rounded-lg shadow-sm border border-border overflow-hidden">
                            <button
                                type="button"
                                onClick={() => {
                                    setTimePeriod('month');
                                    updateDashboardPreference('timePeriod', 'month');
                                }}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium transition-colors duration-200",
                                    timePeriod === 'month'
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-card text-muted-foreground hover:bg-muted"
                                )}
                            >
                                Month
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setTimePeriod('year');
                                    updateDashboardPreference('timePeriod', 'year');
                                }}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium transition-colors duration-200",
                                    timePeriod === 'year'
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-card text-muted-foreground hover:bg-muted"
                                )}
                            >
                                Year
                            </button>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
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
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <Button
                        onClick={() => setShowCreateModal(true)}
                        icon={Plus}
                        className="w-full sm:w-auto"
                    >
                        Add Expense
                    </Button>
                </div>
            </div>

            {/* Category Filter */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <label className="text-sm font-medium text-foreground">Filter by category:</label>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="flex h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="all">All Categories</option>
                        {categories?.map(category => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                    </select>
                </div>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-red-100 dark:bg-red-900/20">
                            <Receipt className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-muted-foreground truncate">
                                    Total Expenses
                                </dt>
                                <dd className="text-2xl font-bold text-foreground">
                                    {formatCurrency(totalExpenses)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
                            <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-muted-foreground truncate">
                                    HST Paid
                                </dt>
                                <dd className="text-2xl font-bold text-foreground">
                                    {formatCurrency(totalHSTPaid)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                            <Receipt className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-muted-foreground truncate">
                                    Total with HST
                                </dt>
                                <dd className="text-2xl font-bold text-foreground">
                                    {formatCurrency(totalExpenses + totalHSTPaid)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Expenses Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">HST Paid</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4">Paid By</th>
                                <th className="px-6 py-4">Receipt</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredExpenses?.map((expense) => (
                                <tr key={expense.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-6 py-4 text-muted-foreground">{formatDate(expense.expense_date)}</td>
                                    <td className="px-6 py-4 font-medium text-foreground">{expense.description}</td>
                                    <td className="px-6 py-4 text-muted-foreground">{expense.category?.name || 'Uncategorized'}</td>
                                    <td className="px-6 py-4 font-medium text-foreground">{formatCurrency(expense.amount)}</td>
                                    <td className="px-6 py-4 text-muted-foreground">{formatCurrency(expense.hst_paid)}</td>
                                    <td className="px-6 py-4 font-medium text-green-600 dark:text-green-400">{formatCurrency(expense.amount + expense.hst_paid)}</td>
                                    <td className="px-6 py-4">
                                        {expense.paid_by === 'corp' ? (
                                            <span className="inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                Corporation
                                            </span>
                                        ) : (
                                            <span className="inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                                                Owner
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {expense.receipt_attached ? (
                                            <span className="inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                Yes
                                            </span>
                                        ) : (
                                            <span className="inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                                                No
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setEditingExpense(expense)}
                                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(expense)}
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {filteredExpenses?.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">No expenses found</p>
                    <p className="text-muted-foreground/60">Add your first expense to get started</p>
                </div>
            )}

            {/* Create/Edit Expense Modal */}
            {(showCreateModal || editingExpense) && (
                <ExpenseModal
                    expense={editingExpense}
                    categories={categories || []}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingExpense(null);
                    }}
                    onSave={() => {
                        _queryClient.invalidateQueries({ queryKey: ['expenses'] });
                        setShowCreateModal(false);
                        setEditingExpense(null);
                    }}
                />
            )}
        </div>
    );
};

// Expense Modal Component
interface ExpenseModalProps {
    expense?: Expense | null;
    categories: ExpenseCategory[];
    onClose: () => void;
    onSave: () => void;
}

function ExpenseModal({ expense, categories, onClose, onSave }: ExpenseModalProps) {
    const { user } = useAuth();
    const HST_RATE = 0.13; // 13% default HST rate

    // Determine if tax applies: if editing, check if hst_paid > 0; if new, default to true
    const initialTaxApplies = expense ? (expense.hst_paid > 0) : true;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const [formData, setFormData] = useState({
        description: expense?.description || '',
        category_id: expense?.category_id || 0,
        amount: expense?.amount || 0,
        hst_paid: expense?.hst_paid || 0,
        expense_date: expense?.expense_date || new Date().toISOString().split('T')[0],
        receipt_attached: expense?.receipt_attached || false,
        paid_by: expense?.paid_by || 'corp',
    });
    const [taxApplies, setTaxApplies] = useState(initialTaxApplies);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadingFiles, setUploadingFiles] = useState(false);

    const createExpenseMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.createExpense(data);
        },
        onSuccess: async (newExpense) => {
            // Upload files if any were selected
            if (selectedFiles.length > 0) {
                setUploadingFiles(true);
                try {
                    for (const file of selectedFiles) {
                        await uploadFileMutation.mutateAsync({ expenseId: newExpense.id, file });
                    }
                    setSelectedFiles([]);
                } catch (error) {
                    console.error('Failed to upload files:', error);
                } finally {
                    setUploadingFiles(false);
                }
            }
            onSave();
        },
    });

    const updateExpenseMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.updateExpense(expense!.id, data);
        },
        onSuccess: () => {
            onSave();
        },
    });

    const uploadFileMutation = useMutation({
        mutationFn: async ({ expenseId, file }: { expenseId: number; file: File }) => {
            return api.uploadExpenseFile(expenseId, file);
        },
    });

    const deleteFileMutation = useMutation({
        mutationFn: async (fileId: number) => {
            return api.deleteExpenseFile(fileId);
        },
        onSuccess: () => {
            onSave(); // Refresh the expense data
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const expenseData = {
            ...formData,
            company_id: user?.company_id,
        };

        if (expense) {
            updateExpenseMutation.mutate(expenseData);
        } else {
            createExpenseMutation.mutate(expenseData);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setSelectedFiles(prev => [...prev, ...files]);
    };

    const handleFileRemove = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleFileUpload = async (expenseId: number) => {
        if (selectedFiles.length === 0) return;

        setUploadingFiles(true);
        try {
            for (const file of selectedFiles) {
                await uploadFileMutation.mutateAsync({ expenseId, file });
            }
            setSelectedFiles([]);
            onSave(); // Refresh the expense data
        } catch (error) {
            console.error('Failed to upload files:', error);
        } finally {
            setUploadingFiles(false);
        }
    };

    const handleFileDownload = async (file: ExpenseFile) => {
        try {
            const blob = await api.downloadExpenseFile(file.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.original_name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Failed to download file:', error);
        }
    };

    const handleFileDelete = (fileId: number) => {
        if (confirm('Are you sure you want to delete this file?')) {
            deleteFileMutation.mutate(fileId);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-foreground">
                        {expense ? 'Edit Expense' : 'Add New Expense'}
                    </h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 rounded-full"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-foreground mb-2">Description *</label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Category *</label>
                            <select
                                value={formData.category_id}
                                onChange={(e) => setFormData({ ...formData, category_id: parseInt(e.target.value) })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            >
                                <option value={0}>Select a category</option>
                                {categories.map(category => (
                                    <option key={category.id} value={category.id}>{category.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Expense Date *</label>
                            <input
                                type="date"
                                value={formData.expense_date}
                                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Amount (before HST) *</label>
                            <input
                                type="number"
                                value={formData.amount}
                                onChange={(e) => {
                                    const newAmount = parseFloat(e.target.value) || 0;
                                    const newHstPaid = taxApplies ? parseFloat((newAmount * HST_RATE).toFixed(2)) : formData.hst_paid;
                                    setFormData({ ...formData, amount: newAmount, hst_paid: newHstPaid });
                                }}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                min="0"
                                step="0.01"
                                required
                            />
                            {formData.amount > 500 && (
                                <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                                                Capital Asset Alert
                                            </h3>
                                            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                                                <p>
                                                    This expense is over $500 CAD and may be considered a capital asset that requires depreciation.
                                                    Consider creating a capital asset entry instead of a regular expense.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-foreground">HST Paid</label>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="tax_applies"
                                        checked={taxApplies}
                                        onChange={(e) => {
                                            const applies = e.target.checked;
                                            setTaxApplies(applies);
                                            if (applies) {
                                                // Auto-calculate HST when tax applies is checked
                                                const calculatedHst = parseFloat((formData.amount * HST_RATE).toFixed(2));
                                                setFormData({ ...formData, hst_paid: calculatedHst });
                                            } else {
                                                // Set to 0 when tax doesn't apply
                                                setFormData({ ...formData, hst_paid: 0 });
                                            }
                                        }}
                                        className="h-4 w-4 text-primary focus:ring-primary border-input rounded"
                                    />
                                    <label htmlFor="tax_applies" className="ml-2 block text-sm text-foreground">
                                        Tax applies (13%)
                                    </label>
                                </div>
                            </div>
                            <input
                                type="number"
                                value={formData.hst_paid}
                                onChange={(e) => setFormData({ ...formData, hst_paid: parseFloat(e.target.value) || 0 })}
                                className={cn(
                                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                                    taxApplies && "bg-muted cursor-not-allowed"
                                )}
                                min="0"
                                step="0.01"
                                readOnly={taxApplies}
                            />
                            {taxApplies && formData.amount > 0 && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Calculated: {formatCurrency(formData.amount)} × 13% = {formatCurrency(formData.hst_paid)}
                                </p>
                            )}
                        </div>

                        <div className="sm:col-span-2">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="receipt_attached"
                                    checked={formData.receipt_attached}
                                    onChange={(e) => setFormData({ ...formData, receipt_attached: e.target.checked })}
                                    className="h-4 w-4 text-primary focus:ring-primary border-input rounded"
                                />
                                <label htmlFor="receipt_attached" className="ml-2 block text-sm text-foreground">
                                    Receipt attached
                                </label>
                            </div>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-foreground mb-2">Paid By *</label>
                            <div className="flex gap-6">
                                <div className="flex items-center">
                                    <input
                                        type="radio"
                                        id="paid_by_corp"
                                        name="paid_by"
                                        value="corp"
                                        checked={formData.paid_by === 'corp'}
                                        onChange={(e) => setFormData({ ...formData, paid_by: e.target.value as 'corp' | 'owner' })}
                                        className="h-4 w-4 text-primary focus:ring-primary border-input"
                                    />
                                    <label htmlFor="paid_by_corp" className="ml-2 block text-sm text-foreground">
                                        Corporation
                                    </label>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="radio"
                                        id="paid_by_owner"
                                        name="paid_by"
                                        value="owner"
                                        checked={formData.paid_by === 'owner'}
                                        onChange={(e) => setFormData({ ...formData, paid_by: e.target.value as 'corp' | 'owner' })}
                                        className="h-4 w-4 text-primary focus:ring-primary border-input"
                                    />
                                    <label htmlFor="paid_by_owner" className="ml-2 block text-sm text-foreground">
                                        Owner (to be reimbursed)
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* File Upload Section */}
                    <div className="border-t border-border pt-6">
                        <h4 className="text-lg font-medium text-foreground mb-4">Files & Receipts</h4>

                        {/* Existing Files */}
                        {expense?.files && expense.files.length > 0 && (
                            <div className="mb-6">
                                <h5 className="text-sm font-medium text-muted-foreground mb-3">Uploaded Files</h5>
                                <div className="space-y-2">
                                    {expense.files.map((file) => (
                                        <div key={file.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-5 w-5 text-muted-foreground" />
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{file.original_name}</p>
                                                    <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleFileDownload(file)}
                                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                                    title="Download"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleFileDelete(file.id)}
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    title="Delete"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* File Upload */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Upload Files</label>
                            <div className="border-2 border-dashed border-border rounded-lg p-6 hover:bg-muted/50 transition-colors">
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="file-upload"
                                    accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar"
                                />
                                <label htmlFor="file-upload" className="cursor-pointer w-full h-full block">
                                    <div className="text-center">
                                        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                                        <div className="mt-2">
                                            <p className="text-sm text-muted-foreground">
                                                <span className="font-medium text-primary hover:text-primary/90">
                                                    Click to upload
                                                </span>
                                                {' '}or drag and drop
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">PDF, images, documents up to 10MB each</p>
                                        </div>
                                    </div>
                                </label>
                            </div>

                            {/* Selected Files */}
                            {selectedFiles.length > 0 && (
                                <div className="mt-4">
                                    <h6 className="text-sm font-medium text-foreground mb-2">Selected Files</h6>
                                    <div className="space-y-2">
                                        {selectedFiles.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800">
                                                <span className="text-sm text-foreground">{file.name}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleFileRemove(index)}
                                                    className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    {expense && (
                                        <Button
                                            type="button"
                                            onClick={() => handleFileUpload(expense.id)}
                                            disabled={uploadingFiles}
                                            className="mt-3"
                                            size="sm"
                                        >
                                            {uploadingFiles ? 'Uploading...' : 'Upload Files'}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending || uploadingFiles}
                        >
                            {createExpenseMutation.isPending || updateExpenseMutation.isPending || uploadingFiles
                                ? 'Saving...'
                                : expense
                                    ? 'Update Expense'
                                    : 'Create Expense'
                            }
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Expenses;
