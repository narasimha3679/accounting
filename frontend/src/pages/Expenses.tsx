import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type Expense, type ExpenseCategory } from '../lib/api';
import { Plus, Edit, Trash2, Receipt } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const Expenses: React.FC = () => {
    const { user } = useAuth();
    const _queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Fetch expenses
    const { data: expenses, isLoading } = useQuery({
        queryKey: ['expenses', user?.company_id],
        queryFn: async () => {
            const result = await api.getExpenses({
                company_id: user?.company_id,
                limit: 1000
            });
            return result.data;
        },
        enabled: !!user?.company_id,
    });

    // Fetch expense categories
    const { data: categories } = useQuery({
        queryKey: ['expense_categories'],
        queryFn: async () => {
            const result = await api.getExpenseCategories({
                limit: 1000
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
                    <p className="text-gray-600">Track your business expenses</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Expense
                </button>
            </div>

            {/* Category Filter */}
            <div className="card">
                <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Filter by category:</label>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="input w-auto"
                    >
                        <option value="all">All Categories</option>
                        {categories?.map(category => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="card">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <Receipt className="h-8 w-8 text-red-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">
                                    Total Expenses
                                </dt>
                                <dd className="text-lg font-medium text-gray-900">
                                    {formatCurrency(totalExpenses)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <Receipt className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">
                                    HST Paid
                                </dt>
                                <dd className="text-lg font-medium text-gray-900">
                                    {formatCurrency(totalHSTPaid)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <Receipt className="h-8 w-8 text-green-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">
                                    Total with HST
                                </dt>
                                <dd className="text-lg font-medium text-gray-900">
                                    {formatCurrency(totalExpenses + totalHSTPaid)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expenses Table */}
            <div className="card">
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead className="bg-gray-50">
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Category</th>
                                <th>Amount</th>
                                <th>HST Paid</th>
                                <th>Paid By</th>
                                <th>Receipt</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredExpenses?.map((expense) => (
                                <tr key={expense.id}>
                                    <td>{formatDate(expense.expense_date)}</td>
                                    <td className="font-medium">{expense.description}</td>
                                    <td>{expense.category?.name || 'Uncategorized'}</td>
                                    <td className="font-medium">{formatCurrency(expense.amount)}</td>
                                    <td>{formatCurrency(expense.hst_paid)}</td>
                                    <td>
                                        {expense.paid_by === 'corp' ? (
                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                Corporation
                                            </span>
                                        ) : (
                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                                Owner
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {expense.receipt_attached ? (
                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                Yes
                                            </span>
                                        ) : (
                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                                No
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setEditingExpense(expense)}
                                                className="text-blue-600 hover:text-blue-800"
                                                title="Edit"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(expense)}
                                                className="text-red-600 hover:text-red-800"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {filteredExpenses?.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No expenses found</p>
                    <p className="text-gray-400">Add your first expense to get started</p>
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

const ExpenseModal: React.FC<ExpenseModalProps> = ({ expense, categories, onClose, onSave }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        description: expense?.description || '',
        category_id: expense?.category_id || 0,
        amount: expense?.amount || 0,
        hst_paid: expense?.hst_paid || 0,
        expense_date: expense?.expense_date || new Date().toISOString().split('T')[0],
        receipt_attached: expense?.receipt_attached || false,
        paid_by: expense?.paid_by || 'corp',
    });

    const createExpenseMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.createExpense(data);
        },
        onSuccess: () => {
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

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
                <div className="mt-3">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        {expense ? 'Edit Expense' : 'Add New Expense'}
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Description *</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Category *</label>
                                <select
                                    value={formData.category_id}
                                    onChange={(e) => setFormData({ ...formData, category_id: parseInt(e.target.value) })}
                                    className="input"
                                    required
                                >
                                    <option value={0}>Select a category</option>
                                    {categories.map(category => (
                                        <option key={category.id} value={category.id}>{category.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Expense Date *</label>
                                <input
                                    type="date"
                                    value={formData.expense_date}
                                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Amount (before HST) *</label>
                                <input
                                    type="number"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                    className="input"
                                    min="0"
                                    step="0.01"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">HST Paid</label>
                                <input
                                    type="number"
                                    value={formData.hst_paid}
                                    onChange={(e) => setFormData({ ...formData, hst_paid: parseFloat(e.target.value) || 0 })}
                                    className="input"
                                    min="0"
                                    step="0.01"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="receipt_attached"
                                        checked={formData.receipt_attached}
                                        onChange={(e) => setFormData({ ...formData, receipt_attached: e.target.checked })}
                                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="receipt_attached" className="ml-2 block text-sm text-gray-900">
                                        Receipt attached
                                    </label>
                                </div>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Paid By *</label>
                                <div className="flex gap-6">
                                    <div className="flex items-center">
                                        <input
                                            type="radio"
                                            id="paid_by_corp"
                                            name="paid_by"
                                            value="corp"
                                            checked={formData.paid_by === 'corp'}
                                            onChange={(e) => setFormData({ ...formData, paid_by: e.target.value as 'corp' | 'owner' })}
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                                        />
                                        <label htmlFor="paid_by_corp" className="ml-2 block text-sm text-gray-900">
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
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                                        />
                                        <label htmlFor="paid_by_owner" className="ml-2 block text-sm text-gray-900">
                                            Owner (to be reimbursed)
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}
                            >
                                {createExpenseMutation.isPending || updateExpenseMutation.isPending
                                    ? 'Saving...'
                                    : expense
                                        ? 'Update Expense'
                                        : 'Create Expense'
                                }
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Expenses;
