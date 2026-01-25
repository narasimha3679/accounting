import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentCompany } from '../hooks/useCurrentCompany';
import api, { type Invoice, type Client, type InvoiceItem, type RecurringInvoice } from '../lib/api';
import { Plus, Edit, Eye, Trash2, Send, Check, X, Power, PowerOff, Calendar } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import AccessDenied from '../components/AccessDenied';
import { cn, formatLocalDate } from '../lib/utils';
import InvoicePreview from '../components/invoices/InvoicePreview';

const Invoices: React.FC = () => {
    const { user } = useAuth();
    const { canManageInvoices, hasPermission } = useCurrentCompany();
    const _queryClient = useQueryClient();

    // Check permission
    if (!canManageInvoices && !hasPermission('can_view_financials')) {
        return <AccessDenied requiredPermission="can_manage_invoices" />;
    }
    const [activeTab, setActiveTab] = useState<'invoices' | 'templates'>('invoices');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [previewingInvoice, setPreviewingInvoice] = useState<Invoice | null>(null);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [invoiceToSend, setInvoiceToSend] = useState<Invoice | null>(null);
    const [emailInput, setEmailInput] = useState('');
    const [saveEmailToClient, setSaveEmailToClient] = useState(true);
    const [isSendingEmail, setIsSendingEmail] = useState(false);

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

    // Update client mutation
    const updateClientMutation = useMutation({
        mutationFn: async ({ id, email }: { id: number; email: string }) => {
            return api.updateClient(id, { email });
        },
        onSuccess: () => {
            _queryClient.invalidateQueries({ queryKey: ['clients'] });
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
        return formatLocalDate(dateString);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'bg-muted text-slate-muted';
            case 'sent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
            case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'overdue': return 'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive-foreground';
            case 'cancelled': return 'bg-muted text-slate-muted';
            default: return 'bg-muted text-slate-muted';
        }
    };

    const handleStatusChange = async (invoice: Invoice, newStatus: string) => {
        if (newStatus === 'paid') {
            const paid_date = prompt('Enter payment date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
            if (paid_date) {
                updateStatusMutation.mutate({ id: invoice.id, status: newStatus, paid_date });
            }
        } else if (newStatus === 'sent') {
            // Check if client has an email before sending
            const clientEmail = invoice.client?.email;
            if (!clientEmail || clientEmail.trim() === '') {
                // Show email modal to ask for email
                setInvoiceToSend(invoice);
                setEmailInput('');
                setSaveEmailToClient(true);
                setShowEmailModal(true);
                return;
            }
            // Client has email, send invoice via email
            try {
                setIsSendingEmail(true);
                const result = await api.sendInvoiceEmail(invoice.id, clientEmail);
                
                if (result.success) {
                    // Refresh invoices to get updated status
                    _queryClient.invalidateQueries({ queryKey: ['invoices'] });
                    alert('Invoice sent successfully!');
                } else {
                    throw new Error(result.message);
                }
            } catch (error: any) {
                console.error('Error sending invoice:', error);
                alert(`Failed to send invoice: ${error.message || 'Please try again.'}`);
            } finally {
                setIsSendingEmail(false);
            }
        } else {
            updateStatusMutation.mutate({ id: invoice.id, status: newStatus });
        }
    };

    const handleSendWithEmail = async () => {
        if (!invoiceToSend || !invoiceToSend.client_id) return;

        const email = emailInput.trim();
        if (!email) {
            alert('Please enter an email address');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address');
            return;
        }

        setIsSendingEmail(true);
        try {
            // Update client email if requested
            if (saveEmailToClient && invoiceToSend.client_id) {
                await updateClientMutation.mutateAsync({ 
                    id: invoiceToSend.client_id, 
                    email 
                });
            }

            // Send invoice via email (this will also update status to 'sent')
            const result = await api.sendInvoiceEmail(invoiceToSend.id, email);

            if (result.success) {
                // Refresh invoices to get updated status
                _queryClient.invalidateQueries({ queryKey: ['invoices'] });
                
                // Close modal
                setShowEmailModal(false);
                setInvoiceToSend(null);
                setEmailInput('');
                
                alert('Invoice sent successfully!');
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            console.error('Error sending invoice:', error);
            alert(`Failed to send invoice: ${error.message || 'Please try again.'}`);
        } finally {
            setIsSendingEmail(false);
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Invoices</h1>
                    <p className="text-slate-muted mt-2">Manage your client invoices and recurring templates</p>
                </div>
                {activeTab === 'invoices' && (
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        icon={Plus}
                        className="w-full sm:w-auto"
                    >
                        Create Invoice
                    </Button>
                )}
                {activeTab === 'templates' && (
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        icon={Plus}
                        className="w-full sm:w-auto"
                    >
                        Create Template
                    </Button>
                )}
            </div>

            {/* Tabs */}
            <div className="border-b border-white/10">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('invoices')}
                        className={cn(
                            "py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                            activeTab === 'invoices'
                                ? "border-neon-emerald text-neon-emerald"
                                : "border-transparent text-slate-muted hover:text-white hover:border-white/20"
                        )}
                    >
                        All Invoices
                    </button>
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={cn(
                            "py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                            activeTab === 'templates'
                                ? "border-neon-emerald text-neon-emerald"
                                : "border-transparent text-slate-muted hover:text-white hover:border-white/20"
                        )}
                    >
                        Recurring Templates
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'invoices' && (
                <>
            {/* Invoices Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold">
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
                                    <td className="px-6 py-4 font-medium text-white">{invoice.invoice_number}</td>
                                    <td className="px-6 py-4 text-white">{invoice.client?.name || 'Unknown Client'}</td>
                                    <td className="px-6 py-4 text-slate-muted">{formatDate(invoice.issue_date)}</td>
                                    <td className="px-6 py-4 text-slate-muted">{formatDate(invoice.due_date)}</td>
                                    <td className="px-6 py-4 font-medium text-white">{formatCurrency(invoice.total)}</td>
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
                                                onClick={() => setPreviewingInvoice(invoice)}
                                                title="Preview"
                                                className="h-8 w-8 text-slate-muted hover:text-white"
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
                </>
            )}

            {activeTab === 'templates' && (
                <RecurringTemplatesTab
                    clients={clients || []}
                />
            )}

            {/* Create/Edit Recurring Template Modal */}
            {activeTab === 'templates' && showCreateModal && (
                <RecurringInvoiceModal
                    template={null}
                    clients={clients || []}
                    onClose={() => {
                        setShowCreateModal(false);
                    }}
                    onSave={() => {
                        _queryClient.invalidateQueries({ queryKey: ['recurring-invoices'] });
                        setShowCreateModal(false);
                    }}
                />
            )}

            {/* Email Input Modal */}
            {showEmailModal && invoiceToSend && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 sm:p-6">
                    <Card className="w-full max-w-md">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-white">
                                    Enter Email Address
                                </h3>
                                <Button variant="ghost" size="icon" onClick={() => {
                                    setShowEmailModal(false);
                                    setInvoiceToSend(null);
                                    setEmailInput('');
                                }}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <p className="text-slate-muted">
                                    Client <span className="font-medium text-white">{invoiceToSend.client?.name || 'Unknown'}</span> does not have an email address. Please enter an email address to send the invoice.
                                </p>

                                <div className="space-y-2">
                                    <label htmlFor="email-input" className="text-sm font-medium text-white">
                                        Email Address
                                    </label>
                                    <input
                                        id="email-input"
                                        type="email"
                                        value={emailInput}
                                        onChange={(e) => setEmailInput(e.target.value)}
                                        placeholder="client@example.com"
                                        className="flex h-10 w-full rounded-md glass border border-white/10 bg-transparent text-white placeholder:text-slate-muted focus-visible:ring-neon-emerald px-3 py-2 text-sm ring-offset-background placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleSendWithEmail();
                                            }
                                        }}
                                    />
                                </div>

                                <div className="flex items-center space-x-2">
                                    <input
                                        id="save-email-checkbox"
                                        type="checkbox"
                                        checked={saveEmailToClient}
                                        onChange={(e) => setSaveEmailToClient(e.target.checked)}
                                        className="h-4 w-4 rounded border-white/10 bg-transparent text-neon-emerald focus:ring-neon-emerald focus:ring-offset-0"
                                    />
                                    <label htmlFor="save-email-checkbox" className="text-sm text-slate-muted cursor-pointer">
                                        Save this email to the client's profile
                                    </label>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setShowEmailModal(false);
                                            setInvoiceToSend(null);
                                            setEmailInput('');
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleSendWithEmail}
                                        disabled={isSendingEmail || updateClientMutation.isPending || !emailInput.trim()}
                                    >
                                        {isSendingEmail || updateClientMutation.isPending
                                            ? 'Sending...'
                                            : 'Send Invoice'
                                        }
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Invoice Preview Modal */}
            {previewingInvoice && (
                <InvoicePreview
                    invoice={previewingInvoice}
                    onClose={() => setPreviewingInvoice(null)}
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
            <div className="bg-card border border-white/10 rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-white">
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
                                    className="text-sm font-medium text-white"
                                >
                                    Client
                                </label>
                                <select
                                    id="invoice-client"
                                    value={formData.client_id}
                                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                    className="flex h-10 w-full rounded-md glass border border-white/10 bg-card text-white placeholder:text-slate-muted focus-visible:ring-neon-emerald px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                >
                                    <option value="">Select a client</option>
                                    {clients.map(client => (
                                        <option key={client.id} value={client.id}>{client.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="invoice-issue-date" className="text-sm font-medium text-white">Issue Date</label>
                                <input
                                    id="invoice-issue-date"
                                    type="date"
                                    value={formData.issue_date}
                                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                                    className="flex h-10 w-full rounded-md glass border border-white/10 bg-transparent text-white placeholder:text-slate-muted focus-visible:ring-neon-emerald px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="invoice-due-date" className="text-sm font-medium text-white">Due Date</label>
                                <input
                                    id="invoice-due-date"
                                    type="date"
                                    value={formData.due_date}
                                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                    className="flex h-10 w-full rounded-md glass border border-white/10 bg-transparent text-white placeholder:text-slate-muted focus-visible:ring-neon-emerald px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="invoice-description" className="text-sm font-medium text-white">Description</label>
                                <input
                                    id="invoice-description"
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="flex h-10 w-full rounded-md glass border border-white/10 bg-transparent text-white placeholder:text-slate-muted focus-visible:ring-neon-emerald px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Invoice description"
                                />
                            </div>
                        </div>

                        {/* Invoice Items */}
                        <div className="space-y-4">
                            <h4 className="text-base font-semibold text-white">Invoice Items</h4>

                            {/* Add New Item */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-muted/30 p-4 rounded-lg border border-white/10">
                                <div className="md:col-span-5 space-y-2">
                                    <label htmlFor="item-description" className="text-sm font-medium text-white">Description</label>
                                    <input
                                        id="item-description"
                                        type="text"
                                        placeholder="Item description"
                                        value={newItem.description}
                                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                        className="flex h-10 w-full rounded-md glass border border-white/10 bg-transparent text-white placeholder:text-slate-muted focus-visible:ring-neon-emerald px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label htmlFor="item-quantity" className="text-sm font-medium text-white">Qty</label>
                                    <input
                                        id="item-quantity"
                                        type="number"
                                        placeholder="1"
                                        value={newItem.quantity}
                                        onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                                        className="flex h-10 w-full rounded-md glass border border-white/10 bg-transparent text-white placeholder:text-slate-muted focus-visible:ring-neon-emerald px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div className="md:col-span-3 space-y-2">
                                    <label htmlFor="item-unit-price" className="text-sm font-medium text-white">Unit Price</label>
                                    <input
                                        id="item-unit-price"
                                        type="number"
                                        placeholder="0.00"
                                        value={newItem.unit_price}
                                        onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                                        className="flex h-10 w-full rounded-md glass border border-white/10 bg-transparent text-white placeholder:text-slate-muted focus-visible:ring-neon-emerald px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                            <div className="border border-white/10 rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-slate-muted uppercase text-xs font-semibold">
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
                                                <td colSpan={5} className="px-4 py-8 text-center text-slate-muted">
                                                    No items added yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            items.map((item, index) => (
                                                <tr key={item.id} className="hover:bg-muted/30">
                                                    <td className="px-4 py-3 text-white">{item.description}</td>
                                                    <td className="px-4 py-3 text-white">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-white">${item.unit_price.toFixed(2)}</td>
                                                    <td className="px-4 py-3 font-medium text-white">${item.total.toFixed(2)}</td>
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
                        <div className="flex justify-end pt-4 border-t border-white/10">
                            <div className="w-full max-w-xs space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-muted">Subtotal:</span>
                                    <span className="font-medium text-white">${subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-muted">HST (13%):</span>
                                    <span className="font-medium text-white">${hstAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-3 text-white">
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

// Recurring Templates Tab Component
interface RecurringTemplatesTabProps {
    clients: Client[];
}

const RecurringTemplatesTab: React.FC<RecurringTemplatesTabProps> = ({ clients }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [editingTemplate, setEditingTemplate] = useState<RecurringInvoice | null>(null);
    const [templateToDelete, setTemplateToDelete] = useState<RecurringInvoice | null>(null);

    // Fetch recurring invoices
    const { data: recurringInvoices, isLoading } = useQuery({
        queryKey: ['recurring-invoices', user?.company_id],
        queryFn: async () => {
            if (!user?.company_id) return [];
            return api.getRecurringInvoices(user.company_id);
        },
        enabled: !!user?.company_id,
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return api.deleteRecurringInvoice(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurring-invoices'] });
            setTemplateToDelete(null);
        },
    });

    // Toggle active mutation
    const toggleMutation = useMutation({
        mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
            return api.toggleRecurringInvoice(id, is_active);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recurring-invoices'] });
        },
    });

    const formatDate = (dateString: string) => {
        return formatLocalDate(dateString);
    };

    const getFrequencyLabel = (frequency: string) => {
        const labels: Record<string, string> = {
            weekly: 'Weekly',
            biweekly: 'Bi-weekly',
            monthly: 'Monthly',
            quarterly: 'Quarterly',
            yearly: 'Yearly',
        };
        return labels[frequency] || frequency;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    return (
        <>
            {/* Templates List */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Template Name</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Frequency</th>
                                <th className="px-6 py-4">Next Generation</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {recurringInvoices && recurringInvoices.length > 0 ? (
                                recurringInvoices.map((template: RecurringInvoice) => (
                                    <tr key={template.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">{template.template_name}</td>
                                        <td className="px-6 py-4 text-white">{template.client?.name || 'Unknown Client'}</td>
                                        <td className="px-6 py-4 text-slate-muted">{getFrequencyLabel(template.frequency)}</td>
                                        <td className="px-6 py-4 text-slate-muted">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                {formatDate(template.next_generation_date)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full",
                                                template.is_active
                                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                    : "bg-muted text-slate-muted"
                                            )}>
                                                {template.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => toggleMutation.mutate({
                                                        id: template.id,
                                                        is_active: !template.is_active
                                                    })}
                                                    title={template.is_active ? 'Deactivate' : 'Activate'}
                                                    className="h-8 w-8"
                                                    disabled={toggleMutation.isPending}
                                                >
                                                    {template.is_active ? (
                                                        <PowerOff className="h-4 w-4 text-yellow-600" />
                                                    ) : (
                                                        <Power className="h-4 w-4 text-green-600" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setEditingTemplate(template)}
                                                    title="Edit"
                                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setTemplateToDelete(template)}
                                                    title="Delete"
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-muted">
                                        No recurring invoice templates. Create one to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Edit Template Modal */}
            {editingTemplate && (
                <RecurringInvoiceModal
                    template={editingTemplate}
                    clients={clients}
                    onClose={() => {
                        setEditingTemplate(null);
                    }}
                    onSave={() => {
                        queryClient.invalidateQueries({ queryKey: ['recurring-invoices'] });
                        setEditingTemplate(null);
                    }}
                />
            )}

            {/* Delete Confirmation Modal */}
            {templateToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                    <div className="bg-card border border-white/10 rounded-xl shadow-lg w-full max-w-md">
                        <div className="p-6">
                            <h3 className="text-xl font-semibold text-white mb-4">Confirm Deletion</h3>
                            <p className="text-slate-muted mb-6">
                                Are you sure you want to delete the template <strong className="text-white">{templateToDelete.template_name}</strong>? This action cannot be undone.
                            </p>
                            <div className="flex flex-col sm:flex-row justify-end gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setTemplateToDelete(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => deleteMutation.mutate(templateToDelete.id)}
                                    disabled={deleteMutation.isPending}
                                >
                                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// Recurring Invoice Modal Component
interface RecurringInvoiceModalProps {
    template?: RecurringInvoice | null;
    clients: Client[];
    onClose: () => void;
    onSave: () => void;
}

const RecurringInvoiceModal: React.FC<RecurringInvoiceModalProps> = ({ template, clients, onClose, onSave }) => {
    const { user } = useAuth();
    
    const [formData, setFormData] = useState({
        client_id: template?.client_id || '',
        template_name: template?.template_name || '',
        description: template?.description || '',
        frequency: template?.frequency || 'monthly' as 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly',
        day_of_month: template?.day_of_month || '',
        next_generation_date: template?.next_generation_date || new Date().toISOString().split('T')[0],
        end_date: template?.end_date || '',
    });
    
    const [items, setItems] = useState<Array<{ description: string; quantity: number; unit_price: number }>>(
        template?.items || []
    );
    const [newItem, setNewItem] = useState({
        description: '',
        quantity: 1,
        unit_price: 0,
    });
    const [error, setError] = useState<string>('');

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.createRecurringInvoice({
                ...data,
                company_id: user!.company_id!,
            });
        },
        onSuccess: () => {
            onSave();
        },
        onError: (err: any) => {
            setError(err.message || 'Failed to create template');
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.updateRecurringInvoice(template!.id, data);
        },
        onSuccess: () => {
            onSave();
        },
        onError: (err: any) => {
            setError(err.message || 'Failed to update template');
        },
    });

    const addItem = (e?: React.MouseEvent) => {
        e?.preventDefault();
        setError('');

        if (!newItem.description.trim()) {
            setError('Please enter a description for the item');
            return;
        }

        if (newItem.quantity <= 0) {
            setError('Please enter a quantity greater than 0');
            return;
        }

        if (newItem.unit_price <= 0) {
            setError('Please enter a unit price greater than 0');
            return;
        }

        setItems([...items, { ...newItem, description: newItem.description.trim() }]);
        setNewItem({ description: '', quantity: 1, unit_price: 0 });
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.client_id || formData.client_id === '') {
            setError('Please select a client');
            return;
        }

        if (!formData.template_name.trim()) {
            setError('Please enter a template name');
            return;
        }

        if (items.length === 0) {
            setError('Please add at least one item to the template');
            return;
        }

        const payload = {
            client_id: parseInt(String(formData.client_id)),
            template_name: formData.template_name.trim(),
            description: formData.description || undefined,
            items,
            frequency: formData.frequency,
            day_of_month: formData.day_of_month ? parseInt(String(formData.day_of_month)) : undefined,
            next_generation_date: formData.next_generation_date,
            end_date: formData.end_date || undefined,
        };

        if (template) {
            updateMutation.mutate(payload);
        } else {
            createMutation.mutate(payload);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 sm:p-6">
            <div className="bg-card border border-white/10 rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-white">
                            {template ? 'Edit Recurring Invoice Template' : 'Create Recurring Invoice Template'}
                        </h3>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* Basic Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white">Template Name *</label>
                                <input
                                    type="text"
                                    value={formData.template_name}
                                    onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                                    className="flex h-10 w-full rounded-md glass border border-white/10 bg-transparent text-white placeholder:text-slate-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    placeholder="e.g., Monthly Retainer"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white">Client *</label>
                                <select
                                    value={formData.client_id}
                                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                    className="flex h-10 w-full rounded-md glass border border-white/10 bg-card text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    required
                                >
                                    <option value="">Select a client</option>
                                    {clients.map(client => (
                                        <option key={client.id} value={client.id}>{client.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white">Frequency *</label>
                                <select
                                    value={formData.frequency}
                                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                                    className="flex h-10 w-full rounded-md glass border border-white/10 bg-card text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    required
                                >
                                    <option value="weekly">Weekly</option>
                                    <option value="biweekly">Bi-weekly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            </div>
                            {(formData.frequency === 'monthly' || formData.frequency === 'quarterly' || formData.frequency === 'yearly') && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-white">Day of Month</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={formData.day_of_month}
                                        onChange={(e) => setFormData({ ...formData, day_of_month: e.target.value })}
                                        className="flex h-10 w-full rounded-md glass border border-white/10 bg-transparent text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        placeholder="Leave empty for end of month"
                                    />
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white">Next Generation Date *</label>
                                <input
                                    type="date"
                                    value={formData.next_generation_date}
                                    onChange={(e) => setFormData({ ...formData, next_generation_date: e.target.value })}
                                    className="flex h-10 w-full rounded-md glass border border-white/10 bg-transparent text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white">End Date (Optional)</label>
                                <input
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    className="flex h-10 w-full rounded-md glass border border-white/10 bg-transparent text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="flex w-full rounded-md glass border border-white/10 bg-transparent text-white placeholder:text-slate-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
                                placeholder="Invoice description"
                            />
                        </div>

                        {/* Items Section */}
                        <div className="space-y-4">
                            <h4 className="text-base font-semibold text-white">Invoice Items</h4>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-muted/30 p-4 rounded-lg border border-white/10">
                                <div className="md:col-span-5 space-y-2">
                                    <label className="text-sm font-medium text-white">Description</label>
                                    <input
                                        type="text"
                                        placeholder="Item description"
                                        value={newItem.description}
                                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                        className="flex h-10 w-full rounded-md glass border border-white/10 bg-transparent text-white placeholder:text-slate-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-sm font-medium text-white">Qty</label>
                                    <input
                                        type="number"
                                        placeholder="1"
                                        value={newItem.quantity}
                                        onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                                        className="flex h-10 w-full rounded-md glass border border-white/10 bg-transparent text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div className="md:col-span-3 space-y-2">
                                    <label className="text-sm font-medium text-white">Unit Price</label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={newItem.unit_price}
                                        onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                                        className="flex h-10 w-full rounded-md glass border border-white/10 bg-transparent text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

                            <div className="border border-white/10 rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-slate-muted uppercase text-xs font-semibold">
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
                                                <td colSpan={5} className="px-4 py-8 text-center text-slate-muted">
                                                    No items added yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            items.map((item, index) => (
                                                <tr key={index} className="hover:bg-muted/30">
                                                    <td className="px-4 py-3 text-white">{item.description}</td>
                                                    <td className="px-4 py-3 text-white">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-white">${item.unit_price.toFixed(2)}</td>
                                                    <td className="px-4 py-3 font-medium text-white">${(item.quantity * item.unit_price).toFixed(2)}</td>
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
                                disabled={createMutation.isPending || updateMutation.isPending}
                            >
                                {createMutation.isPending || updateMutation.isPending
                                    ? 'Saving...'
                                    : template
                                        ? 'Update Template'
                                        : 'Create Template'
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
