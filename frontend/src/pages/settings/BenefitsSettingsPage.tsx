import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api, { type Company } from '../../lib/api';
import BenefitTypesManager from '../../components/settings/BenefitTypesManager';

const BenefitsSettingsPage: React.FC = () => {
    const { user } = useAuth();
    const [company, setCompany] = useState<Company | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return <div>Loading...</div>;
    if (!company) return <div>Failed to load company data.</div>;

    return <BenefitTypesManager companyId={company.id} />;
};

export default BenefitsSettingsPage;
