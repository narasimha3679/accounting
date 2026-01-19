import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api, { type Salary } from '../lib/api';
import Card from '../components/ui/Card';
import { DollarSign, CheckCircle, Clock, Building2, Calendar, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const EmployeeDashboard: React.FC = () => {
    const { user } = useAuth();
    const [salaries, setSalaries] = useState<Salary[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user?.isEmployee && user.employee) {
            loadSalaries();
        }
    }, [user]);

    const loadSalaries = async () => {
        if (!user?.employee) return;

        try {
            setIsLoading(true);
            const response = await api.getSalaries({
                company_id: user.company_id,
                employee_id: user.employee.id,
                limit: 1000
            });
            setSalaries(response.data);
        } catch (error) {
            console.error('Error loading salaries:', error);
        } finally {
            setIsLoading(false);
        }
    };

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
        return new Date(dateString).toLocaleDateString('en-CA');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            default:
                return 'bg-muted text-slate-muted';
        }
    };

    const totalSalaries = salaries.reduce((sum, salary) => sum + salary.amount, 0);
    const paidSalaries = salaries.filter(s => s.status === 'paid').reduce((sum, salary) => sum + salary.amount, 0);
    const pendingSalaries = salaries.filter(s => s.status === 'pending').reduce((sum, salary) => sum + salary.amount, 0);

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
                <p className="text-muted-foreground mt-2">View your salary information</p>
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

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
                            <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-muted-foreground truncate">
                                    Total Salaries
                                </dt>
                                <dd className="text-2xl font-bold text-foreground">
                                    {formatCurrency(totalSalaries)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-muted-foreground truncate">
                                    Paid Salaries
                                </dt>
                                <dd className="text-2xl font-bold text-foreground">
                                    {formatCurrency(paidSalaries)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                            <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-muted-foreground truncate">
                                    Pending Salaries
                                </dt>
                                <dd className="text-2xl font-bold text-foreground">
                                    {formatCurrency(pendingSalaries)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Salary Records */}
            <Card className="overflow-hidden">
                <div className="p-6 border-b border-border">
                    <h2 className="text-xl font-semibold text-foreground">Salary Records</h2>
                    <p className="text-sm text-muted-foreground mt-1">Your salary payment history</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Payment Date</th>
                                <th className="px-6 py-4">Period</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {salaries.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                        No salary records found
                                    </td>
                                </tr>
                            ) : (
                                salaries.map((salary) => (
                                    <tr key={salary.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-foreground">
                                            {formatCurrency(salary.amount)}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {formatDate(salary.payment_date)}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {formatDate(salary.period_start)} - {formatDate(salary.period_end)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(salary.status)}`}>
                                                <span className="capitalize">{salary.status}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground max-w-xs truncate">
                                            {salary.notes || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default EmployeeDashboard;
