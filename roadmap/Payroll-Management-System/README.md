# Payroll Management System - Implementation Roadmap

## Overview

This roadmap outlines the implementation of a comprehensive CRA-compliant payroll management system for Canadian corporations. The system will handle all aspects of payroll except actual money transfers (deposits to employees and remittances to CRA).

### What This System Will Do

- Calculate gross-to-net pay with all statutory deductions (CPP, CPP2, EI, federal/provincial income tax)
- Generate CRA-compliant pay stubs (PDF)
- Track year-to-date earnings and deductions
- Generate T4 slips at year-end
- Support benefits and deductions (pre-tax, post-tax, taxable benefits)
- Track vacation accrual and payout
- Calculate overtime pay
- Generate ROE (Record of Employment) data when employees leave
- Track CRA remittance obligations

### What This System Will NOT Do

- Actual direct deposits to employees
- Actual remittance payments to CRA
- EFT/ACH bank integrations

## Current State

| Feature | Status | Location |
|---------|--------|----------|
| Employee Management | ✅ Complete | `employees` table, `Employees.tsx` |
| Employee Data | ✅ Complete | SIN, payrate, payrate_type, hire_date, address |
| Basic Salary Records | ✅ Exists | `salaries` table (will be replaced by pay_runs) |
| Time Tracking | ✅ Complete | `time_entries` table with approval workflow |
| Employee Dashboard | ✅ Basic | `EmployeeDashboard.tsx` |
| Company Settings | ✅ Partial | `companies` table |

## Target State

A full-featured payroll system with:

- **Pay Runs**: Batch payroll processing with preview → approve → finalize workflow
- **Tax Engine**: Automatic calculation of CPP, CPP2, EI, federal tax, Ontario provincial tax
- **YTD Tracking**: Know when employees hit CPP/EI maximums
- **Pay Stubs**: Professional, CRA-compliant PDF generation
- **T4 Generation**: Batch year-end tax slip generation
- **Self-Service**: Employees view pay stubs, YTD info, tax forms
- **Remittance Tracking**: Know what's owed to CRA and when
- **Vacation/Overtime**: Configurable per company

## Implementation Phases

### Phase 1: Database Schema
**Effort**: 2-3 days  
**Risk**: Medium (foundational changes)

New tables for payroll configuration, pay runs, pay stubs, tax rates, benefits, and YTD tracking.

**See**: `phase-1-database-schema/`

### Phase 2: Company Settings & Configuration
**Effort**: 2-3 days  
**Risk**: Low (new settings UI)

Add payroll settings to companies: pay frequency, overtime rules, vacation policy, benefit types.

**See**: `phase-2-company-settings/`

### Phase 3: Tax Calculation Engine
**Effort**: 4-5 days  
**Risk**: High (must be accurate for CRA compliance)

Core tax calculation library for CPP, CPP2, EI, federal tax, Ontario tax. Includes YTD tracking logic.

**See**: `phase-3-tax-calculation-engine/`

### Phase 4: Pay Run System
**Effort**: 4-5 days  
**Risk**: Medium (core payroll workflow)

Create, preview, approve, and finalize pay runs. Batch processing of multiple employees.

**See**: `phase-4-pay-run-system/`

### Phase 5: Pay Stubs (PDF Generation)
**Effort**: 3-4 days  
**Risk**: Low (presentation layer)

CRA-compliant pay stub generation with all required fields, YTD totals, and professional formatting.

**See**: `phase-5-pay-stubs/`

### Phase 6: Employee Self-Service
**Effort**: 2-3 days  
**Risk**: Low (UI enhancements)

Employee portal to view pay stubs, download PDFs, see YTD earnings, update TD1 info.

**See**: `phase-6-employee-self-service/`

### Phase 7: T4 Generation
**Effort**: 3-4 days  
**Risk**: Medium (CRA compliance critical)

Generate T4 slips with all required boxes, batch generation, PDF output.

**See**: `phase-7-t4-generation/`

### Phase 8: ROE Support
**Effort**: 2-3 days  
**Risk**: Low (data export)

Generate Record of Employment data for terminated/laid-off employees.

**See**: `phase-8-roe-support/`

### Phase 9: Reports & Remittances
**Effort**: 2-3 days  
**Risk**: Low (reporting)

Payroll reports, remittance tracking, CRA payment schedules.

**See**: `phase-9-reports-remittances/`

## Total Estimated Effort

| Phase | Days | Risk |
|-------|------|------|
| Phase 1: Database Schema | 2-3 | Medium |
| Phase 2: Company Settings | 2-3 | Low |
| Phase 3: Tax Engine | 4-5 | High |
| Phase 4: Pay Run System | 4-5 | Medium |
| Phase 5: Pay Stubs | 3-4 | Low |
| Phase 6: Employee Self-Service | 2-3 | Low |
| Phase 7: T4 Generation | 3-4 | Medium |
| Phase 8: ROE Support | 2-3 | Low |
| Phase 9: Reports & Remittances | 2-3 | Low |
| **Total** | **25-33 days** | - |

## Dependencies

```
Phase 1 (Database) 
    ↓
Phase 2 (Settings) ──→ Phase 3 (Tax Engine)
                            ↓
                       Phase 4 (Pay Runs)
                            ↓
            ┌───────────────┼───────────────┐
            ↓               ↓               ↓
       Phase 5         Phase 6         Phase 9
      (Pay Stubs)   (Self-Service)   (Reports)
            ↓               ↓
       Phase 7         Phase 8
    (T4 Generation)  (ROE Support)
```

## 2026 Canadian Payroll Constants (Ontario)

These values are used throughout the implementation:

| Constant | Value | Notes |
|----------|-------|-------|
| CPP Rate (Employee) | 5.95% | On pensionable earnings above basic exemption |
| CPP Rate (Employer) | 5.95% | Matched by employer |
| CPP2 Rate | 4.00% | On earnings between YMPE and YAMPE |
| CPP Basic Exemption | $3,500/year | Pro-rated per pay period |
| YMPE | $74,600 | Year's Maximum Pensionable Earnings |
| YAMPE | $85,000 | Year's Additional Maximum Pensionable Earnings |
| EI Rate (Employee) | 1.63% | On insurable earnings |
| EI Rate (Employer) | 2.282% | 1.4x employee rate |
| EI Max Insurable | $68,900 | Maximum insurable earnings |
| Federal Tax Rate 1 | 14.00% | $0 - $58,523 |
| Federal Tax Rate 2 | 20.50% | $58,524 - $117,037 |
| Federal Tax Rate 3 | 26.00% | $117,038 - $161,087 |
| Federal Tax Rate 4 | 29.00% | $161,088 - $246,752 |
| Federal Tax Rate 5 | 33.00% | Over $246,752 |
| Ontario Tax Rate 1 | 5.05% | $0 - $51,446 |
| Ontario Tax Rate 2 | 9.15% | $51,447 - $102,894 |
| Ontario Tax Rate 3 | 11.16% | $102,895 - $150,000 |
| Ontario Tax Rate 4 | 12.16% | $150,001 - $220,000 |
| Ontario Tax Rate 5 | 13.16% | Over $220,000 |
| Ontario Surtax Threshold 1 | $5,554 | 20% surtax on provincial tax above this |
| Ontario Surtax Threshold 2 | $7,108 | Additional 36% surtax above this |
| Vacation Pay (Ontario) | 4% min | 6% after 5 years |
| Overtime (Ontario) | 1.5x | After 44 hours/week |

## Success Criteria

- [ ] Pay runs can be created, previewed, approved, and finalized
- [ ] All statutory deductions calculate correctly (CPP, CPP2, EI, income tax)
- [ ] YTD tracking stops deductions when maximums reached
- [ ] Pay stubs are CRA-compliant and professional
- [ ] Employees can view their pay stubs and YTD info
- [ ] T4s can be generated at year-end with all required boxes
- [ ] ROE data can be exported for terminated employees
- [ ] Remittance obligations are tracked and visible
- [ ] Benefits (taxable and non-taxable) are supported
- [ ] Vacation accrual and overtime are calculated correctly

## Integration with Multi-Owner Business Support

This payroll system is designed to work with the planned Multi-Owner Business Support feature:

- All payroll tables include `company_id` for multi-company isolation
- RLS policies will use the same patterns as existing company-scoped tables
- When Multi-Owner is implemented, payroll will automatically work with company switching
- No additional changes needed - the architecture is already multi-company ready

## Notes

- All monetary values stored as `NUMERIC(12,2)` for precision
- All dates/times stored in UTC
- Tax calculations follow CRA's Payroll Deductions Tables (T4032)
- Province is stored per employee (defaults to Ontario, extensible for future provinces)
- Tax rates table allows easy updates for future years (2027, 2028, etc.)
