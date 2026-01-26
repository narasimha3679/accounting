# Comprehensive "Pay Myself Optimizer" Engine

## Executive Summary
Build a **sophisticated, accurate withdrawal optimization engine** that helps Canadian CCPC owner-managers make tax-efficient withdrawal decisions. The engine calculates **exact** after-tax outcomes for Reimbursements, Dividends, and Salary/Bonus, using real CRA constants stored in the database.

> [!IMPORTANT]  
> This is a **PLANNING TOOL**, not tax advice. Results should be clearly labeled as estimates for planning purposes.

---

## Problem Statement
Owner-managers of CCPCs face a complex decision when withdrawing money:
1. **Reimbursements** - Tax-free but limited to actual expenses owed
2. **Dividends** - Lower immediate cash outflow, complex personal tax calculation
3. **Salary/Bonus** - Creates RRSP room, CPP benefits, but higher immediate taxes

Currently, the "Pay Myself Slider" only shows Reimbursements and Dividends with a flat 15% estimate. This is **not accurate** and doesn't help users make informed decisions.

---

## Solution Architecture

### Phase 1: Data Foundation (DB Schema)

#### Existing Tables (Already Available)
| Table | Contains | Status |
|-------|----------|--------|
| `tax_constants` | CPP rates, EI rates, basic exemptions, YMPE/YAMPE | ✅ 2025, 2026 |
| `tax_rates` | Federal + Provincial income tax brackets | ✅ Federal + ON |
| `provincial_tax_constants` | Basic personal amount, surtax thresholds | ✅ ON only |

#### New Tables Required

##### `dividend_tax_constants`
```sql
CREATE TABLE dividend_tax_constants (
  id BIGSERIAL PRIMARY KEY,
  tax_year INTEGER NOT NULL,
  province TEXT NOT NULL, -- 'federal', 'ON', 'BC', etc.
  dividend_type TEXT NOT NULL, -- 'eligible', 'non_eligible'
  gross_up_rate NUMERIC NOT NULL, -- e.g., 0.38 for eligible, 0.15 for non-eligible
  federal_tax_credit_rate NUMERIC NOT NULL, -- e.g., 0.1502 for eligible
  provincial_tax_credit_rate NUMERIC, -- varies by province
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Sample Data (2026):**
| dividend_type | gross_up_rate | federal_credit | ON_credit |
|---------------|---------------|----------------|-----------|
| eligible | 0.38 | 0.1502 | 0.10 |
| non_eligible | 0.15 | 0.0903 | 0.0287 |

##### `ontario_health_premium`
```sql
CREATE TABLE ontario_health_premium (
  id BIGSERIAL PRIMARY KEY,
  tax_year INTEGER NOT NULL,
  min_income NUMERIC NOT NULL,
  max_income NUMERIC,
  base_premium NUMERIC NOT NULL,
  rate_on_excess NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
This is needed because Ontario Health Premium is a **surtax** that applies to salary but NOT dividends.

---

### Phase 2: Calculation Engine (Backend Service)

#### File: `backend/src/services/payMyselfOptimizer.js`

##### Core Functions

**1. `fetchTaxConstants(taxYear, province)`**
- Returns: CPP/EI limits, brackets, dividend credits, surtax thresholds

**2. `calculateSalaryNet(grossCorporateCost, constants, ytdIncome = 0)`**
```
Input: $50,000 corporate cost (what corp pays out)

Step 1: Deduct Employer CPP/EI to get Gross Salary
  - Employer CPP = min(Gross * 5.95%, $4,237.95)
  - Employer EI = min(Gross * 1.63% * 1.4, $1,572.30)
  - Gross Salary = $50,000 / (1 + 0.0595 + 0.02282) ≈ $46,200

Step 2: Deduct Employee CPP/EI
  - Employee CPP = min((Gross - $3,500) * 5.95%, $4,237.95)
  - Employee EI = min(Gross * 1.63%, $1,123.07)

Step 3: Calculate Income Tax
  - Federal Tax = BracketCalc(Gross - BasicPersonal)
  - Provincial Tax = BracketCalc(Gross - ProvBasicPersonal)
  - Ontario Surtax = (20% of tax > $5,554) + (36% of tax > $7,108)
  - Ontario Health Premium = tiered calculation

Step 4: Net = Gross - CPP - EI - FedTax - ProvTax - Surtax - OHP

Output: {
  grossSalary: 46200,
  employeeCpp: 2542,
  employeeEi: 753,
  federalTax: 4200,
  provincialTax: 2100,
  ontarioSurtax: 0,
  healthPremium: 300,
  netInPocket: 36305,
  rsspRoomCreated: 8316,  // 18% of gross
  cppBenefitValue: est.    // optional future value
}
```

**3. `calculateDividendNet(amount, constants, dividendType = 'non_eligible')`**
```
Input: $50,000 dividend (actual cash paid)

Step 1: Gross-Up
  - Grossed-up = $50,000 * 1.15 = $57,500 (non-eligible)

Step 2: Calculate Federal Tax
  - Federal Tax = BracketCalc($57,500 - $16,129)
  - Federal Dividend Credit = $57,500 * 9.03%

Step 3: Calculate Provincial Tax
  - Provincial Tax = BracketCalc($57,500 - $12,399)
  - Provincial Dividend Credit = $57,500 * 2.87%

Step 4: Net Tax
  - Total Tax = FedTax - FedCredit + ProvTax - ProvCredit + Surtax

Step 5: Net = $50,000 - Total Tax

Output: {
  cashPaid: 50000,
  grossedUp: 57500,
  federalTax: 8000,
  federalCredit: 5192,
  provincialTax: 3000,
  provincialCredit: 1650,
  netTax: 4158,
  netInPocket: 45842
}
```

**4. `calculateReimbursementNet(amount, owedToOwner)`**
```
Very simple:
- Net = min(amount, owedToOwner)
- Tax = 0

Output: {
  netInPocket: amount,
  tax: 0,
  efficiency: 100%
}
```

**5. `optimizeWithdrawal(totalAmount, owedToOwner, constants, ytdIncome)`**
The "brain" that combines all calculations:

```
Algorithm:
1. First, maximize Reimbursements (100% efficient)
   reimbursement = min(totalAmount, owedToOwner)
   remaining = totalAmount - reimbursement

2. For remaining amount, calculate both options:
   dividendResult = calculateDividendNet(remaining)
   salaryResult = calculateSalaryNet(remaining)

3. Compare net outcomes:
   - If dividendResult.netInPocket > salaryResult.netInPocket:
       recommendation = "Dividend"
       savings = dividendResult.netInPocket - salaryResult.netInPocket
   - Else:
       recommendation = "Salary"
       (rare, but possible at lower income levels due to CPP/RRSP value)

4. Return comprehensive comparison object
```

---

### Phase 3: API Endpoint

#### File: `backend/src/routes/payMyselfRoutes.js`

```javascript
// POST /api/pay-myself/optimize
{
  "corporateCost": 50000,        // Total amount corporation will spend
  "owedToOwner": 5000,           // From owner_payments balance
  "province": "ON",              // Default from company settings
  "taxYear": 2026,               // Default current year
  "ytdPersonalIncome": 0,        // Optional: for marginal rate accuracy
  "dividendType": "non_eligible" // CCPCs typically pay non-eligible
}

// Response
{
  "input": { ... },
  "options": {
    "reimbursement": {
      "amount": 5000,
      "netInPocket": 5000,
      "taxPaid": 0,
      "efficiency": "100%",
      "note": "Tax-free repayment of expenses you paid"
    },
    "dividend": {
      "amount": 45000,
      "grossedUp": 51750,
      "federalTax": 7200,
      "federalCredit": 4673,
      "provincialTax": 2700,
      "provincialCredit": 1485,
      "netTax": 3742,
      "netInPocket": 41258,
      "efficiency": "91.7%",
      "note": "Lower taxes, no CPP/RRSP benefits"
    },
    "salary": {
      "grossSalary": 41500,
      "employeeCpp": 2262,
      "employeeEi": 676,
      "federalTax": 3700,
      "provincialTax": 1900,
      "netInPocket": 32962,
      "efficiency": "73.2%",
      "rsspRoomCreated": 7470,
      "note": "Creates RRSP room and CPP benefits"
    }
  },
  "recommendation": {
    "strategy": "Reimbursement + Dividend",
    "totalNetInPocket": 46258,
    "totalEfficiency": "92.5%",
    "breakdown": [
      { "type": "reimbursement", "amount": 5000 },
      { "type": "dividend", "amount": 45000 }
    ],
    "explanation": "Take all available reimbursements first (tax-free). For the remaining $45,000, dividends save you $8,296 compared to salary. However, salary would create $7,470 in RRSP room."
  },
  "disclaimer": "These are estimates for planning purposes only. Consult a tax professional for your specific situation."
}
```

---

### Phase 4: Frontend Integration

#### Enhanced `PayMyselfSlider.tsx`

**Key Changes:**
1. **API Call**: Debounced call to `/api/pay-myself/optimize` on slider change
2. **3-Way Visual Comparison**: Show side-by-side cards for each option
3. **Recommendation Banner**: Highlight the optimal strategy with reasoning
4. **Toggle**: "Simple View" (current) vs "Detailed View" (new)
5. **Input Fields**: 
   - Province selector (from company settings, but overridable)
   - YTD Income (optional, for accuracy at higher incomes)

**New UI Components:**
```
┌────────────────────────────────────────────────────────────┐
│  💰 Pay Myself Optimizer                    [Simple | Detailed] │
├────────────────────────────────────────────────────────────┤
│  I want to take out: $ [50,000] ◄━━━━━━━━━━━━━━━━━━━━━ ► $100k │
│  ─────────────────────────────────────────────────────────  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Reimburse   │ │ Dividend    │ │ Salary      │          │
│  │ ★ BEST      │ │             │ │             │          │
│  │             │ │             │ │             │          │
│  │ $5,000      │ │ $45,000     │ │ $45,000     │          │
│  │ You keep:   │ │ You keep:   │ │ You keep:   │          │
│  │ $5,000      │ │ $41,258     │ │ $32,962     │          │
│  │ (100%)      │ │ (91.7%)     │ │ (73.2%)     │          │
│  │             │ │             │ │ +$7,470 RRSP│          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                            │
│  💡 RECOMMENDATION                                         │
│  Take $5,000 as Reimbursement + $45,000 as Dividend        │
│  Total in pocket: $46,258 | Efficiency: 92.5%              │
│  ──────────────────────────────────────────────────────── │
│            [Start Withdrawal →]                            │
└────────────────────────────────────────────────────────────┘
```

---

## Data Requirements Checklist

| Data Needed | Source | Status |
|-------------|--------|--------|
| Federal tax brackets | `tax_rates` | ✅ |
| Ontario tax brackets | `tax_rates` | ✅ |
| CPP rates & limits | `tax_constants` | ✅ |
| EI rates & limits | `tax_constants` | ✅ |
| Federal basic personal | `tax_constants` | ✅ |
| Provincial basic personal | `provincial_tax_constants` | ✅ |
| Ontario surtax thresholds | `provincial_tax_constants` | ✅ |
| Dividend gross-up rates | **NEW TABLE NEEDED** | ❌ |
| Dividend tax credits | **NEW TABLE NEEDED** | ❌ |
| Ontario Health Premium | **NEW TABLE NEEDED** | ❌ |
| Other provinces | Future expansion | ❌ |

---

## Implementation Phases

### Phase 1: Database Setup (1-2 hours)
1. Create `dividend_tax_constants` table
2. Create `ontario_health_premium` table
3. Seed data for 2025 and 2026

### Phase 2: Backend Service (4-6 hours)
1. Create `payMyselfOptimizer.js` with all calculation functions
2. Write unit tests with known CRA examples
3. Create API route

### Phase 3: Frontend Integration (3-4 hours)
1. Update `PayMyselfSlider.tsx` with API integration
2. Add detailed comparison view
3. Add recommendation banner

### Phase 4: Testing & Validation (2-3 hours)
1. Compare results against CRA payroll calculator
2. Test edge cases (max CPP, max EI, surtax thresholds)
3. User acceptance testing

---

## Accuracy Guarantees

To ensure user trust, results should match CRA calculations within:
- **CPP/EI**: Exact match (using CRA constants)
- **Income Tax**: Within $50 of CRA calculator
- **Dividend Tax**: Within 1% of actual (due to integration imperfections)

---

## Future Enhancements

1. **Multi-Province Support**: Add BC, AB, QC tax brackets
2. **RRSP Impact**: Show after-tax value of RRSP room created
3. **CPP Benefit Value**: Estimate future CPP pension from contributions
4. **Tax Bracket Visualization**: Show where user sits in brackets
5. **Year-End Planning**: "If you withdraw $X more, you'll jump to next bracket"
6. **Historical Comparison**: "Last year you would have paid $Y less/more"
