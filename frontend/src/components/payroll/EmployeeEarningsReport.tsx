import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Download } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface EmployeeEarningsReportProps {
    companyId: number;
    startDate: string;
    endDate: string;
    employeeId?: number;
}

const EmployeeEarningsReport: React.FC<EmployeeEarningsReportProps> = ({
    companyId,
    startDate,
    endDate,
    employeeId,
}) => {
    const { data: report, isLoading, error } = useQuery({
        queryKey: ['employeeEarningsReport', companyId, startDate, endDate, employeeId],
        queryFn: () =>
            api.getEmployeeEarningsReport({
                company_id: companyId,
                start_date: startDate,
                end_date: endDate,
                employee_id: employeeId,
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
            ['Employee Earnings Report'],
            [`Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`],
            [''],
            ['Employee', 'Employee ID', 'Regular Hours', 'OT Hours', 'Regular Pay', 'OT Pay', 'Gross Pay', 'Net Pay', 'Total Hours'],
            ...report.employees.map((emp) => [
                emp.employee_name,
                emp.employee_id_code,
                emp.regular_hours.toFixed(2),
                emp.overtime_hours.toFixed(2),
                formatCurrency(emp.regular_pay),
                formatCurrency(emp.overtime_pay),
                formatCurrency(emp.gross_pay),
                formatCurrency(emp.net_pay),
                emp.total_hours.toFixed(2),
            ]),
            [''],
            ['TOTALS', '', report.totals.regular_hours.toFixed(2), report.totals.overtime_hours.toFixed(2), formatCurrency(report.totals.regular_pay), formatCurrency(report.totals.overtime_pay), formatCurrency(report.totals.gross_pay), formatCurrency(report.totals.net_pay), report.totals.total_hours.toFixed(2)],
        ];

        const csvContent = csvRows.map((row) => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `employee-earnings-${startDate}-${endDate}.csv`;
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

    if (!report || report.employees.length === 0) {
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
                    <h2 className="text-xl font-bold text-white">Employee Earnings Report</h2>
                    <p className="text-muted-foreground mt-1">
                        {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                    </p>
                </div>
                <Button variant="outline" size="sm" icon={Download} onClick={handleExportCSV}>
                    Export CSV
                </Button>
            </div>

            <Card className="p-0 overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="text-left p-4 text-sm font-semibold text-white">Employee</th>
                            <th className="text-left p-4 text-sm font-semibold text-white">Employee ID</th>
                            <th className="text-right p-4 text-sm font-semibold text-white">Regular Hours</th>
                            <th className="text-right p-4 text-sm font-semibold text-white">OT Hours</th>
                            <th className="text-right p-4 text-sm font-semibold text-white">Regular Pay</th>
                            <th className="text-right p-4 text-sm font-semibold text-white">OT Pay</th>
                            <th className="text-right p-4 text-sm font-semibold text-white">Gross Pay</th>
                            <th className="text-right p-4 text-sm font-semibold text-white">Net Pay</th>
                            <th className="text-right p-4 text-sm font-semibold text-white">Total Hours</th>
                        </tr>
                    </thead>
                    <tbody>
                        {report.employees.map((emp) => (
                            <tr key={emp.employee_id} className="border-b border-white/5 hover:bg-white/5">
                                <td className="p-4 text-white">{emp.employee_name}</td>
                                <td className="p-4 text-muted-foreground">{emp.employee_id_code}</td>
                                <td className="p-4 text-right text-white">{emp.regular_hours.toFixed(2)}</td>
                                <td className="p-4 text-right text-white">{emp.overtime_hours.toFixed(2)}</td>
                                <td className="p-4 text-right text-white">{formatCurrency(emp.regular_pay)}</td>
                                <td className="p-4 text-right text-white">{formatCurrency(emp.overtime_pay)}</td>
                                <td className="p-4 text-right text-white font-medium">{formatCurrency(emp.gross_pay)}</td>
                                <td className="p-4 text-right text-white font-medium">{formatCurrency(emp.net_pay)}</td>
                                <td className="p-4 text-right text-white">{emp.total_hours.toFixed(2)}</td>
                            </tr>
                        ))}
                        <tr className="border-t-2 border-white/20 font-semibold">
                            <td colSpan={2} className="p-4 text-white">TOTALS</td>
                            <td className="p-4 text-right text-white">{report.totals.regular_hours.toFixed(2)}</td>
                            <td className="p-4 text-right text-white">{report.totals.overtime_hours.toFixed(2)}</td>
                            <td className="p-4 text-right text-white">{formatCurrency(report.totals.regular_pay)}</td>
                            <td className="p-4 text-right text-white">{formatCurrency(report.totals.overtime_pay)}</td>
                            <td className="p-4 text-right text-white">{formatCurrency(report.totals.gross_pay)}</td>
                            <td className="p-4 text-right text-white">{formatCurrency(report.totals.net_pay)}</td>
                            <td className="p-4 text-right text-white">{report.totals.total_hours.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

export default EmployeeEarningsReport;
