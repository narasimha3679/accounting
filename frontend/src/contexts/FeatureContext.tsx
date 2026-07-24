import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';
import type { EnabledFeatures } from '../lib/featureConfig';
import { DEFAULT_FEATURES_BY_TYPE } from '../lib/featureConfig';

interface FeatureContextType {
    enabledFeatures: EnabledFeatures;
    isFeatureEnabled: (feature: keyof EnabledFeatures) => boolean;
}

const FeatureContext = createContext<FeatureContextType | undefined>(undefined);

export const useFeatures = () => {
    const context = useContext(FeatureContext);
    if (context === undefined) {
        throw new Error('useFeatures must be used within a FeatureProvider');
    }
    return context;
};

export const FeatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();

    const enabledFeatures = useMemo<EnabledFeatures>(() => {
        if (!user?.company) {
            // Default to solo corporation features if no company
            return DEFAULT_FEATURES_BY_TYPE.solo_corporation;
        }

        const company = user.company;
        
        // If company has explicit enabled_features, use them.
        // Force-disable deprecated salary ledger (replaced by Pay Runs).
        if (company.enabled_features) {
            return { ...company.enabled_features, salary: false };
        }

        // Otherwise, use defaults based on business_type
        const businessType = company.business_type || 'solo_corporation';
        return DEFAULT_FEATURES_BY_TYPE[businessType] || DEFAULT_FEATURES_BY_TYPE.solo_corporation;
    }, [user?.company]);

    const isFeatureEnabled = (feature: keyof EnabledFeatures): boolean => {
        return enabledFeatures[feature] ?? false;
    };

    const value = {
        enabledFeatures,
        isFeatureEnabled,
    };

    return <FeatureContext.Provider value={value}>{children}</FeatureContext.Provider>;
};
