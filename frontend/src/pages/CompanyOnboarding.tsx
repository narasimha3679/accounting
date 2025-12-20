import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Save, Percent, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { cn } from '../lib/utils';

const CompanyOnboarding: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [businessNumber, setBusinessNumber] = useState('');
    const [hstNumber, setHstNumber] = useState('');
    const [hstRegistered, setHstRegistered] = useState(false);
    const [hstFilingFrequency, setHstFilingFrequency] = useState<'monthly' | 'quarterly' | 'annual'>('annual');
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
                hst_filing_frequency: hstRegistered ? hstFilingFrequency : 'annual',
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
        <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-3xl w-full"
            >
                <Card className="p-6 md:p-8 lg:p-10" glass="heavy">
                    {/* Header Section */}
                    <div className="mb-8">
                        <div className="flex items-start space-x-4 mb-4">
                            <div className="h-12 w-12 rounded-xl bg-neon-emerald/20 flex items-center justify-center flex-shrink-0">
                                <Building2 className="h-6 w-6 text-neon-emerald" />
                            </div>
                            <div className="flex-1">
                                <h1 className="heading-1 mb-2">Set up your company</h1>
                                <p className="text-muted-foreground text-base">
                                    Welcome{user?.name ? `, ${user.name}` : ''}. Before you start using the app, we need a few details about your corporation.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 rounded-lg bg-destructive/20 border border-destructive/50 p-4 flex items-start space-x-3"
                        >
                            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-destructive flex-1">{error}</p>
                        </motion.div>
                    )}

                    {/* Success Message */}
                    {success && !error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 rounded-lg bg-neon-emerald/20 border border-neon-emerald/50 p-4 flex items-start space-x-3"
                        >
                            <CheckCircle2 className="h-5 w-5 text-neon-emerald flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-neon-emerald flex-1">{success}</p>
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Company Information Section */}
                        <div className="space-y-6">
                            <div className="flex items-center space-x-2 pb-2 border-b border-border">
                                <Building2 className="h-5 w-5 text-neon-emerald" />
                                <h2 className="heading-3">Company Information</h2>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label htmlFor="name" className="block text-sm font-semibold text-foreground">
                                        Company name <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        placeholder="Enter company name"
                                        className="input"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <label htmlFor="business_number" className="block text-sm font-semibold text-foreground">
                                        Business number <span className="text-destructive">*</span>
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
                                        placeholder="123456789"
                                        className={cn(
                                            "input",
                                            businessNumberError && "border-destructive focus-visible:ring-destructive"
                                        )}
                                    />
                                    {businessNumberError && (
                                        <p className="text-sm text-destructive flex items-center space-x-1 mt-1">
                                            <AlertCircle className="h-4 w-4" />
                                            <span>{businessNumberError}</span>
                                        </p>
                                    )}
                                </div>
                                
                                <div className="space-y-2">
                                    <label htmlFor="hst_number" className="block text-sm font-semibold text-foreground">
                                        HST number <span className="text-muted-foreground text-xs">(optional)</span>
                                    </label>
                                    <input
                                        id="hst_number"
                                        type="text"
                                        value={hstNumber}
                                        onChange={(e) => setHstNumber(e.target.value)}
                                        placeholder="Enter HST number"
                                        className="input"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <label htmlFor="fiscal_year_end" className="block text-sm font-semibold text-foreground">
                                        Fiscal year end <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        id="fiscal_year_end"
                                        type="date"
                                        value={fiscalYearEnd}
                                        onChange={(e) => setFiscalYearEnd(e.target.value)}
                                        required
                                        className="input"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Tax Settings Section */}
                        <div className="space-y-6">
                            <div className="flex items-center space-x-2 pb-2 border-b border-border">
                                <Percent className="h-5 w-5 text-golden-hour" />
                                <h2 className="heading-3">Tax Settings</h2>
                            </div>

                            {/* HST Registration Toggle */}
                            <Card className="p-6" glass="emerald">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center space-x-2">
                                            <h3 className="text-base font-semibold text-foreground">HST Registration</h3>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Enable if your business is HST/GST registered and can claim Input Tax Credits.
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={hstRegistered}
                                            onChange={(e) => setHstRegistered(e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-card border border-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-neon-emerald peer-focus:ring-offset-2 peer-focus:ring-offset-deep-forest rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-emerald" />
                                    </label>
                                </div>
                            </Card>

                            {/* HST Filing Frequency */}
                            {hstRegistered && (
                                <div className="space-y-2">
                                    <label htmlFor="hst_filing_frequency" className="block text-sm font-semibold text-foreground">
                                        HST Filing Frequency <span className="text-destructive">*</span>
                                    </label>
                                    <select
                                        id="hst_filing_frequency"
                                        value={hstFilingFrequency}
                                        onChange={(e) => setHstFilingFrequency(e.target.value as 'monthly' | 'quarterly' | 'annual')}
                                        className="input"
                                        required
                                    >
                                        <option value="monthly">Monthly</option>
                                        <option value="quarterly">Quarterly</option>
                                        <option value="annual">Annual</option>
                                    </select>
                                    <div className="flex items-start space-x-2 mt-2 p-3 rounded-lg bg-card/50 border border-border">
                                        <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-muted-foreground">
                                            How often do you file HST returns with CRA? This affects how HST periods are calculated in reports.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Tax Rates */}
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label htmlFor="small_business_rate" className="block text-sm font-semibold text-foreground">
                                        Small business tax rate (%) <span className="text-destructive">*</span>
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
                                        className="input"
                                    />
                                    <div className="flex items-start space-x-2 mt-2 p-3 rounded-lg bg-card/50 border border-border">
                                        <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-muted-foreground">
                                            Ontario small business tax rate (default: 12.5%).
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <label htmlFor="hst_rate" className="block text-sm font-semibold text-foreground">
                                        HST rate (%) <span className="text-destructive">*</span>
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
                                        className="input"
                                    />
                                    <div className="flex items-start space-x-2 mt-2 p-3 rounded-lg bg-card/50 border border-border">
                                        <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-muted-foreground">
                                            Ontario HST rate (default: 13%).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end pt-4 border-t border-border">
                            <Button
                                type="submit"
                                disabled={isSaving}
                                icon={Save}
                                iconPosition="left"
                                size="lg"
                                variant="default"
                            >
                                {isSaving ? 'Creating company...' : 'Save and continue'}
                            </Button>
                        </div>
                    </form>
                </Card>
            </motion.div>
        </div>
    );
};

export default CompanyOnboarding;


