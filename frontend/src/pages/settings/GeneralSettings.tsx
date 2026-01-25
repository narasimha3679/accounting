import React, { useState, useEffect } from 'react';
import { Building2, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api, { type Company } from '../../lib/api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { getCurrentFiscalYear, formatFiscalYearPeriod } from '../../lib/fiscalYear';

const GeneralSettings: React.FC = () => {
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
            setError('Failed to load company settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: keyof Company, value: string | number | boolean | null) => {
        if (!company) return;
        setCompany({ ...company, [field]: value });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toISOString().split('T')[0];
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
                fiscal_year_end: company.fiscal_year_end,
            });

            setCompany(updatedCompany);
            setSuccess('Settings saved successfully!');
            await refreshUser();
        } catch (error: any) {
            console.error('Error saving settings:', error);
            setError(error?.message || 'Failed to save settings.');
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
                    <Building2 className="h-5 w-5 text-slate-muted mr-2" />
                    <h2 className="text-lg font-medium text-white">Company Information</h2>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                            Company Name
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={company.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="business_number" className="block text-sm font-medium text-white mb-2">
                            Business Number
                        </label>
                        <input
                            type="text"
                            id="business_number"
                            value={company.business_number}
                            onChange={(e) => handleInputChange('business_number', e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            required
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <label htmlFor="fiscal_year_end" className="block text-sm font-medium text-white mb-2">
                            Fiscal Year End
                            <span className="text-xs text-slate-muted ml-2">(The last day of your company's financial year)</span>
                        </label>
                        <input
                            type="date"
                            id="fiscal_year_end"
                            value={formatDate(company.fiscal_year_end)}
                            onChange={(e) => handleInputChange('fiscal_year_end', e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-slate-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            required
                        />
                        {company.fiscal_year_end && (
                            <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-border">
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Current Fiscal Year:</span>
                                    <span className="font-medium text-foreground">
                                        {formatFiscalYearPeriod(getCurrentFiscalYear(company.fiscal_year_end), company.fiscal_year_end)}
                                    </span>
                                </div>
                            </div>
                        )}
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

export default GeneralSettings;
