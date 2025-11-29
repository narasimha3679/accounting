import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type Client } from '../lib/api';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const Clients: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    // Fetch clients
    const { data: clients, isLoading } = useQuery({
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

    // Delete client mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return api.deleteClient(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
        },
    });

    const handleDelete = (client: Client) => {
        if (confirm(`Are you sure you want to delete client "${client.name}"?`)) {
            deleteMutation.mutate(client.id);
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
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Clients</h1>
                    <p className="text-muted-foreground mt-2">Manage your client information</p>
                </div>
                <Button
                    onClick={() => setShowCreateModal(true)}
                    icon={Plus}
                    className="w-full sm:w-auto"
                >
                    Add Client
                </Button>
            </div>

            {/* Clients Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {clients?.map((client) => (
                    <Card key={client.id} className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-medium text-foreground">{client.name}</h3>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setEditingClient(client)}
                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                    title="Edit"
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(client)}
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    title="Delete"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm text-muted-foreground">
                            {client.contact_person && (
                                <p><span className="font-medium text-foreground">Contact:</span> {client.contact_person}</p>
                            )}
                            {client.email && (
                                <p><span className="font-medium text-foreground">Email:</span> {client.email}</p>
                            )}
                            {client.phone && (
                                <p><span className="font-medium text-foreground">Phone:</span> {client.phone}</p>
                            )}
                            {client.address && (
                                <p><span className="font-medium text-foreground">Address:</span> {client.address}</p>
                            )}
                            <p>
                                <span className="font-medium text-foreground">HST Exempt:</span>{' '}
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${client.hst_exempt
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                    }`}>
                                    {client.hst_exempt ? 'Yes' : 'No'}
                                </span>
                            </p>
                        </div>
                    </Card>
                ))}
            </div>

            {clients?.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">No clients found</p>
                    <p className="text-muted-foreground/60">Add your first client to get started</p>
                </div>
            )}

            {/* Create/Edit Client Modal */}
            {(showCreateModal || editingClient) && (
                <ClientModal
                    client={editingClient}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingClient(null);
                    }}
                    onSave={() => {
                        queryClient.invalidateQueries({ queryKey: ['clients'] });
                        setShowCreateModal(false);
                        setEditingClient(null);
                    }}
                />
            )}
        </div>
    );
};

// Client Modal Component
interface ClientModalProps {
    client?: Client | null;
    onClose: () => void;
    onSave: () => void;
}

function ClientModal({ client, onClose, onSave }: ClientModalProps) {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: client?.name || '',
        contact_person: client?.contact_person || '',
        email: client?.email || '',
        phone: client?.phone || '',
        address: client?.address || '',
        hst_exempt: client?.hst_exempt || false,
    });

    const createClientMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.createClient(data);
        },
        onSuccess: () => {
            onSave();
        },
    });

    const updateClientMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.updateClient(client!.id, data);
        },
        onSuccess: () => {
            onSave();
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const clientData = {
            ...formData,
            company_id: user?.company_id,
        };

        if (client) {
            updateClientMutation.mutate(clientData);
        } else {
            createClientMutation.mutate(clientData);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-foreground">
                        {client ? 'Edit Client' : 'Add New Client'}
                    </h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 rounded-full"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label htmlFor="client-name" className="block text-sm font-medium text-foreground mb-2">Company Name *</label>
                            <input
                                id="client-name"
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="client-contact-person" className="block text-sm font-medium text-foreground mb-2">Contact Person</label>
                            <input
                                id="client-contact-person"
                                type="text"
                                value={formData.contact_person}
                                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        <div>
                            <label htmlFor="client-email" className="block text-sm font-medium text-foreground mb-2">Email</label>
                            <input
                                id="client-email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        <div>
                            <label htmlFor="client-phone" className="block text-sm font-medium text-foreground mb-2">Phone</label>
                            <input
                                id="client-phone"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label htmlFor="client-address" className="block text-sm font-medium text-foreground mb-2">Address</label>
                            <textarea
                                id="client-address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                rows={3}
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="hst_exempt"
                                    checked={formData.hst_exempt}
                                    onChange={(e) => setFormData({ ...formData, hst_exempt: e.target.checked })}
                                    className="h-4 w-4 text-primary focus:ring-primary border-input rounded"
                                />
                                <label htmlFor="hst_exempt" className="ml-2 block text-sm text-foreground">
                                    HST Exempt
                                </label>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Check if this client is exempt from HST charges
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={createClientMutation.isPending || updateClientMutation.isPending}
                        >
                            {createClientMutation.isPending || updateClientMutation.isPending
                                ? 'Saving...'
                                : client
                                    ? 'Update Client'
                                    : 'Create Client'
                            }
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Clients;
