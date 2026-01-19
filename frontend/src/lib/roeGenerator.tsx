/**
 * ROE PDF Generator
 * 
 * CRA-compliant Record of Employment (ROE) generation using @react-pdf/renderer
 */

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { ROERecord, Company, Employee } from './api';
import { getReasonCodeLabel } from './roeHelpers';

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontSize: 9,
        fontFamily: 'Helvetica',
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    subtitle: {
        fontSize: 10,
        textAlign: 'center',
        marginBottom: 15,
    },
    section: {
        marginBottom: 12,
        border: '1 solid #000',
        padding: 8,
    },
    sectionTitle: {
        fontSize: 9,
        fontWeight: 'bold',
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    block: {
        marginBottom: 8,
        paddingBottom: 6,
        borderBottom: '0.5 solid #e0e0e0',
    },
    blockLabel: {
        fontSize: 8,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    blockValue: {
        fontSize: 9,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    label: {
        fontWeight: 'bold',
        width: 100,
        fontSize: 8,
    },
    value: {
        flex: 1,
        fontSize: 9,
    },
    table: {
        marginTop: 8,
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottom: '1 solid #000',
        paddingBottom: 4,
        marginBottom: 4,
        fontWeight: 'bold',
        fontSize: 8,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 3,
        borderBottom: '0.5 solid #e0e0e0',
        fontSize: 8,
    },
    tableCell: {
        paddingHorizontal: 4,
    },
    tableCellNumber: {
        width: 40,
        textAlign: 'center',
    },
    tableCellDate: {
        width: 80,
    },
    tableCellEarnings: {
        width: 90,
        textAlign: 'right',
    },
    tableCellHours: {
        width: 60,
        textAlign: 'right',
    },
    footer: {
        marginTop: 15,
        fontSize: 7,
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    twoColumn: {
        flexDirection: 'row',
        gap: 20,
    },
    column: {
        flex: 1,
    },
});

interface ROEDocumentProps {
    roe: ROERecord;
    company: Company;
    employee: Employee;
}

export function ROEDocument({ roe, company, employee }: ROEDocumentProps) {
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
            month: 'short',
            day: 'numeric',
        });
    };

    const formatSIN = (sin: string) => {
        if (!sin) return '';
        const cleaned = sin.replace(/\D/g, '');
        if (cleaned.length !== 9) return sin;
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)}`;
    };

    return (
        <Document>
            <Page size="LETTER" style={styles.page}>
                {/* Header */}
                <Text style={styles.title}>Record of Employment</Text>
                {roe.roe_serial_number && (
                    <Text style={styles.subtitle}>Serial Number: {roe.roe_serial_number}</Text>
                )}

                {/* Employer Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Employer Information</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Business Number:</Text>
                        <Text style={styles.value}>{company.business_number}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Employer Name:</Text>
                        <Text style={styles.value}>{company.name}</Text>
                    </View>
                </View>

                {/* Employee Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Employee Information</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>SIN:</Text>
                        <Text style={styles.value}>{formatSIN(employee.sin || '')}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Name:</Text>
                        <Text style={styles.value}>
                            {employee.first_name} {employee.last_name}
                        </Text>
                    </View>
                    {employee.address && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Address:</Text>
                            <Text style={styles.value}>{employee.address}</Text>
                        </View>
                    )}
                </View>

                {/* ROE Blocks */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ROE Information</Text>

                    <View style={styles.twoColumn}>
                        <View style={styles.column}>
                            {/* Block 10 */}
                            <View style={styles.block}>
                                <Text style={styles.blockLabel}>Block 10: First Day Worked</Text>
                                <Text style={styles.blockValue}>{formatDate(roe.first_day_worked)}</Text>
                            </View>

                            {/* Block 11 */}
                            <View style={styles.block}>
                                <Text style={styles.blockLabel}>Block 11: Last Day For Which Paid</Text>
                                <Text style={styles.blockValue}>{formatDate(roe.last_day_paid)}</Text>
                            </View>

                            {/* Block 12 */}
                            <View style={styles.block}>
                                <Text style={styles.blockLabel}>Block 12: Final Pay Period Ending Date</Text>
                                <Text style={styles.blockValue}>
                                    {formatDate(roe.final_pay_period_end)}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.column}>
                            {/* Block 15A */}
                            <View style={styles.block}>
                                <Text style={styles.blockLabel}>Block 15A: Total Insurable Hours</Text>
                                <Text style={styles.blockValue}>
                                    {roe.total_insurable_hours.toFixed(2)} hours
                                </Text>
                            </View>

                            {/* Block 15B */}
                            <View style={styles.block}>
                                <Text style={styles.blockLabel}>Block 15B: Total Insurable Earnings</Text>
                                <Text style={styles.blockValue}>
                                    {formatCurrency(roe.total_insurable_earnings)}
                                </Text>
                            </View>

                            {/* Block 16 */}
                            <View style={styles.block}>
                                <Text style={styles.blockLabel}>Block 16: Reason for Issuing ROE</Text>
                                <Text style={styles.blockValue}>{getReasonCodeLabel(roe.reason_code)}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Block 15C: Pay Period Earnings */}
                {roe.pay_period_earnings && roe.pay_period_earnings.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            Block 15C: Insurable Earnings by Pay Period (Last 27 Periods)
                        </Text>
                        <View style={styles.table}>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableCell, styles.tableCellNumber]}>PP#</Text>
                                <Text style={[styles.tableCell, styles.tableCellDate]}>Period Ending</Text>
                                <Text style={[styles.tableCell, styles.tableCellEarnings]}>
                                    Insurable Earnings
                                </Text>
                                <Text style={[styles.tableCell, styles.tableCellHours]}>Hours</Text>
                            </View>
                            {roe.pay_period_earnings.slice(0, 27).map((period, index) => (
                                <View key={index} style={styles.tableRow}>
                                    <Text style={[styles.tableCell, styles.tableCellNumber]}>
                                        {index + 1}
                                    </Text>
                                    <Text style={[styles.tableCell, styles.tableCellDate]}>
                                        {formatDate(period.period_end)}
                                    </Text>
                                    <Text style={[styles.tableCell, styles.tableCellEarnings]}>
                                        {formatCurrency(period.earnings)}
                                    </Text>
                                    <Text style={[styles.tableCell, styles.tableCellHours]}>
                                        {period.hours.toFixed(2)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Block 17: Vacation Pay and Other Monies */}
                {(roe.vacation_pay > 0 || (roe.other_monies && roe.other_monies.length > 0)) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Block 17: Additional Payments</Text>
                        {roe.vacation_pay > 0 && (
                            <View style={styles.block}>
                                <Text style={styles.blockLabel}>Block 17A: Vacation Pay</Text>
                                <Text style={styles.blockValue}>{formatCurrency(roe.vacation_pay)}</Text>
                            </View>
                        )}
                        {roe.other_monies && roe.other_monies.length > 0 && (
                            <View style={styles.block}>
                                <Text style={styles.blockLabel}>Block 17C: Other Monies</Text>
                                {roe.other_monies.map((money, index) => (
                                    <View key={index} style={styles.row}>
                                        <Text style={styles.value}>
                                            {money.type}: {formatCurrency(money.amount)}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* Block 18: Comments */}
                {roe.comments && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Block 18: Comments</Text>
                        <Text style={styles.blockValue}>{roe.comments}</Text>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>
                        This ROE is for informational purposes. Submit to Service Canada via ROE Web or
                        mail.
                    </Text>
                    <Text style={{ marginTop: 4 }}>
                        Generated: {new Date().toLocaleDateString('en-CA')}
                    </Text>
                </View>
            </Page>
        </Document>
    );
}
