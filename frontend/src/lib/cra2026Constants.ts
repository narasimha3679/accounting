/**
 * Authoritative 2026 CRA constants shared by payroll mocks, TD1 fallbacks,
 * and the annual canadaTaxEngine. Pay-run calculations still load live values
 * from tax_rates / tax_constants / provincial_tax_constants in Supabase —
 * keep those tables in sync with this module when rates change.
 *
 * Sources: CRA T4032-ON (Jan 2026), CPP/EI contribution tables on canada.ca
 */

export const CRA_2026 = {
    federalBrackets: [
        { min_income: 0, max_income: 58523, rate: 0.14 },
        { min_income: 58523.01, max_income: 117045, rate: 0.205 },
        { min_income: 117045.01, max_income: 181440, rate: 0.26 },
        { min_income: 181440.01, max_income: 258482, rate: 0.29 },
        { min_income: 258482.01, max_income: null as number | null, rate: 0.33 },
    ],
    ontarioBrackets: [
        { min_income: 0, max_income: 53891, rate: 0.0505 },
        { min_income: 53891.01, max_income: 107785, rate: 0.0915 },
        { min_income: 107785.01, max_income: 150000, rate: 0.1116 },
        { min_income: 150000.01, max_income: 220000, rate: 0.1216 },
        { min_income: 220000.01, max_income: null as number | null, rate: 0.1316 },
    ],
    federalBpaMax: 16452,
    federalBpaMin: 14829,
    federalBpaPhaseoutStart: 181440,
    federalBpaPhaseoutEnd: 258482,
    canadaEmploymentAmount: 1501,
    ontarioBpa: 12989,
    ontarioSurtaxThreshold1: 5818,
    ontarioSurtaxRate1: 0.2,
    ontarioSurtaxThreshold2: 7446,
    ontarioSurtaxRate2: 0.36,
    ontarioTaxReductionBase: 300,
    cppYmpe: 74600,
    cppExemption: 3500,
    cppRate: 0.0595,
    cppBaseRate: 0.0495,
    cppMaxContribution: 4230.45,
    cpp2Yampe: 85000,
    cpp2Rate: 0.04,
    cpp2MaxContribution: 416.0,
    eiMie: 68900,
    eiRate: 0.0163,
    eiMaxPremium: 1123.07,
    eiEmployerMultiplier: 1.4,
} as const;
