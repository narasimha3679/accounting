import { useState, useEffect } from 'react';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { T4Document } from '../../lib/t4Generator';
import Button from '../ui/Button';
import { Download, X } from 'lucide-react';
import type { T4Slip, Company } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

interface T4PreviewProps {
    t4: T4Slip;
    onClose: () => void;
}

export default function T4Preview({ t4, onClose }: T4PreviewProps) {
    const [company, setCompany] = useState<Company | null>(null);

    // Fetch company data
    const { data: companyData } = useQuery({
        queryKey: ['company', t4.company_id],
        queryFn: () => api.getCompany(t4.company_id),
        enabled: !!t4.company_id,
    });

    useEffect(() => {
        if (companyData) {
            setCompany(companyData);
        }
    }, [companyData]);

    const fileName = `T4_${t4.employee_name.replace(/[^a-zA-Z0-9]/g, '_')}_${t4.tax_year}.pdf`;

    if (!company) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4">
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-emerald"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-background rounded-lg shadow-lg max-w-6xl w-full h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">T4 Preview</h2>
                        <p className="text-sm text-muted-foreground">
                            {t4.employee_name} - {t4.tax_year}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <PDFDownloadLink
                            document={<T4Document t4={t4} company={company} />}
                            fileName={fileName}
                        >
                            {({ loading }) => (
                                <Button
                                    variant="outline"
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

                {/* PDF Viewer */}
                <div className="flex-1 overflow-hidden bg-white">
                    <PDFViewer width="100%" height="100%">
                        <T4Document t4={t4} company={company} />
                    </PDFViewer>
                </div>
            </div>
        </div>
    );
}
