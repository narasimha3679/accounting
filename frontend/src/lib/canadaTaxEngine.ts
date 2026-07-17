// 2026 Canadian (Ontario) salary tax engine.
// Methodology follows CRA T4032-ON payroll deduction formulas:
// - Enhanced CPP (1% of the 5.95%) and CPP2 are deductions from taxable income
// - Base CPP (4.95%), EI, BPA, and the Canada Employment Amount are
//   non-refundable credits at the lowest rate

export type TaxPeriod = 'annual' | 'monthly' | 'bi-weekly' | 'weekly' | 'daily' | 'hourly';

/** Assumed work schedule for daily/hourly conversions (defaults = standard full-time). */
export interface WorkSchedule {
  hoursPerDay: number; // e.g. 8
  daysPerWeek: number; // e.g. 5
}

export const DEFAULT_WORK_SCHEDULE: WorkSchedule = {
  hoursPerDay: 8,
  daysPerWeek: 5,
};

const WEEKS_PER_YEAR = 52;

/** How many of a given period fit into one year, given the work schedule. */
export function periodsPerYear(
  period: TaxPeriod,
  schedule: WorkSchedule = DEFAULT_WORK_SCHEDULE
): number {
  const hoursPerDay = Math.max(0.25, schedule.hoursPerDay);
  const daysPerWeek = Math.max(0.25, Math.min(7, schedule.daysPerWeek));
  const workingDaysPerYear = daysPerWeek * WEEKS_PER_YEAR;
  const hoursPerYear = hoursPerDay * workingDaysPerYear;

  switch (period) {
    case 'annual':
      return 1;
    case 'monthly':
      return 12;
    case 'bi-weekly':
      return 26;
    case 'weekly':
      return 52;
    case 'daily':
      return workingDaysPerYear;
    case 'hourly':
      return hoursPerYear;
    default: {
      const _exhaustive: never = period;
      return _exhaustive;
    }
  }
}

/** @deprecated Prefer periodsPerYear() — kept for callers that assume the default schedule. */
export const PERIODS_PER_YEAR: Record<TaxPeriod, number> = {
  annual: periodsPerYear('annual'),
  monthly: periodsPerYear('monthly'),
  'bi-weekly': periodsPerYear('bi-weekly'),
  weekly: periodsPerYear('weekly'),
  daily: periodsPerYear('daily'),
  hourly: periodsPerYear('hourly'),
};

export interface TaxResult {
  grossIncome: number;
  federalTax: number;
  provincialTax: number; // Ontario base tax + surtax - tax reduction (excludes health premium)
  ontarioHealthPremium: number;
  cppDeduction: number; // CPP1 (base + enhanced)
  cpp2Deduction: number;
  eiDeduction: number;
  totalTax: number;
  netPay: number;
  marginalTaxRate: number; // percent
  averageTaxRate: number; // percent
}

interface Bracket {
  max: number;
  rate: number;
}

// 2026 Federal tax brackets (taxable income)
const FEDERAL_BRACKETS: Bracket[] = [
  { max: 58523, rate: 0.14 },
  { max: 117045, rate: 0.205 },
  { max: 181440, rate: 0.26 },
  { max: 258482, rate: 0.29 },
  { max: Infinity, rate: 0.33 },
];

const FEDERAL_LOWEST_RATE = 0.14;
const FEDERAL_BPA_MAX = 16452; // full BPA below 4th bracket
const FEDERAL_BPA_MIN = 14829; // reduced BPA above 5th bracket threshold
const FEDERAL_BPA_PHASEOUT_START = 181440;
const FEDERAL_BPA_PHASEOUT_END = 258482;
const CANADA_EMPLOYMENT_AMOUNT = 1501;

// 2026 Ontario tax brackets (taxable income)
const ONTARIO_BRACKETS: Bracket[] = [
  { max: 53891, rate: 0.0505 },
  { max: 107785, rate: 0.0915 },
  { max: 150000, rate: 0.1116 },
  { max: 220000, rate: 0.1216 },
  { max: Infinity, rate: 0.1316 },
];

const ONTARIO_LOWEST_RATE = 0.0505;
const ONTARIO_BPA = 12989;

// Ontario surtax 2026 (applied to basic provincial tax)
const SURTAX_1_THRESHOLD = 5818;
const SURTAX_1_RATE = 0.2;
const SURTAX_2_THRESHOLD = 7446;
const SURTAX_2_RATE = 0.36;

// Ontario tax reduction 2026 (basic personal amount portion only)
const ONTARIO_TAX_REDUCTION_BASE = 300;

// CPP 2026
const CPP_YMPE = 74600;
const CPP_EXEMPTION = 3500;
const CPP_RATE = 0.0595; // base 4.95% (credit) + enhanced 1% (deduction)
const CPP_BASE_RATE = 0.0495;

// CPP2 2026
const CPP2_YAMPE = 85000;
const CPP2_RATE = 0.04;

// EI 2026
const EI_MIE = 68900;
const EI_RATE = 0.0163;

// Dividend gross-ups and dividend tax credits (2026, as % of the grossed-up amount)
export type DividendType = 'eligible' | 'non_eligible';

const DIVIDEND_RATES: Record<
  DividendType,
  { grossUp: number; federalCreditRate: number; ontarioCreditRate: number }
> = {
  eligible: { grossUp: 1.38, federalCreditRate: 0.150198, ontarioCreditRate: 0.1 },
  non_eligible: { grossUp: 1.15, federalCreditRate: 0.090301, ontarioCreditRate: 0.029863 },
};

function taxFromBrackets(taxableIncome: number, brackets: Bracket[]): number {
  let tax = 0;
  let previousMax = 0;
  for (const bracket of brackets) {
    if (taxableIncome <= previousMax) break;
    tax += (Math.min(taxableIncome, bracket.max) - previousMax) * bracket.rate;
    previousMax = bracket.max;
  }
  return tax;
}

// Premium thresholds are based on taxable income (CRA T4032-ON, page A-6)
function calculateOntarioHealthPremium(taxableIncome: number): number {
  if (taxableIncome <= 20000) return 0;
  if (taxableIncome <= 36000) return Math.min(300, (taxableIncome - 20000) * 0.06);
  if (taxableIncome <= 48000) return Math.min(450, 300 + (taxableIncome - 36000) * 0.06);
  if (taxableIncome <= 72000) return Math.min(600, 450 + (taxableIncome - 48000) * 0.25);
  if (taxableIncome <= 200000) return Math.min(750, 600 + (taxableIncome - 72000) * 0.25);
  return Math.min(900, 750 + (taxableIncome - 200000) * 0.25);
}

function federalBpa(taxableIncome: number): number {
  if (taxableIncome <= FEDERAL_BPA_PHASEOUT_START) return FEDERAL_BPA_MAX;
  if (taxableIncome >= FEDERAL_BPA_PHASEOUT_END) return FEDERAL_BPA_MIN;
  const phaseOutRatio =
    (taxableIncome - FEDERAL_BPA_PHASEOUT_START) /
    (FEDERAL_BPA_PHASEOUT_END - FEDERAL_BPA_PHASEOUT_START);
  return FEDERAL_BPA_MAX - phaseOutRatio * (FEDERAL_BPA_MAX - FEDERAL_BPA_MIN);
}

export interface SalaryTaxOptions {
  /**
   * Owner-managers holding more than 40% of voting shares are not insurable
   * under the EI Act, so neither employee nor employer premiums apply.
   */
  eiExempt?: boolean;
}

function computeAnnual(
  annualIncome: number,
  options: SalaryTaxOptions = {}
): Omit<TaxResult, 'marginalTaxRate' | 'averageTaxRate'> {
  const income = Math.max(0, annualIncome);

  // CPP1: 5.95% of pensionable earnings between the $3,500 exemption and YMPE
  const pensionable = Math.min(Math.max(income - CPP_EXEMPTION, 0), CPP_YMPE - CPP_EXEMPTION);
  const cpp = pensionable * CPP_RATE;
  const cppBase = pensionable * CPP_BASE_RATE; // credit portion
  const cppEnhanced = cpp - cppBase; // deduction portion

  // CPP2: 4% of earnings between YMPE and YAMPE (fully deductible)
  const cpp2 =
    income > CPP_YMPE ? (Math.min(income, CPP2_YAMPE) - CPP_YMPE) * CPP2_RATE : 0;

  const ei = options.eiExempt ? 0 : Math.min(income, EI_MIE) * EI_RATE;

  const taxableIncome = Math.max(0, income - cppEnhanced - cpp2);

  // Federal tax
  const federalRaw = taxFromBrackets(taxableIncome, FEDERAL_BRACKETS);
  const cea = Math.min(CANADA_EMPLOYMENT_AMOUNT, income);
  const federalCredits =
    (federalBpa(taxableIncome) + cppBase + ei + cea) * FEDERAL_LOWEST_RATE;
  const federalTax = Math.max(0, federalRaw - federalCredits);

  // Ontario tax
  const ontarioRaw = taxFromBrackets(taxableIncome, ONTARIO_BRACKETS);
  const ontarioCredits = (ONTARIO_BPA + cppBase + ei) * ONTARIO_LOWEST_RATE;
  const basicOntarioTax = Math.max(0, ontarioRaw - ontarioCredits);

  let surtax = 0;
  if (basicOntarioTax > SURTAX_1_THRESHOLD) {
    surtax += (basicOntarioTax - SURTAX_1_THRESHOLD) * SURTAX_1_RATE;
  }
  if (basicOntarioTax > SURTAX_2_THRESHOLD) {
    surtax += (basicOntarioTax - SURTAX_2_THRESHOLD) * SURTAX_2_RATE;
  }

  const ontarioTaxWithSurtax = basicOntarioTax + surtax;
  const ontarioTaxReduction = Math.min(
    ontarioTaxWithSurtax,
    Math.max(0, 2 * ONTARIO_TAX_REDUCTION_BASE - ontarioTaxWithSurtax)
  );
  const provincialTax = ontarioTaxWithSurtax - ontarioTaxReduction;

  const ontarioHealthPremium = calculateOntarioHealthPremium(taxableIncome);

  const totalTax = federalTax + provincialTax + ontarioHealthPremium + cpp + cpp2 + ei;

  return {
    grossIncome: income,
    federalTax,
    provincialTax,
    ontarioHealthPremium,
    cppDeduction: cpp,
    cpp2Deduction: cpp2,
    eiDeduction: ei,
    totalTax,
    netPay: income - totalTax,
  };
}

/**
 * Calculate 2026 Ontario taxes for an ANNUAL gross salary.
 * Use `convertTaxResult` to express the result in another pay period.
 */
export function calculateTaxes(annualIncome: number, options: SalaryTaxOptions = {}): TaxResult {
  const result = computeAnnual(annualIncome, options);

  // Marginal rate: numerical delta on the next $100 of gross income
  const delta = 100;
  const bumped = computeAnnual(Math.max(0, annualIncome) + delta, options);
  const marginalTaxRate = ((bumped.totalTax - result.totalTax) / delta) * 100;

  const averageTaxRate =
    result.grossIncome > 0 ? (result.totalTax / result.grossIncome) * 100 : 0;

  return { ...result, marginalTaxRate, averageTaxRate };
}

export interface DividendTaxResult {
  /** Actual (cash) dividends received */
  actualDividend: number;
  /** Taxable (grossed-up) amount */
  grossedUpDividend: number;
  federalTax: number;
  provincialTax: number;
  ontarioHealthPremium: number;
  federalDividendTaxCredit: number;
  provincialDividendTaxCredit: number;
  totalTax: number;
  netCash: number;
  averageTaxRate: number; // percent of actual dividend
  marginalTaxRate: number; // percent on next $ of actual dividend
}

function computeDividendAnnual(
  actualDividend: number,
  type: DividendType
): Omit<DividendTaxResult, 'marginalTaxRate' | 'averageTaxRate'> {
  const dividend = Math.max(0, actualDividend);
  const rates = DIVIDEND_RATES[type];
  const grossedUp = dividend * rates.grossUp;

  const federalDtc = grossedUp * rates.federalCreditRate;
  const provincialDtc = grossedUp * rates.ontarioCreditRate;

  // Federal tax: brackets on grossed-up income, minus BPA and dividend tax credit
  const federalRaw = taxFromBrackets(grossedUp, FEDERAL_BRACKETS);
  const federalBpaCredit = federalBpa(grossedUp) * FEDERAL_LOWEST_RATE;
  const federalTax = Math.max(0, federalRaw - federalBpaCredit - federalDtc);

  // Ontario tax: the dividend tax credit reduces basic tax BEFORE surtax
  const ontarioRaw = taxFromBrackets(grossedUp, ONTARIO_BRACKETS);
  const ontarioBpaCredit = ONTARIO_BPA * ONTARIO_LOWEST_RATE;
  const basicOntarioTax = Math.max(0, ontarioRaw - ontarioBpaCredit - provincialDtc);

  let surtax = 0;
  if (basicOntarioTax > SURTAX_1_THRESHOLD) {
    surtax += (basicOntarioTax - SURTAX_1_THRESHOLD) * SURTAX_1_RATE;
  }
  if (basicOntarioTax > SURTAX_2_THRESHOLD) {
    surtax += (basicOntarioTax - SURTAX_2_THRESHOLD) * SURTAX_2_RATE;
  }

  const ontarioTaxWithSurtax = basicOntarioTax + surtax;
  const ontarioTaxReduction = Math.min(
    ontarioTaxWithSurtax,
    Math.max(0, 2 * ONTARIO_TAX_REDUCTION_BASE - ontarioTaxWithSurtax)
  );
  const provincialTax = ontarioTaxWithSurtax - ontarioTaxReduction;

  const ontarioHealthPremium = calculateOntarioHealthPremium(grossedUp);

  const totalTax = federalTax + provincialTax + ontarioHealthPremium;

  return {
    actualDividend: dividend,
    grossedUpDividend: grossedUp,
    federalTax,
    provincialTax,
    ontarioHealthPremium,
    federalDividendTaxCredit: federalDtc,
    provincialDividendTaxCredit: provincialDtc,
    totalTax,
    netCash: dividend - totalTax,
  };
}

/**
 * Calculate 2026 Ontario personal taxes on an ANNUAL actual (cash) dividend,
 * assuming it is the person's only income. No CPP/EI applies to dividends.
 */
export function calculateDividendTaxes(
  actualDividend: number,
  type: DividendType
): DividendTaxResult {
  const result = computeDividendAnnual(actualDividend, type);

  const delta = 100;
  const bumped = computeDividendAnnual(Math.max(0, actualDividend) + delta, type);
  const marginalTaxRate = ((bumped.totalTax - result.totalTax) / delta) * 100;

  const averageTaxRate =
    result.actualDividend > 0 ? (result.totalTax / result.actualDividend) * 100 : 0;

  return { ...result, marginalTaxRate, averageTaxRate };
}

/** Convert an annual TaxResult into a per-period view (rates are unchanged). */
export function convertTaxResult(
  result: TaxResult,
  period: TaxPeriod,
  schedule: WorkSchedule = DEFAULT_WORK_SCHEDULE
): TaxResult {
  const divisor = periodsPerYear(period, schedule);
  return {
    grossIncome: result.grossIncome / divisor,
    federalTax: result.federalTax / divisor,
    provincialTax: result.provincialTax / divisor,
    ontarioHealthPremium: result.ontarioHealthPremium / divisor,
    cppDeduction: result.cppDeduction / divisor,
    cpp2Deduction: result.cpp2Deduction / divisor,
    eiDeduction: result.eiDeduction / divisor,
    totalTax: result.totalTax / divisor,
    netPay: result.netPay / divisor,
    marginalTaxRate: result.marginalTaxRate,
    averageTaxRate: result.averageTaxRate,
  };
}
