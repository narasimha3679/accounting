---
name: Fiscal Year and HST Filing Schedule Support
overview: Add comprehensive support for different fiscal year periods and HST filing schedules throughout the application. This includes database schema updates, utility functions for fiscal year calculations, and updates to all pages that filter or display data by date periods.
todos:
  - id: db-schema
    content: Add HST filing schedule fields to companies table via migration (hst_filing_frequency, hst_filing_period_start)
    status: completed
  - id: fiscal-utils
    content: Create fiscalYear.ts utility module with functions for fiscal year calculations
    status: completed
  - id: hst-utils
    content: Create hstPeriods.ts utility module for HST filing period calculations
    status: completed
    dependencies:
      - fiscal-utils
  - id: settings-page
    content: Update Settings page to include HST filing frequency selector and fiscal year display
    status: completed
    dependencies:
      - db-schema
  - id: onboarding-page
    content: Update CompanyOnboarding to collect HST filing frequency during setup
    status: completed
    dependencies:
      - db-schema
  - id: dashboard-update
    content: Update Dashboard to use fiscal year calculations instead of calendar year
    status: completed
    dependencies:
      - fiscal-utils
  - id: reports-update
    content: Update Reports page to use fiscal year filtering and add HST period breakdown
    status: completed
    dependencies:
      - fiscal-utils
      - hst-utils
  - id: tax-calculator-update
    content: Update TaxCalculator to use fiscal year instead of calendar year
    status: completed
    dependencies:
      - fiscal-utils
  - id: expenses-update
    content: Update Expenses page to filter by fiscal year periods
    status: completed
    dependencies:
      - fiscal-utils
  - id: invoices-update
    content: Update Invoices page to use fiscal year for invoice numbering
    status: completed
    dependencies:
      - fiscal-utils
  - id: api-update
    content: Update API layer to use fiscal year utilities in invoice creation and report generation
    status: completed
    dependencies:
      - fiscal-utils
      - hst-utils
  - id: other-pages-update
    content: Update remaining pages (Investments, Dividends, Salary, OwnerPayments, CapitalAssets) to use fiscal year filtering
    status: completed
    dependencies:
      - fiscal-utils
---

# Fiscal Year and HST Filing S

chedule Support

## Overview

The application currently assumes all companies use calendar year (Jan 1 - Dec 31) and doesn't support different HST filing schedules. This plan adds comprehensive support for:

- Custom fiscal year periods (e.g., April 1 - March 31, July 1 - June 30)
- Different HST filing frequencies (monthly, quarterly, annual)
- Proper date filtering and reporting based on fiscal periods

## Database Schema Changes

### 1. Add HST Filing Schedule to Companies Table

- Add `hst_filing_frequency` field: `'monthly' | 'quarterly' | 'annual'` (default: 'annual')
- Add `hst_filing_period_start` field: date (optional, for custom periods)
- Migration: `add_hst_filing_schedule_to_companies`

## Utility Functions

### 2. Create Fiscal Year Utilities (`frontend/src/lib/fiscalYear.ts`)

Create utility functions for:

- `getFiscalYear(date, fiscalYearEnd)`: Get fiscal year number for a given date
- `getFiscalYearRange(fiscalYear, fiscalYearEnd)`: Get start/end dates for a fiscal year
- `getFiscalYearFromDate(date, fiscalYearEnd)`: Determine which fiscal year a date belongs to
- `getFiscalPeriods(fiscalYearEnd, startDate, endDate)`: Get all fiscal periods in a date range
- `isDateInFiscalYear(date, fiscalYear, fiscalYearEnd)`: Check if date is in a fiscal year

### 3. Create HST Period Utilities (`frontend/src/lib/hstPeriods.ts`)

Create utility functions for:

- `getHSTPeriods(filingFrequency, fiscalYearEnd, startDate, endDate)`: Get HST filing periods
- `getHSTPeriodForDate(date, filingFrequency, fiscalYearEnd)`: Get HST period for a date
- `getHSTPeriodRange(period, filingFrequency, fiscalYearEnd)`: Get date range for an HST period

## Frontend Updates

### 4. Update Company Settings (`frontend/src/pages/Settings.tsx`)

- Add HST filing frequency selector (monthly/quarterly/annual)
- Display current fiscal year end date
- Show fiscal year information clearly

### 5. Update Company Onboarding (`frontend/src/pages/CompanyOnboarding.tsx`)

- Add HST filing frequency field during setup
- Validate fiscal year end date

### 6. Update Dashboard (`frontend/src/pages/Dashboard.tsx`)

- Replace calendar year logic with fiscal year calculations
- Use `getFiscalYearRange()` for date filtering
- Display fiscal year period in UI
- Update time period selector to show fiscal periods

### 7. Update Reports Page (`frontend/src/pages/Reports.tsx`)

- Replace `selectedYear` with fiscal year selection
- Use fiscal year utilities for all date filtering
- Update all queries to filter by fiscal year periods
- Add HST period breakdown based on filing frequency
- Update PDF generation to use fiscal periods

### 8. Update Tax Calculator (`frontend/src/pages/TaxCalculator.tsx`)

- Replace calendar year logic with fiscal year
- Use fiscal year utilities for date ranges
- Update fiscal year calculation in useMemo
- Filter investment income/sales by fiscal year properly

### 9. Update Expenses Page (`frontend/src/pages/Expenses.tsx`)

- Replace calendar year filtering with fiscal year
- Update date range calculations

### 10. Update Income Page (`frontend/src/pages/Income.tsx`)

- No changes needed (already uses date-based filtering)

### 11. Update Invoices Page (`frontend/src/pages/Invoices.tsx`)

- Update invoice number generation to use fiscal year instead of calendar year
- Use fiscal year utilities in `createInvoice()`

### 12. Update API Layer (`frontend/src/lib/api.ts`)

- Update `createInvoice()` to use fiscal year for invoice numbering
- Add helper methods for fiscal year-based queries
- Update `generateTaxReport()` to use fiscal year periods
- Add HST period filtering support

### 13. Update Investment Pages

- `frontend/src/pages/Investments.tsx`: Filter by fiscal year
- `frontend/src/pages/InvestmentDetail.tsx`: Use fiscal year when creating income/sales entries

### 14. Update Other Pages

- `frontend/src/pages/Dividends.tsx`: Filter by fiscal year
- `frontend/src/pages/Salary.tsx`: Filter by fiscal year
- `frontend/src/pages/OwnerPayments.tsx`: Filter by fiscal year
- `frontend/src/pages/CapitalAssets.tsx`: Use fiscal year for depreciation

## HST Reporting Enhancements

### 15. Add HST Period View

- Create component to display HST periods based on filing frequency
- Show HST collected/paid per period
- Add reminders for upcoming HST filing deadlines

### 16. Update HST Payments Tracking

- Group HST payments by filing period
- Validate payments against filing schedule
- Show period-specific summaries

## Testing & Validation

### 17. Test Scenarios

- Companies with fiscal year ending March 31
- Companies with fiscal year ending June 30
- Companies with fiscal year ending September 30
- Companies with fiscal year ending December 31
- Monthly HST filers
- Quarterly HST filers
- Annual HST filers
- Date filtering across fiscal year boundaries
- Reports generation for different fiscal years

## Migration Strategy

### 18. Data Migration

- Existing companies: Default to calendar year (Dec 31) and annual HST filing
- Existing data: No changes needed (dates remain the same)
- New companies: Use their specified fiscal year end

## Files to Create/Modify

**New Files:**

- `frontend/src/lib/fiscalYear.ts` - Fiscal year utility functions
- `frontend/src/lib/hstPeriods.ts` - HST period utility functions

**Modified Files:**

- Database: `companies` table (via migration)
- `frontend/src/pages/Settings.tsx`
- `frontend/src/pages/CompanyOnboarding.tsx`
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/pages/Reports.tsx`
- `frontend/src/pages/TaxCalculator.tsx`
- `frontend/src/pages/Expenses.tsx`
- `frontend/src/pages/Invoices.tsx`
- `frontend/src/pages/Investments.tsx`
- `frontend/src/pages/InvestmentDetail.tsx`
- `frontend/src/pages/Dividends.tsx`
- `frontend/src/pages/Salary.tsx`
- `frontend/src/pages/OwnerPayments.tsx`
- `frontend/src/pages/CapitalAssets.tsx`
- `frontend/src/lib/api.ts`

## Key Implementation Details

1. **Fiscal Year Calculation**: Use `fiscal_year_end` date to determine fiscal year boundaries. For example, if fiscal year ends March 31, FY 2024 would be April 1, 2023 - March 31, 2024.
2. **HST Periods**: 

- Monthly: 12 periods per fiscal year
- Quarterly: 4 periods per fiscal year (aligned with fiscal year quarters)