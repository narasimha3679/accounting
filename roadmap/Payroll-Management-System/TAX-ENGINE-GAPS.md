# Tax Engine Gaps — Phase 3 Preview



After Phase 2 (`fix_2026_tax_tables_cra`) + T4032 withholdings alignment, 2026 seed data matches CRA targets, and `PayrollCalculator` uses the same credit/deduction split as `canadaTaxEngine` (CEA, enhanced CPP, ON tax reduction, OHP, employer CPP2 match).



Golden tests in `payrollCalculations.test.ts` assert CPP/EI/tax/net within **$1** for known scenarios. Those expecteds are **internal golden** (derived from T4032-ON methodology + CRA tables), not live PDOC screenshots — replace when PDOC captures are available.



## Still approximate (do not treat as full remittance sign-off)



| Gap | Notes |

|-----|--------|

| Not full CRA T4032 Formula | Claim codes, K′ constants, and official pay-period factors are not implemented. Calculator annualizes period pay × periods/year, applies brackets/credits, then de-annualizes. Steady mid-year pay tracks well; irregular YTD / mid-year hires can diverge from PDOC. |

| Federal BPA phase-out | Annual planners use income-based BPA phase-out; pay runs use the employee’s TD1 `federal_total_claim` (correct for withholdings when TD1 is current). |

| QC / other provinces | Unsupported; defaults and settings assume Ontario. |

| Client-side finalize | Calculate/finalize/void run in the browser against Supabase — not an atomic server transaction. |

| Dual engines | Pay runs use DB rates + `PayrollCalculator`; annual planners use `canadaTaxEngine`. Methodology is aligned; full code merge is still optional cleanup. |

| CPP2 remittance column | Employer CPP2 is included in remittance `total_owing` (1:1 match) and employer cost, but there is no dedicated `cpp2_employer` DB column yet. |



## What is now applied in pay-run withholdings



- Enhanced CPP (1%) + CPP2 deducted from taxable income; base CPP (4.95%) + EI as credits at lowest rate

- Canada Employment Amount (`federal_employment_amount`) as a federal credit

- Ontario tax reduction (basic personal portion)

- Ontario Health Premium (folded into `provincial_tax` for remittance; exposed as `ontarioHealthPremium` on the calc result)

- Ontario surtax formula matches CRA (20% over thr1 + 36% over thr2)

- Employer CPP2 1:1 match in employer total cost and remittance totals



## What Phase 2 did fix



- Federal 2026 brackets: 58,523 / 117,045 / 181,440 / 258,482

- Ontario 2026 brackets: 53,891 / 107,785 / 150,000 / 220,000

- `cpp_max_contribution` → **4,230.45** (was 4,237.95)

- Federal BPA → **16,452**; ON BPA → **12,989**; CEA → **1,501**

- ON surtax thresholds → **5,818** / **7,446** (tax-amount thresholds, not income)

- TD1 fallbacks load from DB / `CRA_2026` instead of stale 15,705 / 12,866 hardcodes



## Remaining Phase 3 direction



- Optional: call a single shared engine module for both pay runs and planners

- Server-side atomic finalize + remittance updates

- Dedicated `cpp2_employer` column if remittance reporting needs the split

- Multi-province tables when product expands beyond Ontario

- Live PDOC screenshot golden captures

