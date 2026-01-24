import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { useQuery } from '@tanstack/react-query';
import { FileText, Calendar } from 'lucide-react';
import Card from '../components/ui/Card';
import PayrollSummaryReportComponent from '../components/payroll/PayrollSummaryReport';
import EmployeeEarningsReportComponent from '../components/payroll/EmployeeEarningsReport';
import DeductionsReportComponent from '../components/payroll/DeductionsReport';
import PayrollJournalEntry from '../components/payroll/PayrollJournalEntry';
import { formatLocalDate } from '../lib/utils';

type ReportTab = 'summary' | 'earnings' | 'deductions' | 'journal';

const PayrollReports: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<ReportTab>('summary');
    const [startDate, setStartDate] = useState<string>(() => {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState<string>(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [groupBy, setGroupBy] = useState<'period' | 'month' | 'quarter' | 'year'>('period');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | undefined>();
    const [selectedPayRunId, setSelectedPayRunId] = useState<number | undefined>();

    // Fetch employees for filter
    const { data: employeesResponse } = useQuery({
        queryKey: ['employees', user?.company_id],
        queryFn: async () => {
            if (!user?.company_id) return { data: [] };
            return api.getEmployees({ company_id: user.company_id, limit: 1000 });
        },
        enabled: !!user?.company_id && activeTab === 'earnings',
    });
    const employees = employeesResponse?.data || [];

    // Fetch pay runs for journal entry
    const { data: payRuns = [] } = useQuery({
        queryKey: ['payRuns', user?.company_id],
        queryFn: async () => {
            if (!user?.company_id) return [];
            return api.getPayRuns({ company_id: user.company_id, status: 'finalized' });
        },
        enabled: !!user?.company_id && activeTab === 'journal',
    });

    const tabs = [
        { id: 'summary' as ReportTab, label: 'Summary Report', icon: FileText },
        { id: 'earnings' as ReportTab, label: 'Employee Earnings', icon: FileText },
        { id: 'deductions' as ReportTab, label: 'Deductions', icon: FileText },
        { id: 'journal' as ReportTab, label: 'Journal Entry', icon: FileText },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Payroll Reports</h1>
                    <p className="text-muted-foreground mt-1">Generate and view payroll reports</p>
                </div>
            </div>

            {/* Tabs */}
            <Card className="p-0">
                <div className="flex border-b border-white/10">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors
                                    ${
                                        activeTab === tab.id
                                            ? 'text-neon-emerald border-b-2 border-neon-emerald'
                                            : 'text-muted-foreground hover:text-white'
                                    }
                                `}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </Card>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Date Range:</span>
                    </div>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    />
                    <span className="text-muted-foreground">to</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    />
                    {activeTab === 'summary' && (
                        <>
                            <span className="text-muted-foreground">Group by:</span>
                            <select
                                value={groupBy}
                                onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
                                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                            >
                                <option value="period">Pay Period</option>
                                <option value="month">Month</option>
                                <option value="quarter">Quarter</option>
                                <option value="year">Year</option>
                            </select>
                        </>
                    )}
                    {activeTab === 'earnings' && (
                        <>
                            <span className="text-muted-foreground">Employee:</span>
                            <select
                                value={selectedEmployeeId || ''}
                                onChange={(e) => setSelectedEmployeeId(e.target.value ? parseInt(e.target.value) : undefined)}
                                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                            >
                                <option value="">All Employees</option>
                                {employees.map((emp) => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.first_name} {emp.last_name} ({emp.employee_id})
                                    </option>
                                ))}
                            </select>
                        </>
                    )}
                    {activeTab === 'journal' && (
                        <>
                            <span className="text-muted-foreground">Pay Run:</span>
                            <select
                                value={selectedPayRunId || ''}
                                onChange={(e) => setSelectedPayRunId(e.target.value ? parseInt(e.target.value) : undefined)}
                                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                            >
                                <option value="">Select Pay Run</option>
                                {payRuns.map((pr) => (
                                    <option key={pr.id} value={pr.id}>
                                        {formatLocalDate(pr.pay_period_start)} - {formatLocalDate(pr.pay_period_end)}
                                    </option>
                                ))}
                            </select>
                        </>
                    )}
                </div>
            </Card>

            {/* Report Content */}
            <Card className="p-6">
                {activeTab === 'summary' && user?.company_id && (
                    <PayrollSummaryReportComponent
                        companyId={user.company_id}
                        startDate={startDate}
                        endDate={endDate}
                        groupBy={groupBy}
                    />
                )}
                {activeTab === 'earnings' && user?.company_id && (
                    <EmployeeEarningsReportComponent
                        companyId={user.company_id}
                        startDate={startDate}
                        endDate={endDate}
                        employeeId={selectedEmployeeId}
                    />
                )}
                {activeTab === 'deductions' && user?.company_id && (
                    <DeductionsReportComponent
                        companyId={user.company_id}
                        startDate={startDate}
                        endDate={endDate}
                    />
                )}
                {activeTab === 'journal' && selectedPayRunId && (
                    <PayrollJournalEntry payRunId={selectedPayRunId} />
                )}
                {activeTab === 'journal' && !selectedPayRunId && (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Please select a pay run to view journal entry</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default PayrollReports;
