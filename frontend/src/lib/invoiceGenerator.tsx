/**
 * Invoice PDF Generator
 * 
 * Professional invoice generation using @react-pdf/renderer
 */

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Invoice, InvoiceItem, Client, Company } from './api';

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: 'Helvetica',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    companyInfo: {
        flex: 1,
    },
    invoiceInfo: {
        flex: 1,
        textAlign: 'right',
    },
    companyName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    invoiceTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    invoiceNumber: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    section: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 8,
        textTransform: 'uppercase',
        borderBottom: '1 solid #000',
        paddingBottom: 4,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    infoLabel: {
        fontWeight: 'bold',
        width: 100,
    },
    infoValue: {
        flex: 1,
    },
    itemsTable: {
        marginTop: 10,
        marginBottom: 15,
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottom: '2 solid #000',
        paddingBottom: 8,
        marginBottom: 8,
        fontWeight: 'bold',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottom: '0.5 solid #e0e0e0',
        paddingVertical: 6,
    },
    colDescription: {
        flex: 3,
    },
    colQuantity: {
        flex: 1,
        textAlign: 'right',
    },
    colUnitPrice: {
        flex: 1,
        textAlign: 'right',
    },
    colTotal: {
        flex: 1,
        textAlign: 'right',
        fontWeight: 'bold',
    },
    totalsSection: {
        marginTop: 10,
        alignSelf: 'flex-end',
        width: 250,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    totalLabel: {
        fontWeight: 'bold',
    },
    totalAmount: {
        fontWeight: 'bold',
    },
    grandTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTop: '2 solid #000',
        paddingTop: 8,
        marginTop: 8,
        fontSize: 12,
    },
    grandTotalLabel: {
        fontWeight: 'bold',
        fontSize: 12,
    },
    grandTotalAmount: {
        fontWeight: 'bold',
        fontSize: 12,
    },
    notes: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#f5f5f5',
        fontSize: 9,
    },
    footer: {
        marginTop: 30,
        fontSize: 8,
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
    },
});

interface InvoiceDocumentProps {
    invoice: Invoice;
    client: Client;
    company: Company;
}

export function InvoiceDocument({ invoice, client, company }: InvoiceDocumentProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-CA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const items = invoice.items || [];

    return (
        <Document>
            <Page size="LETTER" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.companyInfo}>
                        <Text style={styles.companyName}>{company.name}</Text>
                        {company.business_number && (
                            <Text>Business #: {company.business_number}</Text>
                        )}
                        {company.hst_number && <Text>HST #: {company.hst_number}</Text>}
                    </View>
                    <View style={styles.invoiceInfo}>
                        <Text style={styles.invoiceTitle}>INVOICE</Text>
                        <Text style={styles.invoiceNumber}>#{invoice.invoice_number}</Text>
                        <Text>Issue Date: {formatDate(invoice.issue_date)}</Text>
                        <Text>Due Date: {formatDate(invoice.due_date)}</Text>
                    </View>
                </View>

                {/* Bill To Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Bill To</Text>
                    <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>{client.name}</Text>
                    {client.contact_person && (
                        <Text style={{ marginBottom: 2 }}>Attn: {client.contact_person}</Text>
                    )}
                    {client.address && (
                        <Text style={{ marginBottom: 2 }}>{client.address}</Text>
                    )}
                    {client.email && (
                        <Text style={{ marginBottom: 2 }}>Email: {client.email}</Text>
                    )}
                    {client.phone && (
                        <Text>Phone: {client.phone}</Text>
                    )}
                </View>

                {/* Invoice Items Table */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Items</Text>
                    <View style={styles.itemsTable}>
                        {/* Table Header */}
                        <View style={styles.tableHeader}>
                            <Text style={styles.colDescription}>Description</Text>
                            <Text style={styles.colQuantity}>Qty</Text>
                            <Text style={styles.colUnitPrice}>Unit Price</Text>
                            <Text style={styles.colTotal}>Total</Text>
                        </View>

                        {/* Table Rows */}
                        {items.map((item: InvoiceItem, index: number) => (
                            <View key={index} style={styles.tableRow}>
                                <Text style={styles.colDescription}>{item.description}</Text>
                                <Text style={styles.colQuantity}>{item.quantity}</Text>
                                <Text style={styles.colUnitPrice}>
                                    {formatCurrency(item.unit_price)}
                                </Text>
                                <Text style={styles.colTotal}>
                                    {formatCurrency(item.total)}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Totals Section */}
                <View style={styles.totalsSection}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Subtotal:</Text>
                        <Text style={styles.totalAmount}>
                            {formatCurrency(invoice.subtotal)}
                        </Text>
                    </View>
                    {invoice.hst_amount > 0 && (
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>HST ({company.hst_rate}%):</Text>
                            <Text style={styles.totalAmount}>
                                {formatCurrency(invoice.hst_amount)}
                            </Text>
                        </View>
                    )}
                    <View style={styles.grandTotal}>
                        <Text style={styles.grandTotalLabel}>TOTAL:</Text>
                        <Text style={styles.grandTotalAmount}>
                            {formatCurrency(invoice.total)}
                        </Text>
                    </View>
                </View>

                {/* Notes/Description */}
                {invoice.description && (
                    <View style={styles.notes}>
                        <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Notes:</Text>
                        <Text>{invoice.description}</Text>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>Thank you for your business!</Text>
                    <Text>
                        Generated: {new Date().toLocaleDateString('en-CA')}
                    </Text>
                </View>
            </Page>
        </Document>
    );
}
