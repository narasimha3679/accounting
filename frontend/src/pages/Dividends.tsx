import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type Dividend } from '../lib/api';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import {
    Plus,
    Edit,
    Trash2,
    DollarSign,
    CheckCircle,
    Clock,
    Search,
    X
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
                return <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />;
            case 'declared':
                return <Clock className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />;
            default:
                return <Clock className="h-4 w-4 text-slate-muted" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'declared':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            default:
                return 'bg-muted text-slate-muted';
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Dividends</h1>
                    <p className="text-slate-muted mt-2">Manage corporate dividend declarations and payments</p>
                </div>
                <Button
                    onClick={openModal}
                    icon={Plus}
                    className="w-full sm:w-auto"
                >
                    Create Dividend
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
                            <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-slate-muted truncate">
                                    Total Dividends
                                </dt>
                                <dd className="text-2xl font-bold text-white">
                                    {formatCurrency(totalDividends)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-slate-muted truncate">
                                    Paid Dividends
                                </dt>
                                <dd className="text-2xl font-bold text-white">
                                    {formatCurrency(paidDividends)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                            <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-slate-muted truncate">
                                    Announced (Not Paid Yet)
                                </dt>
                                <dd className="text-2xl font-bold text-white">
                                    {formatCurrency(declaredDividends)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-muted" />
                            <input
                                type="text"
                                placeholder="Search dividends..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                    </div>
                    <div className="sm:w-48">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="">All Status</option>
                            <option value="declared">Declared</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Dividends Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Declaration Date</th>
                                <th className="px-6 py-4">Payment Date</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Notes</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredDividends.map((dividend) => (
                                <tr key={dividend.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white">
                                        {formatCurrency(dividend.amount)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-muted">
                                        {formatDate(dividend.declaration_date)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-muted">
                                        {dividend.payment_date ? formatDate(dividend.payment_date) : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(dividend.status)}`}>
                                            {getStatusIcon(dividend.status)}
                                            <span className="ml-1 capitalize">{dividend.status}</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-muted max-w-xs truncate">
                                        {dividend.notes || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(dividend)}
                                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                                title="Edit"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(dividend.id)}
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                title="Delete"
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

                {filteredDividends.length === 0 && (
                    <div className="text-center py-12">
                        <DollarSign className="mx-auto h-12 w-12 text-slate-muted" />
                        <h3 className="mt-2 text-sm font-medium text-white">No dividends found</h3>
                        <p className="mt-1 text-sm text-slate-muted">
                            {searchTerm || statusFilter ? 'Try adjusting your search or filter criteria.' : 'Get started by adding your first dividend.'}
                        </p>
                        {!searchTerm && !statusFilter && (
                            <div className="mt-6">
                                <Button
                                    onClick={openModal}
                                    icon={Plus}
                                    className="mx-auto"
                                >
                                    Create Dividend
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="bg-card px-4 py-3 flex items-center justify-between border-t border-white/10 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-slate-muted">
                                    Showing <span className="font-medium text-white">{(currentPage - 1) * 10 + 1}</span> to{' '}
                                    <span className="font-medium text-white">{Math.min(currentPage * 10, total)}</span> of{' '}
                                    <span className="font-medium text-white">{total}</span> results
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className="rounded-r-none"
                                    >
                                        Previous
                                    </Button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                        <Button
                                            key={page}
                                            variant={page === currentPage ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setCurrentPage(page)}
                                            className="rounded-none"
                                        >
                                            {page}
                                        </Button>
                                    ))}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        className="rounded-l-none"
                                    >
                                        Next
                                    </Button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg border border-white/10 bg-card p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-white">
                                {editingDividend ? 'Edit Dividend' : 'Add New Dividend'}
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={closeModal}
                                className="h-8 w-8 rounded-full"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Amount *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="0.00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Declaration Date *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.declaration_date}
                                    onChange={(e) => setFormData({ ...formData, declaration_date: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Payment Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.payment_date}
                                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Status *
                                </label>
                                <select
                                    required
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'declared' | 'paid' })}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="declared">Declared</option>
                                    <option value="paid">Paid</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Notes
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    rows={3}
                                    placeholder="Optional notes about this dividend..."
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-white/10">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeModal}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                >
                                    {editingDividend ? 'Update' : 'Create'} Dividend
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dividends;
