import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api, { type PayRun, type PayRunItem } from '../../lib/api';
import { PayStubPreview } from './PayStubPreview';
import { generateAllPayStubs, downloadZip } from '../../lib/payStubBulkGenerator';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Download, FileText, Loader2, AlertCircle } from 'lucide-react';

interface PayStubsListProps {
    payRun: PayRun;
    onClose?: () => void;
}

export default function PayStubsList({ payRun, onClose }: PayStubsListProps) {
    const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
    const [bulkError, setBulkError] = useState<string | null>(null);

    // Fetch pay stub data for each item
    const { data: items, isLoading } = useQuery({
        queryKey: ['payRun', payRun.id, 'items'],
        queryFn: async () => {
            const fullPayRun = await api.getPayRun(payRun.id);
            return fullPayRun.items || [];
        },
        enabled: !!payRun.id,
    });

    const handleBulkDownload = async () => {
        setIsGeneratingBulk(true);
        setBulkError(null);

        try {
            if (!items || items.length === 0) {
                throw new Error('No employees in this pay run');
            }

            const zipBlob = await generateAllPayStubs(payRun.id);
            const fileName = `paystubs_${payRun.pay_date.replace(/-/g, '')}.zip`;
            downloadZip(zipBlob, fileName);
        } catch (error: any) {
            console.error('Error generating bulk pay stubs:', error);
            setBulkError(error.message || 'Failed to generate pay stubs. Please try again.');
        } finally {
            setIsGeneratingBulk(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-neon-emerald" />
            </div>
        );
    }

    if (!items || items.length === 0) {
        return (
            <Card className="p-6">
                <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No employees in this pay run</p>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Pay Stubs</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {items.length} employee{items.length !== 1 ? 's' : ''} in this pay run
                    </p>
                </div>
                <div className="flex gap-2">
                    {onClose && (
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                    )}
                    <Button
                        icon={Download}
                        onClick={handleBulkDownload}
                        disabled={isGeneratingBulk}
                    >
                        {isGeneratingBulk ? 'Generating...' : 'Download All (ZIP)'}
                    </Button>
                </div>
            </div>

            {/* Bulk Error */}
            {bulkError && (
                <Card className="p-4 bg-red-900/20 border-red-800">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-semibold text-red-300 mb-1">Error</h4>
                            <p className="text-sm text-red-300">{bulkError}</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Pay Stubs Table */}
            <Card className="p-6">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                                    Employee
                                </th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">
                                    Gross Pay
                                </th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">
                                    Net Pay
                                </th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <PayStubRow key={item.id} item={item} payRun={payRun} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

interface PayStubRowProps {
    item: PayRunItem;
    payRun: PayRun;
}

function PayStubRow({ item, payRun }: PayStubRowProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [payStubData, setPayStubData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const loadPayStubData = async () => {
        if (payStubData) return; // Already loaded

        setIsLoading(true);
        setError(null);

        try {
            if (!item.employee) {
                throw new Error('Employee data is missing');
            }

            const data = await api.getPayStubData(item.id);
            
            // Validate required data
            if (!data.employee || !data.company || !data.ytd) {
                throw new Error('Required pay stub data is missing');
            }

            setPayStubData(data);
        } catch (err: any) {
            console.error('Error loading pay stub data:', err);
            setError(err.message || 'Failed to load pay stub data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const employeeName = item.employee
        ? `${item.employee.first_name} ${item.employee.last_name}`
        : `Employee ${item.employee_id}`;

    return (
        <tr className="border-b border-border hover:bg-muted/30">
            <td className="py-3 px-4">
                <div>
                    <div className="font-medium text-foreground">{employeeName}</div>
                    {item.employee && (
                        <div className="text-sm text-muted-foreground">
                            {item.employee.employee_id}
                        </div>
                    )}
                </div>
            </td>
            <td className="py-3 px-4 text-right text-foreground">
                {formatCurrency(item.gross_pay)}
            </td>
            <td className="py-3 px-4 text-right text-foreground font-medium">
                {formatCurrency(item.net_pay)}
            </td>
            <td className="py-3 px-4 text-right">
                {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground inline-block" />
                ) : error ? (
                    <span className="text-sm text-red-400">{error}</span>
                ) : payStubData ? (
                    <PayStubPreview
                        payRun={payRun}
                        item={item}
                        employee={payStubData.employee}
                        company={payStubData.company}
                        ytd={payStubData.ytd}
                        deductions={payStubData.deductions}
                    />
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadPayStubData}
                        icon={FileText}
                    >
                        Load
                    </Button>
                )}
            </td>
        </tr>
    );
}
