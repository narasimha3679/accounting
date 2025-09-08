import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type Invoice, type Client, type InvoiceItem } from '../lib/api';
import { Plus, Edit, Eye, Trash2, Send, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const Invoices: React.FC = () => {
    const { user } = useAuth();
    const _queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

    // Fetch invoices
    const { data: invoices, isLoading } = useQuery({
        queryKey: ['invoices', user?.company_id],
        queryFn: async () => {
            const result = await api.getInvoices({
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

    // Update invoice status mutation
    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status, paid_date }: { id: number; status: string; paid_date?: string }) => {
            const data: any = { status };
            if (status === 'paid' && paid_date) {
                data.paid_date = paid_date;
            }
            return api.updateInvoice(id, data);
        },
        onSuccess: () => {
            _queryClient.invalidateQueries({ queryKey: ['invoices'] });
        },
    });

    // Delete invoice mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return api.deleteInvoice(id);
        },
        onSuccess: () => {
            _queryClient.invalidateQueries({ queryKey: ['invoices'] });
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'bg-gray-100 text-gray-800';
            case 'sent': return 'bg-blue-100 text-blue-800';
            case 'paid': return 'bg-green-100 text-green-800';
            case 'overdue': return 'bg-red-100 text-red-800';
            case 'cancelled': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const handleStatusChange = (invoice: Invoice, newStatus: string) => {
        if (newStatus === 'paid') {
            const paid_date = prompt('Enter payment date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
            if (paid_date) {
                updateStatusMutation.mutate({ id: invoice.id, status: newStatus, paid_date });
            }
        } else {
            updateStatusMutation.mutate({ id: invoice.id, status: newStatus });
        }
    };

    const handleDelete = (invoice: Invoice) => {
        if (confirm(`Are you sure you want to delete invoice ${invoice.invoice_number}?`)) {
            deleteMutation.mutate(invoice.id);
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
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
                    <p className="text-gray-600">Manage your client invoices</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                    <Plus className="h-4 w-4" />
                    Create Invoice
                </button>
            </div>

            {/* Invoices Table */}
            <div className="card">
                <div className="overflow-x-auto">
                    <table className="table-mobile">
                        <thead className="bg-gray-50">
                            <tr>
                                <th>Invoice #</th>
                                <th>Client</th>
                                <th>Issue Date</th>
                                <th>Due Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {invoices?.map((invoice) => (
                                <tr key={invoice.id}>
                                    <td data-label="Invoice #" className="font-medium">{invoice.invoice_number}</td>
                                    <td data-label="Client">{invoice.client?.name || 'Unknown Client'}</td>
                                    <td data-label="Issue Date">{formatDate(invoice.issue_date)}</td>
                                    <td data-label="Due Date">{formatDate(invoice.due_date)}</td>
                                    <td data-label="Amount" className="font-medium">{formatCurrency(invoice.total)}</td>
                                    <td data-label="Status">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                                            {invoice.status}
                                        </span>
                                    </td>
                                    <td data-label="Actions">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <button
                                                onClick={() => setEditingInvoice(invoice)}
                                                className="text-blue-600 hover:text-blue-800 p-1"
                                                title="Edit"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => window.open(`/invoices/${invoice.id}/preview`, '_blank')}
                                                className="text-gray-600 hover:text-gray-800 p-1"
                                                title="Preview"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            {invoice.status === 'draft' && (
                                                <button
                                                    onClick={() => handleStatusChange(invoice, 'sent')}
                                                    className="text-green-600 hover:text-green-800 p-1"
                                                    title="Send"
                                                >
                                                    <Send className="h-4 w-4" />
                                                </button>
                                            )}
                                            {invoice.status === 'sent' && (
                                                <button
                                                    onClick={() => handleStatusChange(invoice, 'paid')}
                                                    className="text-green-600 hover:text-green-800 p-1"
                                                    title="Mark as Paid"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(invoice)}
                                                className="text-red-600 hover:text-red-800 p-1"
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

            {/* Create/Edit Invoice Modal */}
            {(showCreateModal || editingInvoice) && (
                <InvoiceModal
                    invoice={editingInvoice}
                    clients={clients || []}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingInvoice(null);
                    }}
                    onSave={() => {
                        _queryClient.invalidateQueries({ queryKey: ['invoices'] });
                        setShowCreateModal(false);
                        setEditingInvoice(null);
                    }}
                />
            )}
        </div>
    );
};

// Invoice Modal Component
interface InvoiceModalProps {
    invoice?: Invoice | null;
    clients: Client[];
    onClose: () => void;
    onSave: () => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ invoice, clients, onClose, onSave }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        client_id: invoice?.client_id || '',
        issue_date: invoice?.issue_date || new Date().toISOString().split('T')[0],
        due_date: invoice?.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: invoice?.description || '',
    });
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [newItem, setNewItem] = useState({
        description: '',
        quantity: 1,
        unit_price: 0,
    });

    // Fetch invoice items if editing
    useEffect(() => {
        if (invoice) {
            // For now, we'll use the items from the invoice object
            // In a real implementation, you might need a separate API call
            setItems(invoice.items || []);
        }
    }, [invoice]);

    const createInvoiceMutation = useMutation({
        mutationFn: async (data: any) => {
            const invoiceData = {
                ...data,
                items: items.map(item => ({
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                }))
            };
            return api.createInvoice(invoiceData);
        },
        onSuccess: () => {
            onSave();
        },
    });

    const updateInvoiceMutation = useMutation({
        mutationFn: async (data: any) => {
            const invoiceData = {
                ...data,
                items: items.map(item => ({
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                }))
            };
            return api.updateInvoice(invoice!.id, invoiceData);
        },
        onSuccess: () => {
            onSave();
        },
    });

    const addItem = () => {
        if (newItem.description && newItem.quantity > 0 && newItem.unit_price > 0) {
            const item: InvoiceItem = {
                id: Date.now(), // Temporary ID
                description: newItem.description,
                quantity: newItem.quantity,
                unit_price: newItem.unit_price,
                total: newItem.quantity * newItem.unit_price,
                invoice_id: invoice?.id || 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            setItems([...items, item]);
            setNewItem({ description: '', quantity: 1, unit_price: 0 });
        }
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const hstRate = user?.company?.hst_rate || 0.13; // Use company HST rate, fallback to 13%
        const hstAmount = subtotal * hstRate;
        const total = subtotal + hstAmount;
        return { subtotal, hstAmount, total };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate client_id
        if (!formData.client_id || formData.client_id === '') {
            alert('Please select a client');
            return;
        }

        const clientId = parseInt(String(formData.client_id));
        if (isNaN(clientId)) {
            alert('Invalid client selection');
            return;
        }

        const { subtotal, hstAmount, total } = calculateTotals();

        const invoiceData = {
            ...formData,
            client_id: clientId,
            company_id: user?.company_id,
            subtotal,
            hst_amount: hstAmount,
            total,
            status: 'draft',
        };

        if (invoice) {
            updateInvoiceMutation.mutate(invoiceData);
        } else {
            createInvoiceMutation.mutate(invoiceData);
        }
    };

    const { subtotal, hstAmount, total } = calculateTotals();

    return (
        <div className="modal-mobile">
            <div className="modal-content-mobile">
                <div className="mt-3">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        {invoice ? 'Edit Invoice' : 'Create New Invoice'}
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Information */}
                        <div className="grid-mobile-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Client</label>
                                <select
                                    value={formData.client_id}
                                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                    className="input"
                                    required
                                >
                                    <option value="">Select a client</option>
                                    {clients.map(client => (
                                        <option key={client.id} value={client.id}>{client.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Issue Date</label>
                                <input
                                    type="date"
                                    value={formData.issue_date}
                                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Due Date</label>
                                <input
                                    type="date"
                                    value={formData.due_date}
                                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="input"
                                    placeholder="Invoice description"
                                />
                            </div>
                        </div>

                        {/* Invoice Items */}
                        <div>
                            <h4 className="text-md font-medium text-gray-900 mb-3">Invoice Items</h4>

                            {/* Add New Item */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-4">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Description"
                                        value={newItem.description}
                                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="number"
                                        placeholder="Quantity"
                                        value={newItem.quantity}
                                        onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                                        className="input"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="number"
                                        placeholder="Unit Price"
                                        value={newItem.unit_price}
                                        onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                                        className="input"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div>
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="btn btn-primary w-full"
                                    >
                                        Add Item
                                    </button>
                                </div>
                            </div>

                            {/* Items List */}
                            <div className="overflow-x-auto">
                                <table className="table-mobile">
                                    <thead>
                                        <tr>
                                            <th>Description</th>
                                            <th>Quantity</th>
                                            <th>Unit Price</th>
                                            <th>Total</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, index) => (
                                            <tr key={item.id}>
                                                <td data-label="Description">{item.description}</td>
                                                <td data-label="Quantity">{item.quantity}</td>
                                                <td data-label="Unit Price">${item.unit_price.toFixed(2)}</td>
                                                <td data-label="Total">${item.total.toFixed(2)}</td>
                                                <td data-label="Actions">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(index)}
                                                        className="text-red-600 hover:text-red-800 p-1"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="border-t pt-4">
                            <div className="flex justify-end">
                                <div className="w-64 space-y-2">
                                    <div className="flex justify-between">
                                        <span>Subtotal:</span>
                                        <span>${subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>HST (13%):</span>
                                        <span>${hstAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                                        <span>Total:</span>
                                        <span>${total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row justify-end gap-3">
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
                                disabled={createInvoiceMutation.isPending || updateInvoiceMutation.isPending}
                            >
                                {createInvoiceMutation.isPending || updateInvoiceMutation.isPending
                                    ? 'Saving...'
                                    : invoice
                                        ? 'Update Invoice'
                                        : 'Create Invoice'
                                }
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Invoices;
