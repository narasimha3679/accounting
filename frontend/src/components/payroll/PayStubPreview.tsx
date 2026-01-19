import { useState } from 'react';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { PayStubDocument } from '../../lib/payStubGenerator';
import Button from '../ui/Button';
import { Download, Eye, X } from 'lucide-react';
import type { PayRun, PayRunItem, Employee, Company, PayRunItemDeduction } from '../../lib/api';
import type { EmployeeYTD } from '../../lib/payrollTypes';

interface PayStubPreviewProps {
    payRun: PayRun;
    item: PayRunItem;
    employee: Employee;
    company: Company;
    ytd: EmployeeYTD;
    deductions: PayRunItemDeduction[];
}

export function PayStubPreview({
    payRun,
    item,
    employee,
    company,
    ytd,
    deductions,
}: PayStubPreviewProps) {
    const [showPreview, setShowPreview] = useState(false);

    const fileName = `paystub_${employee.employee_id}_${payRun.pay_date.replace(/-/g, '')}.pdf`;

    return (
        <div>
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    icon={Eye}
                    onClick={() => setShowPreview(!showPreview)}
                >
                    {showPreview ? 'Hide Preview' : 'Preview'}
                </Button>

                <PDFDownloadLink
                    document={
                        <PayStubDocument
                            payRun={payRun}
                            item={item}
                            employee={employee}
                            company={company}
                            ytd={ytd}
                            deductions={deductions}
                        />
                    }
                    fileName={fileName}
                >
                    {({ loading }) => (
                        <Button
                            variant="default"
                            size="sm"
                            icon={Download}
                            disabled={loading}
                        >
                            {loading ? 'Generating...' : 'Download PDF'}
                        </Button>
                    )}
                </PDFDownloadLink>
            </div>

            {showPreview && (
                <div className="mt-4 border rounded-lg overflow-hidden bg-white" style={{ height: '600px' }}>
                    <div className="flex items-center justify-between p-2 bg-gray-100 border-b">
                        <span className="text-sm font-medium">Pay Stub Preview</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={X}
                            onClick={() => setShowPreview(false)}
                        >
                            Close
                        </Button>
                    </div>
                    <PDFViewer width="100%" height="100%">
                        <PayStubDocument
                            payRun={payRun}
                            item={item}
                            employee={employee}
                            company={company}
                            ytd={ytd}
                            deductions={deductions}
                        />
                    </PDFViewer>
                </div>
            )}
        </div>
    );
}
