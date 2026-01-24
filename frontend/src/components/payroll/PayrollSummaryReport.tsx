import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Download } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { formatLocalDate } from '../../lib/utils';

interface PayrollSummaryReportProps {
    companyId: number;
    startDate: string;
    endDate: string;
    groupBy: 'period' | 'month' | 'quarter' | 'year';
}

const PayrollSummaryReport: React.FC<PayrollSummaryReportProps> = ({
    companyId,
    startDate,
    endDate,
    groupBy,
}) => {
    const { data: report, isLoading, error } = useQuery({
        queryKey: ['payrollSummaryReport', companyId, startDate, endDate, groupBy],
        queryFn: () =>
            api.getPayrollSummaryReport({
                company_id: companyId,
                start_date: startDate,
                end_date: endDate,
                group_by: groupBy,
            }),
        enabled: !!companyId && !!startDate && !!endDate,
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const handleExportPDF = () => {
        // TODO: Implement PDF export
        alert('PDF export coming soon');
    };

    const handleExportCSV = () => {
        if (!report) return;

        const csvRows = [
            ['Payroll Summary Report'],
            [`Period: ${formatLocalDate(startDate)} - ${formatLocalDate(endDate)}`],
            [''],
            ['EARNINGS'],
            ['Regular Wages', formatCurrency(report.earnings.regular)],
            ['Overtime', formatCurrency(report.earnings.overtime)],
            ['Vacation Pay', formatCurrency(report.earnings.vacation)],
            ['Taxable Benefits', formatCurrency(report.earnings.taxable_benefits)],
            ['TOTAL GROSS PAY', formatCurrency(report.earnings.total_gross)],
            [''],
            ['EMPLOYEE DEDUCTIONS'],
            ['CPP Contributions', formatCurrency(report.deductions.cpp)],
            ['CPP2 Contributions', formatCurrency(report.deductions.cpp2)],
            ['EI Premiums', formatCurrency(report.deductions.ei)],
            ['Federal Income Tax', formatCurrency(report.deductions.federal_tax)],
            ['Provincial Income Tax', formatCurrency(report.deductions.provincial_tax)],
            ['Pre-tax Deductions', formatCurrency(report.deductions.pre_tax)],
            ['Post-tax Deductions', formatCurrency(report.deductions.post_tax)],
            ['TOTAL DEDUCTIONS', formatCurrency(report.deductions.total)],
            [''],
            ['NET PAY', formatCurrency(report.earnings.total_gross - report.deductions.total)],
            [''],
            ['EMPLOYER COSTS'],
            ['Employer CPP', formatCurrency(report.employer_costs.cpp)],
            ['Employer EI', formatCurrency(report.employer_costs.ei)],
            ['TOTAL EMPLOYER COST', formatCurrency(report.employer_costs.total)],
            [''],
            ['REMITTANCE SUMMARY'],
            ['CPP (Employee + Employer)', formatCurrency(report.remittance.cpp_total)],
            ['EI (Employee + Employer)', formatCurrency(report.remittance.ei_total)],
            ['Income Tax Withheld', formatCurrency(report.remittance.income_tax)],
            ['TOTAL REMITTANCE', formatCurrency(report.remittance.total)],
            [''],
            ['Number of Pay Runs', report.pay_run_count.toString()],
            ['Number of Employees Paid', report.employee_count.toString()],
        ];

        const csvContent = csvRows.map((row) => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payroll-summary-${startDate}-${endDate}.csv`;
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
                    <h2 className="text-xl font-bold text-white">Payroll Summary Report</h2>
                    <p className="text-muted-foreground mt-1">
                        {formatLocalDate(startDate)} - {formatLocalDate(endDate)}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" icon={Download} onClick={handleExportCSV}>
                        Export CSV
                    </Button>
                    <Button variant="outline" size="sm" icon={Download} onClick={handleExportPDF}>
                        Export PDF
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Earnings */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">EARNINGS</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Regular Wages</span>
                            <span className="text-white font-medium">{formatCurrency(report.earnings.regular)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Overtime</span>
                            <span className="text-white font-medium">{formatCurrency(report.earnings.overtime)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Vacation Pay</span>
                            <span className="text-white font-medium">{formatCurrency(report.earnings.vacation)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Taxable Benefits</span>
                            <span className="text-white font-medium">{formatCurrency(report.earnings.taxable_benefits)}</span>
                        </div>
                        <div className="border-t border-white/10 pt-2 mt-2 flex justify-between">
                            <span className="text-white font-semibold">TOTAL GROSS PAY</span>
                            <span className="text-white font-bold text-lg">{formatCurrency(report.earnings.total_gross)}</span>
                        </div>
                    </div>
                </Card>

                {/* Deductions */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">EMPLOYEE DEDUCTIONS</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">CPP Contributions</span>
                            <span className="text-white font-medium">{formatCurrency(report.deductions.cpp)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">CPP2 Contributions</span>
                            <span className="text-white font-medium">{formatCurrency(report.deductions.cpp2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">EI Premiums</span>
                            <span className="text-white font-medium">{formatCurrency(report.deductions.ei)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Federal Income Tax</span>
                            <span className="text-white font-medium">{formatCurrency(report.deductions.federal_tax)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Provincial Income Tax</span>
                            <span className="text-white font-medium">{formatCurrency(report.deductions.provincial_tax)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Pre-tax Deductions</span>
                            <span className="text-white font-medium">{formatCurrency(report.deductions.pre_tax)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Post-tax Deductions</span>
                            <span className="text-white font-medium">{formatCurrency(report.deductions.post_tax)}</span>
                        </div>
                        <div className="border-t border-white/10 pt-2 mt-2 flex justify-between">
                            <span className="text-white font-semibold">TOTAL DEDUCTIONS</span>
                            <span className="text-white font-bold text-lg">{formatCurrency(report.deductions.total)}</span>
                        </div>
                    </div>
                </Card>

                {/* Net Pay */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">NET PAY</h3>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-neon-emerald">
                            {formatCurrency(report.earnings.total_gross - report.deductions.total)}
                        </div>
                    </div>
                </Card>

                {/* Employer Costs */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">EMPLOYER COSTS</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Employer CPP</span>
                            <span className="text-white font-medium">{formatCurrency(report.employer_costs.cpp)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Employer EI</span>
                            <span className="text-white font-medium">{formatCurrency(report.employer_costs.ei)}</span>
                        </div>
                        <div className="border-t border-white/10 pt-2 mt-2 flex justify-between">
                            <span className="text-white font-semibold">TOTAL EMPLOYER COST</span>
                            <span className="text-white font-bold text-lg">{formatCurrency(report.employer_costs.total)}</span>
                        </div>
                    </div>
                </Card>

                {/* Remittance Summary */}
                <Card className="p-6 md:col-span-2">
                    <h3 className="text-lg font-semibold text-white mb-4">REMITTANCE SUMMARY</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">CPP (Employee + Employer)</span>
                            <span className="text-white font-medium">{formatCurrency(report.remittance.cpp_total)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">EI (Employee + Employer)</span>
                            <span className="text-white font-medium">{formatCurrency(report.remittance.ei_total)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Income Tax Withheld</span>
                            <span className="text-white font-medium">{formatCurrency(report.remittance.income_tax)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-white font-semibold">TOTAL REMITTANCE</span>
                            <span className="text-white font-bold text-lg">{formatCurrency(report.remittance.total)}</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Summary Stats */}
            <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Number of Pay Runs: <span className="text-white font-medium">{report.pay_run_count}</span></span>
                <span>Number of Employees Paid: <span className="text-white font-medium">{report.employee_count}</span></span>
            </div>
        </div>
    );
};

export default PayrollSummaryReport;
