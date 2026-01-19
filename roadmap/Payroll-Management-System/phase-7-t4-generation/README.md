# Phase 7: T4 Generation

## Overview

This phase implements T4 (Statement of Remuneration Paid) generation for year-end tax reporting. T4s must be provided to employees by the end of February following the tax year and filed with CRA.

## Prerequisites

- Phase 4-6 complete
- `employee_ytd` table populated with full year data
- `t4_slips` table created (Phase 1)

## T4 Form Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    T4 - STATEMENT OF REMUNERATION PAID                  │
│                              Tax Year 2025                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ EMPLOYER INFORMATION                                                    │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ Name: ABC Company Inc.                                              ││
│ │ Business Number: 123456789 RC0001                                   ││
│ │ Address: 123 Business Street, Toronto, ON M5V 1A1                   ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ EMPLOYEE INFORMATION                                                    │
│ ┌─────────────────────────────────────────────────────────────────────┐│
│ │ Name: SMITH, JOHN                                                   ││
│ │ Social Insurance Number: 123 456 789                                ││
│ │ Address: 456 Employee Ave, Toronto, ON M5V 2B2                      ││
│ │ Province of Employment: Ontario                                      ││
│ └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│ INCOME AND DEDUCTIONS                                                   │
│ ┌───────┬───────────────────────────────────────┬────────────────────┐ │
│ │ Box   │ Description                           │ Amount             │ │
│ ├───────┼───────────────────────────────────────┼────────────────────┤ │
│ │  14   │ Employment income                     │        $52,000.00  │ │
│ │  16   │ Employee's CPP contributions          │         $3,499.80  │ │
│ │  16A  │ Employee's CPP2 contributions         │           $416.00  │ │
│ │  17   │ Employee's QPP contributions          │             $0.00  │ │
│ │  18   │ Employee's EI premiums                │         $1,123.07  │ │
│ │  22   │ Income tax deducted                   │         $8,500.00  │ │
│ │  24   │ EI insurable earnings                 │        $52,000.00  │ │
│ │  26   │ CPP/QPP pensionable earnings          │        $52,000.00  │ │
│ │  44   │ Union dues                            │           $300.00  │ │
│ │  50   │ RPP contributions                     │         $2,600.00  │ │
│ └───────┴───────────────────────────────────────┴────────────────────┘ │
│                                                                         │
│ OTHER INFORMATION                                                       │
│ ┌───────┬───────────────────────────────────────┬────────────────────┐ │
│ │  Box  │ Description                           │ Amount             │ │
│ ├───────┼───────────────────────────────────────┼────────────────────┤ │
│ │  40   │ Other taxable allowances & benefits   │           $600.00  │ │
│ └───────┴───────────────────────────────────────┴────────────────────┘ │
│                                                                         │
│ This information is reported to the Canada Revenue Agency.              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## T4 Box Reference

| Box | Description | Source Field |
|-----|-------------|--------------|
| 14 | Employment income | `gross_earnings` (includes taxable benefits) |
| 16 | Employee's CPP contributions | `cpp_contributions` |
| 16A | Employee's second CPP contributions | `cpp2_contributions` |
| 17 | Employee's QPP contributions | N/A (Quebec only) |
| 18 | Employee's EI premiums | `ei_premiums` |
| 22 | Income tax deducted | `federal_tax + provincial_tax` |
| 24 | EI insurable earnings | `insurable_earnings` |
| 26 | CPP/QPP pensionable earnings | `pensionable_earnings` |
| 44 | Union dues | `union_dues` |
| 46 | Charitable donations | `charitable_donations` |
| 50 | RPP contributions | `rrsp_contributions` |
| 52 | Pension adjustment | If applicable |
| 40 | Other taxable allowances and benefits | `taxable_benefits` |

## Implementation

### 1. T4 Generator Library

Location: `frontend/src/lib/t4Generator.tsx`

```typescript
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

interface T4Data {
    taxYear: number;
    employer: {
        name: string;
        businessNumber: string;
        address: string;
    };
    employee: {
        firstName: string;
        lastName: string;
        sin: string;
        address: string;
        provinceOfEmployment: string;
    };
    boxes: {
        box14: number;  // Employment income
        box16: number;  // CPP contributions
        box16a: number; // CPP2 contributions
        box17: number;  // QPP contributions (always 0 outside Quebec)
        box18: number;  // EI premiums
        box22: number;  // Income tax deducted
        box24: number;  // EI insurable earnings
        box26: number;  // CPP pensionable earnings
        box44?: number; // Union dues
        box46?: number; // Charitable donations
        box50?: number; // RPP contributions
        box52?: number; // Pension adjustment
        box40?: number; // Taxable benefits
    };
}

export function T4Document({ data }: { data: T4Data }) {
    // ... PDF document implementation similar to PayStubDocument
}
```

### 2. T4 Generation Page

Location: `frontend/src/pages/T4Generation.tsx`

**Features:**
- Select tax year
- View all employees with their T4 status
- Generate individual T4s
- Bulk generate all T4s
- Preview T4
- Download individual or bulk (zip)
- Mark as filed

**UI:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ T4 Generation                                             [2025 ▼]     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌───────────────────────────────────────────────────────────────────┐  │
│ │ Tax Year 2025 Summary                                             │  │
│ │ ─────────────────────────────────────────────────────────────     │  │
│ │ Total Employees: 15                                               │  │
│ │ T4s Generated: 12                                                 │  │
│ │ T4s Pending: 3                                                    │  │
│ │ T4s Filed: 0                                                      │  │
│ │                                                                   │  │
│ │ Deadline: February 28, 2026                                       │  │
│ │                                         [Generate All] [Download All]│
│ └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│ ┌───────────────────────────────────────────────────────────────────┐  │
│ │ Employee            │ Box 14      │ Box 22     │ Status  │ Actions│  │
│ ├─────────────────────┼─────────────┼────────────┼─────────┼────────┤  │
│ │ John Smith          │ $52,000.00  │ $8,500.00  │ ✓ Ready │ [↓][👁] │  │
│ │ Jane Doe            │ $48,000.00  │ $7,800.00  │ ✓ Ready │ [↓][👁] │  │
│ │ Bob Wilson          │ $35,000.00  │ $5,200.00  │ ⏳ Pending│ [Gen]  │  │
│ │ ...                 │             │            │         │        │  │
│ └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. T4 Preview Modal

Shows full T4 form with all boxes filled in.

### 4. T4 Summary Report

Generates a summary report for CRA filing:
- Total number of T4s
- Total Box 14 (employment income)
- Total Box 22 (tax deducted)
- Total employer CPP contributions
- Total employer EI premiums

## API Methods

```typescript
// T4 Generation
generateT4(employeeId: number, taxYear: number): Promise<T4Slip>
generateAllT4s(companyId: number, taxYear: number): Promise<T4Slip[]>
regenerateT4(t4Id: number): Promise<T4Slip>

// T4 Retrieval
getT4s(params: { company_id: number; tax_year: number }): Promise<T4Slip[]>
getT4(id: number): Promise<T4Slip>
getEmployeeT4(employeeId: number, taxYear: number): Promise<T4Slip>

// T4 Actions
markT4AsFiled(id: number): Promise<T4Slip>
amendT4(id: number, changes: Partial<T4Boxes>): Promise<T4Slip>

// T4 PDF
getT4PDF(id: number): Promise<Blob>
getAllT4PDFs(companyId: number, taxYear: number): Promise<Blob> // Returns zip
```

## T4 Generation Logic

```typescript
async function generateT4(employeeId: number, taxYear: number): Promise<T4Slip> {
    // 1. Get employee info
    const employee = await getEmployee(employeeId);
    const company = await getCompany(employee.company_id);
    
    // 2. Get YTD data
    const ytd = await getEmployeeYTD(employeeId, taxYear);
    
    // 3. Validate required data
    if (!employee.sin) {
        throw new Error('Employee SIN is required for T4 generation');
    }
    if (!employee.address) {
        throw new Error('Employee address is required for T4 generation');
    }
    
    // 4. Calculate T4 boxes
    const t4Data: T4Boxes = {
        box14: ytd.gross_earnings,
        box16: ytd.cpp_contributions,
        box16a: ytd.cpp2_contributions,
        box17: 0, // QPP - only for Quebec
        box18: ytd.ei_premiums,
        box22: ytd.federal_tax_withheld + ytd.provincial_tax_withheld,
        box24: ytd.insurable_earnings,
        box26: ytd.pensionable_earnings,
        box44: ytd.union_dues || 0,
        box46: ytd.charitable_donations || 0,
        box50: ytd.rrsp_contributions || 0,
        box40: ytd.taxable_benefits || 0,
    };
    
    // 5. Create or update T4 record
    const t4 = await upsertT4({
        company_id: company.id,
        employee_id: employeeId,
        tax_year: taxYear,
        status: 'generated',
        employee_name: `${employee.last_name}, ${employee.first_name}`,
        employee_sin: employee.sin,
        employee_address: employee.address,
        employer_name: company.name,
        employer_bn: company.business_number,
        ...t4Data,
        generated_at: new Date().toISOString(),
    });
    
    return t4;
}
```

## Validation Rules

Before generating T4:

1. **Employee must have SIN** - Cannot file T4 without it
2. **Employee must have address** - Required for T4
3. **Tax year must be complete** - Can only generate after Dec 31
4. **YTD data must exist** - Must have pay run data for the year

## Amended T4s

If a T4 needs to be corrected after filing:

1. Update the T4 record with corrections
2. Mark as 'amended'
3. Generate amended T4 PDF (marked as "AMENDED")
4. Re-file with CRA

## T4 Summary (T4 Summary Slip)

For CRA electronic filing, generate a T4 Summary:

```typescript
interface T4Summary {
    taxYear: number;
    employerName: string;
    businessNumber: string;
    numberOfT4s: number;
    totals: {
        box14: number; // Total employment income
        box16: number; // Total employee CPP
        box16a: number; // Total employee CPP2
        box18: number; // Total employee EI
        box22: number; // Total tax deducted
        box52: number; // Total pension adjustment
    };
    employerContributions: {
        cpp: number;
        ei: number;
    };
    remittanceBalance: number; // What should have been remitted
}
```

## Timeline & Deadlines

| Deadline | Action |
|----------|--------|
| December 31 | Tax year ends |
| January | Generate T4s, verify data |
| February 28 | Deadline to provide T4s to employees |
| February 28 | Deadline to file T4s with CRA (paper) |
| February 28 | Deadline to file T4s with CRA (electronic) |

## CRA Filing Options

This system generates T4 data and PDFs but does not file electronically. Options for employers:

1. **Web Forms** - Enter T4 data manually on CRA website
2. **Internet File Transfer (XML)** - Export XML and upload to CRA
3. **Third-party software** - Export data to compatible software

Consider adding XML export in future enhancement.

## Testing Checklist

- [ ] Generate T4 for single employee
- [ ] Verify all boxes calculate correctly
- [ ] Generate T4s for all employees
- [ ] Preview T4 displays correctly
- [ ] Download individual T4 PDF
- [ ] Download all T4s as zip
- [ ] Verify employee can view their T4
- [ ] Test amended T4 generation
- [ ] Verify YTD totals match T4 boxes
- [ ] Test with missing SIN (should error)
- [ ] Test with missing address (should error)
- [ ] Generate T4 Summary report

## Next Phase

After T4 generation is complete, proceed to **Phase 8: ROE Support** to implement Record of Employment generation.
