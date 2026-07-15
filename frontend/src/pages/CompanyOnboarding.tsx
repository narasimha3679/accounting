import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Building2, AlertCircle, CheckCircle2 } from 'lucide-react';
import Card from '../components/ui/Card';
import { OnboardingWizard, type OnboardingData } from '../components/onboarding/OnboardingWizard';
import type { EnabledFeatures } from '../lib/featureConfig';

const CompanyOnboarding: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [businessNumberError, setBusinessNumberError] = useState('');

    useEffect(() => {
        // If user already has a company, don't allow onboarding again
        if (user?.companies && user.companies.length > 0) {
            // Once the user is linked to a company, leave onboarding
            navigate('/', { replace: true });
        }
    }, [user, navigate]);

    const handleWizardSubmit = async (data: OnboardingData, enabledFeatures: EnabledFeatures) => {
        if (!user) return;

        setIsSaving(true);
        setError('');
        setSuccess('');
        setBusinessNumberError('');

        try {
            // Check if business number already exists
            const exists = await api.checkBusinessNumberExists(data.businessNumber);
            if (exists) {
                setBusinessNumberError(`A company with business number "${data.businessNumber}" already exists. Please use a different business number.`);
                setIsSaving(false);
                return;
            }

            if (data.province !== 'ON') {
                setError('Cashual currently only supports businesses registered in Ontario.');
                setIsSaving(false);
                return;
            }

            // Create the company
            const company = await api.createCompany({
                name: data.name,
                business_number: data.businessNumber,
                hst_number: data.hstNumber || null,
                hst_registered: data.hstRegistered,
                hst_filing_frequency: data.hstFilingFrequency,
                fiscal_year_end: data.fiscalYearEnd,
                small_business_rate: data.smallBusinessRate,
                hst_rate: data.hstRate,
                business_type: data.businessType,
                enabled_features: enabledFeatures,
            });

            // Create user_companies entry for current user as primary owner
            await api.createUserCompanyMembership({
                company_id: company.id,
                role: 'owner',
                is_primary: true,
                invite_status: 'accepted',
            });

            // Create pending invitations for additional shareholders
            const additionalShareholders = data.shareholders.filter(s => !s.isCurrentUser);
            for (const shareholder of additionalShareholders) {
                await api.inviteShareholder({
                    company_id: company.id,
                    email: shareholder.email,
                    name: shareholder.name,
                    role: 'owner',
                });
            }

            await refreshUser();

            const successMessage = additionalShareholders.length > 0
                ? `Company created successfully! Invitations sent to ${additionalShareholders.length} shareholder(s). Redirecting...`
                : 'Company created successfully. Redirecting to your dashboard...';
            setSuccess(successMessage);

            // Force a full reload so AuthContext picks up the new company reliably
            setTimeout(() => {
                window.location.href = '/';
            }, 1200);
        } catch (err: any) {
            console.error('Error creating company during onboarding:', err);
            setError(err?.message ?? 'Failed to create company. Please try again.');
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
                                    Welcome{user?.name ? `, ${user.name}` : ''}. Before you start using the app, we need a few details about your corporation. Cashual currently only supports Ontario businesses.
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

                    <OnboardingWizard
                        onSubmit={handleWizardSubmit}
                        isSubmitting={isSaving}
                        businessNumberError={businessNumberError}
                        currentUserEmail={user?.email ?? ''}
                        currentUserName={user?.name ?? ''}
                    />
                </Card>
            </motion.div>
        </div>
    );
};

export default CompanyOnboarding;


