import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useFeatures } from '../../contexts/FeatureContext';
import api, { type Company } from '../../lib/api';
import { FEATURE_LABELS, FEATURE_GROUPS, type EnabledFeatures } from '../../lib/featureConfig';
import Card from '../../components/ui/Card';
import HelpIcon from '../../components/ui/HelpIcon';

const FeatureSettings: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const { enabledFeatures } = useFeatures();
    const [company, setCompany] = useState<Company | null>(null);
    const [isLoading, setIsLoading] = useState(true);
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
            setError('Failed to load settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFeatureToggle = async (feature: keyof EnabledFeatures, enabled: boolean) => {
        if (!company) return;

        const updatedFeatures: EnabledFeatures = {
            ...(company.enabled_features || enabledFeatures),
            [feature]: enabled,
        };

        const originalFeatures = company.enabled_features;

        setCompany({
            ...company,
            enabled_features: updatedFeatures,
        });

        // Auto-save feature changes
        try {
            await api.updateCompany(company.id, {
                enabled_features: updatedFeatures,
            });
            await refreshUser();
            setSuccess('Feature settings updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            console.error('Error updating features:', err);
            setError('Failed to update feature settings. Please try again.');
            // Revert on error
            setCompany({
                ...company,
                enabled_features: originalFeatures,
            });
        }
    };

    if (isLoading) return <div>Loading...</div>;
    if (!company) return <div>Failed to load company data.</div>;

    return (
        <div className="space-y-6">
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
                    <SettingsIcon className="h-5 w-5 text-slate-muted mr-2" />
                    <h2 className="text-lg font-medium text-white">Feature Management</h2>
                    <HelpIcon
                        content="Customize which features are visible in your navigation. You can enable or disable features based on your business needs."
                        size="sm"
                    />
                </div>

                <div className="space-y-6">
                    {/* Financial Management */}
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-3">Financial Management</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {FEATURE_GROUPS.financial.map((feature) => (
                                <label
                                    key={feature}
                                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-card/50 transition-colors cursor-pointer"
                                >
                                    <span className="text-sm text-foreground">{FEATURE_LABELS[feature]}</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={company.enabled_features?.[feature] ?? enabledFeatures[feature]}
                                            onChange={(e) => handleFeatureToggle(feature, e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-input peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-input after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Payroll & Employees */}
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-3">Payroll & Employees</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {FEATURE_GROUPS.payroll.map((feature) => (
                                <label
                                    key={feature}
                                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-card/50 transition-colors cursor-pointer"
                                >
                                    <span className="text-sm text-foreground">{FEATURE_LABELS[feature]}</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={company.enabled_features?.[feature] ?? enabledFeatures[feature]}
                                            onChange={(e) => handleFeatureToggle(feature, e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-input peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-input after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Tools */}
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-3">Tools & Reports</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {FEATURE_GROUPS.tools.map((feature) => (
                                <label
                                    key={feature}
                                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-card/50 transition-colors cursor-pointer"
                                >
                                    <span className="text-sm text-foreground">{FEATURE_LABELS[feature]}</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={company.enabled_features?.[feature] ?? enabledFeatures[feature]}
                                            onChange={(e) => handleFeatureToggle(feature, e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-input peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-input after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default FeatureSettings;
