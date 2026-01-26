# Implementation Plan: Year-End "One-Click" Export

## Problem
Tax season requires gathering Invoices, Expense Receipts, and Bank Statements. Currently, these must be downloaded individually.

## Solution
A specialized tool to generate a comprehensive "Accountant Package" ZIP file for a specific fiscal year.

## Implementation Details

### Backend (Node.js)
**Note**: Using Node backend as preferred (no Edge Functions).

#### [NEW] `POST /api/reports/year-end-package`
*   **Input**: `fiscal_year` (e.g., 2024), `company_id`.
*   **Process**:
    1.  **Fetch Data**:
        *   Query DB for all Invoices, Expenses, and Dividends in the date range.
    2.  **Generate CSVs**:
        *   Use `fast-csv` or similar to create `invoices.csv` and `expenses.csv`.
    3.  **Gather Files**:
        *   Fetch associated receipt files (PDF/Images) from Storage (Supabase Storage).
    4.  **Generate Summaries**:
        *   Generate `T5_Summary.pdf` using an internal PDF generator (e.g., `pdfmake` or `puppeteer`).
    5.  **Archive**:
        *   Use `archiver` (npm) to create a ZIP stream.
        *   Structure:
            ```
            /Fiscal_2024/
              /Receipts/
              /Invoices/
              financial_summary.csv
              t5_summary.pdf
            ```
    6.  **Response**: Stream the ZIP file back to the client.

### Frontend
#### [NEW] `src/pages/reports/YearEndExport.tsx`
*   **UI**:
    *   Fiscal Year Selector (Dropdown).
    *   "Generate Package" Button (with loading state).
    *   Download link appears upon completion.
*   **Handling**:
    *   This will be a `blob` response type request.
    *   Use `file-saver` to trigger the browser download dialog.

### Validation
*   Ensure enormous files (lots of receipts) don't timeout the Node server. Implement streaming response.
*   Verify CSV dates align with the user's selected Fiscal Year, not Calendar Year (unless they are the same).
