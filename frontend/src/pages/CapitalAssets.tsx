import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type CapitalAsset, type ExpenseCategory, type CCAClass } from '../lib/api';
import { Plus, Edit, Trash2, Calculator, Building2, Calendar, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import HelpIcon from '../components/ui/HelpIcon';

const CapitalAssets: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingAsset, setEditingAsset] = useState<CapitalAsset | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedCCAClass, setSelectedCCAClass] = useState<string>('all');
    const [showDepreciationSchedule, setShowDepreciationSchedule] = useState<CapitalAsset | null>(null);

    // Fetch capital assets
    const { data: assets, isLoading } = useQuery({
        queryKey: ['capital-assets', user?.company_id],
        queryFn: async () => {
            const result = await api.getCapitalAssets({
                company_id: user?.company_id,
                limit: 1000
            });
            return result.data;
        },
        enabled: !!user?.company_id,
    });

    // Fetch expense categories (global list, shared across companies)
    const { data: categories } = useQuery({
        queryKey: ['expense_categories'],
        queryFn: async () => {
            const result = await api.getExpenseCategories({
                limit: 1000,
            });
            return result.data;
        },
    });

    // Fetch CCA classes
    const { data: ccaClasses } = useQuery({
        queryKey: ['cca-classes'],
        queryFn: async () => {
            return api.getCCAClasses();
        },
    });

    // Delete capital asset mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            return api.deleteCapitalAsset(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['capital-assets'] });
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

    const handleDelete = (asset: CapitalAsset) => {
        if (confirm(`Are you sure you want to delete this capital asset?`)) {
            deleteMutation.mutate(asset.id);
        }
    };

    // Filter assets by category and CCA class
    const filteredAssets = assets?.filter(asset => {
        if (selectedCategory !== 'all' && asset.category_id !== parseInt(selectedCategory)) return false;
        if (selectedCCAClass !== 'all' && asset.cca_class !== selectedCCAClass) return false;
        return true;
    });

    // Calculate totals
    const totalCost = filteredAssets?.reduce((sum, asset) => sum + asset.total_cost, 0) || 0;
    const totalDepreciation = filteredAssets?.reduce((sum, asset) => sum + asset.accumulated_depreciation, 0) || 0;
    const totalBookValue = filteredAssets?.reduce((sum, asset) => sum + asset.book_value, 0) || 0;

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
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-bold tracking-tight text-white">Capital Assets</h1>
                        <HelpIcon
                            content="Business equipment and property worth over $500 that depreciate over time"
                            size="sm"
                        />
                    </div>
                    <p className="text-slate-muted mt-2">Manage depreciable business assets over $500</p>
                </div>
                <Button
                    onClick={() => setShowCreateModal(true)}
                    icon={Plus}
                    className="w-full sm:w-auto"
                >
                    Add Capital Asset
                </Button>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <label className="text-sm font-medium text-white">Filter by category:</label>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="flex h-10 w-full sm:w-auto rounded-md border border-input bg-card text-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="all">All Categories</option>
                        {categories?.map(category => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                    </select>

                    <label className="text-sm font-medium text-white">Filter by CCA class:</label>
                    <select
                        value={selectedCCAClass}
                        onChange={(e) => setSelectedCCAClass(e.target.value)}
                        className="flex h-10 w-full sm:w-auto rounded-md border border-input bg-card text-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="all">All CCA Classes</option>
                        {ccaClasses?.map(ccaClass => (
                            <option key={ccaClass.class_number} value={ccaClass.class_number}>
                                Class {ccaClass.class_number} - {ccaClass.description}
                            </option>
                        ))}
                    </select>
                </div>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
                            <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-slate-muted truncate">
                                    Total Cost
                                </dt>
                                <dd className="text-2xl font-bold text-white">
                                    {formatCurrency(totalCost)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-orange-100 dark:bg-orange-900/20">
                            <Calculator className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-slate-muted truncate">
                                    Accumulated Depreciation
                                </dt>
                                <dd className="text-2xl font-bold text-white">
                                    {formatCurrency(totalDepreciation)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                            <Building2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-slate-muted truncate">
                                    Net Book Value
                                </dt>
                                <dd className="text-2xl font-bold text-white">
                                    {formatCurrency(totalBookValue)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Capital Assets Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Purchase Date</th>
                                <th className="px-6 py-4">Total Cost</th>
                                <th className="px-6 py-4">Depreciation Class</th>
                                <th className="px-6 py-4">CCA Rate</th>
                                <th className="px-6 py-4">Accumulated Depreciation</th>
                                <th className="px-6 py-4">Book Value</th>
                                <th className="px-6 py-4">Paid By</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredAssets?.map((asset) => (
                                <tr key={asset.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white">{asset.description}</td>
                                    <td className="px-6 py-4 text-slate-muted">{asset.category?.name || 'Uncategorized'}</td>
                                    <td className="px-6 py-4 text-slate-muted">{formatDate(asset.purchase_date)}</td>
                                    <td className="px-6 py-4 font-medium text-white">{formatCurrency(asset.total_cost)}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                            Class {asset.cca_class}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-muted">{(asset.cca_rate * 100).toFixed(1)}%</td>
                                    <td className="px-6 py-4 text-slate-muted">{formatCurrency(asset.accumulated_depreciation)}</td>
                                    <td className="px-6 py-4 font-medium text-white">{formatCurrency(asset.book_value)}</td>
                                    <td className="px-6 py-4">
                                        {asset.paid_by === 'corp' ? (
                                            <span className="inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                                Corporation
                                            </span>
                                        ) : (
                                            <span className="inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                                                Owner
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setShowDepreciationSchedule(asset)}
                                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                                title="View Depreciation Schedule"
                                            >
                                                <Calendar className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setEditingAsset(asset)}
                                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(asset)}
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

            {filteredAssets?.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-slate-muted text-lg">No capital assets found</p>
                    <p className="text-slate-muted/60">Add your first capital asset to get started</p>
                </div>
            )}

            {/* Create/Edit Capital Asset Modal */}
            {(showCreateModal || editingAsset) && (
                <CapitalAssetModal
                    asset={editingAsset}
                    categories={categories || []}
                    ccaClasses={ccaClasses || []}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingAsset(null);
                    }}
                    onSave={() => {
                        queryClient.invalidateQueries({ queryKey: ['capital-assets'] });
                        setShowCreateModal(false);
                        setEditingAsset(null);
                    }}
                />
            )}

            {/* Depreciation Schedule Modal */}
            {showDepreciationSchedule && (
                <DepreciationScheduleModal
                    asset={showDepreciationSchedule}
                    onClose={() => setShowDepreciationSchedule(null)}
                />
            )}
        </div>
    );
};

// Capital Asset Modal Component
interface CapitalAssetModalProps {
    asset?: CapitalAsset | null;
    categories: ExpenseCategory[];
    ccaClasses: CCAClass[];
    onClose: () => void;
    onSave: () => void;
}

function CapitalAssetModal({ asset, categories, ccaClasses, onClose, onSave }: CapitalAssetModalProps) {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        description: asset?.description || '',
        category_id: asset?.category_id || 0,
        purchase_date: asset?.purchase_date || new Date().toISOString().split('T')[0],
        purchase_amount: asset?.purchase_amount || 0,
        hst_paid: asset?.hst_paid || 0,
        cca_class: asset?.cca_class || '',
        paid_by: asset?.paid_by || 'corp',
        receipt_attached: asset?.receipt_attached || false,
        disposal_date: asset?.disposal_date || '',
        disposal_amount: asset?.disposal_amount || 0,
    });

    const createAssetMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.createCapitalAsset(data);
        },
        onSuccess: () => {
            onSave();
        },
    });

    const updateAssetMutation = useMutation({
        mutationFn: async (data: any) => {
            return api.updateCapitalAsset(asset!.id, data);
        },
        onSuccess: () => {
            onSave();
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const assetData = {
            ...formData,
            // Ensure optional dates are sent as null instead of empty strings
            disposal_date: formData.disposal_date || null,
            company_id: user?.company_id,
        };

        if (asset) {
            updateAssetMutation.mutate(assetData);
        } else {
            createAssetMutation.mutate(assetData);
        }
    };

    const selectedCCAClass = ccaClasses.find(cca => cca.class_number === formData.cca_class);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-white/10 bg-card p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">
                        {asset ? 'Edit Capital Asset' : 'Add New Capital Asset'}
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
                            <label className="block text-sm font-medium text-white mb-2">Description *</label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Category *</label>
                            <select
                                value={formData.category_id}
                                onChange={(e) => setFormData({ ...formData, category_id: parseInt(e.target.value) })}
                                className="flex h-10 w-full rounded-md border border-input bg-card text-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            >
                                <option value={0}>Select a category</option>
                                {categories.map(category => (
                                    <option key={category.id} value={category.id}>{category.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Purchase Date *</label>
                            <input
                                type="date"
                                value={formData.purchase_date}
                                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Purchase Amount (before HST) *</label>
                            <input
                                type="number"
                                value={formData.purchase_amount}
                                onChange={(e) => setFormData({ ...formData, purchase_amount: parseFloat(e.target.value) || 0 })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white mb-2">HST Paid</label>
                            <input
                                type="number"
                                value={formData.hst_paid}
                                onChange={(e) => setFormData({ ...formData, hst_paid: parseFloat(e.target.value) || 0 })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity

-50"
                                min="0"
                                step="0.01"
                            />
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <label className="block text-sm font-medium text-white">Depreciation Class *</label>
                                <HelpIcon
                                    content="CCA (Capital Cost Allowance) is the tax term for depreciation. Each asset class has a specific depreciation rate set by the CRA."
                                    size="sm"
                                />
                            </div>
                            <select
                                value={formData.cca_class}
                                onChange={(e) => setFormData({ ...formData, cca_class: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-card text-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                required
                            >
                                <option value="">Select CCA class</option>
                                {ccaClasses.map(ccaClass => (
                                    <option key={ccaClass.class_number} value={ccaClass.class_number}>
                                        Class {ccaClass.class_number} - {ccaClass.description} ({(ccaClass.rate * 100).toFixed(1)}%)
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedCCAClass && (
                            <div className="sm:col-span-2">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                                    <p className="text-sm text-blue-800 dark:text-blue-300">
                                        <strong>CCA Class {selectedCCAClass.class_number}:</strong> {selectedCCAClass.description}
                                    </p>
                                    <p className="text-sm text-blue-600 dark:text-blue-400">
                                        Depreciation Rate: {(selectedCCAClass.rate * 100).toFixed(1)}% per year
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="sm:col-span-2">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="receipt_attached"
                                    checked={formData.receipt_attached}
                                    onChange={(e) => setFormData({ ...formData, receipt_attached: e.target.checked })}
                                    className="h-4 w-4 text-primary focus:ring-primary border-input rounded"
                                />
                                <label htmlFor="receipt_attached" className="ml-2 block text-sm text-white">
                                    Receipt attached
                                </label>
                            </div>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-white mb-2">Paid By *</label>
                            <div className="flex gap-6">
                                <div className="flex items-center">
                                    <input
                                        type="radio"
                                        id="paid_by_corp"
                                        name="paid_by"
                                        value="corp"
                                        checked={formData.paid_by === 'corp'}
                                        onChange={(e) => setFormData({ ...formData, paid_by: e.target.value as 'corp' | 'owner' })}
                                        className="h-4 w-4 text-primary focus:ring-primary border-input"
                                    />
                                    <label htmlFor="paid_by_corp" className="ml-2 block text-sm text-white">
                                        Corporation
                                    </label>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="radio"
                                        id="paid_by_owner"
                                        name="paid_by"
                                        value="owner"
                                        checked={formData.paid_by === 'owner'}
                                        onChange={(e) => setFormData({ ...formData, paid_by: e.target.value as 'corp' | 'owner' })}
                                        className="h-4 w-4 text-primary focus:ring-primary border-input"
                                    />
                                    <label htmlFor="paid_by_owner" className="ml-2 block text-sm text-white">
                                        Owner (to be reimbursed)
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Disposal fields for editing */}
                        {asset && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">Disposal Date</label>
                                    <input
                                        type="date"
                                        value={formData.disposal_date}
                                        onChange={(e) => setFormData({ ...formData, disposal_date: e.target.value })}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-white mb-2">Disposal Amount</label>
                                    <input
                                        type="number"
                                        value={formData.disposal_amount}
                                        onChange={(e) => setFormData({ ...formData, disposal_amount: parseFloat(e.target.value) || 0 })}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={createAssetMutation.isPending || updateAssetMutation.isPending}
                        >
                            {createAssetMutation.isPending || updateAssetMutation.isPending
                                ? 'Saving...'
                                : asset
                                    ? 'Update Asset'
                                    : 'Create Asset'
                            }
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Depreciation Schedule Modal Component
interface DepreciationScheduleModalProps {
    asset: CapitalAsset;
    onClose: () => void;
}

function DepreciationScheduleModal({ asset, onClose }: DepreciationScheduleModalProps) {
    const queryClient = useQueryClient();
    const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
    const [depreciationCalculation, setDepreciationCalculation] = useState<any>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const calculateDepreciation = async () => {
        setIsCalculating(true);
        setSaveError(null);
        setSaveSuccess(null);
        try {
            const result = await api.calculateDepreciation(asset.id, fiscalYear);
            setDepreciationCalculation(result);
        } catch (error) {
            console.error('Error calculating depreciation:', error);
        } finally {
            setIsCalculating(false);
        }
    };

    const handleRecordDepreciation = async () => {
        if (!depreciationCalculation) return;

        setIsSaving(true);
        setSaveError(null);
        setSaveSuccess(null);

        try {
            // Reload asset with depreciation entries to avoid duplicate entries for the same year
            const assetWithEntries = await api.getCapitalAsset(asset.id);
            const alreadyExists = assetWithEntries.depreciation_entries?.some(
                (entry) => entry.fiscal_year === fiscalYear
            );

            if (alreadyExists) {
                setSaveError('Depreciation for this fiscal year has already been recorded for this asset.');
                return;
            }

            const today = new Date().toISOString().split('T')[0];

            await api.createDepreciationEntry(asset.id, {
                fiscal_year: fiscalYear,
                entry_date: today,
                depreciation_amount: depreciationCalculation.depreciation_amount,
            });

            setSaveSuccess('Depreciation entry recorded for this fiscal year.');

            // Refresh capital assets so accumulated depreciation and book value stay in sync
            queryClient.invalidateQueries({ queryKey: ['capital-assets'] });
        } catch (error) {
            console.error('Error recording depreciation entry:', error);
            setSaveError('Failed to record depreciation entry. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Generate depreciation schedule for next 10 years
    const generateSchedule = () => {
        const schedule = [];
        const currentYear = new Date().getFullYear();
        let remainingBookValue = asset.book_value;

        for (let year = currentYear; year < currentYear + 10; year++) {
            const isHalfYear = year === new Date(asset.purchase_date).getFullYear();
            const depreciationRate = isHalfYear ? asset.cca_rate * 0.5 : asset.cca_rate;
            const depreciationAmount = Math.min(remainingBookValue * depreciationRate, remainingBookValue);

            remainingBookValue -= depreciationAmount;

            schedule.push({
                year,
                depreciationAmount,
                remainingBookValue,
                isHalfYear
            });

            if (remainingBookValue <= 0) break;
        }

        return schedule;
    };

    const schedule = generateSchedule();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm overflow-y-auto">
            <div className="relative w-full max-w-4xl my-10 mx-4">
                <Card className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-white">
                            Depreciation Schedule - {asset.description}
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

                    {/* Asset Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">Total Cost</h4>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">{formatCurrency(asset.total_cost)}</p>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-100 dark:border-orange-800">
                            <h4 className="text-sm font-medium text-orange-800 dark:text-orange-300">CCA Class</h4>
                            <p className="text-2xl font-bold text-orange-900 dark:text-orange-200">Class {asset.cca_class}</p>
                            <p className="text-sm text-orange-700 dark:text-orange-400">{(asset.cca_rate * 100).toFixed(1)}% per year</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-800">
                            <h4 className="text-sm font-medium text-green-800 dark:text-green-300">Current Book Value</h4>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-200">{formatCurrency(asset.book_value)}</p>
                        </div>
                    </div>

                    {/* Depreciation Calculator */}
                    <div className="mb-6 p-4 border border-white/10 rounded-lg bg-muted/20">
                        <h4 className="text-md font-medium text-white mb-3">Depreciation Calculator</h4>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">Fiscal Year</label>
                                <input
                                    type="number"
                                    value={fiscalYear}
                                    onChange={(e) => setFiscalYear(parseInt(e.target.value))}
                                    className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    min="2020"
                                    max="2030"
                                />
                            </div>
                            <Button
                                onClick={calculateDepreciation}
                                disabled={isCalculating}
                                icon={Calculator}
                                className="sm:mt-6"
                            >
                                {isCalculating ? 'Calculating...' : 'Calculate'}
                            </Button>
                        </div>

                        {depreciationCalculation && (
                            <div className="mt-4 space-y-3">
                                <div className="p-3 bg-background rounded-md border border-white/10">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-sm text-slate-muted">Depreciation Amount</p>
                                            <p className="font-semibold text-white">
                                                {formatCurrency(depreciationCalculation.depreciation_amount)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-muted">Half-Year Rule</p>
                                            <p className="font-semibold text-white">
                                                {depreciationCalculation.is_half_year_rule ? 'Yes' : 'No'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-muted">Remaining Book Value</p>
                                            <p className="font-semibold text-white">
                                                {formatCurrency(depreciationCalculation.remaining_book_value)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <Button
                                        type="button"
                                        onClick={handleRecordDepreciation}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? 'Saving...' : 'Record Depreciation Entry'}
                                    </Button>
                                    {saveSuccess && (
                                        <p className="text-sm text-green-700 dark:text-green-400">{saveSuccess}</p>
                                    )}
                                    {saveError && (
                                        <p className="text-sm text-destructive">{saveError}</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Depreciation Schedule Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-slate-muted uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Fiscal Year</th>
                                    <th className="px-6 py-4">Depreciation Rate</th>
                                    <th className="px-6 py-4">Depreciation Amount</th>
                                    <th className="px-6 py-4">Remaining Book Value</th>
                                    <th className="px-6 py-4">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {schedule.map((entry) => (
                                    <tr key={entry.year} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">{entry.year}</td>
                                        <td className="px-6 py-4 text-slate-muted">
                                            {entry.isHalfYear ? (asset.cca_rate * 50).toFixed(1) : (asset.cca_rate * 100).toFixed(1)}%
                                        </td>
                                        <td className="px-6 py-4 text-white">{formatCurrency(entry.depreciationAmount)}</td>
                                        <td className="px-6 py-4 font-medium text-white">{formatCurrency(entry.remainingBookValue)}</td>
                                        <td className="px-6 py-4">
                                            {entry.isHalfYear && (
                                                <span className="inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                                    Half-Year Rule
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
}

export default CapitalAssets;
