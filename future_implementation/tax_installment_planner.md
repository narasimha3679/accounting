# Implementation Plan: Tax Installment Planner

## Problem
Solo owners often forget *when* to pay taxes, leading to penalties. The dashboard currently shows *what* is owed, but not *when*.

## Solution
A proactive timeline widget showing upcoming tax deadlines based on the company's fiscal settings.

## Implementation Details

### Database
#### [NEW] `tax_installments`
(Optional - can be calculated on fly, but storing allows "Mark as Paid")
```sql
create table tax_events (
  id bigint generated always as identity primary key,
  company_id uuid references companies(id),
  event_type text check (event_type in ('hst_filing', 'corp_tax_installment', 'payroll_remittance')),
  due_date date not null,
  period_start date,
  period_end date,
  estimated_amount decimal(12,2),
  status text default 'upcoming', -- upcoming, paid, overdue
  created_at timestamptz default now()
);
```

### Backend (Node.js)
*   New endpoint `GET /api/tax-events` to fetch upcoming deadlines.
*   Logic to generate events if they don't exist:
    *   **HST**: Read `hst_filing_frequency` (Monthly/Quarterly/Annual) -> Calculate next due date (e.g., 1 month after period end).
    *   **Corporate Tax**: Due 2 or 3 months after `fiscal_year_end`.

### Frontend
#### [NEW] `src/lib/taxCalculator.ts`
*   Utility functions to compute deadlines client-side for immediate feedback when settings change.

#### [NEW] `src/components/dashboard/TaxTimeline.tsx`
*   Vertical list or Horizontal timeline of the next 3-6 months.
*   **Visuals**:
    *   🟢 Green: Due > 30 days
    *   🟡 Yellow: Due < 30 days
    *   🔴 Red: Due < 7 days or Overdue
*   **Action**: "Mark as Paid" button updates the `tax_events` status.

### Validation
*   Verify HST deadlines match CRA rules (e.g., Quarterly filers due 1 month after quarter end).
*   Verify Corp Tax Balance due date (2 months after year-end for most corps, 3 for CCPC).
