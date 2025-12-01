import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Save, Percent } from 'lucide-react';

const CompanyOnboarding: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [businessNumber, setBusinessNumber] = useState('');
    const [hstNumber, setHstNumber] = useState('');
    const [hstRegistered, setHstRegistered] = useState(false);
    const [fiscalYearEnd, setFiscalYearEnd] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [smallBusinessRate, setSmallBusinessRate] = useState(0.125);
    const [hstRate, setHstRate] = useState(0.13);

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [businessNumberError, setBusinessNumberError] = useState('');

    useEffect(() => {
        // If user already has a company, don't allow onboarding again
        if (user?.company_id) {
            // Once the user is linked to a company, leave onboarding
            navigate('/', { replace: true });
        }
    }, [user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSaving(true);
        setError('');
        setSuccess('');
        setBusinessNumberError('');

        try {
            // Check if business number already exists
            const exists = await api.checkBusinessNumberExists(businessNumber);
            if (exists) {
                setBusinessNumberError(`A company with business number "${businessNumber}" already exists. Please use a different business number.`);
                setIsSaving(false);
                return;
            }

            const company = await api.createCompany({
                name,
                business_number: businessNumber,
                hst_number: hstNumber || null,
                hst_registered: hstRegistered,
                fiscal_year_end: fiscalYearEnd,
                small_business_rate: smallBusinessRate,
                hst_rate: hstRate,
            });

            await api.assignCurrentUserCompany(company.id);
            await refreshUser();

            setSuccess('Company created successfully. Redirecting to your dashboard...');

            // As an extra safeguard, force a full reload so AuthContext picks up the new company reliably
            setTimeout(() => {
                window.location.href = '/';
            }, 800);
        } catch (err: any) {
            console.error('Error creating company during onboarding:', err);
            setError(err?.message ?? 'Failed to create company. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-2xl w-full bg-white shadow-xl rounded-2xl p-8 space-y-6">
                <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                        <h1 className="heading-1">Set up your company</h1>
                        <p className="text-gray-600">
                            Welcome{user?.name ? `, ${user.name}` : ''}. Before you start using the app, we need a few details about your corporation.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {success && !error && (
                    <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">Company information</h2>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                    Company name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-neon-emerald-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="business_number" className="block text-sm font-medium text-gray-700">
                                    Business number
                                </label>
                                <input
                                    id="business_number"
                                    type="text"
                                    value={businessNumber}
                                    onChange={(e) => {
                                        setBusinessNumber(e.target.value);
                                        setBusinessNumberError('');
                                    }}
                                    required
                                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-primary-500 focus:border-neon-emerald-500 sm:text-sm ${
                                        businessNumberError ? 'border-red-300' : 'border-gray-300'
                                    }`}
                                />
                                {businessNumberError && (
                                    <p className="mt-1 text-sm text-red-600">{businessNumberError}</p>
                                )}
                            </div>
                            <div>
                                <label htmlFor="hst_number" className="block text-sm font-medium text-gray-700">
                                    HST number (optional)
                                </label>
                                <input
                                    id="hst_number"
                                    type="text"
                                    value={hstNumber}
                                    onChange={(e) => setHstNumber(e.target.value)}
                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-neon-emerald-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label htmlFor="fiscal_year_end" className="block text-sm font-medium text-gray-700">
                                    Fiscal year end
                                </label>
                                <input
                                    id="fiscal_year_end"
                                    type="date"
                                    value={fiscalYearEnd}
                                    onChange={(e) => setFiscalYearEnd(e.target.value)}
                                    required
                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-neon-emerald-500 sm:text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Percent className="h-5 w-5 text-gray-400" />
                            <h2 className="text-lg font-semibold text-gray-900">Tax settings</h2>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <h3 className="text-sm font-medium text-gray-900">HST registration</h3>
                                <p className="text-sm text-gray-500">
                                    Enable if your business is HST/GST registered and can claim Input Tax Credits.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={hstRegistered}
                                    onChange={(e) => setHstRegistered(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
                            </label>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="small_business_rate" className="block text-sm font-medium text-gray-700">
                                    Small business tax rate (%)
                                </label>
                                <input
                                    id="small_business_rate"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={smallBusinessRate * 100}
                                    onChange={(e) => setSmallBusinessRate((parseFloat(e.target.value) || 0) / 100)}
                                    required
                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-neon-emerald-500 sm:text-sm"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Ontario small business tax rate (default: 12.5%).
                                </p>
                            </div>
                            <div>
                                <label htmlFor="hst_rate" className="block text-sm font-medium text-gray-700">
                                    HST rate (%)
                                </label>
                                <input
                                    id="hst_rate"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={hstRate * 100}
                                    onChange={(e) => setHstRate((parseFloat(e.target.value) || 0) / 100)}
                                    required
                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-neon-emerald-500 sm:text-sm"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Ontario HST rate (default: 13%).
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save and continue'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompanyOnboarding;


