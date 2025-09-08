import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type Expense, type ExpenseCategory, type ExpenseFile } from '../lib/api';
import { Plus, Edit, Trash2, Receipt, Upload, Download, X, FileText } from 'lucide-react';
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
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
                    <p className="text-gray-600">Track your business expenses</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                    <Plus className="h-4 w-4" />
                    Add Expense
                </button>
            </div>

            {/* Category Filter */}
            <div className="card">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Filter by category:</label>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="input w-full sm:w-auto"
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
                                <th>Total</th>
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
                                    <td className="font-medium text-green-600">{formatCurrency(expense.amount + expense.hst_paid)}</td>
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
                                {formData.amount > 500 && (
                                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-sm font-medium text-yellow-800">
                                                    Capital Asset Alert
                                                </h3>
                                                <div className="mt-2 text-sm text-yellow-700">
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

                        {/* File Upload Section */}
                        <div className="border-t pt-6">
                            <h4 className="text-lg font-medium text-gray-900 mb-4">Files & Receipts</h4>

                            {/* Existing Files */}
                            {expense?.files && expense.files.length > 0 && (
                                <div className="mb-6">
                                    <h5 className="text-sm font-medium text-gray-700 mb-3">Uploaded Files</h5>
                                    <div className="space-y-2">
                                        {expense.files.map((file) => (
                                            <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <FileText className="h-5 w-5 text-gray-500" />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{file.original_name}</p>
                                                        <p className="text-xs text-gray-500">{formatFileSize(file.file_size)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleFileDownload(file)}
                                                        className="text-blue-600 hover:text-blue-800"
                                                        title="Download"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleFileDelete(file.id)}
                                                        className="text-red-600 hover:text-red-800"
                                                        title="Delete"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Files</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                                    <input
                                        type="file"
                                        multiple
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        id="file-upload"
                                        accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar"
                                    />
                                    <label htmlFor="file-upload" className="cursor-pointer">
                                        <div className="text-center">
                                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-600">
                                                    <span className="font-medium text-primary-600 hover:text-primary-500">
                                                        Click to upload
                                                    </span>
                                                    {' '}or drag and drop
                                                </p>
                                                <p className="text-xs text-gray-500">PDF, images, documents up to 10MB each</p>
                                            </div>
                                        </div>
                                    </label>
                                </div>

                                {/* Selected Files */}
                                {selectedFiles.length > 0 && (
                                    <div className="mt-4">
                                        <h6 className="text-sm font-medium text-gray-700 mb-2">Selected Files</h6>
                                        <div className="space-y-2">
                                            {selectedFiles.map((file, index) => (
                                                <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                                                    <span className="text-sm text-gray-900">{file.name}</span>
                                                    <button
                                                        onClick={() => handleFileRemove(index)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        {expense && (
                                            <button
                                                type="button"
                                                onClick={() => handleFileUpload(expense.id)}
                                                disabled={uploadingFiles}
                                                className="mt-3 btn btn-primary btn-sm"
                                            >
                                                {uploadingFiles ? 'Uploading...' : 'Upload Files'}
                                            </button>
                                        )}
                                    </div>
                                )}
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
                                disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending || uploadingFiles}
                            >
                                {createExpenseMutation.isPending || updateExpenseMutation.isPending || uploadingFiles
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
