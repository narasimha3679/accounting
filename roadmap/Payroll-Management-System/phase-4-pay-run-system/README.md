# Phase 4: Pay Run System

## Overview

This phase implements the pay run workflow - the core of the payroll system. Users will create pay runs, add employees, preview calculations, and finalize payroll.

## Prerequisites

- Phase 1-3 complete
- PayrollCalculator working and tested
- Payroll settings configured

## Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PAY RUN WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────┐    ┌───────────┐    ┌──────────┐    ┌───────────┐       │
│   │  Draft   │───▶│  Preview  │───▶│ Approved │───▶│ Finalized │       │
│   └──────────┘    └───────────┘    └──────────┘    └───────────┘       │
│        │               │                │                               │
│        ▼               ▼                ▼                               │
│   - Select dates  - Auto-calc all  - Locked for      - YTD updated     │
│   - Add employees - Review totals    editing         - Pay stubs       │
│   - Enter hours   - Make changes   - Ready to pay     generated        │
│   - Add bonuses   - Submit                           - Remittances     │
│                                                        calculated       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## New Pages

### 1. PayRuns List Page

Location: `frontend/src/pages/PayRuns.tsx`

**Features:**
- List all pay runs with status badges
- Filter by status (draft, pending, approved, finalized)
- Filter by date range
- Quick stats: Total payroll this month, YTD
- Create new pay run button

**Table Columns:**
| Column | Description |
|--------|-------------|
| Pay Period | Start - End dates |
| Pay Date | Date employees get paid |
| Status | Badge (Draft/Pending/Approved/Finalized) |
| Employees | Count |
| Gross Pay | Total gross |
| Net Pay | Total net |
| Actions | View, Edit (if draft), Delete (if draft) |

### 2. PayRunDetail Page

Location: `frontend/src/pages/PayRunDetail.tsx`

**Sections:**

#### A. Header Section
- Pay period dates
- Pay date
- Status badge with workflow actions
- Summary stats: Total Gross, Total Deductions, Total Net, Employer Cost

#### B. Employee Table
| Column | Description |
|--------|-------------|
| Employee | Name and ID |
| Regular Hours | Editable input |
| OT Hours | Editable input |
| Gross Pay | Calculated |
| CPP | Calculated |
| EI | Calculated |
| Tax | Federal + Provincial |
| Other Ded. | Benefits/deductions |
| Net Pay | Final amount |
| Actions | View details, Remove |

#### C. Totals Row
- Sum of all columns
- Employer CPP/EI totals

#### D. Action Buttons (based on status)
- **Draft**: "Calculate All", "Add Employee", "Save", "Submit for Approval"
- **Pending Approval**: "Approve", "Return to Draft"
- **Approved**: "Finalize"
- **Finalized**: "View Pay Stubs", "Generate Report"

### 3. PayRunItemDetail Modal

Shows full calculation breakdown for one employee:

```
┌─────────────────────────────────────────────────────────┐
│ Pay Details: John Smith (EMP001)                        │
├─────────────────────────────────────────────────────────┤
│ EARNINGS                                                │
│ ├─ Regular (80 hrs @ $25.00)          $2,000.00        │
│ ├─ Overtime (5 hrs @ $37.50)            $187.50        │
│ ├─ Vacation Pay                            $0.00        │
│ └─ Taxable Benefits                       $50.00        │
│                                                         │
│ GROSS PAY                              $2,237.50        │
├─────────────────────────────────────────────────────────┤
│ DEDUCTIONS                                              │
│ ├─ CPP (5.95%)                          $125.13        │
│ ├─ CPP2 (4.00%)                           $0.00        │
│ ├─ EI (1.63%)                            $36.47        │
│ ├─ Federal Tax                          $287.45        │
│ ├─ Ontario Tax                          $112.34        │
│ ├─ RRSP (Pre-tax)                       $100.00        │
│ └─ Union Dues (Post-tax)                 $25.00        │
│                                                         │
│ TOTAL DEDUCTIONS                         $686.39        │
├─────────────────────────────────────────────────────────┤
│ NET PAY                                $1,551.11        │
├─────────────────────────────────────────────────────────┤
│ EMPLOYER COSTS                                          │
│ ├─ Employer CPP                         $125.13        │
│ └─ Employer EI                           $51.06        │
│                                                         │
│ TOTAL EMPLOYER COST                    $2,413.69        │
├─────────────────────────────────────────────────────────┤
│ YEAR-TO-DATE                                            │
│ ├─ Gross Earnings                     $24,612.50        │
│ ├─ CPP Contributions                   $1,376.43        │
│ ├─ EI Premiums                           $401.17        │
│ └─ Income Tax                          $4,398.69        │
├─────────────────────────────────────────────────────────┤
│ VACATION                                                │
│ ├─ Accrued This Period (4%)              $89.50        │
│ ├─ YTD Accrued                          $984.50        │
│ └─ Balance                               $984.50        │
└─────────────────────────────────────────────────────────┘
```

## Components

### 1. PayRunTable Component

```typescript
interface PayRunTableProps {
    payRuns: PayRun[];
    onView: (id: number) => void;
    onEdit: (id: number) => void;
    onDelete: (id: number) => void;
}
```

### 2. PayRunItemsTable Component

```typescript
interface PayRunItemsTableProps {
    items: PayRunItem[];
    isEditable: boolean;
    onHoursChange: (itemId: number, field: string, value: number) => void;
    onViewDetails: (item: PayRunItem) => void;
    onRemove: (itemId: number) => void;
}
```

### 3. AddEmployeeToPayRun Modal

- Multi-select list of active employees not in run
- Option to auto-pull hours from time entries
- Option to use default hours from settings

### 4. PayRunSummaryCard Component

Shows totals at a glance:
- Total Gross Pay
- Total Deductions breakdown (CPP, EI, Tax, Other)
- Total Net Pay
- Employer Costs (CPP, EI, Total)
- Remittance Amount (employee + employer statutory)

### 5. PayRunStatusBadge Component

Visual indicator with colors:
- Draft: Gray
- Pending Approval: Yellow
- Approved: Blue
- Finalized: Green
- Void: Red

## API Methods

```typescript
// Pay Runs
getPayRuns(params: { 
    company_id: number; 
    status?: string; 
    start_date?: string; 
    end_date?: string;
}): Promise<PayRun[]>

getPayRun(id: number): Promise<PayRun & { items: PayRunItem[] }>

createPayRun(payRun: {
    company_id: number;
    pay_period_start: string;
    pay_period_end: string;
    pay_date: string;
}): Promise<PayRun>

updatePayRun(id: number, data: Partial<PayRun>): Promise<PayRun>
deletePayRun(id: number): Promise<void>

// Pay Run Items
addEmployeeToPayRun(payRunId: number, employeeId: number, hours?: {
    regular: number;
    overtime: number;
}): Promise<PayRunItem>

updatePayRunItem(itemId: number, data: Partial<PayRunItem>): Promise<PayRunItem>
removePayRunItem(itemId: number): Promise<void>

// Calculations
calculatePayRunItem(itemId: number): Promise<PayRunItem>
calculateAllPayRunItems(payRunId: number): Promise<PayRunItem[]>

// Workflow
submitPayRunForApproval(id: number): Promise<PayRun>
approvePayRun(id: number): Promise<PayRun>
returnPayRunToDraft(id: number): Promise<PayRun>
finalizePayRun(id: number): Promise<PayRun>
voidPayRun(id: number, reason: string): Promise<PayRun>
```

## Business Logic

### Creating a Pay Run

1. Select pay period dates (start, end)
2. Select pay date
3. System validates:
   - No overlapping pay runs for same period
   - Pay date is on or after period end
4. Create draft pay run

### Adding Employees

1. Show list of active employees not in run
2. For each employee added:
   - Pull hours from approved time entries for the period (if using time tracking)
   - Or set default hours (8 × work days in period)
   - Load employee's benefits
   - Load employee's current YTD

### Calculating Pay Run

For each employee in the run:

```typescript
async function calculatePayRunItem(item: PayRunItem) {
    // 1. Get employee data
    const employee = await getEmployee(item.employee_id);
    
    // 2. Get YTD data
    const ytd = await getEmployeeYTD(item.employee_id, taxYear);
    
    // 3. Get tax credits
    const taxCredits = await getEmployeeTaxCredits(item.employee_id, taxYear);
    
    // 4. Get benefits
    const benefits = await getEmployeeBenefits(item.employee_id);
    
    // 5. Calculate
    const calculator = await createPayrollCalculator(companyId, taxYear);
    const result = calculator.calculate({
        employee,
        payPeriod: { start: payRun.pay_period_start, end: payRun.pay_period_end },
        hours: {
            regular: item.regular_hours,
            overtime: item.overtime_hours,
            vacation: item.vacation_hours_used,
            // ...
        },
        benefits: calculateBenefitTotals(benefits, result.grossPay),
        ytd,
        taxCredits,
        settings: payrollSettings
    });
    
    // 6. Update pay run item with results
    await updatePayRunItem(item.id, {
        regular_pay: result.regularPay,
        overtime_pay: result.overtimePay,
        gross_pay: result.grossPay,
        cpp_employee: result.cpp.contribution,
        // ... all other fields
    });
    
    return result;
}
```

### Finalizing Pay Run

When a pay run is finalized:

1. **Lock the pay run** - No more edits allowed
2. **Update YTD for all employees**:
   ```typescript
   for (const item of payRunItems) {
       await updateEmployeeYTD(item.employee_id, taxYear, {
           gross_earnings: ytd.gross_earnings + item.gross_pay,
           cpp_contributions: ytd.cpp_contributions + item.cpp_employee,
           ei_premiums: ytd.ei_premiums + item.ei_employee,
           // ... all YTD fields
       });
   }
   ```
3. **Update remittance tracking**:
   - Add to current remittance period
   - Calculate employer portions
4. **Generate pay stubs** (Phase 5)
5. **Record finalization timestamp**

### Voiding a Pay Run

If a finalized pay run needs to be voided (error discovered):

1. Require reason
2. Reverse YTD updates for all employees
3. Reverse remittance tracking
4. Mark as void (don't delete for audit trail)
5. May need to regenerate affected T4s

## Integration with Time Entries

If company uses time tracking (`time_entries` table):

```typescript
async function pullHoursFromTimeEntries(
    employeeId: number, 
    periodStart: string, 
    periodEnd: string
) {
    // Get approved time entries for the period
    const entries = await getTimeEntries({
        employee_id: employeeId,
        start_date: periodStart,
        end_date: periodEnd,
        status: 'approved',
        entry_type: payrollSettings.time_entry_mode
    });
    
    // Calculate totals
    let regularHours = 0;
    let overtimeHours = 0;
    
    // Group by week for overtime calculation
    const weeklyHours = groupByWeek(entries);
    
    for (const [week, weekEntries] of weeklyHours) {
        const totalWeekHours = sumHours(weekEntries);
        if (payrollSettings.overtime_enabled && totalWeekHours > payrollSettings.overtime_threshold_weekly) {
            regularHours += payrollSettings.overtime_threshold_weekly;
            overtimeHours += totalWeekHours - payrollSettings.overtime_threshold_weekly;
        } else {
            regularHours += totalWeekHours;
        }
    }
    
    return { regularHours, overtimeHours };
}
```

## Navigation Integration

Add to main navigation:

```typescript
// In Layout.tsx navigation items
{
    name: 'Payroll',
    href: '/payroll',
    icon: DollarSign,
    children: [
        { name: 'Pay Runs', href: '/payroll/runs' },
        { name: 'Reports', href: '/payroll/reports' },
        { name: 'T4s', href: '/payroll/t4' },
        { name: 'Settings', href: '/settings?tab=payroll' }
    ]
}
```

## UI/UX Considerations

### Quick Actions
- "Start New Pay Run" button prominently displayed
- "Run Payroll" wizard for first-time users

### Warnings & Validations
- Warn if employee has no hours
- Warn if employee missing SIN
- Warn if employee missing tax credits (use defaults)
- Warn if pay date is holiday
- Error if CPP/EI would go negative

### Bulk Actions
- "Calculate All" button
- "Add All Active Employees" option
- Keyboard navigation in hours grid

### Progress Indicators
- Loading state when calculating
- Progress bar for large pay runs
- Success/error toasts

## Testing Checklist

- [ ] Create new pay run
- [ ] Add employees individually
- [ ] Add all employees at once
- [ ] Edit hours in grid
- [ ] Calculate single employee
- [ ] Calculate all employees
- [ ] View calculation details
- [ ] Submit for approval
- [ ] Approve pay run
- [ ] Return to draft
- [ ] Finalize pay run
- [ ] Verify YTD updates
- [ ] Void finalized pay run
- [ ] Verify YTD reversal
- [ ] Pull hours from time entries
- [ ] Handle employee with maxed CPP
- [ ] Handle employee with maxed EI

## Next Phase

After pay run system is complete, proceed to **Phase 5: Pay Stubs** to generate CRA-compliant pay stub PDFs.
