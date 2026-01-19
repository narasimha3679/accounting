import React from 'react';
import type { PayRunItem } from '../../lib/api';
import Button from '../ui/Button';
import { X } from 'lucide-react';

interface PayRunItemDetailProps {
    item: PayRunItem;
    onClose: () => void;
}

const PayRunItemDetail: React.FC<PayRunItemDetailProps> = ({ item, onClose }) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const getEmployeeName = () => {
        if (item.employee) {
            return `${item.employee.first_name} ${item.employee.last_name}`;
        }
        return `Employee #${item.employee_id}`;
    };

    const getEmployeeId = () => {
        return item.employee?.employee_id || `#${item.employee_id}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-foreground">
                        Pay Details: {getEmployeeName()} ({getEmployeeId()})
                    </h3>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="space-y-6">
                    {/* Earnings */}
                    <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3">EARNINGS</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Regular ({item.regular_hours.toFixed(2)} hrs
                                    {item.hourly_rate ? ` @ ${formatCurrency(item.hourly_rate)}` : ''})
                                </span>
                                <span className="text-foreground">{formatCurrency(item.regular_pay)}</span>
                            </div>
                            {item.overtime_hours > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Overtime ({item.overtime_hours.toFixed(2)} hrs
                                        {item.overtime_rate ? ` @ ${formatCurrency(item.overtime_rate)}` : ''})
                                    </span>
                                    <span className="text-foreground">{formatCurrency(item.overtime_pay)}</span>
                                </div>
                            )}
                            {item.vacation_hours_used > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Vacation Pay</span>
                                    <span className="text-foreground">{formatCurrency(item.vacation_pay)}</span>
                                </div>
                            )}
                            {item.statutory_holiday_hours > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Statutory Holiday Pay</span>
                                    <span className="text-foreground">
                                        {formatCurrency(item.statutory_holiday_pay)}
                                    </span>
                                </div>
                            )}
                            {item.other_earnings > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Other Earnings</span>
                                    <span className="text-foreground">{formatCurrency(item.other_earnings)}</span>
                                </div>
                            )}
                            {item.taxable_benefits > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Taxable Benefits</span>
                                    <span className="text-foreground">{formatCurrency(item.taxable_benefits)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-base font-semibold pt-2 border-t border-border">
                                <span className="text-foreground">GROSS PAY</span>
                                <span className="text-foreground">{formatCurrency(item.gross_pay)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Deductions */}
                    <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3">DEDUCTIONS</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">CPP (5.95%)</span>
                                <span className="text-foreground">{formatCurrency(item.cpp_employee)}</span>
                            </div>
                            {item.cpp2_employee > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">CPP2 (4.00%)</span>
                                    <span className="text-foreground">{formatCurrency(item.cpp2_employee)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">EI (1.63%)</span>
                                <span className="text-foreground">{formatCurrency(item.ei_employee)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Federal Tax</span>
                                <span className="text-foreground">{formatCurrency(item.federal_tax)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Provincial Tax</span>
                                <span className="text-foreground">{formatCurrency(item.provincial_tax)}</span>
                            </div>
                            {item.pre_tax_deductions > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Pre-tax Deductions</span>
                                    <span className="text-foreground">{formatCurrency(item.pre_tax_deductions)}</span>
                                </div>
                            )}
                            {item.post_tax_deductions > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Post-tax Deductions</span>
                                    <span className="text-foreground">{formatCurrency(item.post_tax_deductions)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-base font-semibold pt-2 border-t border-border">
                                <span className="text-foreground">TOTAL DEDUCTIONS</span>
                                <span className="text-foreground">{formatCurrency(item.total_deductions)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Net Pay */}
                    <div className="pt-4 border-t border-border">
                        <div className="flex justify-between text-lg font-bold">
                            <span className="text-foreground">NET PAY</span>
                            <span className="text-foreground">{formatCurrency(item.net_pay)}</span>
                        </div>
                    </div>

                    {/* Employer Costs */}
                    <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3">EMPLOYER COSTS</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Employer CPP</span>
                                <span className="text-foreground">{formatCurrency(item.cpp_employer)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Employer EI</span>
                                <span className="text-foreground">{formatCurrency(item.ei_employer)}</span>
                            </div>
                            <div className="flex justify-between text-base font-semibold pt-2 border-t border-border">
                                <span className="text-foreground">TOTAL EMPLOYER COST</span>
                                <span className="text-foreground">{formatCurrency(item.employer_total_cost)}</span>
                            </div>
                        </div>
                    </div>

                    {/* YTD Info */}
                    {item.ytd_gross_before !== null && item.ytd_gross_before !== undefined && (
                        <div>
                            <h4 className="text-sm font-semibold text-foreground mb-3">YEAR-TO-DATE</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Gross Earnings (Before)</span>
                                    <span className="text-foreground">{formatCurrency(item.ytd_gross_before)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Gross Earnings (After)</span>
                                    <span className="text-foreground">
                                        {formatCurrency(item.ytd_gross_before + item.gross_pay)}
                                    </span>
                                </div>
                                {item.ytd_cpp_before !== null && item.ytd_cpp_before !== undefined && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">CPP Contributions (Before)</span>
                                        <span className="text-foreground">{formatCurrency(item.ytd_cpp_before)}</span>
                                    </div>
                                )}
                                {item.ytd_ei_before !== null && item.ytd_ei_before !== undefined && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">EI Premiums (Before)</span>
                                        <span className="text-foreground">{formatCurrency(item.ytd_ei_before)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Vacation */}
                    {item.vacation_accrued > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-foreground mb-3">VACATION</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Accrued This Period
                                        {item.vacation_rate_used
                                            ? ` (${(item.vacation_rate_used * 100).toFixed(1)}%)`
                                            : ''}
                                    </span>
                                    <span className="text-foreground">{formatCurrency(item.vacation_accrued)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-6 mt-6 border-t border-border">
                    <Button onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};

export default PayRunItemDetail;
