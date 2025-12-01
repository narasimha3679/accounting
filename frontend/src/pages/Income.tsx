import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type IncomeEntry, type Client } from '../lib/api';
import { Plus, Edit, Trash2, DollarSign, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { cn } from '../lib/utils';

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
            case 'client': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'capital': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'other': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
            default: return 'bg-muted text-slate-muted';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Income Entries</h1>
                    <p className="text-slate-muted mt-2">Track income from clients, capital contributions, and other sources</p>
                </div>
                <Button
                    onClick={() => setShowCreateModal(true)}
                    icon={Plus}
                    className="w-full sm:w-auto"
                >
                    Add Income Entry
                </Button>
            </div>

            {/* Income Entries Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">HST</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {incomeEntries?.map((entry) => (
                                <tr key={entry.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white">
                                        {entry.description}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn("inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full", getIncomeTypeColor(entry.income_type))}>
                                            {getIncomeTypeLabel(entry.income_type)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-muted">
                                        {entry.client?.name || '-'}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-white">
                                        {formatCurrency(entry.amount)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-muted">
                                        {formatCurrency(entry.hst_amount)}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-white">
                                        {formatCurrency(entry.total)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-muted">
                                        {formatDate(entry.income_date)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setEditingIncome(entry)}
                                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(entry.id)}
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

    // Calculate HST based on client tax exemption status
    const calculateHST = (): number => {
        // Only calculate HST for client income type
        if (formData.income_type !== 'client' || !formData.client_id) {
            return 0;
        }

        const clientId = typeof formData.client_id === 'string' ? parseInt(formData.client_id) : formData.client_id;
        const selectedClient = clients.find(c => c.id === clientId);

        // If client is tax exempt, no HST
        if (selectedClient?.hst_exempt) {
            return 0;
        }

        // Calculate HST using company's HST rate
        const hstRate = user?.company?.hst_rate || 0.13;
        return formData.amount * hstRate;
    };

    const hstAmount = calculateHST();
    const total = formData.amount + hstAmount;

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
                hst_amount: hstAmount,
            };

            if (income) {
                // For update, also include total
                await api.updateIncomeEntry(income.id, {
                    ...incomeData,
                    total: total,
                });
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 sm:p-6">
            <div className="bg-card border border-white/10 rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-white">
                            {income ? 'Edit Income Entry' : 'Add Income Entry'}
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
                            <label htmlFor="description" className="text-sm font-medium text-white">
                                Description
                            </label>
                            <input
                                type="text"
                                id="description"
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="amount" className="text-sm font-medium text-white">
                                Amount
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <DollarSign className="h-4 w-4 text-slate-muted" />
                                </div>
                                <input
                                    type="number"
                                    id="amount"
                                    step="0.01"
                                    min="0"
                                    value={formData.amount}
                                    onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background pl-9 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                />
                            </div>
                        </div>

                        {formData.income_type === 'client' && formData.client_id && (
                            <div className="bg-muted/50 p-3 rounded-md space-y-2 border border-white/10">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-muted">HST ({((user?.company?.hst_rate || 0.13) * 100).toFixed(1)}%):</span>
                                    <span className="font-medium text-white">
                                        {new Intl.NumberFormat('en-CA', {
                                            style: 'currency',
                                            currency: 'CAD',
                                        }).format(hstAmount)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm font-semibold border-t border-white/10 pt-2">
                                    <span className="text-white">Total:</span>
                                    <span className="text-white">
                                        {new Intl.NumberFormat('en-CA', {
                                            style: 'currency',
                                            currency: 'CAD',
                                        }).format(total)}
                                    </span>
                                </div>
                                {(() => {
                                    const clientId = typeof formData.client_id === 'string' ? parseInt(formData.client_id) : formData.client_id;
                                    const selectedClient = clients.find(c => c.id === clientId);
                                    if (selectedClient?.hst_exempt) {
                                        return (
                                            <p className="text-xs text-slate-muted mt-1">
                                                Client is HST exempt - no HST charged
                                            </p>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor="income_type" className="text-sm font-medium text-white">
                                Income Type
                            </label>
                            <select
                                id="income_type"
                                value={formData.income_type}
                                onChange={(e) => handleInputChange('income_type', e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            >
                                <option value="client">Client Income</option>
                                <option value="capital">Capital Contribution</option>
                                <option value="other">Other Income</option>
                            </select>
                        </div>

                        {formData.income_type === 'client' && (
                            <div className="space-y-2">
                                <label htmlFor="client_id" className="text-sm font-medium text-white">
                                    Client
                                </label>
                                <select
                                    id="client_id"
                                    value={formData.client_id}
                                    onChange={(e) => handleInputChange('client_id', e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

                        <div className="space-y-2">
                            <label htmlFor="income_date" className="text-sm font-medium text-white">
                                Income Date
                            </label>
                            <input
                                type="date"
                                id="income_date"
                                value={formData.income_date}
                                onChange={(e) => handleInputChange('income_date', e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Saving...' : (income ? 'Update' : 'Create')}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Income;
