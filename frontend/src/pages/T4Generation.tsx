import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api, { type T4Slip } from '../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, CheckCircle, AlertCircle, Eye, RefreshCw, BarChart } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import T4Preview from '../components/payroll/T4Preview';
import T4SummaryReport from '../components/payroll/T4SummaryReport';

const T4Generation: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const currentYear = new Date().getFullYear();
    const [taxYear, setTaxYear] = useState<number>(currentYear - 1); // Default to previous year
    const [previewingT4, setPreviewingT4] = useState<T4Slip | null>(null);
    const [showSummary, setShowSummary] = useState(false);

    // Fetch company for summary report
    const { data: company } = useQuery({
        queryKey: ['company', user?.company_id],
        queryFn: () => (user?.company_id ? api.getCompany(user.company_id) : null),
        enabled: !!user?.company_id,
    });

    // Fetch employees
    const { data: employees = [] } = useQuery({
        queryKey: ['employees', user?.company_id],
        queryFn: async () => {
            if (!user?.company_id) return [];
            const result = await api.getEmployees({ company_id: user.company_id, status: 'active' });
            return result.data;
        },
        enabled: !!user?.company_id,
    });

    // Fetch T4s for the selected year
    const { data: t4s = [], isLoading: t4sLoading } = useQuery({
        queryKey: ['t4s', user?.company_id, taxYear],
        queryFn: async () => {
            if (!user?.company_id) return [];
            return api.getT4s({ company_id: user.company_id, tax_year: taxYear });
        },
        enabled: !!user?.company_id,
    });

    // Create a map of employee_id -> T4 for quick lookup
    const t4Map = new Map(t4s.map((t4) => [t4.employee_id, t4]));

    // Generate T4 mutation
    const generateT4Mutation = useMutation({
        mutationFn: ({ employeeId, taxYear }: { employeeId: number; taxYear: number }) =>
            api.generateT4(employeeId, taxYear),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['t4s', user?.company_id, taxYear] });
        },
    });

    // Generate all T4s mutation
    const generateAllMutation = useMutation({
        mutationFn: () => api.generateAllT4s(user!.company_id, taxYear),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['t4s', user?.company_id, taxYear] });
        },
    });

    // Mark as filed mutation
    const markFiledMutation = useMutation({
        mutationFn: (id: number) => api.markT4AsFiled(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['t4s', user?.company_id, taxYear] });
        },
    });

    // Download T4 PDF
    const handleDownloadT4 = async (t4: T4Slip) => {
        try {
            const blob = await api.getT4PDF(t4.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `T4_${t4.employee_name.replace(/[^a-zA-Z0-9]/g, '_')}_${taxYear}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert(`Failed to download T4: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Download all T4s as zip
    const handleDownloadAll = async () => {
        try {
            const blob = await api.getAllT4PDFs(user!.company_id, taxYear);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `T4s_${taxYear}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert(`Failed to download T4s: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Calculate statistics
    const totalEmployees = employees.length;
    const t4sGenerated = t4s.filter((t4) => t4.status === 'generated' || t4.status === 'filed').length;
    const t4sPending = totalEmployees - t4sGenerated;
    const t4sFiled = t4s.filter((t4) => t4.status === 'filed').length;

    // Deadline date (February 28 of year following tax year)
    const deadlineDate = new Date(taxYear + 1, 1, 28); // February 28
    const deadlineStr = deadlineDate.toLocaleDateString('en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const handleGenerateT4 = async (employeeId: number) => {
        try {
            await generateT4Mutation.mutateAsync({ employeeId, taxYear });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            // Show more detailed error in console for debugging
            console.error('T4 Generation Error:', error);
            alert(`Failed to generate T4: ${errorMessage}\n\nCommon issues:\n- Employee missing SIN\n- Employee missing address\n- No payroll data for this tax year\n- Tax year not yet complete`);
        }
    };

    const handleGenerateAll = async () => {
        if (!confirm(`Generate T4s for all ${totalEmployees} employees for ${taxYear}?\n\nNote: This will skip employees with missing SIN, address, or no payroll data.`)) {
            return;
        }
        try {
            const results = await generateAllMutation.mutateAsync();
            if (results.length < totalEmployees) {
                alert(`Generated ${results.length} of ${totalEmployees} T4s. Some employees may have been skipped due to missing information or no payroll data.`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Bulk T4 Generation Error:', error);
            alert(`Failed to generate T4s: ${errorMessage}`);
        }
    };

    const handleMarkAsFiled = async (t4Id: number) => {
        if (!confirm('Mark this T4 as filed with CRA?')) {
            return;
        }
        try {
            await markFiledMutation.mutateAsync(t4Id);
        } catch (error) {
            alert(`Failed to mark T4 as filed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    if (t4sLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">T4 Generation</h1>
                    <p className="text-muted-foreground mt-1">Generate and manage T4 slips for year-end reporting</p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">Tax Year:</label>
                    <select
                        value={taxYear}
                        onChange={(e) => setTaxYear(parseInt(e.target.value))}
                        className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                        {Array.from({ length: 5 }, (_, i) => currentYear - i).map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Total Employees" value={totalEmployees.toString()} icon={FileText} />
                <StatCard title="T4s Generated" value={t4sGenerated.toString()} icon={CheckCircle} />
                <StatCard title="T4s Pending" value={t4sPending.toString()} icon={AlertCircle} />
                <StatCard title="T4s Filed" value={t4sFiled.toString()} icon={CheckCircle} />
            </div>

            {/* Summary Card */}
            <Card className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground mb-2">Tax Year {taxYear} Summary</h2>
                        <div className="space-y-1 text-sm text-muted-foreground">
                            <p>Total Employees: {totalEmployees}</p>
                            <p>T4s Generated: {t4sGenerated}</p>
                            <p>T4s Pending: {t4sPending}</p>
                            <p>T4s Filed: {t4sFiled}</p>
                            <p className="font-medium text-foreground mt-2">
                                Deadline: {deadlineStr}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => setShowSummary(!showSummary)}
                            icon={BarChart}
                            variant="outline"
                            disabled={t4sGenerated === 0}
                        >
                            {showSummary ? 'Hide Summary' : 'View Summary'}
                        </Button>
                        <Button
                            onClick={handleGenerateAll}
                            icon={RefreshCw}
                            variant="outline"
                            disabled={generateAllMutation.isPending || totalEmployees === 0}
                        >
                            {generateAllMutation.isPending ? 'Generating...' : 'Generate All'}
                        </Button>
                        <Button
                            onClick={handleDownloadAll}
                            icon={Download}
                            disabled={t4sGenerated === 0}
                        >
                            Download All
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Employee Table */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Employees</h2>
                {employees.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">No active employees found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-foreground">
                                        Employee
                                    </th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-foreground">
                                        Box 14 (Income)
                                    </th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-foreground">
                                        Box 22 (Tax)
                                    </th>
                                    <th className="text-center py-3 px-4 text-sm font-medium text-foreground">
                                        Status
                                    </th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-foreground">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map((employee) => {
                                    const t4 = t4Map.get(employee.id);
                                    const hasT4 = !!t4;
                                    const isGenerated = t4?.status === 'generated' || t4?.status === 'filed';
                                    const isFiled = t4?.status === 'filed';

                                    return (
                                        <tr key={employee.id} className="border-b border-border hover:bg-muted/30">
                                            <td className="py-3 px-4">
                                                <div>
                                                    <div className="font-medium text-foreground">
                                                        {employee.first_name} {employee.last_name}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {employee.employee_id}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {hasT4 ? formatCurrency(t4.box_14_employment_income) : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {hasT4 ? formatCurrency(t4.box_22_income_tax_deducted) : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {isFiled ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-900/20 text-green-400 border border-green-800">
                                                        <CheckCircle className="h-3 w-3" />
                                                        Filed
                                                    </span>
                                                ) : isGenerated ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-900/20 text-blue-400 border border-blue-800">
                                                        <CheckCircle className="h-3 w-3" />
                                                        Ready
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-900/20 text-yellow-400 border border-yellow-800">
                                                        <AlertCircle className="h-3 w-3" />
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {!hasT4 ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleGenerateT4(employee.id)}
                                                            disabled={generateT4Mutation.isPending}
                                                        >
                                                            Generate
                                                        </Button>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                icon={Eye}
                                                                onClick={() => setPreviewingT4(t4)}
                                                            >
                                                                Preview
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                icon={Download}
                                                                onClick={() => handleDownloadT4(t4)}
                                                            >
                                                                Download
                                                            </Button>
                                                            {!isFiled && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    icon={CheckCircle}
                                                                    onClick={() => handleMarkAsFiled(t4.id)}
                                                                    disabled={markFiledMutation.isPending}
                                                                >
                                                                    Mark Filed
                                                                </Button>
                                                            )}
                                                        </>
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

            {/* T4 Summary Report */}
            {showSummary && t4sGenerated > 0 && company && (
                <T4SummaryReport t4s={t4s.filter((t4) => t4.status === 'generated' || t4.status === 'filed')} taxYear={taxYear} companyName={company.name} />
            )}

            {/* T4 Preview Modal */}
            {previewingT4 && (
                <T4Preview t4={previewingT4} onClose={() => setPreviewingT4(null)} />
            )}
        </div>
    );
};

export default T4Generation;
