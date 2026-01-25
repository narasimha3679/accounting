import React from 'react';
import { CheckCircle2, Settings } from 'lucide-react';
import Card from '../ui/Card';
import { FEATURE_LABELS, FEATURE_GROUPS } from '../../lib/featureConfig';
import type { EnabledFeatures } from '../../lib/featureConfig';

interface FeatureConfirmationProps {
    enabledFeatures: EnabledFeatures;
    businessTypeLabel: string;
}

export const FeatureConfirmation: React.FC<FeatureConfirmationProps> = ({
    enabledFeatures,
    businessTypeLabel,
}) => {
    const enabledFeatureKeys = Object.entries(enabledFeatures)
        .filter(([_, enabled]) => enabled)
        .map(([key]) => key as keyof EnabledFeatures);

    const groupedFeatures = {
        financial: enabledFeatureKeys.filter(f => FEATURE_GROUPS.financial.includes(f as any)),
        payroll: enabledFeatureKeys.filter(f => FEATURE_GROUPS.payroll.includes(f as any)),
        tools: enabledFeatureKeys.filter(f => FEATURE_GROUPS.tools.includes(f as any)),
    };

    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
                    Your personalized experience is ready!
                </h2>
                <p className="text-muted-foreground">
                    Based on your selection as a <strong>{businessTypeLabel}</strong>, we've enabled these features:
                </p>
            </div>

            <Card className="p-6" glass="emerald">
                <div className="space-y-6">
                    {groupedFeatures.financial.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-foreground mb-3">Financial Management</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {groupedFeatures.financial.map((feature) => (
                                    <div key={feature} className="flex items-center space-x-2">
                                        <CheckCircle2 className="h-4 w-4 text-neon-emerald flex-shrink-0" />
                                        <span className="text-sm text-foreground">{FEATURE_LABELS[feature]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {groupedFeatures.payroll.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-foreground mb-3">Payroll & Employees</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {groupedFeatures.payroll.map((feature) => (
                                    <div key={feature} className="flex items-center space-x-2">
                                        <CheckCircle2 className="h-4 w-4 text-neon-emerald flex-shrink-0" />
                                        <span className="text-sm text-foreground">{FEATURE_LABELS[feature]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {groupedFeatures.tools.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-foreground mb-3">Tools & Reports</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {groupedFeatures.tools.map((feature) => (
                                    <div key={feature} className="flex items-center space-x-2">
                                        <CheckCircle2 className="h-4 w-4 text-neon-emerald flex-shrink-0" />
                                        <span className="text-sm text-foreground">{FEATURE_LABELS[feature]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            <div className="flex items-start space-x-2 p-4 rounded-lg bg-card/50 border border-border">
                <Settings className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                    You can always enable or disable features later in Settings.
                </p>
            </div>
        </div>
    );
};
