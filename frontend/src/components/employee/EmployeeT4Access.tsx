import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api, { type T4Slip } from '../../lib/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Download, FileText, Calendar, Eye } from 'lucide-react';
import T4Preview from '../payroll/T4Preview';

interface EmployeeT4AccessProps {
    employeeId: number;
}

export default function EmployeeT4Access({ employeeId }: EmployeeT4AccessProps) {
    const [previewingT4, setPreviewingT4] = useState<T4Slip | null>(null);
    const { data: t4s, isLoading } = useQuery({
        queryKey: ['myT4s', employeeId],
        queryFn: () => api.getMyT4s(),
        enabled: !!employeeId,
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const currentYear = new Date().getFullYear();

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
                <h2 className="text-2xl font-bold text-foreground">Tax Documents (T4)</h2>
            </div>

            {!t4s || t4s.length === 0 ? (
                <Card>
                    <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-2">No T4 slips available</p>
                        <p className="text-sm text-muted-foreground">
                            {currentYear} T4 will be available after year end.
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {t4s.map((t4) => (
                        <Card key={t4.id}>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar className="h-5 w-5 text-muted-foreground" />
                                        <h3 className="text-lg font-semibold text-foreground">
                                            {t4.tax_year} T4 - Statement of Remuneration Paid
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Box 14 (Employment Income): </span>
                                            <span className="font-medium text-foreground">
                                                {formatCurrency(t4.box_14_employment_income)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Box 22 (Income Tax Deducted): </span>
                                            <span className="font-medium text-foreground">
                                                {formatCurrency(t4.box_22_income_tax_deducted)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Box 16 (CPP Contributions): </span>
                                            <span className="font-medium text-foreground">
                                                {formatCurrency(t4.box_16_cpp_contributions)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Box 18 (EI Premiums): </span>
                                            <span className="font-medium text-foreground">
                                                {formatCurrency(t4.box_18_ei_premiums)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        icon={Eye}
                                        onClick={() => setPreviewingT4(t4)}
                                    >
                                        Preview
                                    </Button>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        icon={Download}
                                        onClick={async () => {
                                            try {
                                                const blob = await api.getT4PDF(t4.id);
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `T4_${t4.employee_name.replace(/[^a-zA-Z0-9]/g, '_')}_${t4.tax_year}.pdf`;
                                                document.body.appendChild(a);
                                                a.click();
                                                document.body.removeChild(a);
                                                window.URL.revokeObjectURL(url);
                                            } catch (error) {
                                                alert(`Failed to download T4: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                            }
                                        }}
                                    >
                                        Download PDF
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {(!t4s || t4s.length === 0 || !t4s.some(t4 => t4.tax_year === currentYear)) && (
                <Card>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-5 w-5" />
                        <p className="text-sm">
                            {currentYear} T4 will be available after year end.
                        </p>
                    </div>
                </Card>
            )}

            {/* T4 Preview Modal */}
            {previewingT4 && (
                <T4Preview t4={previewingT4} onClose={() => setPreviewingT4(null)} />
            )}
        </div>
    );
}
