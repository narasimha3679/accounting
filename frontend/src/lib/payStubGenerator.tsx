/**
 * Pay Stub PDF Generator
 * 
 * CRA-compliant pay stub generation using @react-pdf/renderer
 */

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { PayRun, PayRunItem, Employee, Company, PayRunItemDeduction } from './api';
import type { EmployeeYTD } from './payrollTypes';
import { formatLocalDate } from './utils';

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: 'Helvetica',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    companyInfo: {
        flex: 1,
    },
    payStubTitle: {
        flex: 1,
        textAlign: 'right',
    },
    companyName: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    section: {
        marginBottom: 15,
        border: '1 solid #e0e0e0',
        padding: 10,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 2,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottom: '1 solid #e0e0e0',
        paddingBottom: 4,
        marginBottom: 4,
    },
    label: {
        flex: 2,
    },
    current: {
        flex: 1,
        textAlign: 'right',
    },
    ytd: {
        flex: 1,
        textAlign: 'right',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTop: '1 solid #333',
        paddingTop: 4,
        marginTop: 4,
        fontWeight: 'bold',
    },
    netPay: {
        backgroundColor: '#f0f9ff',
        padding: 15,
        marginBottom: 15,
        borderRadius: 4,
    },
    netPayLabel: {
        textAlign: 'center',
        marginBottom: 5,
        fontSize: 11,
        fontWeight: 'bold',
    },
    netPayAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    footer: {
        marginTop: 20,
        fontSize: 8,
        color: '#666',
        textAlign: 'center',
    },
    employeeName: {
        fontWeight: 'bold',
        marginBottom: 2,
    },
});

interface PayStubDocumentProps {
    payRun: PayRun;
    item: PayRunItem;
    employee: Employee;
    company: Company;
    ytd: EmployeeYTD;
    deductions: PayRunItemDeduction[];
}

export function PayStubDocument({
    payRun,
    item,
    employee,
    company,
    ytd,
    deductions,
}: PayStubDocumentProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return formatLocalDate(date, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const maskSIN = (sin: string | null | undefined) => {
        if (!sin) return 'N/A';
        const cleaned = sin.replace(/\D/g, '');
        if (cleaned.length < 3) return 'N/A';
        return `***-***-${cleaned.slice(-3)}`;
    };

    // Calculate YTD values (current period + previous YTD)
    const ytdGross = ytd.gross_earnings || 0;
    const ytdCpp = ytd.cpp_contributions || 0;
    const ytdCpp2 = ytd.cpp2_contributions || 0;
    const ytdEi = ytd.ei_premiums || 0;
    const ytdFederalTax = ytd.federal_tax_withheld || 0;
    const ytdProvincialTax = ytd.provincial_tax_withheld || 0;
    const ytdVacationUsed = ytd.vacation_used || 0;
    const ytdTaxableBenefits = ytd.taxable_benefits || 0;
    const ytdVacationBalance = ytd.vacation_balance || 0;

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
                    <View style={styles.payStubTitle}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>PAY STUB</Text>
                        <Text>
                            Pay Period: {formatDate(payRun.pay_period_start)} -{' '}
                            {formatDate(payRun.pay_period_end)}
                        </Text>
                        <Text>Pay Date: {formatDate(payRun.pay_date)}</Text>
                    </View>
                </View>

                {/* Employee Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>EMPLOYEE INFORMATION</Text>
                    <Text style={styles.employeeName}>
                        {employee.first_name} {employee.last_name}
                    </Text>
                    <Text>Employee ID: {employee.employee_id}</Text>
                    <Text>SIN: {maskSIN(employee.sin)}</Text>
                    {employee.address && <Text>{employee.address}</Text>}
                </View>

                {/* Earnings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>EARNINGS</Text>
                    <View style={styles.headerRow}>
                        <Text style={styles.label}>Description</Text>
                        <Text style={styles.current}>Current</Text>
                        <Text style={styles.ytd}>YTD</Text>
                    </View>

                    {item.regular_hours > 0 && (
                        <View style={styles.row}>
                            <Text style={styles.label}>
                                Regular ({item.regular_hours.toFixed(2)} hrs @{' '}
                                {formatCurrency(item.hourly_rate || 0)})
                            </Text>
                            <Text style={styles.current}>{formatCurrency(item.regular_pay)}</Text>
                            <Text style={styles.ytd}>-</Text>
                        </View>
                    )}

                    {item.overtime_hours > 0 && (
                        <View style={styles.row}>
                            <Text style={styles.label}>
                                Overtime ({item.overtime_hours.toFixed(2)} hrs @{' '}
                                {formatCurrency(item.overtime_rate || 0)})
                            </Text>
                            <Text style={styles.current}>{formatCurrency(item.overtime_pay)}</Text>
                            <Text style={styles.ytd}>-</Text>
                        </View>
                    )}

                    {item.vacation_pay > 0 && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Vacation Pay</Text>
                            <Text style={styles.current}>{formatCurrency(item.vacation_pay)}</Text>
                            <Text style={styles.ytd}>{formatCurrency(ytdVacationUsed)}</Text>
                        </View>
                    )}

                    {item.statutory_holiday_pay > 0 && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Statutory Holiday Pay</Text>
                            <Text style={styles.current}>
                                {formatCurrency(item.statutory_holiday_pay)}
                            </Text>
                            <Text style={styles.ytd}>-</Text>
                        </View>
                    )}

                    {item.other_earnings > 0 && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Other Earnings</Text>
                            <Text style={styles.current}>{formatCurrency(item.other_earnings)}</Text>
                            <Text style={styles.ytd}>-</Text>
                        </View>
                    )}

                    {item.taxable_benefits > 0 && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Taxable Benefits</Text>
                            <Text style={styles.current}>
                                {formatCurrency(item.taxable_benefits)}
                            </Text>
                            <Text style={styles.ytd}>{formatCurrency(ytdTaxableBenefits)}</Text>
                        </View>
                    )}

                    <View style={styles.totalRow}>
                        <Text style={styles.label}>GROSS PAY</Text>
                        <Text style={styles.current}>{formatCurrency(item.gross_pay)}</Text>
                        <Text style={styles.ytd}>{formatCurrency(ytdGross)}</Text>
                    </View>
                </View>

                {/* Deductions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>DEDUCTIONS</Text>
                    <View style={styles.headerRow}>
                        <Text style={styles.label}>Description</Text>
                        <Text style={styles.current}>Current</Text>
                        <Text style={styles.ytd}>YTD</Text>
                    </View>

                    {item.cpp_employee > 0 && (
                        <View style={styles.row}>
                            <Text style={styles.label}>CPP</Text>
                            <Text style={styles.current}>{formatCurrency(item.cpp_employee)}</Text>
                            <Text style={styles.ytd}>{formatCurrency(ytdCpp)}</Text>
                        </View>
                    )}

                    {item.cpp2_employee > 0 && (
                        <View style={styles.row}>
                            <Text style={styles.label}>CPP2</Text>
                            <Text style={styles.current}>{formatCurrency(item.cpp2_employee)}</Text>
                            <Text style={styles.ytd}>{formatCurrency(ytdCpp2)}</Text>
                        </View>
                    )}

                    {item.ei_employee > 0 && (
                        <View style={styles.row}>
                            <Text style={styles.label}>EI</Text>
                            <Text style={styles.current}>{formatCurrency(item.ei_employee)}</Text>
                            <Text style={styles.ytd}>{formatCurrency(ytdEi)}</Text>
                        </View>
                    )}

                    {item.federal_tax > 0 && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Federal Tax</Text>
                            <Text style={styles.current}>{formatCurrency(item.federal_tax)}</Text>
                            <Text style={styles.ytd}>{formatCurrency(ytdFederalTax)}</Text>
                        </View>
                    )}

                    {item.provincial_tax > 0 && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Provincial Tax</Text>
                            <Text style={styles.current}>
                                {formatCurrency(item.provincial_tax)}
                            </Text>
                            <Text style={styles.ytd}>{formatCurrency(ytdProvincialTax)}</Text>
                        </View>
                    )}

                    {/* Other deductions from pay_run_item_deductions */}
                    {deductions
                        .filter((ded) => ded.category !== 'taxable_benefit')
                        .map((ded, index) => (
                            <View key={index} style={styles.row}>
                                <Text style={styles.label}>{ded.description}</Text>
                                <Text style={styles.current}>{formatCurrency(ded.amount)}</Text>
                                <Text style={styles.ytd}>-</Text>
                            </View>
                        ))}

                    <View style={styles.totalRow}>
                        <Text style={styles.label}>TOTAL DEDUCTIONS</Text>
                        <Text style={styles.current}>
                            {formatCurrency(item.total_deductions)}
                        </Text>
                        <Text style={styles.ytd}>-</Text>
                    </View>
                </View>

                {/* Net Pay */}
                <View style={styles.netPay}>
                    <Text style={styles.netPayLabel}>NET PAY</Text>
                    <Text style={styles.netPayAmount}>{formatCurrency(item.net_pay)}</Text>
                </View>

                {/* Vacation Balance */}
                {item.vacation_accrued > 0 || ytdVacationBalance > 0 ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>VACATION BALANCE</Text>
                        <View style={styles.row}>
                            <Text>Accrued This Period</Text>
                            <Text>{formatCurrency(item.vacation_accrued)}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text>Used This Period</Text>
                            <Text>{formatCurrency(item.vacation_pay)}</Text>
                        </View>
                        <View style={[styles.row, { fontWeight: 'bold' }]}>
                            <Text>Current Balance</Text>
                            <Text>{formatCurrency(ytdVacationBalance)}</Text>
                        </View>
                    </View>
                ) : null}

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>
                        This pay stub is for informational purposes. Please retain for your records.
                    </Text>
                    <Text>Questions? Contact HR or Payroll.</Text>
                    <Text>Generated: {new Date().toLocaleDateString('en-CA')}</Text>
                </View>
            </Page>
        </Document>
    );
}
