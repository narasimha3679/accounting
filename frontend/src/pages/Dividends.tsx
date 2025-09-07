import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type Dividend } from '../lib/api';
import {
    Plus,
    Edit,
    Trash2,
    DollarSign,
    CheckCircle,
    Clock,
    Search
} from 'lucide-react';

const Dividends: React.FC = () => {
    const { user } = useAuth();
    const [dividends, setDividends] = useState<Dividend[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDividend, setEditingDividend] = useState<Dividend | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Form state
    const [formData, setFormData] = useState({
        amount: '',
        declaration_date: '',
        payment_date: '',
        status: 'declared' as 'declared' | 'paid',
        notes: '',
    });

    useEffect(() => {
        if (user) {
            loadDividends();
        }
    }, [user, currentPage, statusFilter]);

    const loadDividends = async () => {
        try {
            setIsLoading(true);
            const response = await api.getDividends({
                company_id: user?.company_id,
                page: currentPage,
                limit: 10,
                status: statusFilter || undefined,
            });
            setDividends(response.data);
            setTotalPages(response.totalPages);
            setTotal(response.total);
        } catch (error) {
            console.error('Error loading dividends:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const dividendData = {
                amount: parseFloat(formData.amount),
                declaration_date: formData.declaration_date,
                payment_date: formData.payment_date || undefined,
                status: formData.status,
                notes: formData.notes || undefined,
                company_id: user?.company_id!,
            };

            if (editingDividend) {
                await api.updateDividend(editingDividend.id, dividendData);
            } else {
                await api.createDividend(dividendData);
            }

            setShowModal(false);
            setEditingDividend(null);
            resetForm();
            loadDividends();
        } catch (error) {
            console.error('Error saving dividend:', error);
        }
    };

    const handleEdit = (dividend: Dividend) => {
        setEditingDividend(dividend);
        setFormData({
            amount: dividend.amount.toString(),
            declaration_date: dividend.declaration_date.split('T')[0],
            payment_date: dividend.payment_date ? dividend.payment_date.split('T')[0] : '',
            status: dividend.status,
            notes: dividend.notes || '',
        });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this dividend?')) {
            try {
                await api.deleteDividend(id);
                loadDividends();
            } catch (error) {
                console.error('Error deleting dividend:', error);
            }
        }
    };

    const resetForm = () => {
        setFormData({
            amount: '',
            declaration_date: '',
            payment_date: '',
            status: 'declared',
            notes: '',
        });
    };

    const openModal = () => {
        setEditingDividend(null);
        resetForm();
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingDividend(null);
        resetForm();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-CA');
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'paid':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'declared':
                return <Clock className="h-4 w-4 text-yellow-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid':
                return 'bg-green-100 text-green-800';
            case 'declared':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const filteredDividends = dividends.filter(dividend =>
        dividend.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dividend.amount.toString().includes(searchTerm)
    );

    const totalDividends = dividends.reduce((sum, dividend) => sum + dividend.amount, 0);
    const paidDividends = dividends.filter(d => d.status === 'paid').reduce((sum, dividend) => sum + dividend.amount, 0);
    const declaredDividends = dividends.filter(d => d.status === 'declared').reduce((sum, dividend) => sum + dividend.amount, 0);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dividends</h1>
                    <p className="text-gray-600">Manage corporate dividend declarations and payments</p>
                </div>
                <button
                    onClick={openModal}
                    className="btn-primary flex items-center space-x-2"
                >
                    <Plus className="h-4 w-4" />
                    <span>Add Dividend</span>
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="card">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <DollarSign className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">
                                    Total Dividends
                                </dt>
                                <dd className="text-lg font-medium text-gray-900">
                                    {formatCurrency(totalDividends)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">
                                    Paid Dividends
                                </dt>
                                <dd className="text-lg font-medium text-gray-900">
                                    {formatCurrency(paidDividends)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <Clock className="h-8 w-8 text-yellow-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">
                                    Declared (Unpaid)
                                </dt>
                                <dd className="text-lg font-medium text-gray-900">
                                    {formatCurrency(declaredDividends)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search dividends..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 input-field"
                            />
                        </div>
                    </div>
                    <div className="sm:w-48">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="input-field"
                        >
                            <option value="">All Status</option>
                            <option value="declared">Declared</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Dividends Table */}
            <div className="card">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Declaration Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Payment Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Notes
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredDividends.map((dividend) => (
                                <tr key={dividend.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {formatCurrency(dividend.amount)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(dividend.declaration_date)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {dividend.payment_date ? formatDate(dividend.payment_date) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(dividend.status)}`}>
                                            {getStatusIcon(dividend.status)}
                                            <span className="ml-1 capitalize">{dividend.status}</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                        {dividend.notes || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={() => handleEdit(dividend)}
                                                className="text-primary-600 hover:text-primary-900"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(dividend.id)}
                                                className="text-red-600 hover:text-red-900"
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

                {filteredDividends.length === 0 && (
                    <div className="text-center py-12">
                        <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No dividends found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {searchTerm || statusFilter ? 'Try adjusting your search or filter criteria.' : 'Get started by adding your first dividend.'}
                        </p>
                        {!searchTerm && !statusFilter && (
                            <div className="mt-6">
                                <button
                                    onClick={openModal}
                                    className="btn-primary"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Dividend
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Showing <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> to{' '}
                                    <span className="font-medium">{Math.min(currentPage * 10, total)}</span> of{' '}
                                    <span className="font-medium">{total}</span> results
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                    <button
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === currentPage
                                                ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                {editingDividend ? 'Edit Dividend' : 'Add New Dividend'}
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Amount *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        className="input-field"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Declaration Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.declaration_date}
                                        onChange={(e) => setFormData({ ...formData, declaration_date: e.target.value })}
                                        className="input-field"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Payment Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.payment_date}
                                        onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                                        className="input-field"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Status *
                                    </label>
                                    <select
                                        required
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'declared' | 'paid' })}
                                        className="input-field"
                                    >
                                        <option value="declared">Declared</option>
                                        <option value="paid">Paid</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        Notes
                                    </label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="input-field"
                                        rows={3}
                                        placeholder="Optional notes about this dividend..."
                                    />
                                </div>

                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                    >
                                        {editingDividend ? 'Update' : 'Create'} Dividend
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dividends;
