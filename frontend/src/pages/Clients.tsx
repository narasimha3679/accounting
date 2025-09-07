import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type Client } from '../lib/api';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const Clients: React.FC = () => {
    const { user } = useAuth();
    const _queryClient = useQueryClient();
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
            _queryClient.invalidateQueries({ queryKey: ['clients'] });
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
                    <p className="text-gray-600">Manage your client information</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Client
                </button>
            </div>

            {/* Clients Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {clients?.map((client) => (
                    <div key={client.id} className="card">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-medium text-gray-900">{client.name}</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setEditingClient(client)}
                                    className="text-blue-600 hover:text-blue-800"
                                    title="Edit"
                                >
                                    <Edit className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(client)}
                                    className="text-red-600 hover:text-red-800"
                                    title="Delete"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                            {client.contact_person && (
                                <p><span className="font-medium">Contact:</span> {client.contact_person}</p>
                            )}
                            {client.email && (
                                <p><span className="font-medium">Email:</span> {client.email}</p>
                            )}
                            {client.phone && (
                                <p><span className="font-medium">Phone:</span> {client.phone}</p>
                            )}
                            {client.address && (
                                <p><span className="font-medium">Address:</span> {client.address}</p>
                            )}
                            <p>
                                <span className="font-medium">HST Exempt:</span>{' '}
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${client.hst_exempt
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-blue-100 text-blue-800'
                                    }`}>
                                    {client.hst_exempt ? 'Yes' : 'No'}
                                </span>
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {clients?.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No clients found</p>
                    <p className="text-gray-400">Add your first client to get started</p>
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
                        _queryClient.invalidateQueries({ queryKey: ['clients'] });
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

const ClientModal: React.FC<ClientModalProps> = ({ client, onClose, onSave }) => {
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
                <div className="mt-3">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        {client ? 'Edit Client' : 'Add New Client'}
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Company Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                                <input
                                    type="text"
                                    value={formData.contact_person}
                                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                    className="input"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="input"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Phone</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="input"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Address</label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="input"
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
                                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="hst_exempt" className="ml-2 block text-sm text-gray-900">
                                        HST Exempt
                                    </label>
                                </div>
                                <p className="mt-1 text-sm text-gray-500">
                                    Check if this client is exempt from HST charges
                                </p>
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
                                disabled={createClientMutation.isPending || updateClientMutation.isPending}
                            >
                                {createClientMutation.isPending || updateClientMutation.isPending
                                    ? 'Saving...'
                                    : client
                                        ? 'Update Client'
                                        : 'Create Client'
                                }
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Clients;
