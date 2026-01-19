# Phase 6: Employee Self-Service

## Overview

This phase enhances the employee dashboard to provide self-service payroll features. Employees will be able to view their pay stubs, YTD information, tax documents, and update their TD1 tax credits.

## Prerequisites

- Phase 5 complete (pay stubs available)
- Existing Employee Dashboard (`EmployeeDashboard.tsx`)
- Employee authentication working

## Current State

The existing `EmployeeDashboard.tsx` shows:
- Welcome message
- Basic salary records (from old salaries table)

## Target State

Enhanced dashboard with:
- Pay stubs list with download
- YTD summary
- T4 access (when available)
- TD1 form (tax credits update)
- Personal info view
- Vacation balance

## New Components

### 1. EmployeePayStubs Component

Location: `frontend/src/components/employee/EmployeePayStubs.tsx`

```typescript
interface EmployeePayStubsProps {
    employeeId: number;
}
```

**Features:**
- List of all pay stubs
- Filter by year
- Preview button (opens modal)
- Download PDF button
- Mobile-responsive cards

**UI:**
```
┌─────────────────────────────────────────────────────────────────┐
│ My Pay Stubs                                        [2026 ▼]    │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Jan 15, 2026                                                │ │
│ │ Pay Period: Jan 1 - Jan 15, 2026                           │ │
│ │                                                             │ │
│ │ Gross: $2,237.50    Net: $1,551.11    [Preview] [Download] │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Jan 1, 2026                                                 │ │
│ │ Pay Period: Dec 16 - Dec 31, 2025                          │ │
│ │                                                             │ │
│ │ Gross: $2,187.50    Net: $1,523.45    [Preview] [Download] │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Showing 2 of 24 pay stubs                     [Load More]       │
└─────────────────────────────────────────────────────────────────┘
```

### 2. EmployeeYTDSummary Component

Location: `frontend/src/components/employee/EmployeeYTDSummary.tsx`

**Features:**
- Current year earnings summary
- Deductions breakdown
- Progress bars for CPP/EI maximums
- Previous year comparison (optional)

**UI:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Year-to-Date Summary (2026)                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ EARNINGS                                                        │
│ ├─ Gross Earnings                              $26,900.00       │
│ ├─ Taxable Benefits                               $600.00       │
│ └─ Total Earnings                              $27,500.00       │
│                                                                 │
│ DEDUCTIONS                                                      │
│ ├─ CPP Contributions          $1,501.56 / $4,237.95   [███░░] │
│ ├─ CPP2 Contributions             $0.00 / $416.00     [░░░░░] │
│ ├─ EI Premiums                  $437.64 / $1,123.07   [██░░░] │
│ ├─ Federal Tax                                     $3,449.40    │
│ ├─ Provincial Tax                                  $1,348.08    │
│ └─ Other Deductions                                $1,500.00    │
│                                                                 │
│ TOTAL DEDUCTIONS                                   $8,236.68    │
│                                                                 │
│ NET PAY (YTD)                                     $19,263.32    │
│                                                                 │
│ VACATION                                                        │
│ ├─ Earned                                          $1,076.00    │
│ ├─ Used                                               $0.00     │
│ └─ Balance                                         $1,076.00    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. EmployeeTD1Form Component

Location: `frontend/src/components/employee/EmployeeTD1Form.tsx`

**Features:**
- View current tax credit claims
- Update federal and provincial TD1 amounts
- Request additional tax withholding
- Claim tax exempt status (with warning)
- Submit changes (takes effect next pay period)

**UI:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Tax Credits (TD1)                                    [Edit]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ FEDERAL TD1 (2026)                                              │
│ ├─ Basic Personal Amount                           $16,129.00   │
│ ├─ Additional Claims                                    $0.00   │
│ └─ Total Claim                                     $16,129.00   │
│                                                                 │
│ ONTARIO TD1 (2026)                                              │
│ ├─ Basic Personal Amount                           $12,399.00   │
│ ├─ Additional Claims                                    $0.00   │
│ └─ Total Claim                                     $12,399.00   │
│                                                                 │
│ ADDITIONAL OPTIONS                                              │
│ ├─ Additional Tax Per Pay Period                       $0.00    │
│ └─ Claim Tax Exempt                                      No     │
│                                                                 │
│ Last Updated: Jan 1, 2026                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Edit Mode:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Update Tax Credits                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ FEDERAL CLAIMS                                                  │
│ Basic Personal Amount: [$16,129.00    ] (2026 default)         │
│ Additional Claims:     [$0.00         ]                         │
│                                                                 │
│ ℹ️ Additional claims may include: spouse/partner amount,        │
│    eligible dependent amount, caregiver amount, disability      │
│    amount, tuition, etc. See TD1 form for details.             │
│                                                                 │
│ PROVINCIAL CLAIMS (Ontario)                                     │
│ Basic Personal Amount: [$12,399.00    ] (2026 default)         │
│ Additional Claims:     [$0.00         ]                         │
│                                                                 │
│ ADDITIONAL OPTIONS                                              │
│ Additional Tax Per Pay: [$0.00        ]                         │
│ ℹ️ Request extra tax withheld each pay period.                  │
│                                                                 │
│ □ I claim tax exempt status (Line 13 of TD1)                   │
│ ⚠️ Only check this if you expect to earn less than your        │
│    total claim amount for the year.                            │
│                                                                 │
│                                        [Cancel] [Save Changes]  │
└─────────────────────────────────────────────────────────────────┘
```

### 4. EmployeeT4Access Component

Location: `frontend/src/components/employee/EmployeeT4Access.tsx`

**Features:**
- List T4s by year
- Download T4 PDF
- View T4 details inline

**UI:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Tax Documents (T4)                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 2025 T4 - Statement of Remuneration Paid                    │ │
│ │                                                             │ │
│ │ Box 14 (Employment Income):        $52,000.00               │ │
│ │ Box 22 (Income Tax Deducted):       $8,500.00               │ │
│ │ Box 16 (CPP Contributions):         $3,500.00               │ │
│ │ Box 18 (EI Premiums):               $1,050.00               │ │
│ │                                                             │ │
│ │                              [View Full T4] [Download PDF]  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ 📋 2026 T4 will be available after year end.                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5. EmployeePersonalInfo Component

Location: `frontend/src/components/employee/EmployeePersonalInfo.tsx`

**Features:**
- View personal info (read-only mostly)
- View/update mailing address
- View employment details

**UI:**
```
┌─────────────────────────────────────────────────────────────────┐
│ My Information                                       [Edit]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ PERSONAL                                                        │
│ ├─ Name                        John Smith                       │
│ ├─ Employee ID                 EMP001                           │
│ ├─ Email                       john.smith@email.com             │
│ └─ Phone                       (416) 555-1234                   │
│                                                                 │
│ MAILING ADDRESS                                                 │
│ 456 Employee Avenue                                             │
│ Toronto, ON M5V 2B2                                            │
│                                                                 │
│ EMPLOYMENT                                                      │
│ ├─ Position                    Software Developer               │
│ ├─ Hire Date                   January 15, 2023                 │
│ ├─ Pay Rate                    $52,000.00 / year (Salary)       │
│ └─ Status                      Active                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Updated Employee Dashboard

Location: Update `frontend/src/pages/EmployeeDashboard.tsx`

**New Layout:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Welcome, John!                                                          │
│ ABC Company Inc.                                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│ │ YTD Gross   │ │ YTD Net     │ │ Vacation    │ │ Last Pay    │        │
│ │ $27,500     │ │ $19,263     │ │ Balance     │ │ $1,551.11   │        │
│ │             │ │             │ │ $1,076.00   │ │ Jan 15      │        │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘        │
│                                                                         │
│ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐│
│ │ Recent Pay Stubs                │ │ Quick Actions                   ││
│ │ ─────────────────────────────── │ │ ─────────────────────────────── ││
│ │ Jan 15, 2026      $1,551.11 [↓]│ │ [📄] View All Pay Stubs         ││
│ │ Jan 1, 2026       $1,523.45 [↓]│ │ [📊] YTD Summary                 ││
│ │ Dec 15, 2025      $1,498.00 [↓]│ │ [📝] Update TD1                  ││
│ │                                 │ │ [📋] View T4                     ││
│ │            [View All]           │ │ [👤] My Information              ││
│ └─────────────────────────────────┘ └─────────────────────────────────┘│
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ CPP Contributions                                                   ││
│ │ $1,501.56 / $4,237.95                                    [███░░░] ││
│ │                                                                     ││
│ │ EI Premiums                                                         ││
│ │ $437.64 / $1,123.07                                      [██░░░░] ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Navigation

Update employee navigation in `Layout.tsx`:

```typescript
const employeeNavItems = [
    { name: 'Dashboard', href: '/employee-dashboard', icon: Home },
    { name: 'Pay Stubs', href: '/employee/pay-stubs', icon: FileText },
    { name: 'YTD Summary', href: '/employee/ytd', icon: BarChart },
    { name: 'Tax Documents', href: '/employee/tax-documents', icon: FileCheck },
    { name: 'My Info', href: '/employee/info', icon: User },
];
```

## New Routes

Add to `App.tsx`:

```typescript
// Employee routes
<Route path="/employee/pay-stubs" element={<EmployeeRoute><EmployeePayStubsPage /></EmployeeRoute>} />
<Route path="/employee/ytd" element={<EmployeeRoute><EmployeeYTDPage /></EmployeeRoute>} />
<Route path="/employee/tax-documents" element={<EmployeeRoute><EmployeeTaxDocumentsPage /></EmployeeRoute>} />
<Route path="/employee/info" element={<EmployeeRoute><EmployeeInfoPage /></EmployeeRoute>} />
```

## API Methods

```typescript
// Employee self-service API methods
getMyPayStubs(params?: { year?: number; limit?: number }): Promise<PayRunItem[]>
getMyYTD(year?: number): Promise<EmployeeYTD>
getMyTaxCredits(year?: number): Promise<EmployeeTaxCredits>
updateMyTaxCredits(year: number, credits: Partial<EmployeeTaxCredits>): Promise<EmployeeTaxCredits>
getMyT4s(): Promise<T4Slip[]>
getMyInfo(): Promise<Employee>
updateMyAddress(address: string): Promise<Employee>
```

## RLS Policies

Ensure employees can only access their own data:

```sql
-- Employee can view own pay run items
CREATE POLICY "Employees can view own pay run items"
    ON pay_run_items FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM employees 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Employee can view and update own tax credits
CREATE POLICY "Employees can manage own tax credits"
    ON employee_tax_credits FOR ALL
    USING (
        employee_id IN (
            SELECT id FROM employees 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Employee can view own T4s
CREATE POLICY "Employees can view own T4s"
    ON t4_slips FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM employees 
            WHERE auth_user_id = auth.uid()
        )
    );
```

## Mobile Experience

All employee self-service features should be fully mobile-responsive:

- Cards stack vertically
- Pay stub list as cards, not table
- TD1 form with mobile-friendly inputs
- Touch-friendly download buttons
- Pull-to-refresh support

## Push Notifications (Optional)

Consider adding push notifications for:
- New pay stub available
- TD1 update reminder (annual)
- T4 available

Integration with existing push notification system.

## Testing Checklist

- [ ] Employee can view dashboard
- [ ] Employee can see recent pay stubs
- [ ] Employee can view all pay stubs
- [ ] Employee can filter pay stubs by year
- [ ] Employee can download pay stub PDF
- [ ] Employee can view YTD summary
- [ ] Employee can see CPP/EI progress
- [ ] Employee can view tax credits
- [ ] Employee can edit tax credits
- [ ] Tax credit changes save correctly
- [ ] Employee can view T4s (if available)
- [ ] Employee can download T4 PDF
- [ ] Employee can view personal info
- [ ] Employee can update address
- [ ] RLS prevents access to other employees' data
- [ ] Mobile views work correctly

## Next Phase

After employee self-service is complete, proceed to **Phase 7: T4 Generation** to implement year-end tax slip generation.
