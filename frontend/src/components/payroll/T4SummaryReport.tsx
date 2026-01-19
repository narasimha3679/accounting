import type { T4Slip } from '../../lib/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Download } from 'lucide-react';

interface T4SummaryReportProps {
    t4s: T4Slip[];
    taxYear: number;
    companyName: string;
}

export default function T4SummaryReport({ t4s, taxYear, companyName }: T4SummaryReportProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    // Calculate totals
    const totalT4s = t4s.length;
    const totalBox14 = t4s.reduce((sum, t4) => sum + t4.box_14_employment_income, 0);
    const totalBox16 = t4s.reduce((sum, t4) => sum + t4.box_16_cpp_contributions, 0);
    const totalBox16A = t4s.reduce((sum, t4) => sum + t4.box_16a_cpp2_contributions, 0);
    const totalBox18 = t4s.reduce((sum, t4) => sum + t4.box_18_ei_premiums, 0);
    const totalBox22 = t4s.reduce((sum, t4) => sum + t4.box_22_income_tax_deducted, 0);
    const totalBox24 = t4s.reduce((sum, t4) => sum + t4.box_24_ei_insurable_earnings, 0);
    const totalBox26 = t4s.reduce((sum, t4) => sum + t4.box_26_cpp_pensionable_earnings, 0);

    // Employer contributions (1.4x for EI, 1x for CPP)
    const totalEmployerCPP = totalBox16; // Employer matches employee CPP
    const totalEmployerEI = totalBox18 * 1.4; // Employer pays 1.4x employee EI

    // Export to CSV
    const handleExportCSV = () => {
        const csvRows = [
            ['T4 Summary Report', ''],
            ['Company', companyName],
            ['Tax Year', taxYear.toString()],
            ['Generated', new Date().toLocaleDateString('en-CA')],
            [''],
            ['Summary Totals', ''],
            ['Total Number of T4s', totalT4s.toString()],
            [''],
            ['Box Totals', ''],
            ['Box 14 - Employment Income', formatCurrency(totalBox14)],
            ['Box 16 - CPP Contributions (Employee)', formatCurrency(totalBox16)],
            ['Box 16A - CPP2 Contributions (Employee)', formatCurrency(totalBox16A)],
            ['Box 18 - EI Premiums (Employee)', formatCurrency(totalBox18)],
            ['Box 22 - Income Tax Deducted', formatCurrency(totalBox22)],
            ['Box 24 - EI Insurable Earnings', formatCurrency(totalBox24)],
            ['Box 26 - CPP Pensionable Earnings', formatCurrency(totalBox26)],
            [''],
            ['Employer Contributions', ''],
            ['Employer CPP Contributions', formatCurrency(totalEmployerCPP)],
            ['Employer EI Premiums', formatCurrency(totalEmployerEI)],
            ['Total Employer Contributions', formatCurrency(totalEmployerCPP + totalEmployerEI)],
            [''],
            ['Remittance Total', ''],
            [
                'Total Remittance Owing',
                formatCurrency(totalBox16 + totalBox16A + totalBox18 + totalBox22 + totalEmployerCPP + totalEmployerEI),
            ],
        ];

        const csvContent = csvRows.map((row) => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `T4_Summary_${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${taxYear}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">T4 Summary Report</h2>
                    <p className="text-sm text-muted-foreground">
                        {companyName} - Tax Year {taxYear}
                    </p>
                </div>
                <Button variant="outline" size="sm" icon={Download} onClick={handleExportCSV}>
                    Export CSV
                </Button>
            </div>

            <div className="space-y-6">
                {/* Summary Totals */}
                <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">Summary Totals</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-muted rounded-md">
                            <div className="text-sm text-muted-foreground">Total Number of T4s</div>
                            <div className="text-lg font-semibold text-foreground">{totalT4s}</div>
                        </div>
                    </div>
                </div>

                {/* Box Totals */}
                <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">Box Totals</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-muted rounded-md">
                            <div className="text-sm text-muted-foreground">Box 14 - Employment Income</div>
                            <div className="text-lg font-semibold text-foreground">{formatCurrency(totalBox14)}</div>
                        </div>
                        <div className="p-3 bg-muted rounded-md">
                            <div className="text-sm text-muted-foreground">Box 16 - CPP Contributions (Employee)</div>
                            <div className="text-lg font-semibold text-foreground">{formatCurrency(totalBox16)}</div>
                        </div>
                        <div className="p-3 bg-muted rounded-md">
                            <div className="text-sm text-muted-foreground">
                                Box 16A - CPP2 Contributions (Employee)
                            </div>
                            <div className="text-lg font-semibold text-foreground">{formatCurrency(totalBox16A)}</div>
                        </div>
                        <div className="p-3 bg-muted rounded-md">
                            <div className="text-sm text-muted-foreground">Box 18 - EI Premiums (Employee)</div>
                            <div className="text-lg font-semibold text-foreground">{formatCurrency(totalBox18)}</div>
                        </div>
                        <div className="p-3 bg-muted rounded-md">
                            <div className="text-sm text-muted-foreground">Box 22 - Income Tax Deducted</div>
                            <div className="text-lg font-semibold text-foreground">{formatCurrency(totalBox22)}</div>
                        </div>
                        <div className="p-3 bg-muted rounded-md">
                            <div className="text-sm text-muted-foreground">Box 24 - EI Insurable Earnings</div>
                            <div className="text-lg font-semibold text-foreground">{formatCurrency(totalBox24)}</div>
                        </div>
                        <div className="p-3 bg-muted rounded-md">
                            <div className="text-sm text-muted-foreground">Box 26 - CPP Pensionable Earnings</div>
                            <div className="text-lg font-semibold text-foreground">{formatCurrency(totalBox26)}</div>
                        </div>
                    </div>
                </div>

                {/* Employer Contributions */}
                <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">Employer Contributions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-muted rounded-md">
                            <div className="text-sm text-muted-foreground">Employer CPP Contributions</div>
                            <div className="text-lg font-semibold text-foreground">
                                {formatCurrency(totalEmployerCPP)}
                            </div>
                        </div>
                        <div className="p-3 bg-muted rounded-md">
                            <div className="text-sm text-muted-foreground">Employer EI Premiums</div>
                            <div className="text-lg font-semibold text-foreground">
                                {formatCurrency(totalEmployerEI)}
                            </div>
                        </div>
                        <div className="p-3 bg-muted rounded-md md:col-span-2">
                            <div className="text-sm text-muted-foreground">Total Employer Contributions</div>
                            <div className="text-lg font-semibold text-foreground">
                                {formatCurrency(totalEmployerCPP + totalEmployerEI)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Remittance Total */}
                <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">Remittance Total</h3>
                    <div className="p-4 bg-primary/10 rounded-md border border-primary/20">
                        <div className="text-sm text-muted-foreground mb-1">Total Remittance Owing</div>
                        <div className="text-2xl font-bold text-foreground">
                            {formatCurrency(
                                totalBox16 +
                                    totalBox16A +
                                    totalBox18 +
                                    totalBox22 +
                                    totalEmployerCPP +
                                    totalEmployerEI
                            )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                            Includes: Employee CPP/CPP2/EI + Income Tax + Employer CPP/EI
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}
