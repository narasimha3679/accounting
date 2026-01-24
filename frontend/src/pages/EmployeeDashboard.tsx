import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import { DollarSign, TrendingUp, Building2, Calendar, FileText, BarChart, FileCheck, User, Briefcase } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatLocalDate } from '../lib/utils';

const EmployeeDashboard: React.FC = () => {
    const { user } = useAuth();
    const currentYear = new Date().getFullYear();

    // Fetch YTD data
    const { data: ytd, isLoading: ytdLoading } = useQuery({
        queryKey: ['myYTD', user?.employee?.id, currentYear],
        queryFn: () => api.getMyYTD(currentYear),
        enabled: !!user?.employee?.id,
    });

    // Fetch recent pay stubs
    const { data: recentPayStubs, isLoading: payStubsLoading } = useQuery({
        queryKey: ['myPayStubs', user?.employee?.id, 'recent'],
        queryFn: () => api.getMyPayStubs({ limit: 5 }),
        enabled: !!user?.employee?.id,
    });

    // Fetch upcoming schedules
    const { data: schedulesData } = useQuery({
        queryKey: ['schedules', 'employee', user?.employee?.id, 'upcoming'],
        queryFn: async () => {
            if (!user?.employee?.id) return [];
            const today = new Date().toISOString().split('T')[0];
            const result = await api.getSchedules({
                employee_id: user.employee.id,
                start_date: today,
                status: 'scheduled',
                limit: 5
            });
            return result.data;
        },
        enabled: !!user?.employee?.id,
    });

    // Fetch pending timesheets
    const { data: timesheetsData } = useQuery({
        queryKey: ['timesheets', 'employee', user?.employee?.id, 'pending'],
        queryFn: async () => {
            if (!user?.employee?.id) return [];
            const result = await api.getTimesheets({
                employee_id: user.employee.id,
                status: 'pending',
                limit: 5
            });
            return result.data;
        },
        enabled: !!user?.employee?.id,
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return formatLocalDate(dateString, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const isLoading = ytdLoading || payStubsLoading;
    const ytdNet = ytd ? ytd.gross_earnings - ytd.federal_tax_withheld - ytd.provincial_tax_withheld - ytd.cpp_contributions - ytd.cpp2_contributions - ytd.ei_premiums : 0;
    const lastPay = recentPayStubs && recentPayStubs.length > 0 ? recentPayStubs[0] : null;

    if (!user?.isEmployee || !user.employee) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Access denied. This page is for employees only.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Welcome, {user.employee.first_name}!
                </h1>
                <p className="text-muted-foreground mt-2">
                    {user.company?.name || 'View your payroll information'}
                </p>
            </div>

            {/* Company Info */}
            {user.company && (
                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
                            <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-5">
                            <h3 className="text-lg font-semibold text-foreground">{user.company.name}</h3>
                            <p className="text-sm text-muted-foreground">Your Company</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Quick Links */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Link to="/employee-schedule">
                    <Card className="p-6 hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
                                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="ml-5 flex-1">
                                <h3 className="text-lg font-semibold text-foreground">My Schedule</h3>
                                <p className="text-sm text-muted-foreground">View your work schedule</p>
                                {schedulesData && schedulesData.length > 0 && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {schedulesData.length} upcoming shift{schedulesData.length !== 1 ? 's' : ''}
                                    </p>
                                )}
                            </div>
                        </div>
                    </Card>
                </Link>
                <Link to="/employee-timesheet">
                    <Card className="p-6 hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                                <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="ml-5 flex-1">
                                <h3 className="text-lg font-semibold text-foreground">My Timesheet</h3>
                                <p className="text-sm text-muted-foreground">Submit and track timesheets</p>
                                {timesheetsData && timesheetsData.length > 0 && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {timesheetsData.length} pending approval
                                    </p>
                                )}
                            </div>
                        </div>
                    </Card>
                </Link>
            </div>

            {/* Payroll Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="YTD Gross"
                    value={ytd ? formatCurrency(ytd.gross_earnings) : formatCurrency(0)}
                    icon={DollarSign}
                />
                <StatCard
                    title="YTD Net"
                    value={formatCurrency(ytdNet)}
                    icon={TrendingUp}
                />
                <StatCard
                    title="Vacation Balance"
                    value={ytd ? formatCurrency(ytd.vacation_balance) : formatCurrency(0)}
                    icon={Briefcase}
                />
                <StatCard
                    title="Last Pay"
                    value={lastPay ? formatCurrency(lastPay.net_pay) : formatCurrency(0)}
                    icon={Calendar}
                    subtitle={lastPay?.pay_run?.pay_date ? formatDate(lastPay.pay_run.pay_date) : undefined}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Pay Stubs */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-foreground">Recent Pay Stubs</h2>
                        <Link to="/employee/pay-stubs">
                            <Button variant="ghost" size="sm">
                                View All
                            </Button>
                        </Link>
                    </div>
                    {!recentPayStubs || recentPayStubs.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">No pay stubs available</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentPayStubs.slice(0, 3).map((item) => {
                                const payRun = item.pay_run;
                                if (!payRun) return null;
                                return (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium text-foreground">
                                                {formatDate(payRun.pay_date)}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(payRun.pay_period_start)} - {formatDate(payRun.pay_period_end)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-foreground">
                                                {formatCurrency(item.net_pay)}
                                            </p>
                                            <Link
                                                to="/employee/pay-stubs"
                                                className="text-xs text-neon-emerald hover:underline"
                                            >
                                                View
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>

                {/* Quick Actions */}
                <Card>
                    <h2 className="text-xl font-semibold mb-4 text-foreground">Quick Actions</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Link to="/employee/pay-stubs">
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                                <FileText className="h-5 w-5 text-neon-emerald" />
                                <span className="text-foreground">View All Pay Stubs</span>
                            </div>
                        </Link>
                        <Link to="/employee/ytd">
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                                <BarChart className="h-5 w-5 text-neon-emerald" />
                                <span className="text-foreground">YTD Summary</span>
                            </div>
                        </Link>
                        <Link to="/employee/td1">
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                                <FileText className="h-5 w-5 text-neon-emerald" />
                                <span className="text-foreground">Update TD1</span>
                            </div>
                        </Link>
                        <Link to="/employee/tax-documents">
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                                <FileCheck className="h-5 w-5 text-neon-emerald" />
                                <span className="text-foreground">View T4</span>
                            </div>
                        </Link>
                        <Link to="/employee/info">
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                                <User className="h-5 w-5 text-neon-emerald" />
                                <span className="text-foreground">My Information</span>
                            </div>
                        </Link>
                    </div>
                </Card>
            </div>

            {/* CPP/EI Progress */}
            {ytd && (
                <Card>
                    <h2 className="text-xl font-semibold mb-4 text-foreground">Contribution Progress</h2>
                    <div className="space-y-4">
                        {/* CPP Progress */}
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm text-muted-foreground">CPP Contributions</span>
                                <span className="text-sm font-medium text-foreground">
                                    {formatCurrency(ytd.cpp_contributions)}
                                </span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2">
                                <div
                                    className="bg-neon-emerald h-2 rounded-full transition-all"
                                    style={{
                                        width: `${Math.min(100, ytd.cpp_maxed_out ? 100 : (ytd.cpp_contributions / 4500) * 100)}%`,
                                    }}
                                />
                            </div>
                        </div>

                        {/* EI Progress */}
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-sm text-muted-foreground">EI Premiums</span>
                                <span className="text-sm font-medium text-foreground">
                                    {formatCurrency(ytd.ei_premiums)}
                                </span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2">
                                <div
                                    className="bg-neon-emerald h-2 rounded-full transition-all"
                                    style={{
                                        width: `${Math.min(100, ytd.ei_maxed_out ? 100 : (ytd.ei_premiums / 1200) * 100)}%`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </Card>
            )}

        </div>
    );
};

export default EmployeeDashboard;
