# Tax Engine Gaps — Phase 3 Preview

After Phase 2 (`fix_2026_tax_tables_cra`), 2026 seed data in Supabase matches CRA targets for federal/ON brackets, CPP max, BPA, CEA, and Ontario surtax thresholds. Unit mocks and TD1 fallbacks use the same numbers via `frontend/src/lib/cra2026Constants.ts`.

Golden tests in `payrollCalculations.test.ts` assert CPP/EI/tax/net within **$1** for known scenarios. Those expecteds are **internal golden** (derived from the corrected calculator + CRA tables), not live PDOC screenshots — replace when PDOC captures are available.

## Still approximate (do not treat as full remittance sign-off)

| Gap | Notes |
|-----|--------|
| Not full CRA T4032 Formula | Claim codes, K′ constants, and official pay-period factors are not implemented. Calculator annualizes period pay × periods/year, applies brackets, subtracts BPA × lowest rate, then de-annualizes. |
| Canada Employment Amount | Stored in `tax_constants.federal_employment_amount` ($1,501) but **not applied** in `PayrollCalculator` federal credits. |
| Ontario tax reduction | `canadaTaxEngine` models the basic personal portion; payroll withholdings do not. |
| Ontario Health Premium | `health_premium_enabled` / `ontario_health_premium` table exist; premium is **not** withheld on pay runs. |
| Enhanced CPP credit vs deduction | T4032 treats base CPP (4.95%) as a credit and enhanced (1%) + CPP2 as deductions from taxable income. `PayrollCalculator` deducts **full** CPP+CPP2 from annualized income before tax — differs from `canadaTaxEngine.ts`. |
| Employer CPP2 | Employee CPP2 is calculated; employer CPP2 match may be missing from employer cost / remittance paths. |
| QC / other provinces | Unsupported; defaults and settings assume Ontario. |
| Client-side finalize | Calculate/finalize/void run in the browser against Supabase — not an atomic server transaction. |
| Dual engines | Pay runs use DB rates + `PayrollCalculator`; annual planners use `canadaTaxEngine`. Phase 2 keeps them consistent via shared `cra2026Constants` + DB migration; full merge is Phase 3. |

## What Phase 2 did fix

- Federal 2026 brackets: 58,523 / 117,045 / 181,440 / 258,482
- Ontario 2026 brackets: 53,891 / 107,785 / 150,000 / 220,000
- `cpp_max_contribution` → **4,230.45** (was 4,237.95)
- Federal BPA → **16,452**; ON BPA → **12,989**; CEA → **1,501**
- ON surtax thresholds → **5,818** / **7,446** (tax-amount thresholds, not income)
- TD1 fallbacks load from DB / `CRA_2026` instead of stale 15,705 / 12,866 hardcodes

## Phase 3 direction (out of scope here)

- Implement T4032-ON Formula (or call a single shared engine for both pay runs and planners)
- Wire CEA, ON tax reduction, and health premium where remittance demos need them
- Server-side atomic finalize + remittance updates
- Multi-province tables when product expands beyond Ontario
