import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type OwnerPayment } from '../lib/api';
import {
    Plus,
    Edit,
    Trash2,
    Search,
    Calendar,
    DollarSign,
    FileText,
    CreditCard,
    CheckCircle,
    AlertCircle,
    X
} from 'lucide-react';

interface OwnerPaymentModalProps {
    ownerPayment?: OwnerPayment;
    onClose: () => void;
    onSave: (ownerPayment: OwnerPayment) => void;
}

const OwnerPaymentModal: React.FC<OwnerPaymentModalProps> = ({ ownerPayment, onClose, onSave }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        payment_date: '',
        payment_type: 'reimbursement' as 'reimbursement' | 'loan_repayment' | 'other',
        reference: '',
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (ownerPayment) {
            setFormData({
                description: ownerPayment.description,
                amount: ownerPayment.amount.toString(),
                payment_date: ownerPayment.payment_date.split('T')[0],
                payment_type: ownerPayment.payment_type,
                reference: ownerPayment.reference || '',
                notes: ownerPayment.notes || ''
            });
        }
    }, [ownerPayment]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.company_id) return;

        setIsSubmitting(true);
        try {
            const paymentData = {
                description: formData.description,
                amount: parseFloat(formData.amount),
                payment_date: formData.payment_date,
                payment_type: formData.payment_type,
                reference: formData.reference || undefined,
                notes: formData.notes || undefined,
                company_id: user.company_id
            };

            let savedPayment: OwnerPayment;
            if (ownerPayment) {
                savedPayment = await api.updateOwnerPayment(ownerPayment.id, paymentData);
            } else {
                savedPayment = await api.createOwnerPayment(paymentData);
            }

            onSave(savedPayment);
            onClose();
        } catch (error) {
            console.error('Error saving owner payment:', error);
            alert('Error saving owner payment. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {ownerPayment ? 'Edit Owner Payment' : 'Add Owner Payment'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                                Description *
                            </label>
                            <input
                                type="text"
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                                Amount *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <DollarSign className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="number"
                                    id="amount"
                                    step="0.01"
                                    min="0"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="payment_date" className="block text-sm font-medium text-gray-700 mb-2">
                                Payment Date *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Calendar className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="date"
                                    id="payment_date"
                                    value={formData.payment_date}
                                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="payment_type" className="block text-sm font-medium text-gray-700 mb-2">
                                Payment Type *
                            </label>
                            <select
                                id="payment_type"
                                value={formData.payment_type}
                                onChange={(e) => setFormData({ ...formData, payment_type: e.target.value as any })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            >
                                <option value="reimbursement">Reimbursement</option>
                                <option value="loan_repayment">Loan Repayment</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="reference" className="block text-sm font-medium text-gray-700 mb-2">
                                Reference (Optional)
                            </label>
                            <input
                                type="text"
                                id="reference"
                                value={formData.reference}
                                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                placeholder="Check number, transfer reference, etc."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                            Notes (Optional)
                        </label>
                        <textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Additional notes about this payment..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting ? 'Saving...' : (ownerPayment ? 'Update Payment' : 'Add Payment')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const OwnerPayments: React.FC = () => {
    const { user } = useAuth();
    const [ownerPayments, setOwnerPayments] = useState<OwnerPayment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPayment, setEditingPayment] = useState<OwnerPayment | undefined>();
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentTypeFilter, setPaymentTypeFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    useEffect(() => {
        if (user) {
            loadOwnerPayments();
        }
    }, [user]);

    const loadOwnerPayments = async () => {
        if (!user?.company_id) return;

        try {
            setIsLoading(true);
            const response = await api.getOwnerPayments({
                company_id: user.company_id,
                limit: 1000
            });
            setOwnerPayments(response.data);
        } catch (error) {
            console.error('Error loading owner payments:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = (savedPayment: OwnerPayment) => {
        if (editingPayment) {
            setOwnerPayments(prev =>
                prev.map(payment =>
                    payment.id === savedPayment.id ? savedPayment : payment
                )
            );
        } else {
            setOwnerPayments(prev => [savedPayment, ...prev]);
        }
        setEditingPayment(undefined);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this owner payment?')) return;

        try {
            await api.deleteOwnerPayment(id);
            setOwnerPayments(prev => prev.filter(payment => payment.id !== id));
        } catch (error) {
            console.error('Error deleting owner payment:', error);
            alert('Error deleting owner payment. Please try again.');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-CA');
    };

    const getPaymentTypeIcon = (type: string) => {
        switch (type) {
            case 'reimbursement':
                return <CreditCard className="h-4 w-4" />;
            case 'loan_repayment':
                return <FileText className="h-4 w-4" />;
            default:
                return <CheckCircle className="h-4 w-4" />;
        }
    };

    const getPaymentTypeColor = (type: string) => {
        switch (type) {
            case 'reimbursement':
                return 'bg-blue-100 text-blue-800';
            case 'loan_repayment':
                return 'bg-purple-100 text-purple-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const filteredPayments = ownerPayments.filter(payment => {
        const matchesSearch = payment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (payment.reference && payment.reference.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesType = !paymentTypeFilter || payment.payment_type === paymentTypeFilter;
        const matchesDate = !dateFilter || payment.payment_date.startsWith(dateFilter);

        return matchesSearch && matchesType && matchesDate;
    });

    const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Owner Payments</h1>
                    <p className="text-gray-600">Track payments made by the corporation to the owner</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                            Search
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                id="search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by description or reference..."
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="payment_type_filter" className="block text-sm font-medium text-gray-700 mb-2">
                            Payment Type
                        </label>
                        <select
                            id="payment_type_filter"
                            value={paymentTypeFilter}
                            onChange={(e) => setPaymentTypeFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Types</option>
                            <option value="reimbursement">Reimbursement</option>
                            <option value="loan_repayment">Loan Repayment</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="date_filter" className="block text-sm font-medium text-gray-700 mb-2">
                            Year
                        </label>
                        <select
                            id="date_filter"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Years</option>
                            <option value="2024">2024</option>
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Summary</h3>
                        <p className="text-gray-600">{filteredPayments.length} payments found</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</div>
                        <div className="text-sm text-gray-600">Total Amount</div>
                    </div>
                </div>
            </div>

            {/* Payments List */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {filteredPayments.length === 0 ? (
                    <div className="text-center py-12">
                        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
                        <p className="text-gray-600 mb-4">
                            {searchTerm || paymentTypeFilter || dateFilter
                                ? 'Try adjusting your filters to see more results.'
                                : 'Get started by adding your first owner payment.'
                            }
                        </p>
                        {!searchTerm && !paymentTypeFilter && !dateFilter && (
                            <button
                                onClick={() => setShowModal(true)}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Payment
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Description
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Reference
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {payment.description}
                                            </div>
                                            {payment.notes && (
                                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                                    {payment.notes}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentTypeColor(payment.payment_type)}`}>
                                                {getPaymentTypeIcon(payment.payment_type)}
                                                <span className="ml-1 capitalize">{payment.payment_type.replace('_', ' ')}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {formatCurrency(payment.amount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(payment.payment_date)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {payment.reference || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingPayment(payment);
                                                        setShowModal(true);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(payment.id)}
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
                )}
            </div>

            {showModal && (
                <OwnerPaymentModal
                    ownerPayment={editingPayment}
                    onClose={() => {
                        setShowModal(false);
                        setEditingPayment(undefined);
                    }}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

export default OwnerPayments;
