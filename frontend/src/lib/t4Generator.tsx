/**
 * T4 PDF Generator
 * 
 * CRA-compliant T4 (Statement of Remuneration Paid) generation using @react-pdf/renderer
 */

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { T4Slip, Company } from './api';

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: 'Helvetica',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        textTransform: 'uppercase',
    },
    taxYear: {
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 15,
        border: '1 solid #000',
        padding: 10,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 8,
        textTransform: 'uppercase',
        borderBottom: '1 solid #000',
        paddingBottom: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3,
        borderBottom: '0.5 solid #e0e0e0',
    },
    boxLabel: {
        flex: 1,
        fontSize: 9,
    },
    boxNumber: {
        fontWeight: 'bold',
        marginRight: 5,
    },
    boxDescription: {
        flex: 2,
    },
    boxAmount: {
        flex: 1,
        textAlign: 'right',
        fontWeight: 'bold',
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    infoLabel: {
        fontWeight: 'bold',
        width: 120,
    },
    infoValue: {
        flex: 1,
    },
    amendedBadge: {
        backgroundColor: '#ff0000',
        color: '#ffffff',
        padding: 8,
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 12,
        marginBottom: 15,
        textTransform: 'uppercase',
    },
    footer: {
        marginTop: 20,
        fontSize: 8,
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    boxTable: {
        marginTop: 5,
    },
    boxHeader: {
        flexDirection: 'row',
        borderBottom: '1 solid #000',
        paddingBottom: 4,
        marginBottom: 4,
        fontWeight: 'bold',
    },
    boxHeaderLabel: {
        flex: 1,
        fontSize: 9,
    },
    boxHeaderDescription: {
        flex: 2,
        fontSize: 9,
    },
    boxHeaderAmount: {
        flex: 1,
        textAlign: 'right',
        fontSize: 9,
    },
});

interface T4DocumentProps {
    t4: T4Slip;
    company: Company;
}

export function T4Document({ t4 }: T4DocumentProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const formatSIN = (sin: string) => {
        if (!sin) return '';
        const cleaned = sin.replace(/\D/g, '');
        if (cleaned.length !== 9) return sin;
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)}`;
    };

    const isAmended = t4.status === 'amended';

    return (
        <Document>
            <Page size="LETTER" style={styles.page}>
                {/* Title */}
                <Text style={styles.title}>T4 - STATEMENT OF REMUNERATION PAID</Text>
                <Text style={styles.taxYear}>Tax Year {t4.tax_year}</Text>

                {/* Amended Badge */}
                {isAmended && <Text style={styles.amendedBadge}>AMENDED</Text>}

                {/* Employer Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>EMPLOYER INFORMATION</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Name:</Text>
                        <Text style={styles.infoValue}>{t4.employer_name}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Business Number:</Text>
                        <Text style={styles.infoValue}>{t4.employer_bn}</Text>
                    </View>
                    {t4.employer_address && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Address:</Text>
                            <Text style={styles.infoValue}>{t4.employer_address}</Text>
                        </View>
                    )}
                </View>

                {/* Employee Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>EMPLOYEE INFORMATION</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Name:</Text>
                        <Text style={styles.infoValue}>{t4.employee_name}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Social Insurance Number:</Text>
                        <Text style={styles.infoValue}>{formatSIN(t4.employee_sin)}</Text>
                    </View>
                    {t4.employee_address && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Address:</Text>
                            <Text style={styles.infoValue}>{t4.employee_address}</Text>
                        </View>
                    )}
                </View>

                {/* Income and Deductions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>INCOME AND DEDUCTIONS</Text>
                    <View style={styles.boxTable}>
                        <View style={styles.boxHeader}>
                            <Text style={styles.boxHeaderLabel}>Box</Text>
                            <Text style={styles.boxHeaderDescription}>Description</Text>
                            <Text style={styles.boxHeaderAmount}>Amount</Text>
                        </View>

                        {/* Box 14 - Employment Income */}
                        {t4.box_14_employment_income > 0 && (
                            <View style={styles.row}>
                                <Text style={styles.boxLabel}>
                                    <Text style={styles.boxNumber}>14</Text>
                                    <Text>Employment income</Text>
                                </Text>
                                <Text style={styles.boxAmount}>
                                    {formatCurrency(t4.box_14_employment_income)}
                                </Text>
                            </View>
                        )}

                        {/* Box 16 - CPP Contributions */}
                        {t4.box_16_cpp_contributions > 0 && (
                            <View style={styles.row}>
                                <Text style={styles.boxLabel}>
                                    <Text style={styles.boxNumber}>16</Text>
                                    <Text>Employee's CPP contributions</Text>
                                </Text>
                                <Text style={styles.boxAmount}>
                                    {formatCurrency(t4.box_16_cpp_contributions)}
                                </Text>
                            </View>
                        )}

                        {/* Box 16A - CPP2 Contributions */}
                        {t4.box_16a_cpp2_contributions > 0 && (
                            <View style={styles.row}>
                                <Text style={styles.boxLabel}>
                                    <Text style={styles.boxNumber}>16A</Text>
                                    <Text>Employee's CPP2 contributions</Text>
                                </Text>
                                <Text style={styles.boxAmount}>
                                    {formatCurrency(t4.box_16a_cpp2_contributions)}
                                </Text>
                            </View>
                        )}

                        {/* Box 17 - QPP (Quebec only, always 0 for Ontario) */}
                        <View style={styles.row}>
                            <Text style={styles.boxLabel}>
                                <Text style={styles.boxNumber}>17</Text>
                                <Text>Employee's QPP contributions</Text>
                            </Text>
                            <Text style={styles.boxAmount}>{formatCurrency(0)}</Text>
                        </View>

                        {/* Box 18 - EI Premiums */}
                        {t4.box_18_ei_premiums > 0 && (
                            <View style={styles.row}>
                                <Text style={styles.boxLabel}>
                                    <Text style={styles.boxNumber}>18</Text>
                                    <Text>Employee's EI premiums</Text>
                                </Text>
                                <Text style={styles.boxAmount}>
                                    {formatCurrency(t4.box_18_ei_premiums)}
                                </Text>
                            </View>
                        )}

                        {/* Box 22 - Income Tax Deducted */}
                        {t4.box_22_income_tax_deducted > 0 && (
                            <View style={styles.row}>
                                <Text style={styles.boxLabel}>
                                    <Text style={styles.boxNumber}>22</Text>
                                    <Text>Income tax deducted</Text>
                                </Text>
                                <Text style={styles.boxAmount}>
                                    {formatCurrency(t4.box_22_income_tax_deducted)}
                                </Text>
                            </View>
                        )}

                        {/* Box 24 - EI Insurable Earnings */}
                        {t4.box_24_ei_insurable_earnings > 0 && (
                            <View style={styles.row}>
                                <Text style={styles.boxLabel}>
                                    <Text style={styles.boxNumber}>24</Text>
                                    <Text>EI insurable earnings</Text>
                                </Text>
                                <Text style={styles.boxAmount}>
                                    {formatCurrency(t4.box_24_ei_insurable_earnings)}
                                </Text>
                            </View>
                        )}

                        {/* Box 26 - CPP Pensionable Earnings */}
                        {t4.box_26_cpp_pensionable_earnings > 0 && (
                            <View style={styles.row}>
                                <Text style={styles.boxLabel}>
                                    <Text style={styles.boxNumber}>26</Text>
                                    <Text>CPP/QPP pensionable earnings</Text>
                                </Text>
                                <Text style={styles.boxAmount}>
                                    {formatCurrency(t4.box_26_cpp_pensionable_earnings)}
                                </Text>
                            </View>
                        )}

                        {/* Box 44 - Union Dues */}
                        {t4.box_44_union_dues > 0 && (
                            <View style={styles.row}>
                                <Text style={styles.boxLabel}>
                                    <Text style={styles.boxNumber}>44</Text>
                                    <Text>Union dues</Text>
                                </Text>
                                <Text style={styles.boxAmount}>
                                    {formatCurrency(t4.box_44_union_dues)}
                                </Text>
                            </View>
                        )}

                        {/* Box 46 - Charitable Donations */}
                        {t4.box_46_charitable_donations > 0 && (
                            <View style={styles.row}>
                                <Text style={styles.boxLabel}>
                                    <Text style={styles.boxNumber}>46</Text>
                                    <Text>Charitable donations</Text>
                                </Text>
                                <Text style={styles.boxAmount}>
                                    {formatCurrency(t4.box_46_charitable_donations)}
                                </Text>
                            </View>
                        )}

                        {/* Box 50 - RPP Contributions */}
                        {t4.box_50_rpp_contributions > 0 && (
                            <View style={styles.row}>
                                <Text style={styles.boxLabel}>
                                    <Text style={styles.boxNumber}>50</Text>
                                    <Text>RPP contributions</Text>
                                </Text>
                                <Text style={styles.boxAmount}>
                                    {formatCurrency(t4.box_50_rpp_contributions)}
                                </Text>
                            </View>
                        )}

                        {/* Box 52 - Pension Adjustment */}
                        {t4.box_52_pension_adjustment > 0 && (
                            <View style={styles.row}>
                                <Text style={styles.boxLabel}>
                                    <Text style={styles.boxNumber}>52</Text>
                                    <Text>Pension adjustment</Text>
                                </Text>
                                <Text style={styles.boxAmount}>
                                    {formatCurrency(t4.box_52_pension_adjustment)}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Other Information */}
                {((t4.other_info as any)?.box_40_taxable_benefits > 0 ||
                    t4.box_44_union_dues > 0 ||
                    t4.box_46_charitable_donations > 0 ||
                    t4.box_50_rpp_contributions > 0 ||
                    t4.box_52_pension_adjustment > 0) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>OTHER INFORMATION</Text>
                        <View style={styles.boxTable}>
                            {/* Box 40 - Taxable Benefits */}
                            {(t4.other_info as any)?.box_40_taxable_benefits > 0 && (
                                <View style={styles.row}>
                                    <Text style={styles.boxLabel}>
                                        <Text style={styles.boxNumber}>40</Text>
                                        <Text>Other taxable allowances & benefits</Text>
                                    </Text>
                                    <Text style={styles.boxAmount}>
                                        {formatCurrency((t4.other_info as any)?.box_40_taxable_benefits || 0)}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>
                        This information is reported to the Canada Revenue Agency.
                    </Text>
                    {t4.generated_at && (
                        <Text>
                            Generated: {new Date(t4.generated_at).toLocaleDateString('en-CA')}
                        </Text>
                    )}
                    {isAmended && t4.amended_at && (
                        <Text>
                            Amended: {new Date(t4.amended_at).toLocaleDateString('en-CA')}
                        </Text>
                    )}
                </View>
            </Page>
        </Document>
    );
}
