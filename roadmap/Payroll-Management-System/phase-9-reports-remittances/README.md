# Phase 9: Reports & Remittances

## Overview

This phase implements payroll reports and CRA remittance tracking. These tools help employers understand their payroll costs and ensure they meet their remittance obligations.

## Prerequisites

- Phase 4-8 complete
- Pay run data available
- `remittance_periods` table created (Phase 1)

## Reports

### 1. Payroll Summary Report

Summary of payroll for a date range.

**Parameters:**
- Date range (start/end)
- Group by: Pay period, Month, Quarter, Year

**Output:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ PAYROLL SUMMARY REPORT                                                  │
│ Period: January 1, 2026 - March 31, 2026 (Q1)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ EARNINGS                                                                │
│ ─────────────────────────────────────────────────────────────           │
│ Regular Wages                                          $156,000.00      │
│ Overtime                                                $12,500.00      │
│ Vacation Pay                                             $6,240.00      │
│ Taxable Benefits                                         $3,600.00      │
│                                                         ───────────     │
│ TOTAL GROSS PAY                                        $178,340.00      │
│                                                                         │
│ EMPLOYEE DEDUCTIONS                                                     │
│ ─────────────────────────────────────────────────────────────           │
│ CPP Contributions                                       $10,061.42      │
│ CPP2 Contributions                                       $1,248.00      │
│ EI Premiums                                              $2,906.94      │
│ Federal Income Tax                                      $28,534.40      │
│ Provincial Income Tax                                   $11,156.33      │
│ Pre-tax Deductions (RRSP, etc.)                         $7,800.00      │
│ Post-tax Deductions                                      $1,950.00      │
│                                                         ───────────     │
│ TOTAL DEDUCTIONS                                        $63,657.09      │
│                                                                         │
│ NET PAY                                                $114,682.91      │
│                                                                         │
│ EMPLOYER COSTS                                                          │
│ ─────────────────────────────────────────────────────────────           │
│ Employer CPP                                            $10,061.42      │
│ Employer EI                                              $4,069.72      │
│                                                         ───────────     │
│ TOTAL EMPLOYER COST                                    $192,471.14      │
│                                                                         │
│ REMITTANCE SUMMARY                                                      │
│ ─────────────────────────────────────────────────────────────           │
│ CPP (Employee + Employer)                               $20,122.84      │
│ EI (Employee + Employer)                                 $6,976.66      │
│ Income Tax Withheld                                     $39,690.73      │
│                                                         ───────────     │
│ TOTAL REMITTANCE                                        $66,790.23      │
│                                                                         │
│ Number of Pay Runs: 6                                                   │
│ Number of Employees Paid: 15                                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. Employee Earnings Report

Detailed earnings by employee.

**Parameters:**
- Date range
- Employee filter (optional)
- Sort by: Name, Employee ID, Earnings

**Output:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ EMPLOYEE EARNINGS REPORT                                                │
│ Period: January 1, 2026 - March 31, 2026                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Employee       │ Regular    │ OT       │ Gross     │ Net       │ Hours  │
│ ───────────────┼────────────┼──────────┼───────────┼───────────┼────────│
│ John Smith     │ $12,000.00 │ $937.50  │ $12,937.50│ $9,123.45 │ 500.0  │
│ Jane Doe       │ $11,200.00 │ $0.00    │ $11,200.00│ $7,890.12 │ 480.0  │
│ Bob Wilson     │ $10,400.00 │ $750.00  │ $11,150.00│ $7,845.67 │ 470.0  │
│ ...            │            │          │           │           │        │
│ ───────────────┼────────────┼──────────┼───────────┼───────────┼────────│
│ TOTALS         │$156,000.00 │$12,500.00│$178,340.00│$114,682.91│7,200.0 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. Deductions Report

Breakdown of all deductions.

**Parameters:**
- Date range
- Deduction type filter

**Output:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ DEDUCTIONS REPORT                                                       │
│ Period: January 1, 2026 - March 31, 2026                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ STATUTORY DEDUCTIONS                                                    │
│ Employee       │ CPP       │ CPP2     │ EI       │ Fed Tax  │ Prov Tax │
│ ───────────────┼───────────┼──────────┼──────────┼──────────┼──────────│
│ John Smith     │ $770.28   │ $0.00    │ $210.89  │ $2,199.00│ $859.68  │
│ Jane Doe       │ $666.76   │ $0.00    │ $182.56  │ $1,904.00│ $744.24  │
│ ...            │           │          │          │          │          │
│ ───────────────┼───────────┼──────────┼──────────┼──────────┼──────────│
│ TOTALS         │$10,061.42 │$1,248.00 │$2,906.94 │$28,534.40│$11,156.33│
│                                                                         │
│ OTHER DEDUCTIONS                                                        │
│ Deduction Type │ Employee Count │ Total Amount                         │
│ ───────────────┼────────────────┼─────────────────                      │
│ RRSP           │ 12             │ $7,200.00                             │
│ Health Benefits│ 15             │ $1,500.00                             │
│ Union Dues     │ 8              │ $600.00                               │
│ Parking        │ 5              │ $450.00                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4. Payroll Journal Entry Report

For accounting integration.

**Output:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ PAYROLL JOURNAL ENTRY                                                   │
│ Pay Period: January 1-15, 2026    Pay Date: January 20, 2026           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Account                          │ Debit        │ Credit               │
│ ─────────────────────────────────┼──────────────┼──────────────────────│
│ Wages Expense                    │ $28,000.00   │                      │
│ Overtime Expense                 │ $2,100.00    │                      │
│ Vacation Pay Expense             │ $1,040.00    │                      │
│ Benefits Expense                 │ $600.00      │                      │
│ CPP Expense (Employer)           │ $1,677.00    │                      │
│ EI Expense (Employer)            │ $678.00      │                      │
│   CPP Payable                    │              │ $3,354.00            │
│   EI Payable                     │              │ $1,161.00            │
│   Federal Tax Payable            │              │ $4,756.00            │
│   Provincial Tax Payable         │              │ $1,860.00            │
│   RRSP Payable                   │              │ $1,200.00            │
│   Wages Payable / Cash           │              │ $21,764.00           │
│ ─────────────────────────────────┼──────────────┼──────────────────────│
│ TOTALS                           │ $34,095.00   │ $34,095.00           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Remittance Tracking

### Remittance Dashboard

Location: `frontend/src/pages/PayrollRemittances.tsx`

**Features:**
- Current period remittance summary
- Upcoming due dates
- History of remittances
- Record payment

**UI:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ CRA Remittances                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ CURRENT PERIOD                                        Due: Feb 15, 2026│
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ Period: January 2026                                                ││
│ │                                                                     ││
│ │ CPP Contributions (Employee)              $3,353.81                 ││
│ │ CPP Contributions (Employer)              $3,353.81                 ││
│ │ CPP2 Contributions (Employee)               $416.00                 ││
│ │ EI Premiums (Employee)                      $968.98                 ││
│ │ EI Premiums (Employer)                    $1,356.57                 ││
│ │ Income Tax Withheld                      $13,230.24                 ││
│ │                                           ───────────               ││
│ │ TOTAL REMITTANCE DUE                     $22,679.41                 ││
│ │                                                                     ││
│ │                                          [Record Payment]           ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ REMITTANCE SCHEDULE                                                     │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ Your remitter type: Regular                                         ││
│ │ Remittances are due by the 15th of the following month.            ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ PAYMENT HISTORY                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ Period      │ Due Date   │ Amount      │ Paid Date  │ Status       ││
│ ├─────────────┼────────────┼─────────────┼────────────┼──────────────┤│
│ │ Dec 2025    │ Jan 15, 26 │ $21,234.56  │ Jan 14, 26 │ ✓ Paid       ││
│ │ Nov 2025    │ Dec 15, 25 │ $20,987.32  │ Dec 12, 25 │ ✓ Paid       ││
│ │ Oct 2025    │ Nov 15, 25 │ $21,456.78  │ Nov 15, 25 │ ✓ Paid       ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Record Payment Modal

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Record Remittance Payment                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Period: January 2026                                                    │
│ Amount Due: $22,679.41                                                  │
│                                                                         │
│ Amount Paid: [$22,679.41        ]                                       │
│ Payment Date: [February 14, 2026]                                       │
│ Confirmation #: [RC1234567890   ]                                       │
│ Notes: [                        ]                                       │
│                                                                         │
│                                        [Cancel] [Record Payment]        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Remittance Calculator

When a pay run is finalized:

```typescript
async function updateRemittancePeriod(payRun: PayRun) {
    // Determine remittance period based on pay date
    const payDate = new Date(payRun.pay_date);
    const periodStart = new Date(payDate.getFullYear(), payDate.getMonth(), 1);
    const periodEnd = new Date(payDate.getFullYear(), payDate.getMonth() + 1, 0);
    
    // Calculate due date based on remitter type
    const settings = await getPayrollSettings(payRun.company_id);
    const dueDate = calculateDueDate(periodEnd, settings.remitter_type);
    
    // Get or create remittance period
    let period = await getRemittancePeriod(payRun.company_id, periodStart, periodEnd);
    
    if (!period) {
        period = await createRemittancePeriod({
            company_id: payRun.company_id,
            period_start: periodStart,
            period_end: periodEnd,
            due_date: dueDate,
            status: 'pending'
        });
    }
    
    // Add pay run amounts
    await updateRemittancePeriod(period.id, {
        cpp_employee: period.cpp_employee + payRun.total_cpp,
        cpp_employer: period.cpp_employer + payRun.total_employer_cpp,
        ei_employee: period.ei_employee + payRun.total_ei,
        ei_employer: period.ei_employer + payRun.total_employer_ei,
        income_tax: period.income_tax + payRun.total_federal_tax + payRun.total_provincial_tax,
        total_owing: calculateTotal(period)
    });
}

function calculateDueDate(periodEnd: Date, remitterType: string): Date {
    const nextMonth = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 1);
    
    switch (remitterType) {
        case 'quarterly':
            // Due by end of month following quarter
            return new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);
        case 'regular':
            // Due by 15th of following month
            return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15);
        case 'threshold1':
            // Due by 25th of same month (for payments before 16th)
            return new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 25);
        case 'threshold2':
            // Multiple due dates per month
            return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 10);
        default:
            return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15);
    }
}
```

## API Methods

```typescript
// Reports
getPayrollSummaryReport(params: {
    company_id: number;
    start_date: string;
    end_date: string;
    group_by?: 'period' | 'month' | 'quarter' | 'year';
}): Promise<PayrollSummaryReport>

getEmployeeEarningsReport(params: {
    company_id: number;
    start_date: string;
    end_date: string;
    employee_id?: number;
}): Promise<EmployeeEarningsReport>

getDeductionsReport(params: {
    company_id: number;
    start_date: string;
    end_date: string;
}): Promise<DeductionsReport>

getPayrollJournalEntry(payRunId: number): Promise<JournalEntry>

// Remittances
getRemittancePeriods(companyId: number): Promise<RemittancePeriod[]>
getCurrentRemittancePeriod(companyId: number): Promise<RemittancePeriod>
recordRemittancePayment(id: number, payment: RemittancePayment): Promise<RemittancePeriod>

// Export
exportReportPDF(reportType: string, params: object): Promise<Blob>
exportReportCSV(reportType: string, params: object): Promise<Blob>
```

## Report Export Options

All reports should support:
- **View on screen** (default)
- **Export to PDF** (formatted for printing)
- **Export to CSV/Excel** (for further analysis)

## Integration with Dashboard

Add payroll widgets to main dashboard:

```typescript
// Payroll Quick Stats
- Next pay date: Jan 31, 2026
- Pay runs pending: 1
- Remittance due: Feb 15 ($22,679.41)

// Payroll Alerts
- ⚠️ 2 employees missing tax credits
- ⚠️ Remittance due in 5 days
```

## Testing Checklist

- [ ] Generate payroll summary report
- [ ] Verify report totals match pay run totals
- [ ] Generate employee earnings report
- [ ] Filter by employee works
- [ ] Generate deductions report
- [ ] Generate journal entry
- [ ] Verify debits = credits
- [ ] View remittance dashboard
- [ ] Current period shows correctly
- [ ] Record remittance payment
- [ ] Payment history displays
- [ ] Overdue remittances highlighted
- [ ] Export report to PDF
- [ ] Export report to CSV

## Completion

This completes the Payroll Management System roadmap. After all phases are implemented:

1. **Comprehensive testing** with real-world scenarios
2. **User documentation** for administrators and employees
3. **Training materials** for payroll staff
4. **Go-live checklist** for production deployment

## Future Enhancements

Consider for future versions:
- CRA electronic filing integration
- Direct deposit file generation (CPA-005 format)
- Multiple province support
- Contractor payments (T4A)
- Pension plan integration
- Time off request workflow
- Scheduled automatic pay runs
- Email notifications for pay stubs
