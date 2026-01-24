import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api, { type ROERecord, type Employee } from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Filter, X, Eye, Edit, Download, CheckCircle, FileText } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { getReasonCodeLabel } from '../lib/roeHelpers';
import ROEPreview from '../components/payroll/ROEPreview';
import { formatLocalDate } from '../lib/utils';

const ROEList: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [employeeFilter, setEmployeeFilter] = useState<string>('');
    const [previewingROE, setPreviewingROE] = useState<ROERecord | null>(null);
    const [previewEmployee, setPreviewEmployee] = useState<Employee | null>(null);

    // Fetch ROEs
    const { data: roes = [], isLoading } = useQuery({
        queryKey: ['roes', user?.company_id, statusFilter],
        queryFn: async () => {
            if (!user?.company_id) return [];
            const allROEs = await api.getROEs(user.company_id);
            return statusFilter ? allROEs.filter((roe) => roe.status === statusFilter) : allROEs;
        },
        enabled: !!user?.company_id,
    });

    // Fetch employees for filter and display
    const { data: employees = [] } = useQuery({
        queryKey: ['employees', user?.company_id],
        queryFn: async () => {
            if (!user?.company_id) return [];
            const result = await api.getEmployees({ company_id: user.company_id });
            return result.data;
        },
        enabled: !!user?.company_id,
    });

    // Submit ROE mutation
    const submitMutation = useMutation({
        mutationFn: (id: number) => api.submitROE(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roes'] });
        },
    });

    // Filter ROEs by employee
    const filteredROEs = employeeFilter
        ? roes.filter((roe) => roe.employee_id.toString() === employeeFilter)
        : roes;

    // Create employee map for quick lookup
    const employeeMap = new Map(employees.map((emp) => [emp.id, emp]));


    const handleEdit = (roe: ROERecord) => {
        if (roe.status === 'draft') {
            navigate(`/payroll/roe/${roe.id}`);
        } else {
            alert('Can only edit ROEs with status "draft"');
        }
    };

    const handlePreview = async (roe: ROERecord) => {
        const employee = employeeMap.get(roe.employee_id);
        if (employee) {
            setPreviewEmployee(employee);
            setPreviewingROE(roe);
        }
    };

    const handleDownload = async (roe: ROERecord) => {
        try {
            // Dynamic import to avoid SSR issues
            const { ROEDocument } = await import('../lib/roeGenerator');
            const { pdf } = await import('@react-pdf/renderer');
            const company = await api.getCompany(roe.company_id);
            const employee = employeeMap.get(roe.employee_id);

            if (!employee) {
                alert('Employee not found');
                return;
            }

            const doc = <ROEDocument roe={roe} company={company} employee={employee} />;
            const blob = await pdf(doc).toBlob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ROE_${employee.employee_id}_${roe.last_day_paid.replace(/-/g, '')}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert(`Failed to download ROE: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleSubmit = (roe: ROERecord) => {
        if (confirm('Mark this ROE as submitted to Service Canada?')) {
            submitMutation.mutate(roe.id);
        }
    };

    const handleCreate = () => {
        navigate('/payroll/roe/new');
    };

    const clearFilters = () => {
        setStatusFilter('');
        setEmployeeFilter('');
    };

    const hasFilters = statusFilter || employeeFilter;

    const getStatusBadge = (status: string) => {
        const styles = {
            draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            generated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            submitted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        };
        return (
            <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                    styles[status as keyof typeof styles] || 'bg-slate-100 text-slate-800'
                }`}
            >
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const formatDate = (date: string) => {
        return formatLocalDate(date, {
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Records of Employment</h1>
                    <p className="text-muted-foreground mt-1">Manage ROEs for terminated employees</p>
                </div>
                <Button onClick={handleCreate} icon={Plus}>
                    New ROE
                </Button>
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
                        <option value="generated">Generated</option>
                        <option value="submitted">Submitted</option>
                    </select>
                    <select
                        value={employeeFilter}
                        onChange={(e) => setEmployeeFilter(e.target.value)}
                        className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                        <option value="">All Employees</option>
                        {employees.map((emp) => (
                            <option key={emp.id} value={emp.id.toString()}>
                                {emp.first_name} {emp.last_name} ({emp.employee_id})
                            </option>
                        ))}
                    </select>
                    {hasFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} icon={X}>
                            Clear
                        </Button>
                    )}
                </div>
            </Card>

            {/* ROEs Table */}
            <Card className="p-6">
                {filteredROEs.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-slate-muted mx-auto mb-4" />
                        <p className="text-slate-muted">No ROEs found</p>
                        <Button onClick={handleCreate} icon={Plus} className="mt-4">
                            Create First ROE
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left py-3 px-4 text-sm font-medium">Employee</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium">Reason</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium">
                                        Last Day Paid
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-medium">Status</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium">
                                        Generated
                                    </th>
                                    <th className="text-right py-3 px-4 text-sm font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredROEs.map((roe) => {
                                    const employee = employeeMap.get(roe.employee_id);
                                    return (
                                        <tr
                                            key={roe.id}
                                            className="border-b border-slate-700 hover:bg-slate-800/50"
                                        >
                                            <td className="py-3 px-4">
                                                {employee
                                                    ? `${employee.first_name} ${employee.last_name}`
                                                    : `Employee #${roe.employee_id}`}
                                            </td>
                                            <td className="py-3 px-4">
                                                {getReasonCodeLabel(roe.reason_code)}
                                            </td>
                                            <td className="py-3 px-4">{formatDate(roe.last_day_paid)}</td>
                                            <td className="py-3 px-4">{getStatusBadge(roe.status)}</td>
                                            <td className="py-3 px-4">
                                                {roe.generated_at
                                                    ? formatDate(roe.generated_at)
                                                    : '-'}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        icon={Eye}
                                                        onClick={() => handlePreview(roe)}
                                                        title="Preview"
                                                    />
                                                    {roe.status === 'draft' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            icon={Edit}
                                                            onClick={() => handleEdit(roe)}
                                                            title="Edit"
                                                        />
                                                    )}
                                                    {roe.status !== 'draft' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            icon={Download}
                                                            onClick={() => handleDownload(roe)}
                                                            title="Download PDF"
                                                        />
                                                    )}
                                                    {roe.status === 'generated' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            icon={CheckCircle}
                                                            onClick={() => handleSubmit(roe)}
                                                            title="Mark as Submitted"
                                                            disabled={submitMutation.isPending}
                                                        />
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Preview Modal */}
            {previewingROE && previewEmployee && (
                <ROEPreview
                    roe={previewingROE}
                    employee={previewEmployee}
                    onClose={() => {
                        setPreviewingROE(null);
                        setPreviewEmployee(null);
                    }}
                />
            )}
        </div>
    );
};

export default ROEList;
