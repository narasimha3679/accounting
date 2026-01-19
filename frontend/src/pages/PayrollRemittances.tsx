import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { useQuery } from '@tanstack/react-query';
import Card from '../components/ui/Card';
import RemittanceSummaryCard from '../components/payroll/RemittanceSummaryCard';
import RemittanceHistoryTable from '../components/payroll/RemittanceHistoryTable';
import RecordPaymentModal from '../components/payroll/RecordPaymentModal';

const PayrollRemittances: React.FC = () => {
    const { user } = useAuth();
    const [showRecordPayment, setShowRecordPayment] = useState(false);
    const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);

    const { data: currentPeriod, isLoading: loadingCurrent } = useQuery({
        queryKey: ['currentRemittancePeriod', user?.company_id],
        queryFn: async () => {
            if (!user?.company_id) return null;
            return api.getCurrentRemittancePeriod(user.company_id);
        },
        enabled: !!user?.company_id,
    });

    const { data: periods = [], isLoading: loadingHistory } = useQuery({
        queryKey: ['remittancePeriods', user?.company_id],
        queryFn: async () => {
            if (!user?.company_id) return [];
            return api.getRemittancePeriods(user.company_id);
        },
        enabled: !!user?.company_id,
    });

    const { data: payrollSettings } = useQuery({
        queryKey: ['payrollSettings', user?.company_id],
        queryFn: async () => {
            if (!user?.company_id) return null;
            return api.getPayrollSettings(user.company_id);
        },
        enabled: !!user?.company_id,
    });

    const getRemitterTypeDescription = (type: string) => {
        switch (type) {
            case 'quarterly':
                return 'Quarterly: Small businesses (<$1,000/month average). Remittances due by end of month following quarter.';
            case 'regular':
                return 'Regular: Most employers. Remittances due by the 15th of the following month.';
            case 'threshold1':
                return 'Threshold 1: Large employers. Remittances due by 25th of same month (for payments before 16th).';
            case 'threshold2':
                return 'Threshold 2: Largest employers. Multiple due dates per month (10th of following month).';
            default:
                return 'Remittances due by the 15th of the following month.';
        }
    };

    if (loadingCurrent || loadingHistory) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">CRA Remittances</h1>
                    <p className="text-muted-foreground mt-1">Track and record payroll remittance payments</p>
                </div>
            </div>

            {/* Current Period */}
            {currentPeriod && (
                <RemittanceSummaryCard
                    period={currentPeriod}
                    onRecordPayment={() => {
                        setSelectedPeriodId(currentPeriod.id);
                        setShowRecordPayment(true);
                    }}
                />
            )}

            {/* Remittance Schedule */}
            {payrollSettings && (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-2">Remittance Schedule</h3>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Your remitter type:</span>
                            <span className="text-white font-medium capitalize">{payrollSettings.remitter_type}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{getRemitterTypeDescription(payrollSettings.remitter_type)}</p>
                    </div>
                </Card>
            )}

            {/* Payment History */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Payment History</h3>
                <RemittanceHistoryTable
                    periods={periods}
                    onRecordPayment={(periodId) => {
                        setSelectedPeriodId(periodId);
                        setShowRecordPayment(true);
                    }}
                />
            </Card>

            {/* Record Payment Modal */}
            {showRecordPayment && selectedPeriodId && (
                <RecordPaymentModal
                    periodId={selectedPeriodId}
                    onClose={() => {
                        setShowRecordPayment(false);
                        setSelectedPeriodId(null);
                    }}
                />
            )}
        </div>
    );
};

export default PayrollRemittances;
