import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Download } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { formatLocalDate } from '../../lib/utils';

interface DeductionsReportProps {
    companyId: number;
    startDate: string;
    endDate: string;
}

const DeductionsReport: React.FC<DeductionsReportProps> = ({
    companyId,
    startDate,
    endDate,
}) => {
    const { data: report, isLoading, error } = useQuery({
        queryKey: ['deductionsReport', companyId, startDate, endDate],
        queryFn: () =>
            api.getDeductionsReport({
                company_id: companyId,
                start_date: startDate,
                end_date: endDate,
            }),
        enabled: !!companyId && !!startDate && !!endDate,
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const handleExportCSV = () => {
        if (!report) return;

        const csvRows = [
            ['Deductions Report'],
            [`Period: ${formatLocalDate(startDate)} - ${formatLocalDate(endDate)}`],
            [''],
            ['STATUTORY DEDUCTIONS'],
            ['Employee', 'CPP', 'CPP2', 'EI', 'Federal Tax', 'Provincial Tax'],
            ...report.statutory_deductions.map((ded) => [
                ded.employee_name,
                formatCurrency(ded.cpp),
                formatCurrency(ded.cpp2),
                formatCurrency(ded.ei),
                formatCurrency(ded.federal_tax),
                formatCurrency(ded.provincial_tax),
            ]),
            ['TOTALS', formatCurrency(report.totals.cpp), formatCurrency(report.totals.cpp2), formatCurrency(report.totals.ei), formatCurrency(report.totals.federal_tax), formatCurrency(report.totals.provincial_tax)],
            [''],
            ['OTHER DEDUCTIONS'],
            ['Deduction Type', 'Employee Count', 'Total Amount'],
            ...report.other_deductions.map((ded) => [ded.deduction_type, ded.employee_count.toString(), formatCurrency(ded.total_amount)]),
        ];

        const csvContent = csvRows.map((row) => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `deductions-${startDate}-${endDate}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-400">Error loading report: {error instanceof Error ? error.message : 'Unknown error'}</p>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">No data available for the selected period</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Deductions Report</h2>
                    <p className="text-muted-foreground mt-1">
                        {formatLocalDate(startDate)} - {formatLocalDate(endDate)}
                    </p>
                </div>
                <Button variant="outline" size="sm" icon={Download} onClick={handleExportCSV}>
                    Export CSV
                </Button>
            </div>

            {/* Statutory Deductions */}
            <Card className="p-0 overflow-x-auto">
                <div className="p-6 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white">STATUTORY DEDUCTIONS</h3>
                </div>
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="text-left p-4 text-sm font-semibold text-white">Employee</th>
                            <th className="text-right p-4 text-sm font-semibold text-white">CPP</th>
                            <th className="text-right p-4 text-sm font-semibold text-white">CPP2</th>
                            <th className="text-right p-4 text-sm font-semibold text-white">EI</th>
                            <th className="text-right p-4 text-sm font-semibold text-white">Federal Tax</th>
                            <th className="text-right p-4 text-sm font-semibold text-white">Provincial Tax</th>
                        </tr>
                    </thead>
                    <tbody>
                        {report.statutory_deductions.map((ded, idx) => (
                            <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                <td className="p-4 text-white">{ded.employee_name}</td>
                                <td className="p-4 text-right text-white">{formatCurrency(ded.cpp)}</td>
                                <td className="p-4 text-right text-white">{formatCurrency(ded.cpp2)}</td>
                                <td className="p-4 text-right text-white">{formatCurrency(ded.ei)}</td>
                                <td className="p-4 text-right text-white">{formatCurrency(ded.federal_tax)}</td>
                                <td className="p-4 text-right text-white">{formatCurrency(ded.provincial_tax)}</td>
                            </tr>
                        ))}
                        <tr className="border-t-2 border-white/20 font-semibold">
                            <td className="p-4 text-white">TOTALS</td>
                            <td className="p-4 text-right text-white">{formatCurrency(report.totals.cpp)}</td>
                            <td className="p-4 text-right text-white">{formatCurrency(report.totals.cpp2)}</td>
                            <td className="p-4 text-right text-white">{formatCurrency(report.totals.ei)}</td>
                            <td className="p-4 text-right text-white">{formatCurrency(report.totals.federal_tax)}</td>
                            <td className="p-4 text-right text-white">{formatCurrency(report.totals.provincial_tax)}</td>
                        </tr>
                    </tbody>
                </table>
            </Card>

            {/* Other Deductions */}
            {report.other_deductions.length > 0 && (
                <Card className="p-0 overflow-x-auto">
                    <div className="p-6 border-b border-white/10">
                        <h3 className="text-lg font-semibold text-white">OTHER DEDUCTIONS</h3>
                    </div>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left p-4 text-sm font-semibold text-white">Deduction Type</th>
                                <th className="text-right p-4 text-sm font-semibold text-white">Employee Count</th>
                                <th className="text-right p-4 text-sm font-semibold text-white">Total Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.other_deductions.map((ded, idx) => (
                                <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                    <td className="p-4 text-white">{ded.deduction_type}</td>
                                    <td className="p-4 text-right text-white">{ded.employee_count}</td>
                                    <td className="p-4 text-right text-white">{formatCurrency(ded.total_amount)}</td>
                                </tr>
                            ))}
                            <tr className="border-t-2 border-white/20 font-semibold">
                                <td className="p-4 text-white">TOTALS</td>
                                <td className="p-4 text-right text-white">-</td>
                                <td className="p-4 text-right text-white">{formatCurrency(report.totals.other)}</td>
                            </tr>
                        </tbody>
                    </table>
                </Card>
            )}

            {/* Total Deductions */}
            <Card className="p-6">
                <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-white">TOTAL DEDUCTIONS</span>
                    <span className="text-2xl font-bold text-neon-emerald">{formatCurrency(report.totals.total)}</span>
                </div>
            </Card>
        </div>
    );
};

export default DeductionsReport;
