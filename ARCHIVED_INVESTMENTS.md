# Archived Investment Functionality

This document describes the investment functionality that was removed from the codebase on [current date]. The code has been preserved in the git branch `feature/investments-archived` for potential future implementation.

## What Was Removed

### Frontend Pages
- `frontend/src/pages/Investments.tsx` - Main investments listing page
- `frontend/src/pages/InvestmentDetail.tsx` - Investment detail page

### Frontend Components
- `frontend/src/components/investments/BalanceChart.tsx` - Investment balance chart component
- `frontend/src/components/investments/` directory

### Frontend Utilities
- `frontend/src/lib/stockApi.ts` - Stock API integration (only used for investments)

### API Layer (`frontend/src/lib/api.ts`)
- Investment interfaces:
  - `Investment`
  - `InvestmentIncome`
  - `InvestmentSale`
  - `InvestmentTransaction`
- Investment API methods:
  - `getInvestments()`
  - `getInvestment()`
  - `createInvestment()`
  - `updateInvestment()`
  - `deleteInvestment()`
  - `getInvestmentIncome()`
  - `createInvestmentIncome()`
  - `updateInvestmentIncome()`
  - `deleteInvestmentIncome()`
  - `getInvestmentSales()`
  - `createInvestmentSale()`
  - `updateInvestmentSale()`
  - `getInvestmentSale()`
  - `deleteInvestmentSale()`
  - `getInvestmentTransactions()`
  - `getInvestmentTransaction()`
  - `createInvestmentTransaction()`
  - `updateInvestmentTransaction()`
  - `deleteInvestmentTransaction()`
  - `calculateInvestmentBalance()`
  - `calculateInvestmentCostBasis()`
  - `getInvestmentDetail()`
- Investment tax rate fields from Company interface:
  - `investment_interest_tax_rate`
  - `investment_eligible_dividend_tax_rate`
  - `investment_noneligible_dividend_tax_rate`
  - `investment_capital_gain_tax_rate`

### Routes and Navigation
- Removed `/investments` route from `App.tsx`
- Removed `/investments/:id` route from `App.tsx`
- Removed "Investments" navigation item from `Layout.tsx`

### Reports Page (`frontend/src/pages/Reports.tsx`)
- Removed investment income and sales data fetching
- Removed investment income calculations (interest, dividends, capital gains/losses)
- Removed investment tax calculations
- Removed investment-related fields from report data structure
- Removed investment income/sales UI sections

### Tax Calculator (`frontend/src/pages/TaxCalculator.tsx`)
- Removed investment income and sales queries
- Removed investment calculations and validations
- Removed investment breakdown calculations
- Removed investment UI sections
- Updated RDTOH calculation to not depend on investment income tax

### Landing Page Components
- Removed investment mentions from:
  - `frontend/src/components/landing/Pricing.tsx`
  - `frontend/src/components/landing/FAQ.tsx`
  - `frontend/src/components/landing/HowItWorks.tsx`
  - `frontend/src/components/landing/Comparison.tsx`
  - `frontend/src/components/landing/UseCases.tsx`
  - `frontend/src/components/landing/Features.tsx`

## Database Tables (Preserved)

The following database tables remain in the database but are no longer accessible through the UI/API:
- `investments`
- `investment_income`
- `investment_sales`
- `investment_transactions`

**Note:** These tables were intentionally kept to preserve any existing data. They can be dropped in the future if needed, or the functionality can be restored by merging the archived branch.

## How to Restore

If you want to restore the investment functionality in the future:

1. Checkout the archived branch:
   ```bash
   git checkout feature/investments-archived
   ```

2. Review the code to understand what was implemented

3. Merge specific files or the entire branch back into main:
   ```bash
   git checkout main
   git merge feature/investments-archived
   ```

4. Resolve any conflicts that may have arisen from other changes

5. Re-enable the routes and navigation items

6. Update any dependencies that may have changed

## Implementation Notes

The investment functionality included:
- Support for stocks and GICs (Guaranteed Investment Certificates)
- Investment income tracking (interest, dividends, capital gains/losses)
- Investment sales with cost basis calculations
- Investment transactions (contributions, withdrawals, reinvestments)
- Integration with stock price API for automatic valuation
- Tax calculations for investment income (separate from active business income)
- RDTOH (Refundable Dividend Tax on Hand) calculations based on investment income tax
- Investment breakdown by individual investment
- Reinvestment tracking and summaries

## Branch Information

- **Branch Name:** `feature/investments-archived`
- **Created:** [Date when branch was created]
- **Last Commit:** Archive: Preserve investment functionality code before removal
