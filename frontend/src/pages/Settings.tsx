import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type Company } from '../lib/api';
import { Save, Building2, Percent } from 'lucide-react';

const Settings: React.FC = () => {
    const { user } = useAuth();
    const [company, setCompany] = useState<Company | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (user?.company_id) {
            loadCompanyData();
        }
    }, [user]);

    const loadCompanyData = async () => {
        try {
            const companyData = await api.getCompany(user!.company_id);
            setCompany(companyData);
        } catch (error) {
            console.error('Error loading company data:', error);
            setError('Failed to load company settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!company) return;

        setIsSaving(true);
        setError('');
        setSuccess('');

        try {
            const updatedCompany = await api.updateCompany(company.id, {
                name: company.name,
                business_number: company.business_number,
                hst_number: company.hst_number,
                hst_registered: company.hst_registered,
                fiscal_year_end: company.fiscal_year_end,
                small_business_rate: company.small_business_rate,
                hst_rate: company.hst_rate,
            });

            setCompany(updatedCompany);
            setSuccess('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            setError('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (field: keyof Company, value: string | number | boolean) => {
        if (!company) return;

        setCompany({
            ...company,
            [field]: value,
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toISOString().split('T')[0];
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!company) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-red-600">Failed to load company settings</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600">Manage your company settings and tax preferences</p>
            </div>

            {error && (
                <div className="rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-700">{error}</div>
                </div>
            )}

            {success && (
                <div className="rounded-md bg-green-50 p-4">
                    <div className="text-sm text-green-700">{success}</div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Company Information */}
                <div className="card">
                    <div className="flex items-center mb-4">
                        <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                        <h2 className="text-lg font-medium text-gray-900">Company Information</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                Company Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={company.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="business_number" className="block text-sm font-medium text-gray-700">
                                Business Number
                            </label>
                            <input
                                type="text"
                                id="business_number"
                                value={company.business_number}
                                onChange={(e) => handleInputChange('business_number', e.target.value)}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="hst_number" className="block text-sm font-medium text-gray-700">
                                HST Number (Optional)
                            </label>
                            <input
                                type="text"
                                id="hst_number"
                                value={company.hst_number || ''}
                                onChange={(e) => handleInputChange('hst_number', e.target.value)}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            />
                        </div>

                        <div>
                            <label htmlFor="fiscal_year_end" className="block text-sm font-medium text-gray-700">
                                Fiscal Year End
                            </label>
                            <input
                                type="date"
                                id="fiscal_year_end"
                                value={formatDate(company.fiscal_year_end)}
                                onChange={(e) => handleInputChange('fiscal_year_end', e.target.value)}
                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Tax Settings */}
                <div className="card">
                    <div className="flex items-center mb-4">
                        <Percent className="h-5 w-5 text-gray-400 mr-2" />
                        <h2 className="text-lg font-medium text-gray-900">Tax Settings</h2>
                    </div>

                    <div className="space-y-4">
                        {/* HST Registration Toggle */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <h3 className="text-sm font-medium text-gray-900">HST Registration</h3>
                                <p className="text-sm text-gray-500">
                                    Enable if your business is HST/GST registered and can claim Input Tax Credits
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={company.hst_registered}
                                    onChange={(e) => handleInputChange('hst_registered', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="small_business_rate" className="block text-sm font-medium text-gray-700">
                                    Small Business Tax Rate (%)
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <input
                                        type="number"
                                        id="small_business_rate"
                                        step="0.1"
                                        min="0"
                                        max="100"
                                        value={company.small_business_rate * 100}
                                        onChange={(e) => handleInputChange('small_business_rate', parseFloat(e.target.value) / 100)}
                                        className="block w-full pr-3 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                        required
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">%</span>
                                    </div>
                                </div>
                                <p className="mt-1 text-sm text-gray-500">
                                    Ontario small business tax rate (default: 12.5%)
                                </p>
                            </div>

                            <div>
                                <label htmlFor="hst_rate" className="block text-sm font-medium text-gray-700">
                                    HST Rate (%)
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <input
                                        type="number"
                                        id="hst_rate"
                                        step="0.1"
                                        min="0"
                                        max="100"
                                        value={company.hst_rate * 100}
                                        onChange={(e) => handleInputChange('hst_rate', parseFloat(e.target.value) / 100)}
                                        className="block w-full pr-3 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                        required
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">%</span>
                                    </div>
                                </div>
                                <p className="mt-1 text-sm text-gray-500">
                                    Ontario HST rate (default: 13%)
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Settings;
