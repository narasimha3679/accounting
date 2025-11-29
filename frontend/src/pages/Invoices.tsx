import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type Invoice, type Client, type InvoiceItem } from '../lib/api';
import { Plus, Edit, Eye, Trash2, Send, Check, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { cn } from '../lib/utils';

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
            case 'draft': return 'bg-muted text-muted-foreground';
            case 'sent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'overdue': return 'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive-foreground';
            case 'cancelled': return 'bg-muted text-muted-foreground';
            default: return 'bg-muted text-muted-foreground';
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Invoices</h1>
                    <p className="text-muted-foreground mt-2">Manage your client invoices</p>
                </div>
                <Button
                    onClick={() => setShowCreateModal(true)}
                    icon={Plus}
                    className="w-full sm:w-auto"
                >
                    Create Invoice
                </Button>
            </div>

            {/* Invoices Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Invoice #</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Issue Date</th>
                                <th className="px-6 py-4">Due Date</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {invoices?.map((invoice) => (
                                <tr key={invoice.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-foreground">{invoice.invoice_number}</td>
                                    <td className="px-6 py-4 text-foreground">{invoice.client?.name || 'Unknown Client'}</td>
                                    <td className="px-6 py-4 text-muted-foreground">{formatDate(invoice.issue_date)}</td>
                                    <td className="px-6 py-4 text-muted-foreground">{formatDate(invoice.due_date)}</td>
                                    <td className="px-6 py-4 font-medium text-foreground">{formatCurrency(invoice.total)}</td>
                                    <td className="px-6 py-4">
                                        <span className={cn("inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full", getStatusColor(invoice.status))}>
                                            {invoice.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setEditingInvoice(invoice)}
                                                title="Edit"
                                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => window.open(`/invoices/${invoice.id}/preview`, '_blank')}
                                                title="Preview"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {invoice.status === 'draft' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleStatusChange(invoice, 'sent')}
                                                    title="Send"
                                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                                >
                                                    <Send className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {invoice.status === 'sent' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleStatusChange(invoice, 'paid')}
                                                    title="Mark as Paid"
                                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(invoice)}
                                                title="Delete"
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

    const addItem = (e?: React.MouseEvent) => {
        e?.preventDefault();
        e?.stopPropagation();

        if (!newItem.description || newItem.description.trim() === '') {
            alert('Please enter a description for the item');
            return;
        }

        if (!newItem.quantity || newItem.quantity <= 0) {
            alert('Please enter a quantity greater than 0');
            return;
        }

        if (!newItem.unit_price || newItem.unit_price <= 0) {
            alert('Please enter a unit price greater than 0');
            return;
        }

        const item: InvoiceItem = {
            id: Date.now(), // Temporary ID
            description: newItem.description.trim(),
            quantity: newItem.quantity,
            unit_price: newItem.unit_price,
            total: newItem.quantity * newItem.unit_price,
            invoice_id: invoice?.id || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        setItems([...items, item]);
        setNewItem({ description: '', quantity: 1, unit_price: 0 });
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

        // Validate that at least one item is added
        if (items.length === 0) {
            alert('Please add at least one item to the invoice');
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 sm:p-6">
            <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-foreground">
                            {invoice ? 'Edit Invoice' : 'Create New Invoice'}
                        </h3>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Basic Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label
                                    htmlFor="invoice-client"
                                    className="text-sm font-medium text-foreground"
                                >
                                    Client
                                </label>
                                <select
                                    id="invoice-client"
                                    value={formData.client_id}
                                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                >
                                    <option value="">Select a client</option>
                                    {clients.map(client => (
                                        <option key={client.id} value={client.id}>{client.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="invoice-issue-date" className="text-sm font-medium text-foreground">Issue Date</label>
                                <input
                                    id="invoice-issue-date"
                                    type="date"
                                    value={formData.issue_date}
                                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="invoice-due-date" className="text-sm font-medium text-foreground">Due Date</label>
                                <input
                                    id="invoice-due-date"
                                    type="date"
                                    value={formData.due_date}
                                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="invoice-description" className="text-sm font-medium text-foreground">Description</label>
                                <input
                                    id="invoice-description"
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Invoice description"
                                />
                            </div>
                        </div>

                        {/* Invoice Items */}
                        <div className="space-y-4">
                            <h4 className="text-base font-semibold text-foreground">Invoice Items</h4>

                            {/* Add New Item */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-muted/30 p-4 rounded-lg border border-border">
                                <div className="md:col-span-5 space-y-2">
                                    <label htmlFor="item-description" className="text-sm font-medium text-foreground">Description</label>
                                    <input
                                        id="item-description"
                                        type="text"
                                        placeholder="Item description"
                                        value={newItem.description}
                                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label htmlFor="item-quantity" className="text-sm font-medium text-foreground">Qty</label>
                                    <input
                                        id="item-quantity"
                                        type="number"
                                        placeholder="1"
                                        value={newItem.quantity}
                                        onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div className="md:col-span-3 space-y-2">
                                    <label htmlFor="item-unit-price" className="text-sm font-medium text-foreground">Unit Price</label>
                                    <input
                                        id="item-unit-price"
                                        type="number"
                                        placeholder="0.00"
                                        value={newItem.unit_price}
                                        onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Button
                                        type="button"
                                        onClick={(e) => addItem(e)}
                                        className="w-full"
                                        variant="secondary"
                                    >
                                        Add
                                    </Button>
                                </div>
                            </div>

                            {/* Items List */}
                            <div className="border border-border rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-muted-foreground uppercase text-xs font-semibold">
                                        <tr>
                                            <th className="px-4 py-3">Description</th>
                                            <th className="px-4 py-3 w-24">Qty</th>
                                            <th className="px-4 py-3 w-32">Unit Price</th>
                                            <th className="px-4 py-3 w-32">Total</th>
                                            <th className="px-4 py-3 w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border bg-card">
                                        {items.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                                    No items added yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            items.map((item, index) => (
                                                <tr key={item.id} className="hover:bg-muted/30">
                                                    <td className="px-4 py-3 text-foreground">{item.description}</td>
                                                    <td className="px-4 py-3 text-foreground">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-foreground">${item.unit_price.toFixed(2)}</td>
                                                    <td className="px-4 py-3 font-medium text-foreground">${item.total.toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeItem(index)}
                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end pt-4 border-t border-border">
                            <div className="w-full max-w-xs space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal:</span>
                                    <span className="font-medium text-foreground">${subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">HST (13%):</span>
                                    <span className="font-medium text-foreground">${hstAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold border-t border-border pt-3 text-foreground">
                                    <span>Total:</span>
                                    <span>${total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createInvoiceMutation.isPending || updateInvoiceMutation.isPending}
                            >
                                {createInvoiceMutation.isPending || updateInvoiceMutation.isPending
                                    ? 'Saving...'
                                    : invoice
                                        ? 'Update Invoice'
                                        : 'Create Invoice'
                                }
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Invoices;
