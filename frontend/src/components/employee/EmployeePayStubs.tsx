import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api, { type PayRunItem, type PayRun } from '../../lib/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Eye, Calendar } from 'lucide-react';
import { PayStubPreview } from '../payroll/PayStubPreview';
import type { Employee, Company, PayRunItemDeduction } from '../../lib/api';
import type { EmployeeYTD } from '../../lib/payrollTypes';

interface EmployeePayStubsProps {
    employeeId: number;
}

export default function EmployeePayStubs({ employeeId }: EmployeePayStubsProps) {
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [previewItem, setPreviewItem] = useState<PayRunItem | null>(null);
    const [previewData, setPreviewData] = useState<{
        payRun: PayRun;
        item: PayRunItem;
        employee: Employee;
        company: Company;
        ytd: EmployeeYTD;
        deductions: PayRunItemDeduction[];
    } | null>(null);

    // Get available years from pay stubs
    const { data: allPayStubs } = useQuery({
        queryKey: ['myPayStubs', employeeId],
        queryFn: () => api.getMyPayStubs(),
    });

    const availableYears = React.useMemo(() => {
        if (!allPayStubs) return [new Date().getFullYear()];
        const years = new Set<number>();
        allPayStubs.forEach((item) => {
            const payRun = 'pay_run' in item ? item.pay_run : undefined;
            if (payRun?.pay_date) {
                years.add(new Date(payRun.pay_date).getFullYear());
            }
        });
        return Array.from(years).sort((a, b) => b - a);
    }, [allPayStubs]);

    // Get filtered pay stubs
    const { data: payStubs, isLoading } = useQuery({
        queryKey: ['myPayStubs', employeeId, selectedYear],
        queryFn: () => api.getMyPayStubs({ year: selectedYear }),
        enabled: !!employeeId,
    });

    const handlePreview = async (item: PayRunItem & { pay_run?: PayRun }) => {
        const payRun = 'pay_run' in item ? item.pay_run : undefined;
        if (!payRun) return;
        
        try {
            // Fetch full pay stub data
            const data = await api.getPayStubData(item.id);
            setPreviewData(data);
            setPreviewItem(item);
        } catch (error: any) {
            console.error('Error loading pay stub data:', error);
            alert(`Failed to load pay stub preview: ${error.message || 'Unknown error'}`);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-CA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with year filter */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">My Pay Stubs</h2>
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="glass border border-white/10 rounded-lg px-3 py-2 text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-neon-emerald"
                    >
                        {availableYears.map((year) => (
                            <option key={year} value={year} className="bg-deep-forest">
                                {year}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Pay Stubs List */}
            {!payStubs || payStubs.length === 0 ? (
                <Card>
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">No pay stubs found for {selectedYear}</p>
                    </div>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {payStubs.map((item) => {
                        const payRun = 'pay_run' in item ? item.pay_run : undefined;
                        if (!payRun) return null;

                        return (
                            <Card key={item.id} className="hover:bg-opacity-90">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-lg font-semibold text-foreground">
                                                {formatDate(payRun.pay_date)}
                                            </h3>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            Pay Period: {formatDate(payRun.pay_period_start)} - {formatDate(payRun.pay_period_end)}
                                        </p>
                                        <div className="flex flex-wrap gap-4 text-sm">
                                            <div>
                                                <span className="text-muted-foreground">Gross: </span>
                                                <span className="font-medium text-foreground">{formatCurrency(item.gross_pay)}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Net: </span>
                                                <span className="font-medium text-foreground">{formatCurrency(item.net_pay)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            icon={Eye}
                                            onClick={() => handlePreview(item)}
                                        >
                                            Preview
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Preview Modal */}
            {previewData && previewItem && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setPreviewData(null);
                            setPreviewItem(null);
                        }
                    }}
                >
                    <div className="bg-deep-forest rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-foreground">Pay Stub Preview</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setPreviewData(null);
                                    setPreviewItem(null);
                                }}
                            >
                                Close
                            </Button>
                        </div>
                        <div className="p-4">
                            <PayStubPreview
                                payRun={previewData.payRun}
                                item={previewData.item}
                                employee={previewData.employee}
                                company={previewData.company}
                                ytd={previewData.ytd}
                                deductions={previewData.deductions}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
