---
name: Move Pay Myself Optimizer to Frontend
overview: Move Pay Myself Optimizer calculations from Node.js backend to frontend UI, and ensure all non-personal tax data (tax constants, brackets, dividend constants, health premium) is accessible to all authenticated users via RLS policies.
todos:
  - id: "1"
    content: Create migration to ensure RLS policies for tax_constants, tax_rates, and provincial_tax_constants tables allow authenticated users to read
    status: completed
  - id: "2"
    content: Add getDividendTaxConstants() and getOntarioHealthPremium() API methods to frontend/src/lib/api.ts
    status: completed
  - id: "3"
    content: Add TypeScript types for DividendTaxConstants and OntarioHealthPremiumTier to payrollTypes.ts
    status: completed
  - id: "4"
    content: Create frontend/src/lib/payMyselfOptimizer.ts with all calculation functions ported from backend
    status: completed
  - id: "5"
    content: Update PayMyselfSlider.tsx to fetch dividend constants and health premium data
    status: completed
  - id: "6"
    content: Replace backend API call in PayMyselfSlider with client-side optimizeWithdrawal() calculation
    status: completed
  - id: "7"
    content: Add deprecation notice to backend payMyselfRoutes.js (optional)
    status: completed
  - id: "8"
    content: Test calculations match backend results and handle edge cases
    status: completed
isProject: false
---

# Move Pay Myself Optimizer Calculations to Frontend

## Overview

Currently, the Pay Myself Optimizer runs on the Node.js backend using the service role key. This plan moves all calculations to the frontend for better UX (instant feedback) and reduces server load. All non-personal tax data will be accessible to authenticated users via RLS policies.

## Current State Analysis

### Backend Implementation

- **File**: `backend/src/services/payMyselfOptimizer.js`
- **Model**: Takes "corporate cost" (what corp pays out) → calculates net in pocket
- **Functions**:
  - `fetchTaxConstants()` - fetches all tax data using service role key
  - `calculateSalaryNet()` - calculates salary net after taxes
  - `calculateDividendNet()` - calculates dividend net after taxes  
  - `calculateReimbursementNet()` - calculates reimbursement (tax-free)
  - `optimizeWithdrawal()` - main optimization function
- **API Endpoint**: `POST /api/pay-myself/optimize` in `backend/src/routes/payMyselfRoutes.js`

### Frontend Implementation

- **File**: `frontend/src/components/dashboard/PayMyselfSlider.tsx`
- Currently calls backend API via `api.optimizeWithdrawal()`
- Already fetches: `tax_constants`, `tax_rates`, `provincial_tax_constants`
- Missing: API methods for `dividend_tax_constants` and `ontario_health_premium`

### RLS Policies Status

- ✅ `dividend_tax_constants` - Already has RLS policy for authenticated users (migration 008)
- ✅ `ontario_health_premium` - Already has RLS policy for authenticated users (migration 009)
- ❓ `tax_constants`, `tax_rates`, `provincial_tax_constants` - Need to verify/add RLS policies

## Implementation Plan

### Phase 1: Ensure RLS Policies for All Tax Tables

**File**: Create new migration `supabase/migrations/012_ensure_tax_tables_public_read.sql`

Add RLS policies to allow authenticated users to read all tax-related tables:

```sql
-- Ensure tax_constants is readable by authenticated users
ALTER TABLE tax_constants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read tax_constants" ON tax_constants;
CREATE POLICY "Allow authenticated users to read tax_constants"
ON tax_constants FOR SELECT
TO authenticated
USING (true);

-- Ensure tax_rates is readable by authenticated users  
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read tax_rates" ON tax_rates;
CREATE POLICY "Allow authenticated users to read tax_rates"
ON tax_rates FOR SELECT
TO authenticated
USING (true);

-- Ensure provincial_tax_constants is readable by authenticated users
ALTER TABLE provincial_tax_constants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read provincial_tax_constants" ON provincial_tax_constants;
CREATE POLICY "Allow authenticated users to read provincial_tax_constants"
ON provincial_tax_constants FOR SELECT
TO authenticated
USING (true);
```

### Phase 2: Add Frontend API Methods

**File**: `frontend/src/lib/api.ts`

Add two new methods to the `SupabaseApi` class:

1. **`getDividendTaxConstants(taxYear: number, province: string)`**

   - Fetches from `dividend_tax_constants` table
   - Filters by `tax_year` and `province` IN ('federal', province)
   - Returns array of dividend constants with proper TypeScript types

2. **`getOntarioHealthPremium(taxYear: number)`**

   - Fetches from `ontario_health_premium` table
   - Filters by `tax_year`
   - Orders by `min_income` ascending
   - Returns array of premium tiers

Add TypeScript types in `frontend/src/lib/payrollTypes.ts`:

- `DividendTaxConstants` interface
- `OntarioHealthPremiumTier` interface

### Phase 3: Create Frontend Optimizer Service

**File**: Create `frontend/src/lib/payMyselfOptimizer.ts`

Port the backend calculation logic to TypeScript:

1. **`fetchTaxConstants(taxYear: number, province: string)`**

   - Uses frontend API methods (not service role key)
   - Returns same structure as backend version
   - Handles missing data gracefully

2. **`calculateBracketTax(taxableIncome: number, brackets: TaxBracket[])`**

   - Port from backend (same logic)

3. **`calculateOntarioHealthPremium(taxableIncome: number, tiers: OntarioHealthPremiumTier[])`**

   - Port from backend (same logic)

4. **`calculateOntarioSurtax(baseProvincialTax: number, provincialConstants: ProvincialTaxConstants)`**

   - Port from backend (same logic)

5. **`calculateSalaryNet(corporateCost: number, constants: TaxConstantsBundle, ytdIncome: number)`**

   - Port from backend (same logic)
   - Includes iterative gross salary calculation
   - Returns same structure

6. **`calculateDividendNet(amount: number, constants: TaxConstantsBundle, dividendType: string, ytdIncome: number, smallBusinessRate: number)`**

   - Port from backend (same logic)
   - Uses dividend constants from database

7. **`calculateReimbursementNet(amount: number, owedToOwner: number)`**

   - Port from backend (same logic)

8. **`optimizeWithdrawal(params: OptimizerParams)`**

   - Port from backend (same logic)
   - Main optimization function
   - Returns same response structure

**Key differences from existing `salaryDividendOptimizer.ts`**:

- This optimizer works with "corporate cost" model (what corp pays out)
- Existing optimizer works with "corporate net income" model
- Both can coexist - this one is specifically for the Pay Myself Slider

### Phase 4: Update PayMyselfSlider Component

**File**: `frontend/src/components/dashboard/PayMyselfSlider.tsx`

Changes:

1. **Add data fetching** for missing tax constants:
   ```typescript
   const { data: dividendConstants } = useQuery({
     queryKey: ['dividendTaxConstants', taxYear, selectedProvince],
     queryFn: async () => await api.getDividendTaxConstants(taxYear, selectedProvince),
     enabled: !!taxYear && !!selectedProvince,
   });
   
   const { data: healthPremiumTiers } = useQuery({
     queryKey: ['ontarioHealthPremium', taxYear],
     queryFn: async () => await api.getOntarioHealthPremium(taxYear),
     enabled: !!taxYear && selectedProvince === 'ON',
   });
   ```

2. **Replace backend API call** with client-side calculation:

   - Remove the `api.optimizeWithdrawal()` call
   - Use `optimizeWithdrawal()` from `payMyselfOptimizer.ts` directly
   - Calculate in `useMemo` or `useEffect` when inputs change
   - Keep debouncing for performance

3. **Update error handling**:

   - Handle missing tax data gracefully
   - Show loading states while fetching tax constants
   - Fallback to simple calculation if optimizer fails

### Phase 5: Update Backend (Optional - Deprecate or Keep as Fallback)

**File**: `backend/src/routes/payMyselfRoutes.js`

Options:

- **Option A**: Keep endpoint as fallback for edge cases
- **Option B**: Add deprecation notice and remove after frontend is stable
- **Option C**: Remove immediately (recommended if frontend works well)

Recommendation: Keep for 1-2 releases as fallback, then remove.

### Phase 6: Testing & Validation

1. **Unit Tests**: Create tests for `payMyselfOptimizer.ts` functions

   - Test edge cases (zero amounts, max CPP/EI, surtax thresholds)
   - Compare results with backend calculations

2. **Integration Tests**: 

   - Test `PayMyselfSlider` with various inputs
   - Verify calculations match backend results
   - Test with different provinces, tax years, dividend types

3. **Performance Testing**:

   - Ensure calculations are fast enough for real-time slider updates
   - Cache tax constants appropriately
   - Verify debouncing works correctly

## Files to Modify

### New Files

- `supabase/migrations/012_ensure_tax_tables_public_read.sql`
- `frontend/src/lib/payMyselfOptimizer.ts`
- `frontend/src/lib/payMyselfOptimizer.test.ts` (optional)

### Modified Files

- `frontend/src/lib/api.ts` - Add 2 new API methods
- `frontend/src/lib/payrollTypes.ts` - Add TypeScript types
- `frontend/src/components/dashboard/PayMyselfSlider.tsx` - Use client-side calculations
- `backend/src/routes/payMyselfRoutes.js` - Add deprecation notice (optional)

## Benefits

1. **Better UX**: Instant calculations as user adjusts slider (no network latency)
2. **Reduced Server Load**: Calculations run client-side
3. **Offline Capability**: Can cache tax constants and work offline
4. **Consistency**: All tax data accessible via same RLS pattern
5. **Maintainability**: Single source of truth for calculations

## Risks & Mitigations

1. **Risk**: Client-side calculations might be slower on low-end devices

   - **Mitigation**: Use debouncing, memoization, and consider Web Workers for heavy calculations

2. **Risk**: Tax constants might be stale if cached too long

   - **Mitigation**: Use appropriate `staleTime` in React Query (e.g., 1 hour for tax constants)

3. **Risk**: Different calculation results between frontend and backend

   - **Mitigation**: Port exact same logic, add unit tests comparing results

## Rollout Strategy

1. Deploy RLS migration first (Phase 1)
2. Add frontend API methods (Phase 2)
3. Create frontend optimizer (Phase 3)
4. Update PayMyselfSlider with feature flag (Phase 4)
5. Test thoroughly
6. Enable for all users
7. Deprecate backend endpoint after 1-2 releases