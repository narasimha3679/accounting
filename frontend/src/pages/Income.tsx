import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type IncomeEntry, type Client } from '../lib/api';
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const Income: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingIncome, setEditingIncome] = useState<IncomeEntry | null>(null);

    // Fetch income entries
    const { data: incomeEntries, isLoading } = useQuery({
        queryKey: ['income_entries', user?.company_id],
        queryFn: async () => {
            const result = await api.getIncomeEntries({
                company_id: user?.company_id,
                limit: 1000
            });
            return result.data;
        },
        enabled: !!user?.company_id,
    });

    // Fetch clients for dropdown
    const { data: clients } = useQuery({
        queryKey: ['clients', user?.company_id],
        queryFn: async () => {
            const result = await api.getClients({
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
        if (window.confirm('Are you sure you want to delete this income entry?')) {
            try {
                await api.deleteIncomeEntry(id);
                queryClient.invalidateQueries({ queryKey: ['income_entries'] });
            } catch (error) {
                console.error('Error deleting income entry:', error);
            }
        }
    };

    const getIncomeTypeLabel = (type: string) => {
        switch (type) {
            case 'client': return 'Client Income';
            case 'capital': return 'Capital Contribution';
            case 'other': return 'Other Income';
            default: return type;
        }
    };

    const getIncomeTypeColor = (type: string) => {
        switch (type) {
            case 'client': return 'bg-blue-100 text-blue-800';
            case 'capital': return 'bg-green-100 text-green-800';
            case 'other': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

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
                    <h1 className="text-2xl font-bold text-gray-900">Income Entries</h1>
                    <p className="text-gray-600">Track income from clients, capital contributions, and other sources</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Income Entry
                </button>
            </div>

            {/* Income Entries Table */}
            <div className="card">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Description
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Client
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    HST
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {incomeEntries?.map((entry) => (
                                <tr key={entry.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {entry.description}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getIncomeTypeColor(entry.income_type)}`}>
                                            {getIncomeTypeLabel(entry.income_type)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {entry.client?.name || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatCurrency(entry.amount)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatCurrency(entry.hst_amount)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {formatCurrency(entry.total)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(entry.income_date)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={() => setEditingIncome(entry)}
                                                className="text-primary-600 hover:text-primary-900"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(entry.id)}
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
            </div>

            {/* Create/Edit Modal */}
            {(showCreateModal || editingIncome) && (
                <IncomeModal
                    income={editingIncome}
                    clients={clients || []}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingIncome(null);
                    }}
                    onSave={() => {
                        queryClient.invalidateQueries({ queryKey: ['income_entries'] });
                        setShowCreateModal(false);
                        setEditingIncome(null);
                    }}
                />
            )}
        </div>
    );
};

interface IncomeModalProps {
    income?: IncomeEntry | null;
    clients: Client[];
    onClose: () => void;
    onSave: () => void;
}

const IncomeModal: React.FC<IncomeModalProps> = ({ income, clients, onClose, onSave }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        description: income?.description || '',
        amount: income?.amount || 0,
        income_type: income?.income_type || 'client',
        client_id: income?.client_id || '',
        income_date: income?.income_date ? income.income_date.split('T')[0] : new Date().toISOString().split('T')[0],
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const incomeData = {
                description: formData.description,
                amount: formData.amount,
                income_type: formData.income_type,
                client_id: formData.client_id ? (typeof formData.client_id === 'string' ? parseInt(formData.client_id) : formData.client_id) : undefined,
                income_date: formData.income_date,
                company_id: user?.company_id!,
            };

            if (income) {
                await api.updateIncomeEntry(income.id, incomeData);
            } else {
                await api.createIncomeEntry(incomeData);
            }

            onSave();
        } catch (error) {
            console.error('Error saving income entry:', error);
            setError('Failed to save income entry');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: string, value: string | number) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        {income ? 'Edit Income Entry' : 'Add Income Entry'}
                    </h3>

                    {error && (
                        <div className="mb-4 rounded-md bg-red-50 p-4">
                            <div className="text-sm text-red-700">{error}</div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                Description
                            </label>
                            <input
                                type="text"
                                id="description"
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                                Amount
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <DollarSign className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="number"
                                    id="amount"
                                    step="0.01"
                                    min="0"
                                    value={formData.amount}
                                    onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                                    className="block w-full pl-10 pr-3 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="income_type" className="block text-sm font-medium text-gray-700">
                                Income Type
                            </label>
                            <select
                                id="income_type"
                                value={formData.income_type}
                                onChange={(e) => handleInputChange('income_type', e.target.value)}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                required
                            >
                                <option value="client">Client Income</option>
                                <option value="capital">Capital Contribution</option>
                                <option value="other">Other Income</option>
                            </select>
                        </div>

                        {formData.income_type === 'client' && (
                            <div>
                                <label htmlFor="client_id" className="block text-sm font-medium text-gray-700">
                                    Client
                                </label>
                                <select
                                    id="client_id"
                                    value={formData.client_id}
                                    onChange={(e) => handleInputChange('client_id', e.target.value)}
                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                >
                                    <option value="">Select a client</option>
                                    {clients.map((client) => (
                                        <option key={client.id} value={client.id}>
                                            {client.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label htmlFor="income_date" className="block text-sm font-medium text-gray-700">
                                Income Date
                            </label>
                            <input
                                type="date"
                                id="income_date"
                                value={formData.income_date}
                                onChange={(e) => handleInputChange('income_date', e.target.value)}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                required
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                            >
                                {isLoading ? 'Saving...' : (income ? 'Update' : 'Create')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Income;
