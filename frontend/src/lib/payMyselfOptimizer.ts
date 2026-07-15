/**
 * Pay Myself Optimizer
 *
 * Client-side withdrawal optimization for Canadian CCPC owner-managers.
 * Corporate cost → reimbursement / dividend / salary comparison.
 */

import { supabase } from './supabaseClient';
import type { TaxBracket, TaxConstants, ProvincialTaxConstants, DividendTaxConstants, OntarioHealthPremiumTier } from './payrollTypes';
import type { PayMyselfOptimizeResponse } from './payMyselfTypes';

export interface TaxConstantsBundle {
    taxConstants: Partial<TaxConstants>;
    federalBrackets: TaxBracket[];
    provincialBrackets: TaxBracket[];
    provincialConstants: Partial<ProvincialTaxConstants>;
    dividendConstants: DividendTaxConstants[];
    healthPremiumTiers: OntarioHealthPremiumTier[];
    province: string;
    taxYear: number;
}

export interface OptimizerParams {
    corporateCost: number;
    owedToOwner?: number;
    province?: string;
    taxYear?: number;
    ytdPersonalIncome?: number;
    dividendType?: 'eligible' | 'non_eligible';
    smallBusinessRate?: number;
}

function round(value: number): number {
    return Math.round(value * 100) / 100;
}

/**
 * Fetch all tax reference data needed for Pay Myself calculations
 */
export async function fetchTaxConstants(taxYear: number, province = 'ON'): Promise<TaxConstantsBundle> {
    const [
        taxConstantsResult,
        federalBracketsResult,
        provincialBracketsResult,
        provincialConstantsResult,
        dividendConstantsResult,
        healthPremiumResult,
    ] = await Promise.all([
        supabase.from('tax_constants').select('*').eq('tax_year', taxYear).maybeSingle(),
        supabase
            .from('tax_rates')
            .select('min_income, max_income, rate')
            .eq('tax_year', taxYear)
            .eq('jurisdiction', 'federal')
            .order('bracket_number', { ascending: true }),
        supabase
            .from('tax_rates')
            .select('min_income, max_income, rate')
            .eq('tax_year', taxYear)
            .eq('jurisdiction', province)
            .order('bracket_number', { ascending: true }),
        supabase
            .from('provincial_tax_constants')
            .select('*')
            .eq('tax_year', taxYear)
            .eq('province', province)
            .maybeSingle(),
        supabase
            .from('dividend_tax_constants')
            .select('*')
            .eq('tax_year', taxYear)
            .in('province', ['federal', province]),
        province === 'ON'
            ? supabase
                .from('ontario_health_premium')
                .select('*')
                .eq('tax_year', taxYear)
                .order('min_income', { ascending: true })
            : Promise.resolve({ data: [] as OntarioHealthPremiumTier[], error: null }),
    ]);

    if (taxConstantsResult.error) {
        throw new Error(`Failed to fetch tax constants: ${taxConstantsResult.error.message}`);
    }
    if (federalBracketsResult.error) {
        throw new Error(`Failed to fetch federal brackets: ${federalBracketsResult.error.message}`);
    }
    if (provincialBracketsResult.error) {
        throw new Error(`Failed to fetch provincial brackets: ${provincialBracketsResult.error.message}`);
    }
    if (provincialConstantsResult.error) {
        throw new Error(`Failed to fetch provincial constants: ${provincialConstantsResult.error.message}`);
    }
    if (dividendConstantsResult.error) {
        throw new Error(`Failed to fetch dividend constants: ${dividendConstantsResult.error.message}`);
    }
    if (healthPremiumResult.error) {
        throw new Error(`Failed to fetch Ontario Health Premium: ${healthPremiumResult.error.message}`);
    }

    const federalBrackets = (federalBracketsResult.data || []).map(row => ({
        min_income: Number(row.min_income),
        max_income: row.max_income != null ? Number(row.max_income) : null,
        rate: Number(row.rate),
    }));
    const provincialBrackets = (provincialBracketsResult.data || []).map(row => ({
        min_income: Number(row.min_income),
        max_income: row.max_income != null ? Number(row.max_income) : null,
        rate: Number(row.rate),
    }));

    // Fail loudly instead of silently computing $0 tax with missing brackets
    if (!taxConstantsResult.data) {
        throw new Error(`No tax constants found for ${taxYear}. Sign in required, or rates not seeded yet.`);
    }
    if (federalBrackets.length === 0) {
        throw new Error(`No federal tax brackets found for ${taxYear}. Sign in required, or rates not seeded yet.`);
    }
    if (provincialBrackets.length === 0) {
        throw new Error(`No ${province} tax brackets found for ${taxYear}. Sign in required, or rates not seeded yet.`);
    }

    return {
        taxConstants: taxConstantsResult.data || {},
        federalBrackets,
        provincialBrackets,
        provincialConstants: provincialConstantsResult.data || {},
        dividendConstants: (dividendConstantsResult.data || []).map(row => ({
            tax_year: Number(row.tax_year),
            province: row.province,
            dividend_type: row.dividend_type as 'eligible' | 'non_eligible',
            gross_up_rate: Number(row.gross_up_rate),
            federal_tax_credit_rate: Number(row.federal_tax_credit_rate),
            provincial_tax_credit_rate: Number(row.provincial_tax_credit_rate),
        })),
        healthPremiumTiers: (healthPremiumResult.data || []).map(row => ({
            tax_year: Number(row.tax_year),
            min_income: Number(row.min_income),
            max_income: row.max_income != null ? Number(row.max_income) : null,
            base_premium: Number(row.base_premium),
            rate_on_excess: Number(row.rate_on_excess),
        })),
        province,
        taxYear,
    };
}

export function calculateBracketTax(taxableIncome: number, brackets: TaxBracket[]): number {
    if (!brackets || brackets.length === 0 || taxableIncome <= 0) return 0;

    let tax = 0;
    for (const bracket of brackets) {
        const minIncome = Number(bracket.min_income);
        const maxIncome = bracket.max_income != null ? Number(bracket.max_income) : Infinity;
        const rate = Number(bracket.rate);

        if (taxableIncome > minIncome) {
            const taxableInBracket = Math.min(taxableIncome, maxIncome) - minIncome;
            tax += taxableInBracket * rate;
        }
    }
    return round(tax);
}

export function calculateOntarioHealthPremium(
    taxableIncome: number,
    tiers: OntarioHealthPremiumTier[]
): number {
    if (!tiers || tiers.length === 0 || taxableIncome <= 0) return 0;

    for (const tier of tiers) {
        const minIncome = Number(tier.min_income);
        const maxIncome = tier.max_income != null ? Number(tier.max_income) : Infinity;
        const basePremium = Number(tier.base_premium);
        const rateOnExcess = Number(tier.rate_on_excess);

        if (taxableIncome >= minIncome && taxableIncome <= maxIncome) {
            const excess = taxableIncome - minIncome;
            const calculatedPremium = basePremium + excess * rateOnExcess;

            const tierIndex = tiers.indexOf(tier);
            if (tierIndex < tiers.length - 1) {
                const nextTierBase = Number(tiers[tierIndex + 1].base_premium);
                return round(
                    Math.min(
                        calculatedPremium,
                        nextTierBase + (minIncome - Number(tiers[tierIndex + 1].min_income)) * rateOnExcess
                    )
                );
            }
            return round(calculatedPremium);
        }
    }

    const lastTier = tiers[tiers.length - 1];
    return round(Number(lastTier.base_premium));
}

export function calculateOntarioSurtax(
    baseProvincialTax: number,
    provincialConstants: Partial<ProvincialTaxConstants>
): number {
    if (!provincialConstants) return 0;

    const threshold1 = Number(provincialConstants.surtax_threshold_1 || 5554);
    const threshold2 = Number(provincialConstants.surtax_threshold_2 || 7108);
    const rate1 = Number(provincialConstants.surtax_rate_1 || 0.2);
    const rate2 = Number(provincialConstants.surtax_rate_2 || 0.36);

    let surtax = 0;

    if (baseProvincialTax > threshold1) {
        const amountAbove1 = Math.min(baseProvincialTax, threshold2) - threshold1;
        surtax += amountAbove1 * rate1;
    }

    if (baseProvincialTax > threshold2) {
        const amountAbove2 = baseProvincialTax - threshold2;
        surtax += amountAbove2 * rate2;
    }

    return round(surtax);
}

export function calculateSalaryNet(
    corporateCost: number,
    constants: TaxConstantsBundle,
    ytdIncome = 0
) {
    const { taxConstants, federalBrackets, provincialBrackets, provincialConstants, healthPremiumTiers, province } =
        constants;

    if (corporateCost <= 0) {
        return {
            corporateCost: 0,
            grossSalary: 0,
            employerCpp: 0,
            employerEi: 0,
            employeeCpp: 0,
            employeeEi: 0,
            federalTax: 0,
            provincialTax: 0,
            ontarioSurtax: 0,
            healthPremium: 0,
            totalDeductions: 0,
            netInPocket: 0,
            rrspRoomCreated: 0,
            efficiency: 0,
        };
    }

    const cppRate = Number(taxConstants.cpp_rate || 0.0595);
    const cppEmployerRate = Number(taxConstants.cpp_employer_rate || 0.0595);
    const cppBasicExemption = Number(taxConstants.cpp_basic_exemption || 3500);
    const cppMaxContribution = Number(taxConstants.cpp_max_contribution || 4237.95);

    const eiEmployeeRate = Number(taxConstants.ei_employee_rate || 0.0163);
    const eiEmployerMultiplier = Number(taxConstants.ei_employer_multiplier || 1.4);
    const eiMaxPremium = Number(taxConstants.ei_max_premium || 1123.07);

    const federalBasicPersonal = Number(taxConstants.federal_basic_personal_amount || 16129);
    const provincialBasicPersonal = Number(provincialConstants.basic_personal_amount || 12399);

    let grossSalary = corporateCost / 1.08;
    for (let i = 0; i < 10; i++) {
        const employerCpp = Math.min(
            Math.max(0, grossSalary - cppBasicExemption) * cppEmployerRate,
            cppMaxContribution
        );
        const employerEi = Math.min(
            grossSalary * eiEmployeeRate * eiEmployerMultiplier,
            eiMaxPremium * eiEmployerMultiplier
        );
        const totalEmployerCost = grossSalary + employerCpp + employerEi;
        grossSalary = grossSalary * (corporateCost / totalEmployerCost);
    }
    grossSalary = round(grossSalary);

    const employerCpp = round(
        Math.min(Math.max(0, grossSalary - cppBasicExemption) * cppEmployerRate, cppMaxContribution)
    );
    const employerEi = round(
        Math.min(grossSalary * eiEmployeeRate * eiEmployerMultiplier, eiMaxPremium * eiEmployerMultiplier)
    );

    const employeeCpp = round(
        Math.min(Math.max(0, grossSalary - cppBasicExemption) * cppRate, cppMaxContribution)
    );
    const employeeEi = round(Math.min(grossSalary * eiEmployeeRate, eiMaxPremium));

    const totalIncome = grossSalary + ytdIncome;

    const federalTaxBeforeCredits = calculateBracketTax(totalIncome, federalBrackets);
    const lowestFederalRate = federalBrackets[0]?.rate || 0.15;
    const federalBasicCredit = federalBasicPersonal * lowestFederalRate;
    const federalCppCredit = employeeCpp * lowestFederalRate;
    const federalEiCredit = employeeEi * lowestFederalRate;
    const federalEmploymentCredit = Math.min(grossSalary, 1433) * lowestFederalRate;
    const federalTax = round(
        Math.max(
            0,
            federalTaxBeforeCredits - federalBasicCredit - federalCppCredit - federalEiCredit - federalEmploymentCredit
        )
    );

    const provincialTaxBeforeCredits = calculateBracketTax(totalIncome, provincialBrackets);
    const lowestProvincialRate = provincialBrackets[0]?.rate || 0.0505;
    const provincialBasicCredit = provincialBasicPersonal * lowestProvincialRate;
    const provincialCppCredit = employeeCpp * lowestProvincialRate;
    const provincialEiCredit = employeeEi * lowestProvincialRate;
    const baseprovincialTax = Math.max(
        0,
        provincialTaxBeforeCredits - provincialBasicCredit - provincialCppCredit - provincialEiCredit
    );

    const ontarioSurtax = province === 'ON' ? calculateOntarioSurtax(baseprovincialTax, provincialConstants) : 0;
    const provincialTax = round(baseprovincialTax + ontarioSurtax);

    const healthPremium =
        province === 'ON' ? calculateOntarioHealthPremium(totalIncome, healthPremiumTiers) : 0;

    const totalDeductions = employeeCpp + employeeEi + federalTax + provincialTax + healthPremium;
    const netInPocket = round(grossSalary - totalDeductions);

    const rrspMaxRoom = Number(taxConstants.rrsp_max_contribution_room || 31560);
    const rrspRoomCreated = round(Math.min(grossSalary * 0.18, rrspMaxRoom));

    const efficiency = corporateCost > 0 ? round((netInPocket / corporateCost) * 100) : 0;

    return {
        corporateCost: round(corporateCost),
        grossSalary,
        employerCpp,
        employerEi,
        employeeCpp,
        employeeEi,
        federalTax,
        provincialTax,
        ontarioSurtax,
        healthPremium,
        totalDeductions: round(totalDeductions),
        netInPocket,
        rrspRoomCreated,
        efficiency,
    };
}

export function calculateDividendNet(
    amount: number,
    constants: TaxConstantsBundle,
    dividendType: 'eligible' | 'non_eligible' = 'non_eligible',
    ytdIncome = 0,
    smallBusinessRate = 0.125
) {
    const { federalBrackets, provincialBrackets, provincialConstants, dividendConstants, province } = constants;

    if (amount <= 0) {
        return {
            cashPaid: 0,
            grossCorpIncome: 0,
            corporateTax: 0,
            grossedUp: 0,
            dividendType,
            federalTaxBeforeCredits: 0,
            federalDividendCredit: 0,
            provincialTaxBeforeCredits: 0,
            provincialDividendCredit: 0,
            ontarioSurtax: 0,
            netFederalTax: 0,
            netProvincialTax: 0,
            netTax: 0,
            totalTax: 0,
            netInPocket: 0,
            efficiency: 100,
            trueEfficiency: 100,
            grossUpRate: 0,
            federalCreditRate: 0,
            provincialCreditRate: 0,
        };
    }

    const grossCorpIncome = round(amount / (1 - smallBusinessRate));
    const corporateTax = round(grossCorpIncome - amount);

    const federalDivConstants = dividendConstants.find(
        d => d.province === 'federal' && d.dividend_type === dividendType
    );
    const provincialDivConstants = dividendConstants.find(
        d => d.province === province && d.dividend_type === dividendType
    );

    const grossUpRate = federalDivConstants
        ? Number(federalDivConstants.gross_up_rate)
        : dividendType === 'eligible'
            ? 0.38
            : 0.15;
    const federalCreditRate = federalDivConstants
        ? Number(federalDivConstants.federal_tax_credit_rate)
        : dividendType === 'eligible'
            ? 0.1502
            : 0.0903;
    const provincialCreditRate = provincialDivConstants
        ? Number(provincialDivConstants.provincial_tax_credit_rate)
        : dividendType === 'eligible'
            ? 0.1
            : 0.0287;

    const grossedUp = round(amount * (1 + grossUpRate));
    const totalTaxableIncome = grossedUp + ytdIncome;

    const federalTaxBeforeCredits = calculateBracketTax(totalTaxableIncome, federalBrackets);
    const federalBasicPersonal = Number(constants.taxConstants?.federal_basic_personal_amount || 16129);
    const lowestFederalRate = federalBrackets[0]?.rate || 0.15;
    const federalBasicCredit = federalBasicPersonal * lowestFederalRate;
    const federalDividendCredit = round(grossedUp * federalCreditRate);
    const netFederalTax = round(Math.max(0, federalTaxBeforeCredits - federalBasicCredit - federalDividendCredit));

    const provincialTaxBeforeCredits = calculateBracketTax(totalTaxableIncome, provincialBrackets);
    const provincialBasicPersonal = Number(constants.provincialConstants?.basic_personal_amount || 12399);
    const lowestProvincialRate = provincialBrackets[0]?.rate || 0.0505;
    const provincialBasicCredit = provincialBasicPersonal * lowestProvincialRate;
    const provincialDividendCredit = round(grossedUp * provincialCreditRate);
    const baseProvincialTax = Math.max(
        0,
        provincialTaxBeforeCredits - provincialBasicCredit - provincialDividendCredit
    );

    const ontarioSurtax = province === 'ON' ? calculateOntarioSurtax(baseProvincialTax, provincialConstants) : 0;
    const netProvincialTax = round(baseProvincialTax + ontarioSurtax);

    const netTax = round(netFederalTax + netProvincialTax);
    const netInPocket = round(amount - netTax);

    const efficiency = amount > 0 ? round((netInPocket / amount) * 100) : 100;
    const trueEfficiency = grossCorpIncome > 0 ? round((netInPocket / grossCorpIncome) * 100) : 100;
    const totalTax = round(corporateTax + netTax);

    return {
        cashPaid: round(amount),
        grossCorpIncome,
        corporateTax,
        grossedUp,
        dividendType,
        grossUpRate: round(grossUpRate * 100),
        federalTaxBeforeCredits: round(federalTaxBeforeCredits),
        federalDividendCredit,
        federalCreditRate: round(federalCreditRate * 100),
        provincialTaxBeforeCredits: round(provincialTaxBeforeCredits),
        provincialDividendCredit,
        provincialCreditRate: round(provincialCreditRate * 100),
        ontarioSurtax,
        netFederalTax,
        netProvincialTax,
        netTax,
        totalTax,
        netInPocket,
        efficiency,
        trueEfficiency,
    };
}

export function calculateReimbursementNet(amount: number, owedToOwner: number) {
    const reimbursableAmount = Math.min(amount, owedToOwner);

    return {
        amount: round(reimbursableAmount),
        availableToReimburse: round(owedToOwner),
        netInPocket: round(reimbursableAmount),
        tax: 0,
        efficiency: 100,
        note: 'Tax-free repayment of expenses you paid on behalf of the company',
    };
}

/**
 * Optimize withdrawal strategy (fetches tax constants, then calculates)
 */
export async function optimizeWithdrawal(params: OptimizerParams): Promise<PayMyselfOptimizeResponse> {
    const {
        province = 'ON',
        taxYear = new Date().getFullYear(),
        smallBusinessRate = 0.125,
    } = params;

    const constants = await fetchTaxConstants(taxYear, province);
    return optimizeWithdrawalWithConstants(params, constants, smallBusinessRate);
}

/**
 * Pure optimization given a pre-fetched tax constants bundle (for React Query caching)
 */
export function optimizeWithdrawalWithConstants(
    params: OptimizerParams,
    constants: TaxConstantsBundle,
    smallBusinessRate = 0.125
): PayMyselfOptimizeResponse {
    const {
        corporateCost,
        owedToOwner = 0,
        province = 'ON',
        taxYear = new Date().getFullYear(),
        ytdPersonalIncome = 0,
        dividendType = 'non_eligible',
    } = params;

    const reimbursement = calculateReimbursementNet(corporateCost, owedToOwner);
    const reimbursementAmount = reimbursement.amount;
    const remaining = corporateCost - reimbursementAmount;

    const dividendResult = calculateDividendNet(
        remaining,
        constants,
        dividendType,
        ytdPersonalIncome,
        smallBusinessRate
    );
    const salaryResult = calculateSalaryNet(remaining, constants, ytdPersonalIncome);

    let recommendation: 'reimbursement' | 'dividend' | 'salary';
    let explanation: string;

    if (reimbursementAmount === corporateCost) {
        recommendation = 'reimbursement';
        explanation = `Take the full amount as reimbursement. This is 100% tax-free since the company owes you $${owedToOwner.toLocaleString()}.`;
    } else if (dividendResult.netInPocket > salaryResult.netInPocket) {
        const savings = round(dividendResult.netInPocket - salaryResult.netInPocket);
        recommendation = 'dividend';
        explanation =
            reimbursementAmount > 0
                ? `Take $${reimbursementAmount.toLocaleString()} as reimbursement (tax-free) + $${remaining.toLocaleString()} as ${dividendType === 'eligible' ? 'eligible' : 'non-eligible'} dividend. Dividends save you $${savings.toLocaleString()} compared to salary.`
                : `Take ${dividendType === 'eligible' ? 'eligible' : 'non-eligible'} dividends. You keep $${dividendResult.netInPocket.toLocaleString()} (${dividendResult.efficiency}% efficiency) vs $${salaryResult.netInPocket.toLocaleString()} with salary.`;
    } else {
        recommendation = 'salary';
        explanation =
            reimbursementAmount > 0
                ? `Take $${reimbursementAmount.toLocaleString()} as reimbursement (tax-free) + $${remaining.toLocaleString()} as salary. Salary is slightly better here and creates $${salaryResult.rrspRoomCreated.toLocaleString()} in RRSP room.`
                : `Take salary. You keep $${salaryResult.netInPocket.toLocaleString()} plus you get $${salaryResult.rrspRoomCreated.toLocaleString()} in RRSP contribution room.`;
    }

    let totalNetInPocket: number;
    if (recommendation === 'dividend') {
        totalNetInPocket = round(reimbursementAmount + dividendResult.netInPocket);
    } else if (recommendation === 'salary') {
        totalNetInPocket = round(reimbursementAmount + salaryResult.netInPocket);
    } else {
        totalNetInPocket = reimbursementAmount;
    }
    const totalEfficiency = corporateCost > 0 ? round((totalNetInPocket / corporateCost) * 100) : 100;

    return {
        input: {
            corporateCost: round(corporateCost),
            owedToOwner: round(owedToOwner),
            province,
            taxYear,
            ytdPersonalIncome: round(ytdPersonalIncome),
            dividendType,
        },
        options: {
            reimbursement: {
                ...reimbursement,
                available: owedToOwner > 0,
            },
            dividend: {
                ...dividendResult,
                amount: remaining,
                note: `Includes ${(smallBusinessRate * 100).toFixed(1)}% corp tax. No CPP/RRSP benefits.`,
            },
            salary: {
                ...salaryResult,
                amount: remaining,
                note: 'Creates RRSP room and CPP benefits',
            },
        },
        recommendation: {
            strategy:
                reimbursementAmount > 0 && remaining > 0
                    ? `Reimbursement + ${recommendation.charAt(0).toUpperCase() + recommendation.slice(1)}`
                    : recommendation.charAt(0).toUpperCase() + recommendation.slice(1),
            totalNetInPocket,
            totalEfficiency: `${totalEfficiency}%`,
            breakdown: [
                ...(reimbursementAmount > 0 ? [{ type: 'reimbursement', amount: reimbursementAmount }] : []),
                ...(remaining > 0
                    ? [{ type: recommendation === 'salary' ? 'salary' : 'dividend', amount: remaining }]
                    : []),
            ],
            explanation,
        },
        disclaimer:
            'These are estimates for planning purposes only. Consult a tax professional for your specific situation.',
    };
}
