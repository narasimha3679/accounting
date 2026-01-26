import React, { useState, useEffect } from 'react';
import { Percent } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api, { type Company } from '../../lib/api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import HelpIcon from '../../components/ui/HelpIcon';

const TaxSettings: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const [company, setCompany] = useState<Company | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadCompanyData();
    }, [user]);

    const loadCompanyData = async () => {
        if (!user?.company_id) return;
        try {
            const companyData = await api.getCompany(user.company_id);
            setCompany(companyData);
        } catch (error) {
            console.error('Error loading company data:', error);
            setError('Failed to load tax settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: keyof Company, value: string | number | boolean | null) => {
        if (!company) return;
        setCompany({ ...company, [field]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!company) return;

        setIsSaving(true);
        setError('');
        setSuccess('');

        try {
            const updatedCompany = await api.updateCompany(company.id, {
                hst_number: company.hst_number,
                hst_registered: company.hst_registered,
                hst_filing_frequency: company.hst_filing_frequency || 'annual',
                small_business_rate: company.small_business_rate,
                hst_rate: company.hst_rate,
                default_dividend_type: company.default_dividend_type || 'non_eligible',
            });

            setCompany(updatedCompany);
            setSuccess('Tax settings saved successfully!');
            await refreshUser();
        } catch (error: any) {
            console.error('Error saving tax settings:', error);
            setError(error?.message || 'Failed to save tax settings.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div>Loading...</div>;
    if (!company) return <div>Failed to load company data.</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                    <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
                </Card>
            )}

            {success && (
                <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <div className="text-sm text-green-700 dark:text-green-300">{success}</div>
                </Card>
            )}

            <Card className="p-6">
                <div className="flex items-center mb-4">
                    <Percent className="h-5 w-5 text-slate-muted mr-2" />
                    <h2 className="text-lg font-medium text-white">Tax Settings</h2>
                </div>

                <div className="space-y-4">
                    {/* HST Registration Toggle */}
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium text-white">HST Registration</h3>
                                <HelpIcon
                                    content="Are you registered for HST/GST? If yes, you can claim Input Tax Credits (ITCs) for HST paid on business expenses."
                                    size="sm"
                                />
                            </div>
                            <p className="text-sm text-slate-muted">
                                Enable if your business is HST/GST registered
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={company.hst_registered}
                                onChange={(e) => handleInputChange('hst_registered', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-input peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-input after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    {/* HST Number */}
                    <div>
                        <label htmlFor="hst_number" className="block text-sm font-medium text-white mb-2">
                            HST Number (Optional)
                        </label>
                        <input
                            type="text"
                            id="hst_number"
                            value={company.hst_number || ''}
                            onChange={(e) => handleInputChange('hst_number', e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                    </div>

                    {/* HST Filing Frequency */}
                    {company.hst_registered && (
                        <div>
                            <label htmlFor="hst_filing_frequency" className="block text-sm font-medium text-white mb-2">
                                HST Filing Frequency
                                <HelpIcon
                                    content="How often do you file HST returns? Monthly, quarterly, or annually."
                                    size="sm"
                                />
                            </label>
                            <select
                                id="hst_filing_frequency"
                                value={company.hst_filing_frequency || 'annual'}
                                onChange={(e) => handleInputChange('hst_filing_frequency', e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="annual">Annual</option>
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="small_business_rate" className="block text-sm font-medium text-white mb-2">
                                Small Business Tax Rate (%)
                            </label>
                            <div className="relative rounded-md shadow-sm">
                                <input
                                    type="number"
                                    id="small_business_rate"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={company.small_business_rate * 100}
                                    onChange={(e) => handleInputChange('small_business_rate', parseFloat(e.target.value) / 100)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    required
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <span className="text-slate-muted text-sm">%</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="hst_rate" className="block text-sm font-medium text-white mb-2">
                                HST Rate (%)
                            </label>
                            <div className="relative rounded-md shadow-sm">
                                <input
                                    type="number"
                                    id="hst_rate"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={company.hst_rate * 100}
                                    onChange={(e) => handleInputChange('hst_rate', parseFloat(e.target.value) / 100)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    required
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <span className="text-slate-muted text-sm">%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Default Dividend Type */}
                    <div>
                        <label htmlFor="default_dividend_type" className="block text-sm font-medium text-white mb-2">
                            Default Dividend Type
                            <HelpIcon
                                content="Most small businesses use non-eligible dividends. Eligible dividends are typically from public corporations. This default will be used when creating new dividends."
                                size="sm"
                            />
                        </label>
                        <select
                            id="default_dividend_type"
                            value={company.default_dividend_type || 'non_eligible'}
                            onChange={(e) => handleInputChange('default_dividend_type', e.target.value as 'eligible' | 'non_eligible')}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value="non_eligible">Non-Eligible (CCPC - Most Small Businesses)</option>
                            <option value="eligible">Eligible (Public Corporations)</option>
                        </select>
                        <p className="mt-1 text-xs text-slate-muted">
                            This setting will be used as the default when creating new dividends throughout the platform.
                        </p>
                    </div>
                </div>
            </Card>

            <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </form>
    );
};

export default TaxSettings;
