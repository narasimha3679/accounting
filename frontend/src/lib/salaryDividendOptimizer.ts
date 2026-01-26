/**
 * Salary vs Dividend Optimizer
 * 
 * Calculates optimal mix of salary and dividends to minimize tax burden
 * while considering CPP contributions, RRSP room, and RDTOH refunds.
 */

import { calculateBracketTax } from './taxTables';
import { round } from './payrollConstants';
import type { TaxBracket, TaxConstants } from './payrollTypes';

// Dividend gross-up and tax credit rates (2024 CRA rates)
const ELIGIBLE_GROSS_UP = 1.38; // 38% gross-up
const NON_ELIGIBLE_GROSS_UP = 1.15; // 15% gross-up
const ELIGIBLE_FEDERAL_TAX_CREDIT_RATE = 0.150198; // 15.0198% of grossed-up amount
const NON_ELIGIBLE_FEDERAL_TAX_CREDIT_RATE = 0.090301; // 9.0301% of grossed-up amount

// Provincial dividend tax credit rates (as percentage of grossed-up amount)
// These are approximate - actual rates vary by province and income level
const PROVINCIAL_DIVIDEND_TAX_CREDITS: Record<string, { eligible: number; nonEligible: number }> = {
    ON: { eligible: 0.10, nonEligible: 0.0338 }, // Ontario
    BC: { eligible: 0.12, nonEligible: 0.02 }, // British Columbia
    AB: { eligible: 0.10, nonEligible: 0.02 }, // Alberta
    QC: { eligible: 0.1175, nonEligible: 0.02 }, // Quebec (different system)
    SK: { eligible: 0.11, nonEligible: 0.02 }, // Saskatchewan
    MB: { eligible: 0.11, nonEligible: 0.02 }, // Manitoba
    NB: { eligible: 0.10, nonEligible: 0.02 }, // New Brunswick
    NS: { eligible: 0.08, nonEligible: 0.02 }, // Nova Scotia
    PE: { eligible: 0.10, nonEligible: 0.02 }, // Prince Edward Island
    NL: { eligible: 0.10, nonEligible: 0.02 }, // Newfoundland and Labrador
    YT: { eligible: 0.10, nonEligible: 0.02 }, // Yukon
    NT: { eligible: 0.10, nonEligible: 0.02 }, // Northwest Territories
    NU: { eligible: 0.10, nonEligible: 0.02 }, // Nunavut
};

// RDTOH refund rate: $1 refund per $2.61 of non-eligible dividends (2024)
const RDTOH_REFUND_RATE = 1 / 2.61;

// CPP constants are now passed in via TaxConstants inputs


export interface OptimizerInputs {
    corporateNetIncome: number;
    rdtohBalance: number;
    otherPersonalIncome: number;
    province: string;
    desiredPersonalCash?: number;
    maximizeCPP?: boolean;
    prioritizeRRSPRoom?: boolean;
    fiscalYear: number;
    smallBusinessTaxRate: number;
    federalBrackets: TaxBracket[];
    provincialBrackets: TaxBracket[];
    taxConstants: TaxConstants;
    provincialConstants?: {
        surtax_threshold_1?: number | null;
        surtax_threshold_2?: number | null;
        surtax_rate_1?: number | null;
        surtax_rate_2?: number | null;
    };
}

export interface CompensationScenario {
    salary: number;
    eligibleDividends: number;
    nonEligibleDividends: number;

    // Corporate impact
    corporateTax: number;
    rdtohRefund: number;
    employerCPP: number; // NEW
    employerEI: number;  // NEW

    // Personal impact
    cppContributions: number; // This is employee portion
    federalTax: number;
    provincialTax: number;
    totalPersonalTax: number;

    // Net results
    rrspRoomGenerated: number;
    netCashToOwner: number;
    totalTaxBurden: number; // corp + personal + employer cpp/ei - RDTOH refund
    effectiveTaxRate: number;

    // Details
    grossedUpEligibleDividends: number;
    grossedUpNonEligibleDividends: number;
    federalDividendTaxCredit: number;
    provincialDividendTaxCredit: number;
}

/**
 * Calculate small business tax on corporate income
 */
function calculateSmallBusinessTax(income: number, rate: number): number {
    return round(Math.max(0, income) * rate);
}

/**
 * Calculate CPP contributions for annual salary
 */
function calculateCPP(salary: number, constants: TaxConstants): number {
    if (salary <= 0) return 0;

    // Use constants from input or fallbacks if missing (though they should be present)
    const ympe = constants.cpp_ympe || 68500;
    const basicExemption = constants.cpp_basic_exemption || 3500;
    const rate = constants.cpp_rate || 0.0595;

    const pensionableEarnings = Math.min(salary, ympe);
    const contributionBase = Math.max(0, pensionableEarnings - basicExemption);
    const contribution = contributionBase * rate;

    return round(contribution);
}

/**
 * Gross up dividends for tax purposes
 */
function grossUpDividends(amount: number, type: 'eligible' | 'non_eligible'): number {
    if (amount <= 0) return 0;
    const grossUp = type === 'eligible' ? ELIGIBLE_GROSS_UP : NON_ELIGIBLE_GROSS_UP;
    return round(amount * grossUp);
}

/**
 * Calculate federal dividend tax credit
 */
function calculateFederalDividendTaxCredit(
    eligibleDividends: number,
    nonEligibleDividends: number
): number {
    const grossedUpEligible = grossUpDividends(eligibleDividends, 'eligible');
    const grossedUpNonEligible = grossUpDividends(nonEligibleDividends, 'non_eligible');

    const eligibleCredit = grossedUpEligible * ELIGIBLE_FEDERAL_TAX_CREDIT_RATE;
    const nonEligibleCredit = grossedUpNonEligible * NON_ELIGIBLE_FEDERAL_TAX_CREDIT_RATE;

    return round(eligibleCredit + nonEligibleCredit);
}

/**
 * Calculate provincial dividend tax credit
 */
function calculateProvincialDividendTaxCredit(
    eligibleDividends: number,
    nonEligibleDividends: number,
    province: string
): number {
    const credits = PROVINCIAL_DIVIDEND_TAX_CREDITS[province] || PROVINCIAL_DIVIDEND_TAX_CREDITS.ON;

    const grossedUpEligible = grossUpDividends(eligibleDividends, 'eligible');
    const grossedUpNonEligible = grossUpDividends(nonEligibleDividends, 'non_eligible');

    const eligibleCredit = grossedUpEligible * credits.eligible;
    const nonEligibleCredit = grossedUpNonEligible * credits.nonEligible;

    return round(eligibleCredit + nonEligibleCredit);
}

/**
 * Calculate Ontario surtax (if applicable)
 */
function calculateOntarioSurtax(
    baseProvincialTax: number,
    provincialConstants?: OptimizerInputs['provincialConstants']
): number {
    if (!provincialConstants) return 0;

    const threshold1 = provincialConstants.surtax_threshold_1 ?? 5554;
    const threshold2 = provincialConstants.surtax_threshold_2 ?? 7108;
    const rate1 = provincialConstants.surtax_rate_1 ?? 0.20;
    const rate2 = provincialConstants.surtax_rate_2 ?? 0.36;

    let surtax = 0;

    if (baseProvincialTax > threshold1) {
        surtax += (Math.min(baseProvincialTax, threshold2) - threshold1) * rate1;
    }

    if (baseProvincialTax > threshold2) {
        surtax += (baseProvincialTax - threshold2) * rate2;
    }

    return round(surtax);
}

/**
 * Calculate personal income tax (federal and provincial)
 */
function calculatePersonalTax(
    taxableIncome: number,
    inputs: OptimizerInputs
): { federalTax: number; provincialTax: number } {
    // Calculate federal tax on taxable income
    const federalTaxBeforeCredits = calculateBracketTax(taxableIncome, inputs.federalBrackets);

    // Apply basic personal amount (lowest bracket rate)
    const lowestFederalRate = inputs.federalBrackets[0]?.rate || 0.15;
    const federalBasicPersonalAmount = inputs.taxConstants.federal_basic_personal_amount || 15000;
    const federalCredits = federalBasicPersonalAmount * lowestFederalRate;
    const federalTax = Math.max(0, federalTaxBeforeCredits - federalCredits);

    // Calculate provincial tax
    const provincialTaxBeforeCredits = calculateBracketTax(taxableIncome, inputs.provincialBrackets);

    // Apply Ontario surtax if applicable
    let ontarioSurtax = 0;
    if (inputs.province === 'ON') {
        ontarioSurtax = calculateOntarioSurtax(provincialTaxBeforeCredits, inputs.provincialConstants);
    }

    const totalProvincialTaxBeforeCredits = provincialTaxBeforeCredits + ontarioSurtax;

    // Apply basic personal amount (lowest bracket rate)
    const lowestProvincialRate = inputs.provincialBrackets[0]?.rate || 0.0505;
    const provincialBasicPersonalAmount = 12000; // Approximate - varies by province
    const provincialCredits = provincialBasicPersonalAmount * lowestProvincialRate;
    const provincialTax = Math.max(0, totalProvincialTaxBeforeCredits - provincialCredits);

    return {
        federalTax: round(federalTax),
        provincialTax: round(provincialTax),
    };
}

/**
 * Calculate RDTOH refund from non-eligible dividends
 */
function calculateRDTOHRefund(nonEligibleDividends: number, rdtohBalance: number): number {
    const potentialRefund = nonEligibleDividends * RDTOH_REFUND_RATE;
    return round(Math.min(potentialRefund, rdtohBalance));
}

/**
 * Calculate complete scenario for a given salary/dividend mix
 */
export function calculateScenario(
    inputs: OptimizerInputs,
    salary: number,
    eligibleDividends: number,
    nonEligibleDividends: number
): CompensationScenario {
    // 0. Calculate Employer Payroll Taxes (Expenses)
    // Employer CPP
    const employerCPP = Math.min(
        Math.max(0, salary - (inputs.taxConstants.cpp_basic_exemption || 3500)) * (inputs.taxConstants.cpp_employer_rate || 1), // usually same as employee rate
        inputs.taxConstants.cpp_max_contribution || 3867.50
    );

    // Employer EI - usually 1.4x employee rate
    // Note: Owners are often EI exempt, but if we want to be safe or if they opted in:
    // Let's assume standard for now, but keeping it minimal if 0 salary.
    // Actually, usually owners are exempt. But if we are "accounting for it" as requested:
    // We'll calculate it.
    const employerEIRate = (inputs.taxConstants.ei_employee_rate || 0.0166) * (inputs.taxConstants.ei_employer_multiplier || 1.4);
    const employerEI = Math.min(
        salary * employerEIRate,
        (inputs.taxConstants.ei_max_premium || 1049.12) * (inputs.taxConstants.ei_employer_multiplier || 1.4)
    );

    // 1. Calculate corporate tax on remaining income
    // Deduct Salary AND Employer Taxes from Net Income before tax
    const remainingCorpIncome = inputs.corporateNetIncome - salary - employerCPP - employerEI;
    const corporateTax = calculateSmallBusinessTax(remainingCorpIncome, inputs.smallBusinessTaxRate);

    // 2. Calculate available funds after corporate tax
    const afterTaxCorporateIncome = remainingCorpIncome - corporateTax;

    // Ensure dividends don't exceed available funds
    const totalDividends = eligibleDividends + nonEligibleDividends;
    if (totalDividends > afterTaxCorporateIncome) {
        // Find scale, but handle cases where afterTaxCorporateIncome < 0 (loss)
        if (afterTaxCorporateIncome <= 0) {
            eligibleDividends = 0;
            nonEligibleDividends = 0;
        } else {
            // Scale down dividends proportionally
            const scale = afterTaxCorporateIncome / totalDividends;
            eligibleDividends = eligibleDividends * scale;
            nonEligibleDividends = nonEligibleDividends * scale;
        }
    }

    // 3. Calculate RDTOH refund from non-eligible dividends
    const rdtohRefund = calculateRDTOHRefund(nonEligibleDividends, inputs.rdtohBalance);

    // 4. Calculate CPP contributions (Employee portion)
    const cppContributions = calculateCPP(salary, inputs.taxConstants);

    // 5. Calculate grossed-up dividends
    const grossedUpEligible = grossUpDividends(eligibleDividends, 'eligible');
    const grossedUpNonEligible = grossUpDividends(nonEligibleDividends, 'non_eligible');

    // 6. Calculate personal taxable income (grossed-up dividends + salary + other income)
    const taxableIncome = salary + grossedUpEligible + grossedUpNonEligible + inputs.otherPersonalIncome;

    // 7. Calculate personal taxes before dividend credits
    const { federalTax: federalTaxBeforeCredits, provincialTax: provincialTaxBeforeCredits } =
        calculatePersonalTax(taxableIncome, inputs);

    // 8. Calculate dividend tax credits
    const federalDividendTaxCredit = calculateFederalDividendTaxCredit(eligibleDividends, nonEligibleDividends);
    const provincialDividendTaxCredit = calculateProvincialDividendTaxCredit(
        eligibleDividends,
        nonEligibleDividends,
        inputs.province
    );

    // 9. Apply dividend tax credits
    const federalTax = Math.max(0, federalTaxBeforeCredits - federalDividendTaxCredit);
    const provincialTax = Math.max(0, provincialTaxBeforeCredits - provincialDividendTaxCredit);
    const totalPersonalTax = federalTax + provincialTax;

    // 10. Calculate net cash to owner
    const netCashToOwner = round(
        salary - cppContributions - federalTax - provincialTax + eligibleDividends + nonEligibleDividends
    );

    // 11. Calculate RRSP room (18% of earned income, max $31,560 for 2024)
    const rrspRoomGenerated = round(Math.min(salary * 0.18, 31560));

    // 12. Calculate total tax burden (corporate + personal + employer taxes - RDTOH refund)
    // We include Employer Taxes in burden because it's money leaving the "ecosystem"
    // (Owner + Corp combo) to the government.
    const totalTaxBurden = round(corporateTax + totalPersonalTax + employerCPP + employerEI - rdtohRefund);

    // 13. Calculate effective tax rate
    const effectiveTaxRate =
        inputs.corporateNetIncome > 0
            ? round((totalTaxBurden / inputs.corporateNetIncome) * 100)
            : 0;

    return {
        salary: round(salary),
        eligibleDividends: round(eligibleDividends),
        nonEligibleDividends: round(nonEligibleDividends),
        corporateTax,
        rdtohRefund,
        employerCPP: round(employerCPP),
        employerEI: round(employerEI),
        cppContributions,
        federalTax,
        provincialTax,
        totalPersonalTax,
        rrspRoomGenerated,
        netCashToOwner,
        totalTaxBurden,
        effectiveTaxRate,
        grossedUpEligibleDividends: grossedUpEligible,
        grossedUpNonEligibleDividends: grossedUpNonEligible,
        federalDividendTaxCredit,
        provincialDividendTaxCredit,
    };
}

/**
 * Find optimal mix of salary and dividends
 */
export function findOptimalMix(inputs: OptimizerInputs): CompensationScenario[] {
    const scenarios: CompensationScenario[] = [];
    const cppYmpe = inputs.taxConstants.cpp_ympe || 68500;

    // Scenario 1: All salary
    scenarios.push(calculateScenario(inputs, inputs.corporateNetIncome, 0, 0));

    // Scenario 2: All non-eligible dividends
    const afterCorpTaxAllNonEligible = inputs.corporateNetIncome * (1 - inputs.smallBusinessTaxRate);
    scenarios.push(calculateScenario(inputs, 0, 0, afterCorpTaxAllNonEligible));

    // Scenario 3: All eligible dividends
    const afterCorpTaxAllEligible = inputs.corporateNetIncome * (1 - inputs.smallBusinessTaxRate);
    scenarios.push(calculateScenario(inputs, 0, afterCorpTaxAllEligible, 0));

    // Scenario 4: Optimal mix based on strategy
    let optimalSalary = 0;
    let optimalEligibleDividends = 0;
    let optimalNonEligibleDividends = 0;

    if (inputs.desiredPersonalCash) {
        // Optimization target: minimize tax burden while meeting cash requirement
        // We will handle this in the iterative search below
        optimalSalary = 0; // Placeholder, will be overwritten by iterative result
    } else if (inputs.maximizeCPP) {
        // Take salary up to CPP max to maximize CPP contributions
        optimalSalary = Math.min(cppYmpe, inputs.corporateNetIncome);
    } else if (inputs.prioritizeRRSPRoom) {
        // Maximize salary to generate RRSP room (up to reasonable limit)
        optimalSalary = Math.min(inputs.corporateNetIncome * 0.6, 175000); // 60% or $175k max
    } else {
        // Balanced approach: take some salary for CPP, rest as dividends
        optimalSalary = Math.min(cppYmpe * 0.8, inputs.corporateNetIncome * 0.3);
    }

    // If not using desired cash strategy, calculate the single point estimate now
    if (!inputs.desiredPersonalCash) {
        // Calculate remaining corporate income after salary
        const remainingCorpIncome = inputs.corporateNetIncome - optimalSalary;
        const corporateTax = calculateSmallBusinessTax(remainingCorpIncome, inputs.smallBusinessTaxRate);
        const afterTaxIncome = remainingCorpIncome - corporateTax;

        // Use RDTOH balance first with non-eligible dividends
        if (inputs.rdtohBalance > 0) {
            const maxNonEligibleFromRDTOH = inputs.rdtohBalance / RDTOH_REFUND_RATE;
            optimalNonEligibleDividends = Math.min(maxNonEligibleFromRDTOH, afterTaxIncome * 0.5);
        }

        // Remaining as eligible dividends
        optimalEligibleDividends = Math.max(0, afterTaxIncome - optimalNonEligibleDividends);

        scenarios.push(calculateScenario(inputs, optimalSalary, optimalEligibleDividends, optimalNonEligibleDividends));
    }

    // Scenario 5: Custom optimization - iterate to find best mix
    // Try different salary levels and find the one with lowest tax burden
    // If desiredPersonalCash is set, filter for scenarios that meet the cash requirement

    let bestScenario: CompensationScenario | null = null;
    let bestMetric = Infinity; // Metric to minimize (usually tax burden)

    // Refined iteration step: $1,000 increments for better precision
    const step = 1000;

    for (let salary = 0; salary <= inputs.corporateNetIncome; salary += step) {
        const remaining = inputs.corporateNetIncome - salary;
        if (remaining < 0) break;

        const corpTax = calculateSmallBusinessTax(remaining, inputs.smallBusinessTaxRate);
        const afterTax = remaining - corpTax;

        // Try different dividend mixes (0%, 25%, 50%, 75%, 100% non-eligible)
        // More granular dividend mix check
        const dividendSteps = 5;

        for (let i = 0; i <= dividendSteps; i++) {
            const nonEligiblePct = i / dividendSteps;
            const nonEligible = afterTax * nonEligiblePct;
            const eligible = afterTax * (1 - nonEligiblePct);

            const scenario = calculateScenario(inputs, salary, eligible, nonEligible);

            if (inputs.desiredPersonalCash) {
                // If targeting specific cash, we want the lowest tax burden that meets the cash requirement
                if (scenario.netCashToOwner >= inputs.desiredPersonalCash) {
                    // Check if this is better than current best
                    // We prioritize:
                    // 1. Meeting the cash target (already checked)
                    // 2. Lowest total tax burden
                    if (scenario.totalTaxBurden < bestMetric) {
                        bestMetric = scenario.totalTaxBurden;
                        bestScenario = scenario;
                    }
                }
            } else {
                // Standard optimization: Minimize total tax burden
                if (scenario.totalTaxBurden < bestMetric) {
                    bestMetric = scenario.totalTaxBurden;
                    bestScenario = scenario;
                }
            }
        }
    }

    // If we found a best scenario via iteration, add it
    if (bestScenario) {
        // Only add if it's different from existing scenarios
        const isNewScenario = !scenarios.some(
            (s) =>
                Math.abs(s.salary - (bestScenario?.salary || 0)) < 100 &&
                Math.abs(s.eligibleDividends - (bestScenario?.eligibleDividends || 0)) < 100 &&
                Math.abs(s.nonEligibleDividends - (bestScenario?.nonEligibleDividends || 0)) < 100
        );

        if (isNewScenario) {
            scenarios.push(bestScenario);
        }
    } else if (inputs.desiredPersonalCash) {
        // If we strictly needed cash and couldn't find ANY scenario, 
        // fallback to the one that gives MAX cash (likely all dividends or mix) to show "closest possible"
        // But usually "All Salary" or "All Dividends" are already in the list.
    }

    // Sort scenarios based on inputs and strategies
    return scenarios.sort((a, b) => {
        // 1. If desiredPersonalCash is set, prioritize meeting it
        if (inputs.desiredPersonalCash) {
            const aMet = a.netCashToOwner >= inputs.desiredPersonalCash;
            const bMet = b.netCashToOwner >= inputs.desiredPersonalCash;
            if (aMet && !bMet) return -1;
            if (!aMet && bMet) return 1;
            // If both met (or neither met), optimize for tax
        }

        // 2. If maximizeCPP is set, prioritize high salary (up to YMPE)
        if (inputs.maximizeCPP) {
            // Check if scenario maximizes CPP (approximate check using salary against YMPE)
            const ympe = inputs.taxConstants.cpp_ympe || 68500;
            // Consider "maximized" if salary covers YMPE or uses all available income
            const targetSalary = Math.min(ympe, inputs.corporateNetIncome);
            const aMaxed = a.salary >= targetSalary - 100;
            const bMaxed = b.salary >= targetSalary - 100;

            if (aMaxed && !bMaxed) return -1;
            if (!aMaxed && bMaxed) return 1;
        }

        // 3. Default: Minimize total tax burden
        return a.totalTaxBurden - b.totalTaxBurden;
    });
}

/**
 * Get recommendation based on scenarios
 */
export function getRecommendation(scenarios: CompensationScenario[]): {
    recommended: CompensationScenario;
    explanation: string;
    considerations: string[];
} {
    if (scenarios.length === 0) {
        throw new Error('No scenarios to analyze');
    }

    const best = scenarios[0]; // Already sorted by tax burden

    const considerations: string[] = [];

    // Check if salary is significant
    if (best.salary > 0) {
        considerations.push(
            `Salary of $${best.salary.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} generates $${best.cppContributions.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in CPP contributions and $${best.rrspRoomGenerated.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in RRSP contribution room.`
        );
    }

    // Check RDTOH usage
    if (best.rdtohRefund > 0) {
        considerations.push(
            `Using $${best.nonEligibleDividends.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in non-eligible dividends generates a $${best.rdtohRefund.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RDTOH refund, reducing your total tax burden.`
        );
    }

    // Compare to other scenarios
    if (scenarios.length > 1) {
        const allSalary = scenarios.find((s) => s.eligibleDividends === 0 && s.nonEligibleDividends === 0);
        if (allSalary) {
            const savings = allSalary.totalTaxBurden - best.totalTaxBurden;
            if (savings > 100) {
                considerations.push(
                    `This mix saves $${savings.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} compared to taking all salary.`
                );
            }
        }
    }

    let explanation = `The optimal compensation mix is $${best.salary.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in salary`;

    if (best.eligibleDividends > 0 && best.nonEligibleDividends > 0) {
        explanation += `, $${best.nonEligibleDividends.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in non-eligible dividends, and $${best.eligibleDividends.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in eligible dividends`;
    } else if (best.nonEligibleDividends > 0) {
        explanation += ` and $${best.nonEligibleDividends.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in non-eligible dividends`;
    } else if (best.eligibleDividends > 0) {
        explanation += ` and $${best.eligibleDividends.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in eligible dividends`;
    }

    explanation += `. This results in a total tax burden of $${best.totalTaxBurden.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (effective rate of ${best.effectiveTaxRate.toFixed(2)}%) and net cash of $${best.netCashToOwner.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;

    return {
        recommended: best,
        explanation,
        considerations,
    };
}

/**
 * Generate multiple strategy options based on user goals
 */
export interface StrategyOption {
    id: string;
    name: string;
    description: string;
    scenario: CompensationScenario;
    pros: string[];
    cons: string[];
}

export interface StrategyOptionsResult {
    options: StrategyOption[];
    recommended: string;
    explanation: string;
}

export function generateStrategyOptions(
    inputs: OptimizerInputs,
    selectedGoals: string[]
): StrategyOptionsResult {
    const options: StrategyOption[] = [];
    const cppYmpe = inputs.taxConstants.cpp_ympe || 68500;

    // Strategy 1: Tax Minimizer
    const taxMinimizerInputs: OptimizerInputs = {
        ...inputs,
        maximizeCPP: false,
        prioritizeRRSPRoom: false,
        desiredPersonalCash: undefined,
    };
    const taxMinimizerScenarios = findOptimalMix(taxMinimizerInputs);
    const taxMinimizer = taxMinimizerScenarios[0];

    if (taxMinimizer) {
        const pros: string[] = [];
        const cons: string[] = [];

        if (taxMinimizer.rdtohRefund > 0) {
            pros.push(`Triggers $${taxMinimizer.rdtohRefund.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} RDTOH refund`);
        }
        pros.push(`Lowest total tax: $${taxMinimizer.totalTaxBurden.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
        pros.push(`Effective tax rate: ${taxMinimizer.effectiveTaxRate.toFixed(1)}%`);

        if (taxMinimizer.rrspRoomGenerated < 10000) {
            cons.push('Limited RRSP room generated');
        }
        if (taxMinimizer.cppContributions < 3000) {
            cons.push('Lower CPP contributions');
        }

        options.push({
            id: 'tax_minimizer',
            name: 'Tax Minimizer',
            description: 'Lowest total tax burden',
            scenario: taxMinimizer,
            pros,
            cons,
        });
    }

    // Strategy 2: RRSP Builder
    const rrspBuilderInputs: OptimizerInputs = {
        ...inputs,
        maximizeCPP: false,
        prioritizeRRSPRoom: true,
        desiredPersonalCash: undefined,
    };
    const rrspBuilderScenarios = findOptimalMix(rrspBuilderInputs);
    const rrspBuilder = rrspBuilderScenarios.find(s => s.rrspRoomGenerated > 0) || rrspBuilderScenarios[0];

    if (rrspBuilder && rrspBuilder.rrspRoomGenerated > 0) {
        const pros: string[] = [];
        const cons: string[] = [];

        pros.push(`Generates $${rrspBuilder.rrspRoomGenerated.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} in RRSP room`);
        if (rrspBuilder.cppContributions > 3000) {
            pros.push(`Builds $${rrspBuilder.cppContributions.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} in CPP contributions`);
        }

        cons.push(`Higher tax burden: $${rrspBuilder.totalTaxBurden.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
        if (rrspBuilder.netCashToOwner < taxMinimizer?.netCashToOwner * 0.9) {
            cons.push('Lower net cash compared to tax-optimized strategy');
        }

        options.push({
            id: 'rrsp_builder',
            name: 'RRSP Builder',
            description: 'Maximize RRSP contribution room',
            scenario: rrspBuilder,
            pros,
            cons,
        });
    }

    // Strategy 3: CPP Maximizer
    const cppMaximizerInputs: OptimizerInputs = {
        ...inputs,
        maximizeCPP: true,
        prioritizeRRSPRoom: false,
        desiredPersonalCash: undefined,
    };
    const cppMaximizerScenarios = findOptimalMix(cppMaximizerInputs);
    const cppMaximizer = cppMaximizerScenarios.find(s => s.salary >= Math.min(cppYmpe * 0.9, inputs.corporateNetIncome * 0.5)) || cppMaximizerScenarios[0];

    if (cppMaximizer && cppMaximizer.cppContributions > 0) {
        const pros: string[] = [];
        const cons: string[] = [];

        pros.push(`Maximizes CPP contributions: $${cppMaximizer.cppContributions.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
        if (cppMaximizer.rrspRoomGenerated > 10000) {
            pros.push(`Also generates $${cppMaximizer.rrspRoomGenerated.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} in RRSP room`);
        }

        cons.push(`Higher tax burden: $${cppMaximizer.totalTaxBurden.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
        if (cppMaximizer.netCashToOwner < taxMinimizer?.netCashToOwner * 0.9) {
            cons.push('Lower net cash compared to tax-optimized strategy');
        }

        options.push({
            id: 'cpp_maximizer',
            name: 'CPP Maximizer',
            description: 'Maximize CPP benefits for retirement',
            scenario: cppMaximizer,
            pros,
            cons,
        });
    }

    // Strategy 4: Balanced Approach
    const balancedSalary = Math.min(cppYmpe * 0.8, inputs.corporateNetIncome * 0.3);
    const remainingCorpIncome = inputs.corporateNetIncome - balancedSalary;
    const corporateTax = calculateSmallBusinessTax(remainingCorpIncome, inputs.smallBusinessTaxRate);
    const afterTaxIncome = remainingCorpIncome - corporateTax;

    // Use some RDTOH if available
    let balancedNonEligible = 0;
    if (inputs.rdtohBalance > 0) {
        const maxNonEligibleFromRDTOH = inputs.rdtohBalance / RDTOH_REFUND_RATE;
        balancedNonEligible = Math.min(maxNonEligibleFromRDTOH * 0.6, afterTaxIncome * 0.4);
    }
    const balancedEligible = Math.max(0, afterTaxIncome - balancedNonEligible);

    const balanced = calculateScenario(inputs, balancedSalary, balancedEligible, balancedNonEligible);

    const balancedPros: string[] = [];
    const balancedCons: string[] = [];

    if (balanced.rrspRoomGenerated > 5000) {
        balancedPros.push(`Good RRSP room: $${balanced.rrspRoomGenerated.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
    }
    if (balanced.cppContributions > 2000) {
        balancedPros.push(`Reasonable CPP contributions: $${balanced.cppContributions.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
    }
    balancedPros.push(`Balanced tax burden: $${balanced.totalTaxBurden.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);

    if (balanced.totalTaxBurden > taxMinimizer?.totalTaxBurden * 1.1) {
        balancedCons.push('Slightly higher taxes than pure tax minimization');
    }
    if (balanced.rrspRoomGenerated < 10000) {
        balancedCons.push('Less RRSP room than dedicated RRSP strategy');
    }

    options.push({
        id: 'balanced',
        name: 'Balanced Approach',
        description: 'Good mix of all benefits',
        scenario: balanced,
        pros: balancedPros,
        cons: balancedCons,
    });

    // Strategy 5: Custom (if target cash is specified)
    if (inputs.desiredPersonalCash) {
        const customScenarios = findOptimalMix(inputs);
        const custom = customScenarios[0];

        if (custom) {
            const customPros: string[] = [];
            const customCons: string[] = [];

            customPros.push(`Meets your cash target: $${custom.netCashToOwner.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);
            if (custom.totalTaxBurden < taxMinimizer?.totalTaxBurden * 1.05) {
                customPros.push('Tax-efficient while meeting cash needs');
            }

            if (custom.rrspRoomGenerated < 5000) {
                customCons.push('Limited RRSP room');
            }
            if (custom.cppContributions < 2000) {
                customCons.push('Lower CPP contributions');
            }

            options.push({
                id: 'custom_cash',
                name: 'Target Cash Strategy',
                description: `Optimized to meet your $${inputs.desiredPersonalCash.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} cash target`,
                scenario: custom,
                pros: customPros,
                cons: customCons,
            });
        }
    }

    // Determine recommended option based on selected goals
    let recommended = 'balanced';
    let explanation = '';

    if (selectedGoals.includes('net_cash') && inputs.desiredPersonalCash) {
        recommended = 'custom_cash';
        explanation = `This strategy is optimized to meet your target cash amount of $${inputs.desiredPersonalCash.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} while minimizing taxes.`;
    } else if (selectedGoals.includes('minimize_tax') && !selectedGoals.includes('maximize_rrsp') && !selectedGoals.includes('maximize_cpp')) {
        recommended = 'tax_minimizer';
        explanation = 'This strategy minimizes your total tax burden by optimizing the mix of salary and dividends.';
    } else if (selectedGoals.includes('maximize_rrsp') && !selectedGoals.includes('maximize_cpp')) {
        recommended = 'rrsp_builder';
        explanation = 'This strategy maximizes your RRSP contribution room, giving you more flexibility for retirement savings.';
    } else if (selectedGoals.includes('maximize_cpp') && !selectedGoals.includes('maximize_rrsp')) {
        recommended = 'cpp_maximizer';
        explanation = 'This strategy maximizes your CPP contributions, building stronger retirement benefits.';
    } else if (selectedGoals.length > 1) {
        recommended = 'balanced';
        explanation = 'This balanced approach considers all your goals and provides a good mix of tax efficiency, RRSP room, and CPP benefits.';
    } else {
        recommended = 'balanced';
        explanation = 'This balanced approach provides a good mix of all benefits.';
    }

    return {
        options,
        recommended,
        explanation,
    };
}
