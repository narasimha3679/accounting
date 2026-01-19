import React from 'react';
import { type RemittancePeriod } from '../../lib/api';
import { Calendar, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface RemittanceSummaryCardProps {
    period: RemittancePeriod;
    onRecordPayment: () => void;
}

const RemittanceSummaryCard: React.FC<RemittanceSummaryCardProps> = ({ period, onRecordPayment }) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-CA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const dueDate = new Date(period.due_date);
    const isOverdue = period.status === 'overdue' || (period.status === 'pending' && dueDate < new Date());
    const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-white">Current Period</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                        Period: {formatDate(period.period_start)} - {formatDate(period.period_end)}
                    </p>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Due:</span>
                        <span className={`text-sm font-medium ${isOverdue ? 'text-red-400' : daysUntilDue <= 7 ? 'text-yellow-400' : 'text-white'}`}>
                            {formatDate(period.due_date)}
                        </span>
                    </div>
                    {isOverdue && (
                        <div className="flex items-center gap-1 mt-1 text-red-400 text-sm">
                            <AlertCircle className="h-3 w-3" />
                            <span>Overdue</span>
                        </div>
                    )}
                    {!isOverdue && daysUntilDue <= 7 && daysUntilDue > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-yellow-400 text-sm">
                            <AlertCircle className="h-3 w-3" />
                            <span>Due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">CPP Contributions (Employee)</span>
                    <span className="text-white font-medium">{formatCurrency(period.cpp_employee)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">CPP Contributions (Employer)</span>
                    <span className="text-white font-medium">{formatCurrency(period.cpp_employer)}</span>
                </div>
                {period.cpp2_employee > 0 && (
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">CPP2 Contributions (Employee)</span>
                        <span className="text-white font-medium">{formatCurrency(period.cpp2_employee)}</span>
                    </div>
                )}
                <div className="flex justify-between">
                    <span className="text-muted-foreground">EI Premiums (Employee)</span>
                    <span className="text-white font-medium">{formatCurrency(period.ei_employee)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">EI Premiums (Employer)</span>
                    <span className="text-white font-medium">{formatCurrency(period.ei_employer)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Income Tax Withheld</span>
                    <span className="text-white font-medium">{formatCurrency(period.income_tax)}</span>
                </div>
                <div className="border-t border-white/10 pt-3 mt-3 flex justify-between">
                    <span className="text-white font-semibold text-lg">TOTAL REMITTANCE DUE</span>
                    <span className="text-white font-bold text-xl">{formatCurrency(period.total_owing)}</span>
                </div>
            </div>

            {period.status === 'paid' ? (
                <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-300 font-medium">Payment Recorded</p>
                            {period.paid_date && (
                                <p className="text-green-400 text-sm mt-1">
                                    Paid: {formatDate(period.paid_date)} | Amount: {formatCurrency(period.paid_amount || 0)}
                                </p>
                            )}
                            {period.confirmation_number && (
                                <p className="text-green-400 text-sm mt-1">Confirmation: {period.confirmation_number}</p>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <Button onClick={onRecordPayment} className="w-full">
                    Record Payment
                </Button>
            )}
        </Card>
    );
};

export default RemittanceSummaryCard;
