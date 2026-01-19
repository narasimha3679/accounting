# Phase 8: ROE Support

## Overview

This phase implements Record of Employment (ROE) data generation. An ROE is required when an employee stops working and experiences an interruption of earnings, regardless of the reason (layoff, termination, resignation, maternity leave, etc.).

## Prerequisites

- Phase 4-7 complete
- Pay run history available
- `roe_records` table created (Phase 1)

## ROE Form Blocks

| Block | Description | Source |
|-------|-------------|--------|
| 1 | Serial number | Generated or manual |
| 2 | Business number | Company BN |
| 3 | Employer name | Company name |
| 4 | Employee SIN | Employee SIN |
| 5 | Employee name | First and last name |
| 6 | Employee address | Employee address |
| 10 | First day worked | Hire date or return date |
| 11 | Last day for which paid | Last pay date |
| 12 | Final pay period end date | Last period end |
| 15A | Total insurable hours | Sum of hours worked |
| 15B | Total insurable earnings | Sum of insurable earnings |
| 15C | Insurable earnings by pay period | Last 27 periods |
| 16 | Reason for issuing | Code (A, E, M, etc.) |
| 17A | Vacation pay | Vacation payout amount |
| 17B | Statutory holiday pay | If applicable |
| 17C | Other monies | Severance, bonuses, etc. |
| 18 | Comments | Additional notes |

## ROE Reason Codes

| Code | Reason | Common Use |
|------|--------|------------|
| A | Shortage of work | Layoff, contract end |
| B | Strike or lockout | Labor dispute |
| D | Illness or injury | Short-term disability |
| E | Quit | Voluntary resignation |
| F | Maternity | Maternity leave |
| G | Retirement | Voluntary retirement |
| K | Other | Not covered by other codes |
| M | Dismissal | Terminated for cause |
| N | Leave of absence | Unpaid leave |
| P | Parental | Parental leave |
| Z | Compassionate care | Caregiver leave |

## Implementation

### 1. ROE Generator Page

Location: `frontend/src/pages/ROEGeneration.tsx`

**Features:**
- Triggered when employee status changes to 'terminated' or 'inactive'
- Or manually initiated
- Pre-fills data from pay history
- Allows editing before finalizing
- Generates printable ROE form

**UI:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Generate Record of Employment                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Employee: John Smith (EMP001)                                           │
│ Status: Terminated                                                      │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ BLOCK 10: First Day Worked                                          ││
│ │ [January 15, 2023    ]                                              ││
│ │                                                                     ││
│ │ BLOCK 11: Last Day For Which Paid                                   ││
│ │ [January 20, 2026    ]                                              ││
│ │                                                                     ││
│ │ BLOCK 12: Final Pay Period Ending Date                              ││
│ │ [January 15, 2026    ]                                              ││
│ │                                                                     ││
│ │ BLOCK 15A: Total Insurable Hours                                    ││
│ │ [4,160.00           ] hours                                         ││
│ │                                                                     ││
│ │ BLOCK 15B: Total Insurable Earnings                                 ││
│ │ [$156,000.00        ]                                               ││
│ │                                                                     ││
│ │ BLOCK 16: Reason for Issuing ROE                                    ││
│ │ [M - Dismissal            ▼]                                        ││
│ │                                                                     ││
│ │ BLOCK 17A: Vacation Pay                                             ││
│ │ [$2,340.00          ] (outstanding balance)                         ││
│ │                                                                     ││
│ │ BLOCK 18: Comments                                                  ││
│ │ [                                                    ]              ││
│ │ [                                                    ]              ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ BLOCK 15C: Insurable Earnings by Pay Period (Last 27 Periods)         │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ PP# │ Period Ending    │ Insurable Earnings │ Hours    │ Edit      ││
│ ├─────┼──────────────────┼────────────────────┼──────────┼───────────┤│
│ │  1  │ Jan 15, 2026     │ $2,000.00          │ 80.00    │ [Edit]    ││
│ │  2  │ Jan 1, 2026      │ $2,000.00          │ 80.00    │ [Edit]    ││
│ │  3  │ Dec 15, 2025     │ $2,000.00          │ 80.00    │ [Edit]    ││
│ │ ... │                  │                    │          │           ││
│ │ 27  │ Dec 15, 2024     │ $1,800.00          │ 72.00    │ [Edit]    ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│                              [Save Draft] [Preview] [Generate ROE]      │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. ROE Data Collection

```typescript
interface ROEInput {
    employeeId: number;
    reasonCode: string;
    lastDayPaid: string;
    finalPayPeriodEnd: string;
    vacationPay?: number;
    otherMonies?: { type: string; amount: number }[];
    comments?: string;
}

async function collectROEData(input: ROEInput): Promise<ROERecord> {
    const employee = await getEmployee(input.employeeId);
    const company = await getCompany(employee.company_id);
    
    // Get last 27 pay periods of data
    const payHistory = await getPayRunItemsForEmployee(input.employeeId, {
        limit: 27,
        orderBy: 'pay_date DESC'
    });
    
    // Calculate totals
    let totalHours = 0;
    let totalInsurableEarnings = 0;
    const payPeriodEarnings: { period_end: string; earnings: number; hours: number }[] = [];
    
    for (const item of payHistory) {
        const hours = item.regular_hours + item.overtime_hours + item.vacation_hours_used;
        const earnings = item.gross_pay; // Insurable earnings = gross pay
        
        totalHours += hours;
        totalInsurableEarnings += earnings;
        
        payPeriodEarnings.push({
            period_end: item.pay_run.pay_period_end,
            earnings,
            hours
        });
    }
    
    // Get vacation balance
    const ytd = await getEmployeeYTD(input.employeeId, new Date().getFullYear());
    const vacationBalance = ytd.vacation_balance;
    
    return {
        company_id: company.id,
        employee_id: input.employeeId,
        status: 'draft',
        first_day_worked: employee.hire_date,
        last_day_paid: input.lastDayPaid,
        final_pay_period_end: input.finalPayPeriodEnd,
        total_insurable_hours: totalHours,
        total_insurable_earnings: totalInsurableEarnings,
        reason_code: input.reasonCode,
        pay_period_earnings: payPeriodEarnings,
        vacation_pay: input.vacationPay || vacationBalance,
        other_monies: input.otherMonies || [],
        comments: input.comments
    };
}
```

### 3. ROE PDF Generator

Location: `frontend/src/lib/roeGenerator.tsx`

Generate a printable ROE form that matches the official CRA format.

```typescript
export function ROEDocument({ data }: { data: ROERecord }) {
    // Generate PDF matching official ROE format
    // Employers can print and submit or use as reference for ROE Web
}
```

### 4. ROE List View

Location: `frontend/src/pages/ROEList.tsx`

Show all generated ROEs with ability to:
- View/Edit drafts
- Generate new ROE
- Download PDF
- Mark as submitted

**UI:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Records of Employment                                    [+ New ROE]    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ Employee        │ Reason     │ Last Day   │ Status    │ Actions    ││
│ ├─────────────────┼────────────┼────────────┼───────────┼────────────┤│
│ │ John Smith      │ M-Dismissal│ Jan 20, 26 │ Draft     │ [Edit][↓]  ││
│ │ Jane Doe        │ E-Quit     │ Dec 15, 25 │ Submitted │ [View][↓]  ││
│ │ Bob Wilson      │ F-Maternity│ Nov 1, 25  │ Submitted │ [View][↓]  ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## API Methods

```typescript
// ROE Management
createROE(input: ROEInput): Promise<ROERecord>
updateROE(id: number, data: Partial<ROERecord>): Promise<ROERecord>
generateROE(id: number): Promise<ROERecord> // Mark as generated
submitROE(id: number): Promise<ROERecord> // Mark as submitted
getROEs(companyId: number): Promise<ROERecord[]>
getROE(id: number): Promise<ROERecord>

// ROE PDF
getROEPDF(id: number): Promise<Blob>

// Auto-collection
collectROEDataForEmployee(employeeId: number): Promise<Partial<ROERecord>>
```

## Integration with Employee Termination

When an employee is terminated:

1. Show prompt: "Generate ROE for this employee?"
2. If yes, redirect to ROE generation page with data pre-filled
3. If no, can generate later from ROE list

```typescript
// In Employees.tsx
const handleTerminateEmployee = async (employee: Employee) => {
    const confirmed = await confirmTermination(employee);
    if (!confirmed) return;
    
    await updateEmployee(employee.id, { status: 'terminated' });
    
    const generateROE = await confirm(
        'Generate ROE?',
        'Would you like to generate a Record of Employment for this employee?'
    );
    
    if (generateROE) {
        navigate(`/payroll/roe/new?employee=${employee.id}`);
    }
};
```

## ROE Web Integration

While this system doesn't submit directly to ROE Web, provide:

1. **Data export** formatted for ROE Web manual entry
2. **XML export** for ROE Web upload (future enhancement)
3. **Instructions** on how to submit via ROE Web

## Block 15C Rules

- List pay periods in reverse chronological order
- Include up to 27 pay periods
- For variable earnings, may need to adjust for "best weeks"
- Statutory holidays during employment should be included

## Validation Rules

1. **First day worked** must be ≤ last day paid
2. **Reason code** is required
3. **Total insurable hours** must be ≥ 0
4. **Pay period earnings** must have at least 1 entry
5. **SIN** must be valid format

## Testing Checklist

- [ ] Create new ROE from terminated employee
- [ ] Pre-filled data is accurate
- [ ] Can edit all ROE fields
- [ ] Can edit pay period earnings
- [ ] Validation errors display correctly
- [ ] Generate ROE PDF
- [ ] Download PDF
- [ ] View list of ROEs
- [ ] Mark ROE as submitted
- [ ] Test all reason codes
- [ ] Verify insurable earnings calculation
- [ ] Verify hours calculation

## Next Phase

After ROE support is complete, proceed to **Phase 9: Reports & Remittances** to implement payroll reports and CRA remittance tracking.
