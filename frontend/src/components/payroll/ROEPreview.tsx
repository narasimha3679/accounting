import React from 'react';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { ROEDocument } from '../../lib/roeGenerator';
import Button from '../ui/Button';
import { Download, X } from 'lucide-react';
import type { ROERecord, Employee } from '../../lib/api';
import api from '../../lib/api';

interface ROEPreviewProps {
    roe: ROERecord;
    employee: Employee;
    onClose: () => void;
}

export default function ROEPreview({ roe, employee, onClose }: ROEPreviewProps) {
    const [company, setCompany] = React.useState<any>(null);
    const [loadingCompany, setLoadingCompany] = React.useState(true);

    React.useEffect(() => {
        api.getCompany(roe.company_id)
            .then((comp) => {
                setCompany(comp);
                setLoadingCompany(false);
            })
            .catch(() => {
                setLoadingCompany(false);
            });
    }, [roe.company_id]);

    if (loadingCompany || !company) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full mx-4">
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
                    </div>
                </div>
            </div>
        );
    }

    const fileName = `ROE_${employee.employee_id}_${roe.last_day_paid.replace(/-/g, '')}.pdf`;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-slate-800 rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">ROE Preview</h2>
                    <div className="flex gap-2">
                        <PDFDownloadLink
                            document={<ROEDocument roe={roe} company={company} employee={employee} />}
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
                        <Button variant="ghost" size="sm" icon={X} onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
                <div className="flex-1 border rounded-lg overflow-hidden bg-white" style={{ minHeight: '600px' }}>
                    <PDFViewer width="100%" height="100%">
                        <ROEDocument roe={roe} company={company} employee={employee} />
                    </PDFViewer>
                </div>
            </div>
        </div>
    );
}
