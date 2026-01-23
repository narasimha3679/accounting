import { useState, useEffect } from 'react';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { InvoiceDocument } from '../../lib/invoiceGenerator';
import Button from '../ui/Button';
import { Download, X } from 'lucide-react';
import type { Invoice, Client, Company } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

interface InvoicePreviewProps {
    invoice: Invoice;
    onClose: () => void;
}

export default function InvoicePreview({ invoice, onClose }: InvoicePreviewProps) {
    const [company, setCompany] = useState<Company | null>(null);
    const [client, setClient] = useState<Client | null>(null);

    // Fetch company data
    const { data: companyData } = useQuery({
        queryKey: ['company', invoice.company_id],
        queryFn: () => api.getCompany(invoice.company_id),
        enabled: !!invoice.company_id,
    });

    // Fetch client data if not already loaded
    const { data: clientData } = useQuery({
        queryKey: ['client', invoice.client_id],
        queryFn: () => api.getClient(invoice.client_id),
        enabled: !!invoice.client_id && !invoice.client,
    });

    useEffect(() => {
        if (companyData) {
            setCompany(companyData);
        }
    }, [companyData]);

    useEffect(() => {
        if (invoice.client) {
            setClient(invoice.client);
        } else if (clientData) {
            setClient(clientData);
        }
    }, [invoice.client, clientData]);

    const fileName = `Invoice_${invoice.invoice_number.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    if (!company || !client) {
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
                        <h2 className="text-lg font-semibold text-foreground">Invoice Preview</h2>
                        <p className="text-sm text-muted-foreground">
                            {invoice.invoice_number} - {client.name}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <PDFDownloadLink
                            document={<InvoiceDocument invoice={invoice} client={client} company={company} />}
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
                        <InvoiceDocument invoice={invoice} client={client} company={company} />
                    </PDFViewer>
                </div>
            </div>
        </div>
    );
}
