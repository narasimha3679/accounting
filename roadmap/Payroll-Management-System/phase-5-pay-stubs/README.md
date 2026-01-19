# Phase 5: Pay Stubs (PDF Generation)

## Overview

This phase implements CRA-compliant pay stub generation. Pay stubs are generated when a pay run is finalized and can be viewed/downloaded by both employers and employees.

## Prerequisites

- Phase 4 complete (pay runs with calculated items)
- PDF generation library

## Recommended Libraries

### Option 1: @react-pdf/renderer (Recommended)
- React-based PDF generation
- Great for complex layouts
- Good TypeScript support

```bash
npm install @react-pdf/renderer
```

### Option 2: jsPDF + html2canvas
- More lightweight
- Converts HTML to PDF
- Less precise control

### Option 3: Puppeteer (Server-side)
- Supabase Edge Function
- Full HTML/CSS support
- Higher resource usage

**Recommendation**: Use `@react-pdf/renderer` for client-side generation with the option to add server-side generation later for bulk operations.

## Pay Stub Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌─────────────────────────────────┐  ┌───────────────────────────┐│
│  │ COMPANY NAME                    │  │  PAY STUB                 ││
│  │ 123 Business Street             │  │                           ││
│  │ Toronto, ON M5V 1A1             │  │  Pay Period:              ││
│  │ Business #: 123456789 RC0001    │  │  Jan 1 - Jan 15, 2026     ││
│  │                                 │  │                           ││
│  │                                 │  │  Pay Date: Jan 20, 2026   ││
│  └─────────────────────────────────┘  └───────────────────────────┘│
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ EMPLOYEE INFORMATION                                            ││
│  │ John Smith                                                      ││
│  │ Employee ID: EMP001                                             ││
│  │ SIN: ***-***-789                                                ││
│  │ 456 Employee Avenue, Toronto, ON M5V 2B2                        ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ EARNINGS                           CURRENT         YTD          ││
│  │ ─────────────────────────────────────────────────────────────── ││
│  │ Regular (80.00 hrs @ $25.00)       $2,000.00    $24,000.00      ││
│  │ Overtime (5.00 hrs @ $37.50)         $187.50     $1,500.00      ││
│  │ Vacation Pay                           $0.00       $800.00      ││
│  │ Taxable Benefits                      $50.00       $600.00      ││
│  │ ─────────────────────────────────────────────────────────────── ││
│  │ GROSS PAY                          $2,237.50    $26,900.00      ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ DEDUCTIONS                         CURRENT         YTD          ││
│  │ ─────────────────────────────────────────────────────────────── ││
│  │ CPP                                  $125.13     $1,501.56      ││
│  │ CPP2                                   $0.00         $0.00      ││
│  │ EI                                    $36.47       $437.64      ││
│  │ Federal Tax                          $287.45     $3,449.40      ││
│  │ Ontario Tax                          $112.34     $1,348.08      ││
│  │ RRSP Contribution                    $100.00     $1,200.00      ││
│  │ Union Dues                            $25.00       $300.00      ││
│  │ ─────────────────────────────────────────────────────────────── ││
│  │ TOTAL DEDUCTIONS                     $686.39     $8,236.68      ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ NET PAY                            $1,551.11                    ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ VACATION BALANCE                                                ││
│  │ ─────────────────────────────────────────────────────────────── ││
│  │ Accrued This Period                   $89.50                    ││
│  │ Used This Period                       $0.00                    ││
│  │ Current Balance                    $1,076.00                    ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ This pay stub is for informational purposes. Please retain      ││
│  │ for your records. Questions? Contact HR or Payroll.             ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│                                        Generated: Jan 20, 2026      │
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation

### 1. Pay Stub Document Component

Location: `frontend/src/lib/payStubGenerator.tsx`

```tsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { PayRunItem, PayRun, Employee, Company } from './api';

// Register fonts (optional - for better typography)
Font.register({
    family: 'Inter',
    fonts: [
        { src: '/fonts/Inter-Regular.ttf' },
        { src: '/fonts/Inter-Bold.ttf', fontWeight: 'bold' }
    ]
});

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: 'Helvetica'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20
    },
    companyInfo: {
        flex: 1
    },
    payStubTitle: {
        flex: 1,
        textAlign: 'right'
    },
    section: {
        marginBottom: 15,
        border: '1 solid #e0e0e0',
        padding: 10
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333'
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 2
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottom: '1 solid #e0e0e0',
        paddingBottom: 4,
        marginBottom: 4
    },
    label: {
        flex: 2
    },
    current: {
        flex: 1,
        textAlign: 'right'
    },
    ytd: {
        flex: 1,
        textAlign: 'right'
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTop: '1 solid #333',
        paddingTop: 4,
        marginTop: 4,
        fontWeight: 'bold'
    },
    netPay: {
        backgroundColor: '#f0f9ff',
        padding: 15,
        marginBottom: 15
    },
    netPayAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center'
    },
    footer: {
        marginTop: 20,
        fontSize: 8,
        color: '#666',
        textAlign: 'center'
    }
});

interface PayStubProps {
    payRun: PayRun;
    item: PayRunItem;
    employee: Employee;
    company: Company;
    ytd: EmployeeYTD;
    deductions: PayRunItemDeduction[];
}

export function PayStubDocument({ payRun, item, employee, company, ytd, deductions }: PayStubProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD'
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-CA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const maskSIN = (sin: string) => {
        if (!sin) return 'N/A';
        return `***-***-${sin.slice(-3)}`;
    };

    return (
        <Document>
            <Page size="LETTER" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.companyInfo}>
                        <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{company.name}</Text>
                        <Text>Business #: {company.business_number}</Text>
                    </View>
                    <View style={styles.payStubTitle}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>PAY STUB</Text>
                        <Text>Pay Period: {formatDate(payRun.pay_period_start)} - {formatDate(payRun.pay_period_end)}</Text>
                        <Text>Pay Date: {formatDate(payRun.pay_date)}</Text>
                    </View>
                </View>

                {/* Employee Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>EMPLOYEE INFORMATION</Text>
                    <Text style={{ fontWeight: 'bold' }}>{employee.first_name} {employee.last_name}</Text>
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
                                Regular ({item.regular_hours.toFixed(2)} hrs @ {formatCurrency(item.hourly_rate || 0)})
                            </Text>
                            <Text style={styles.current}>{formatCurrency(item.regular_pay)}</Text>
                            <Text style={styles.ytd}>{formatCurrency(ytd.gross_earnings - item.gross_pay + item.regular_pay)}</Text>
                        </View>
                    )}
                    
                    {item.overtime_hours > 0 && (
                        <View style={styles.row}>
                            <Text style={styles.label}>
                                Overtime ({item.overtime_hours.toFixed(2)} hrs @ {formatCurrency(item.overtime_rate || 0)})
                            </Text>
                            <Text style={styles.current}>{formatCurrency(item.overtime_pay)}</Text>
                            <Text style={styles.ytd}>-</Text>
                        </View>
                    )}
                    
                    {item.vacation_pay > 0 && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Vacation Pay</Text>
                            <Text style={styles.current}>{formatCurrency(item.vacation_pay)}</Text>
                            <Text style={styles.ytd}>{formatCurrency(ytd.vacation_used)}</Text>
                        </View>
                    )}
                    
                    {item.taxable_benefits > 0 && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Taxable Benefits</Text>
                            <Text style={styles.current}>{formatCurrency(item.taxable_benefits)}</Text>
                            <Text style={styles.ytd}>{formatCurrency(ytd.taxable_benefits)}</Text>
                        </View>
                    )}
                    
                    <View style={styles.totalRow}>
                        <Text style={styles.label}>GROSS PAY</Text>
                        <Text style={styles.current}>{formatCurrency(item.gross_pay)}</Text>
                        <Text style={styles.ytd}>{formatCurrency(ytd.gross_earnings)}</Text>
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
                    
                    <View style={styles.row}>
                        <Text style={styles.label}>CPP</Text>
                        <Text style={styles.current}>{formatCurrency(item.cpp_employee)}</Text>
                        <Text style={styles.ytd}>{formatCurrency(ytd.cpp_contributions)}</Text>
                    </View>
                    
                    {item.cpp2_employee > 0 && (
                        <View style={styles.row}>
                            <Text style={styles.label}>CPP2</Text>
                            <Text style={styles.current}>{formatCurrency(item.cpp2_employee)}</Text>
                            <Text style={styles.ytd}>{formatCurrency(ytd.cpp2_contributions)}</Text>
                        </View>
                    )}
                    
                    <View style={styles.row}>
                        <Text style={styles.label}>EI</Text>
                        <Text style={styles.current}>{formatCurrency(item.ei_employee)}</Text>
                        <Text style={styles.ytd}>{formatCurrency(ytd.ei_premiums)}</Text>
                    </View>
                    
                    <View style={styles.row}>
                        <Text style={styles.label}>Federal Tax</Text>
                        <Text style={styles.current}>{formatCurrency(item.federal_tax)}</Text>
                        <Text style={styles.ytd}>{formatCurrency(ytd.federal_tax_withheld)}</Text>
                    </View>
                    
                    <View style={styles.row}>
                        <Text style={styles.label}>Provincial Tax</Text>
                        <Text style={styles.current}>{formatCurrency(item.provincial_tax)}</Text>
                        <Text style={styles.ytd}>{formatCurrency(ytd.provincial_tax_withheld)}</Text>
                    </View>
                    
                    {/* Other deductions from benefits */}
                    {deductions.map((ded, index) => (
                        <View key={index} style={styles.row}>
                            <Text style={styles.label}>{ded.description}</Text>
                            <Text style={styles.current}>{formatCurrency(ded.amount)}</Text>
                            <Text style={styles.ytd}>-</Text>
                        </View>
                    ))}
                    
                    <View style={styles.totalRow}>
                        <Text style={styles.label}>TOTAL DEDUCTIONS</Text>
                        <Text style={styles.current}>{formatCurrency(item.total_deductions)}</Text>
                        <Text style={styles.ytd}>-</Text>
                    </View>
                </View>

                {/* Net Pay */}
                <View style={styles.netPay}>
                    <Text style={{ textAlign: 'center', marginBottom: 5 }}>NET PAY</Text>
                    <Text style={styles.netPayAmount}>{formatCurrency(item.net_pay)}</Text>
                </View>

                {/* Vacation Balance */}
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
                        <Text>{formatCurrency(ytd.vacation_balance)}</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>This pay stub is for informational purposes. Please retain for your records.</Text>
                    <Text>Generated: {new Date().toLocaleDateString('en-CA')}</Text>
                </View>
            </Page>
        </Document>
    );
}
```

### 2. Pay Stub Preview Component

Location: `frontend/src/components/payroll/PayStubPreview.tsx`

```tsx
import React from 'react';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { PayStubDocument } from '../../lib/payStubGenerator';
import Button from '../ui/Button';
import { Download, Eye } from 'lucide-react';

interface PayStubPreviewProps {
    payRun: PayRun;
    item: PayRunItem;
    employee: Employee;
    company: Company;
    ytd: EmployeeYTD;
    deductions: PayRunItemDeduction[];
}

export function PayStubPreview({ payRun, item, employee, company, ytd, deductions }: PayStubPreviewProps) {
    const [showPreview, setShowPreview] = React.useState(false);
    
    const fileName = `paystub_${employee.employee_id}_${payRun.pay_date}.pdf`;
    
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
                <div className="mt-4 border rounded-lg overflow-hidden" style={{ height: '600px' }}>
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
```

### 3. Bulk Pay Stub Generation

For generating all pay stubs in a finalized pay run:

```typescript
// In api.ts
async function generateAllPayStubs(payRunId: number): Promise<Blob> {
    // This would be better as a server-side operation
    // For client-side, we can generate individual PDFs and zip them
    
    const payRun = await getPayRun(payRunId);
    const company = await getCompany(payRun.company_id);
    
    const pdfs: { name: string; blob: Blob }[] = [];
    
    for (const item of payRun.items) {
        const employee = item.employee;
        const ytd = await getEmployeeYTD(item.employee_id, new Date(payRun.pay_date).getFullYear());
        const deductions = await getPayRunItemDeductions(item.id);
        
        const blob = await pdf(
            <PayStubDocument
                payRun={payRun}
                item={item}
                employee={employee}
                company={company}
                ytd={ytd}
                deductions={deductions}
            />
        ).toBlob();
        
        pdfs.push({
            name: `paystub_${employee.employee_id}_${payRun.pay_date}.pdf`,
            blob
        });
    }
    
    // Use JSZip to create a zip file
    const zip = new JSZip();
    for (const { name, blob } of pdfs) {
        zip.file(name, blob);
    }
    
    return zip.generateAsync({ type: 'blob' });
}
```

## API Methods

```typescript
// Get pay stub data for an item
getPayStubData(payRunItemId: number): Promise<{
    payRun: PayRun;
    item: PayRunItem;
    employee: Employee;
    company: Company;
    ytd: EmployeeYTD;
    deductions: PayRunItemDeduction[];
}>

// Generate and store pay stub (for record keeping)
generatePayStub(payRunItemId: number): Promise<{ url: string }>

// Get pay stubs for employee
getEmployeePayStubs(employeeId: number, params?: {
    year?: number;
    limit?: number;
}): Promise<PayStub[]>
```

## Storage

Pay stubs can be stored in Supabase Storage for easy retrieval:

```typescript
const storagePath = `paystubs/${company_id}/${tax_year}/${employee_id}/${pay_run_id}.pdf`;
```

Alternatively, generate on-demand since all the data is in the database.

## Employee Access

Employees should be able to:
1. View list of their pay stubs
2. Preview individual pay stubs
3. Download pay stubs as PDF

This will be implemented in Phase 6 (Employee Self-Service).

## Testing Checklist

- [ ] Generate pay stub for single employee
- [ ] Verify all fields display correctly
- [ ] Verify YTD totals are accurate
- [ ] Test with various deduction types
- [ ] Test with overtime
- [ ] Test with vacation pay
- [ ] Test with taxable benefits
- [ ] Download PDF successfully
- [ ] Bulk generate for all employees
- [ ] Zip file downloads correctly
- [ ] PDF displays correctly on mobile
- [ ] SIN is properly masked

## Next Phase

After pay stubs are complete, proceed to **Phase 6: Employee Self-Service** to build the employee portal.
