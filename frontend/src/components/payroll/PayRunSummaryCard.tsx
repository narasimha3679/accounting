import React from 'react';
import Card from '../ui/Card';
import type { PayRun } from '../../lib/api';

interface PayRunSummaryCardProps {
    payRun: PayRun;
}

const PayRunSummaryCard: React.FC<PayRunSummaryCardProps> = ({ payRun }) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    return (
        <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Pay Run Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Gross Pay</p>
                    <p className="text-xl font-semibold text-white">{formatCurrency(payRun.total_gross)}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Deductions</p>
                    <p className="text-xl font-semibold text-white">
                        {formatCurrency(
                            payRun.total_cpp +
                                payRun.total_cpp2 +
                                payRun.total_ei +
                                payRun.total_federal_tax +
                                payRun.total_provincial_tax +
                                payRun.total_other_deductions
                        )}
                    </p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Net Pay</p>
                    <p className="text-xl font-semibold text-white">{formatCurrency(payRun.total_net)}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground mb-1">Employer Cost</p>
                    <p className="text-xl font-semibold text-white">{formatCurrency(payRun.total_employer_cost)}</p>
                </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
                <h4 className="text-sm font-medium text-white mb-3">Deductions Breakdown</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div>
                        <span className="text-muted-foreground">CPP:</span>
                        <span className="ml-2 text-white">{formatCurrency(payRun.total_cpp)}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">CPP2:</span>
                        <span className="ml-2 text-white">{formatCurrency(payRun.total_cpp2)}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">EI:</span>
                        <span className="ml-2 text-white">{formatCurrency(payRun.total_ei)}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Federal Tax:</span>
                        <span className="ml-2 text-white">{formatCurrency(payRun.total_federal_tax)}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Provincial Tax:</span>
                        <span className="ml-2 text-white">{formatCurrency(payRun.total_provincial_tax)}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Other:</span>
                        <span className="ml-2 text-white">{formatCurrency(payRun.total_other_deductions)}</span>
                    </div>
                </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
                <h4 className="text-sm font-medium text-white mb-3">Employer Costs</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <span className="text-muted-foreground">Employer CPP:</span>
                        <span className="ml-2 text-white">{formatCurrency(payRun.total_employer_cpp)}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Employer EI:</span>
                        <span className="ml-2 text-white">{formatCurrency(payRun.total_employer_ei)}</span>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default PayRunSummaryCard;
