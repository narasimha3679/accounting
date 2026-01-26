import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';
import Card from '../components/ui/Card';
import PayMyselfOptimizer from '../components/compensation/PayMyselfOptimizer';
import StrategyTrackingDashboard from '../components/compensation/StrategyTrackingDashboard';
import { getFiscalYear } from '../lib/fiscalYear';

const CompensationStrategy: React.FC = () => {
    const { user } = useAuth();
    const [selectedFiscalYear, setSelectedFiscalYear] = useState(() => {
        if (user?.company?.fiscal_year_end) {
            return getFiscalYear(new Date(), user.company.fiscal_year_end);
        }
        return new Date().getFullYear();
    });
    const [refreshKey, setRefreshKey] = useState(0);

    // Fetch strategy progress from database
    const {
        data: progress,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['compensationStrategyProgress', user?.company_id, selectedFiscalYear, refreshKey],
        queryFn: async () => {
            if (!user?.company_id) throw new Error('No company selected');
            return api.getCompensationStrategyProgress(user.company_id, selectedFiscalYear);
        },
        enabled: !!user?.company_id,
    });

    const handleStrategyComplete = () => {
        setRefreshKey((k) => k + 1);
        refetch();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <Card className="border-red-500/50 bg-red-500/10 p-6">
                <div className="flex items-start gap-4">
                    <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                    <div>
                        <h3 className="text-lg font-semibold text-red-500 mb-2">
                            Error Loading Strategy
                        </h3>
                        <p className="text-sm text-red-500/80">
                            {error instanceof Error ? error.message : 'Failed to load compensation strategy'}
                        </p>
                    </div>
                </div>
            </Card>
        );
    }

    // If no strategy exists, show the optimizer
    if (!progress?.hasStrategy) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <PayMyselfOptimizer
                    fiscalYear={selectedFiscalYear}
                    onComplete={handleStrategyComplete}
                />
            </div>
        );
    }

    // Show the tracking dashboard
    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Annual Compensation Strategy</h1>
                    <p className="text-muted-foreground">
                        Track your progress against your {selectedFiscalYear} compensation plan
                    </p>
                </div>
                <div>
                    <select
                        value={selectedFiscalYear}
                        onChange={(e) => setSelectedFiscalYear(parseInt(e.target.value))}
                        className="input"
                    >
                        {[selectedFiscalYear - 1, selectedFiscalYear, selectedFiscalYear + 1].map(
                            (year) => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            )
                        )}
                    </select>
                </div>
            </div>
            <StrategyTrackingDashboard progress={progress} />
        </div>
    );
};

export default CompensationStrategy;
