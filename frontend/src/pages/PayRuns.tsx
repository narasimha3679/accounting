import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, DollarSign, Filter, X } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import PayRunTable from '../components/payroll/PayRunTable';
import StatCard from '../components/ui/StatCard';

const PayRuns: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [startDateFilter, setStartDateFilter] = useState<string>('');
    const [endDateFilter, setEndDateFilter] = useState<string>('');

    // Fetch pay runs
    const { data: payRuns = [], isLoading } = useQuery({
        queryKey: ['payRuns', user?.company_id, statusFilter, startDateFilter, endDateFilter],
        queryFn: async () => {
            if (!user?.company_id) return [];
            return api.getPayRuns({
                company_id: user.company_id,
                status: statusFilter || undefined,
                start_date: startDateFilter || undefined,
                end_date: endDateFilter || undefined,
            });
        },
        enabled: !!user?.company_id,
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.deletePayRun(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payRuns'] });
        },
    });

    // Calculate stats
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthPayRuns = payRuns.filter((pr) => {
        const prDate = new Date(pr.pay_period_start);
        return prDate.getMonth() === currentMonth && prDate.getFullYear() === currentYear;
    });
    const totalThisMonth = monthPayRuns.reduce((sum, pr) => sum + pr.total_net, 0);
    const ytdTotal = payRuns
        .filter((pr) => {
            const prDate = new Date(pr.pay_period_start);
            return prDate.getFullYear() === currentYear && pr.status === 'finalized';
        })
        .reduce((sum, pr) => sum + pr.total_net, 0);

    const handleView = (id: number) => {
        navigate(`/payroll/runs/${id}`);
    };

    const handleEdit = (id: number) => {
        navigate(`/payroll/runs/${id}`);
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this pay run? This action cannot be undone.')) {
            deleteMutation.mutate(id);
        }
    };

    const handleCreate = () => {
        navigate('/payroll/runs/new');
    };

    const clearFilters = () => {
        setStatusFilter('');
        setStartDateFilter('');
        setEndDateFilter('');
    };

    const hasFilters = statusFilter || startDateFilter || endDateFilter;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Pay Runs</h1>
                    <p className="text-muted-foreground mt-1">Manage payroll batches and pay periods</p>
                </div>
                <Button onClick={handleCreate} icon={Plus}>
                    Create New Pay Run
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    title="Total This Month"
                    value={new Intl.NumberFormat('en-CA', {
                        style: 'currency',
                        currency: 'CAD',
                    }).format(totalThisMonth)}
                    icon={DollarSign}
                />
                <StatCard
                    title="YTD Total"
                    value={new Intl.NumberFormat('en-CA', {
                        style: 'currency',
                        currency: 'CAD',
                    }).format(ytdTotal)}
                    icon={DollarSign}
                />
                <StatCard title="Total Pay Runs" value={payRuns.length.toString()} icon={Calendar} />
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Filters:</span>
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                        <option value="">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="pending_approval">Pending Approval</option>
                        <option value="approved">Approved</option>
                        <option value="finalized">Finalized</option>
                        <option value="void">Void</option>
                    </select>
                    <input
                        type="date"
                        value={startDateFilter}
                        onChange={(e) => setStartDateFilter(e.target.value)}
                        placeholder="Start Date"
                        className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    />
                    <input
                        type="date"
                        value={endDateFilter}
                        onChange={(e) => setEndDateFilter(e.target.value)}
                        placeholder="End Date"
                        className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    />
                    {hasFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} icon={X}>
                            Clear
                        </Button>
                    )}
                </div>
            </Card>

            {/* Pay Runs Table */}
            <Card className="p-6">
                <PayRunTable payRuns={payRuns} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} />
            </Card>
        </div>
    );
};

export default PayRuns;
