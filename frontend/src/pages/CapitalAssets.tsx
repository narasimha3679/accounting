import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type CapitalAsset, type ExpenseCategory, type CCAClass } from '../lib/api';
import { Plus, Edit, Trash2, Calculator, Building2, Calendar } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

    // Fetch expense categories
    const { data: categories } = useQuery({
        queryKey: ['expense_categories'],
        queryFn: async () => {
            const result = await api.getExpenseCategories({
                limit: 1000
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Capital Assets</h1>
                    <p className="text-gray-600">Manage depreciable business assets over $500</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Capital Asset
                </button>
            </div>

            {/* Filters */}
            <div className="card">
                <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Filter by category:</label>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="input w-auto"
                    >
                        <option value="all">All Categories</option>
                        {categories?.map(category => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                    </select>

                    <label className="text-sm font-medium text-gray-700">Filter by CCA class:</label>
                    <select
                        value={selectedCCAClass}
                        onChange={(e) => setSelectedCCAClass(e.target.value)}
                        className="input w-auto"
                    >
                        <option value="all">All CCA Classes</option>
                        {ccaClasses?.map(ccaClass => (
                            <option key={ccaClass.class_number} value={ccaClass.class_number}>
                                Class {ccaClass.class_number} - {ccaClass.description}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="card">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <Building2 className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">
                                    Total Cost
                                </dt>
                                <dd className="text-lg font-medium text-gray-900">
                                    {formatCurrency(totalCost)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <Calculator className="h-8 w-8 text-orange-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">
                                    Accumulated Depreciation
                                </dt>
                                <dd className="text-lg font-medium text-gray-900">
                                    {formatCurrency(totalDepreciation)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <Building2 className="h-8 w-8 text-green-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">
                                    Net Book Value
                                </dt>
                                <dd className="text-lg font-medium text-gray-900">
                                    {formatCurrency(totalBookValue)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>

            {/* Capital Assets Table */}
            <div className="card">
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead className="bg-gray-50">
                            <tr>
                                <th>Description</th>
                                <th>Category</th>
                                <th>Purchase Date</th>
                                <th>Total Cost</th>
                                <th>CCA Class</th>
                                <th>CCA Rate</th>
                                <th>Accumulated Depreciation</th>
                                <th>Book Value</th>
                                <th>Paid By</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredAssets?.map((asset) => (
                                <tr key={asset.id}>
                                    <td className="font-medium">{asset.description}</td>
                                    <td>{asset.category?.name || 'Uncategorized'}</td>
                                    <td>{formatDate(asset.purchase_date)}</td>
                                    <td className="font-medium">{formatCurrency(asset.total_cost)}</td>
                                    <td>
                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                            Class {asset.cca_class}
                                        </span>
                                    </td>
                                    <td>{(asset.cca_rate * 100).toFixed(1)}%</td>
                                    <td>{formatCurrency(asset.accumulated_depreciation)}</td>
                                    <td className="font-medium">{formatCurrency(asset.book_value)}</td>
                                    <td>
                                        {asset.paid_by === 'corp' ? (
                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                Corporation
                                            </span>
                                        ) : (
                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                                Owner
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setShowDepreciationSchedule(asset)}
                                                className="text-green-600 hover:text-green-800"
                                                title="View Depreciation Schedule"
                                            >
                                                <Calendar className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => setEditingAsset(asset)}
                                                className="text-blue-600 hover:text-blue-800"
                                                title="Edit"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(asset)}
                                                className="text-red-600 hover:text-red-800"
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

            {filteredAssets?.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No capital assets found</p>
                    <p className="text-gray-400">Add your first capital asset to get started</p>
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

const CapitalAssetModal: React.FC<CapitalAssetModalProps> = ({ asset, categories, ccaClasses, onClose, onSave }) => {
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
                <div className="mt-3">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        {asset ? 'Edit Capital Asset' : 'Add New Capital Asset'}
                    </h3>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Description *</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Category *</label>
                                <select
                                    value={formData.category_id}
                                    onChange={(e) => setFormData({ ...formData, category_id: parseInt(e.target.value) })}
                                    className="input"
                                    required
                                >
                                    <option value={0}>Select a category</option>
                                    {categories.map(category => (
                                        <option key={category.id} value={category.id}>{category.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Purchase Date *</label>
                                <input
                                    type="date"
                                    value={formData.purchase_date}
                                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Purchase Amount (before HST) *</label>
                                <input
                                    type="number"
                                    value={formData.purchase_amount}
                                    onChange={(e) => setFormData({ ...formData, purchase_amount: parseFloat(e.target.value) || 0 })}
                                    className="input"
                                    min="0"
                                    step="0.01"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">HST Paid</label>
                                <input
                                    type="number"
                                    value={formData.hst_paid}
                                    onChange={(e) => setFormData({ ...formData, hst_paid: parseFloat(e.target.value) || 0 })}
                                    className="input"
                                    min="0"
                                    step="0.01"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">CCA Class *</label>
                                <select
                                    value={formData.cca_class}
                                    onChange={(e) => setFormData({ ...formData, cca_class: e.target.value })}
                                    className="input"
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
                                    <div className="bg-blue-50 p-3 rounded-md">
                                        <p className="text-sm text-blue-800">
                                            <strong>CCA Class {selectedCCAClass.class_number}:</strong> {selectedCCAClass.description}
                                        </p>
                                        <p className="text-sm text-blue-600">
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
                                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="receipt_attached" className="ml-2 block text-sm text-gray-900">
                                        Receipt attached
                                    </label>
                                </div>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Paid By *</label>
                                <div className="flex gap-6">
                                    <div className="flex items-center">
                                        <input
                                            type="radio"
                                            id="paid_by_corp"
                                            name="paid_by"
                                            value="corp"
                                            checked={formData.paid_by === 'corp'}
                                            onChange={(e) => setFormData({ ...formData, paid_by: e.target.value as 'corp' | 'owner' })}
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                                        />
                                        <label htmlFor="paid_by_corp" className="ml-2 block text-sm text-gray-900">
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
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                                        />
                                        <label htmlFor="paid_by_owner" className="ml-2 block text-sm text-gray-900">
                                            Owner (to be reimbursed)
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Disposal fields for editing */}
                            {asset && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Disposal Date</label>
                                        <input
                                            type="date"
                                            value={formData.disposal_date}
                                            onChange={(e) => setFormData({ ...formData, disposal_date: e.target.value })}
                                            className="input"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Disposal Amount</label>
                                        <input
                                            type="number"
                                            value={formData.disposal_amount}
                                            onChange={(e) => setFormData({ ...formData, disposal_amount: parseFloat(e.target.value) || 0 })}
                                            className="input"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                </>
                            )}
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
                                disabled={createAssetMutation.isPending || updateAssetMutation.isPending}
                            >
                                {createAssetMutation.isPending || updateAssetMutation.isPending
                                    ? 'Saving...'
                                    : asset
                                        ? 'Update Asset'
                                        : 'Create Asset'
                                }
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// Depreciation Schedule Modal Component
interface DepreciationScheduleModalProps {
    asset: CapitalAsset;
    onClose: () => void;
}

const DepreciationScheduleModal: React.FC<DepreciationScheduleModalProps> = ({ asset, onClose }) => {
    const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
    const [depreciationCalculation, setDepreciationCalculation] = useState<any>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const calculateDepreciation = async () => {
        setIsCalculating(true);
        try {
            const result = await api.calculateDepreciation(asset.id, fiscalYear);
            setDepreciationCalculation(result);
        } catch (error) {
            console.error('Error calculating depreciation:', error);
        } finally {
            setIsCalculating(false);
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
                <div className="mt-3">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">
                            Depreciation Schedule - {asset.description}
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Asset Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-800">Total Cost</h4>
                            <p className="text-2xl font-bold text-blue-900">{formatCurrency(asset.total_cost)}</p>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-orange-800">CCA Class</h4>
                            <p className="text-2xl font-bold text-orange-900">Class {asset.cca_class}</p>
                            <p className="text-sm text-orange-700">{(asset.cca_rate * 100).toFixed(1)}% per year</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-green-800">Current Book Value</h4>
                            <p className="text-2xl font-bold text-green-900">{formatCurrency(asset.book_value)}</p>
                        </div>
                    </div>

                    {/* Depreciation Calculator */}
                    <div className="mb-6 p-4 border rounded-lg">
                        <h4 className="text-md font-medium text-gray-900 mb-3">Depreciation Calculator</h4>
                        <div className="flex items-center gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Fiscal Year</label>
                                <input
                                    type="number"
                                    value={fiscalYear}
                                    onChange={(e) => setFiscalYear(parseInt(e.target.value))}
                                    className="input w-32"
                                    min="2020"
                                    max="2030"
                                />
                            </div>
                            <button
                                onClick={calculateDepreciation}
                                disabled={isCalculating}
                                className="btn btn-primary flex items-center gap-2"
                            >
                                <Calculator className="h-4 w-4" />
                                {isCalculating ? 'Calculating...' : 'Calculate'}
                            </button>
                        </div>

                        {depreciationCalculation && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-md">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Depreciation Amount</p>
                                        <p className="font-semibold">{formatCurrency(depreciationCalculation.depreciation_amount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Half-Year Rule</p>
                                        <p className="font-semibold">{depreciationCalculation.is_half_year_rule ? 'Yes' : 'No'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Remaining Book Value</p>
                                        <p className="font-semibold">{formatCurrency(depreciationCalculation.remaining_book_value)}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Depreciation Schedule Table */}
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th>Fiscal Year</th>
                                    <th>Depreciation Rate</th>
                                    <th>Depreciation Amount</th>
                                    <th>Remaining Book Value</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {schedule.map((entry) => (
                                    <tr key={entry.year}>
                                        <td className="font-medium">{entry.year}</td>
                                        <td>
                                            {entry.isHalfYear ? (
                                                <span className="text-orange-600 font-semibold">
                                                    {(asset.cca_rate * 50).toFixed(1)}% (Half-Year)
                                                </span>
                                            ) : (
                                                <span className="text-blue-600">
                                                    {(asset.cca_rate * 100).toFixed(1)}%
                                                </span>
                                            )}
                                        </td>
                                        <td className="font-medium">{formatCurrency(entry.depreciationAmount)}</td>
                                        <td className="font-medium">{formatCurrency(entry.remainingBookValue)}</td>
                                        <td>
                                            {entry.isHalfYear && (
                                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                                    Half-Year Rule
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={onClose}
                            className="btn btn-secondary"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CapitalAssets;
