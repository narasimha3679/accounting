/**
 * Payroll Calculation Engine
 *
 * CRA T4032-ON aligned withholdings:
 * - Enhanced CPP (1%) + CPP2 are deductions from taxable income
 * - Base CPP (4.95%), EI, TD1 claims, and Canada Employment Amount are credits
 * - Ontario: credits → surtax → tax reduction → health premium
 */

import type {
    PayrollInput,
    PayrollOutput,
    TaxConstants,
    TaxBracket,
    ProvincialTaxConstants,
    EmployeeYTD,
} from './payrollTypes';
import { getPayPeriodsPerYear, round } from './payrollConstants';
import { calculateBracketTax } from './taxTables';
import { CRA_2026 } from './cra2026Constants';

/** Enhanced CPP share of the combined employee rate (1% of 5.95%). */
const CPP_ENHANCED_RATE = CRA_2026.cppRate - CRA_2026.cppBaseRate;

export class PayrollCalculator {
    private taxConstants: TaxConstants;
    private federalBrackets: TaxBracket[];
    private provincialBrackets: TaxBracket[];
    private provincialConstants: ProvincialTaxConstants;
    private payPeriodsPerYear: number;

    constructor(
        taxConstants: TaxConstants,
        federalBrackets: TaxBracket[],
        provincialBrackets: TaxBracket[],
        provincialConstants: ProvincialTaxConstants,
        payFrequency: 'weekly' | 'biweekly' | 'semi_monthly' | 'monthly'
    ) {
        this.taxConstants = taxConstants;
        this.federalBrackets = federalBrackets;
        this.provincialBrackets = provincialBrackets;
        this.provincialConstants = provincialConstants;
        this.payPeriodsPerYear = getPayPeriodsPerYear(payFrequency);
    }

    /**
     * Main calculation method - processes complete payroll calculation
     */
    calculate(input: PayrollInput): PayrollOutput {
        // Step 1: Calculate gross pay
        const earnings = this.calculateEarnings(input);

        // Step 2: Calculate taxable income (gross - pre-tax deductions + taxable benefits)
        const taxableIncome = earnings.grossPay - input.benefits.preTaxDeductions + input.benefits.taxable;

        // Step 3: Calculate CPP
        const cpp = this.calculateCPP(taxableIncome, input.ytd);

        // Step 4: Calculate CPP2
        const cpp2 = this.calculateCPP2(taxableIncome, input.ytd);

        // Step 5: Calculate EI
        const ei = this.calculateEI(earnings.grossPay, input.ytd, !!input.employee.ei_exempt);

        // Step 6: Calculate income tax (T4032-ON style)
        const { federalTax, provincialTax, ontarioHealthPremium, details } = this.calculateIncomeTax(
            taxableIncome,
            cpp.contribution,
            cpp2.contribution,
            ei.premium,
            input.taxCredits,
            input.employee.province
        );

        // Step 7: Calculate total deductions (provincialTax already includes OHP)
        const totalDeductions =
            cpp.contribution +
            cpp2.contribution +
            ei.premium +
            federalTax +
            provincialTax +
            input.benefits.preTaxDeductions +
            input.benefits.postTaxDeductions +
            input.taxCredits.additional_tax_per_pay;

        // Step 8: Calculate net pay
        const netPay = earnings.grossPay + input.benefits.taxable - totalDeductions;

        // Step 9: Calculate vacation accrual
        const vacation = this.calculateVacation(earnings.grossPay, input);

        // Step 10: Calculate employer costs (CPP + CPP2 match + EI)
        const employerCppTotal = cpp.employerContribution + cpp2.employerContribution;
        const employerCosts = {
            cpp: employerCppTotal,
            ei: ei.employerPremium,
            total: earnings.grossPay + employerCppTotal + ei.employerPremium,
        };

        return {
            // Earnings
            regularPay: earnings.regularPay,
            overtimePay: earnings.overtimePay,
            vacationPay: earnings.vacationPay,
            statutoryHolidayPay: earnings.statutoryHolidayPay,
            otherEarnings: earnings.otherEarnings,
            taxableBenefits: input.benefits.taxable,
            grossPay: earnings.grossPay,

            taxableIncome,

            cpp,
            cpp2,
            ei,

            federalTax,
            provincialTax,
            ontarioHealthPremium,
            totalIncomeTax: federalTax + provincialTax,

            preTaxDeductions: input.benefits.preTaxDeductions,
            postTaxDeductions: input.benefits.postTaxDeductions,
            additionalTax: input.taxCredits.additional_tax_per_pay,

            totalDeductions,
            netPay,

            employerCpp: employerCosts.cpp,
            employerEi: employerCosts.ei,
            employerTotalCost: employerCosts.total,

            vacationAccrued: vacation.accrued,
            vacationRate: vacation.rate,

            calculationDetails: {
                payPeriodsPerYear: this.payPeriodsPerYear,
                ...details,
            },
        };
    }

    /**
     * Calculate earnings breakdown (regular, overtime, vacation, etc.)
     */
    private calculateEarnings(input: PayrollInput) {
        const { hours, otherEarnings, settings, employee } = input;

        // Get hourly rate based on payrate type
        let hourlyRate: number;
        if (employee.payrate_type === 'hourly') {
            hourlyRate = employee.payrate;
        } else if (employee.payrate_type === 'salary') {
            // Annual salary to hourly
            const hoursPerYear =
                settings.default_work_hours_per_day * settings.default_work_days_per_week * 52;
            hourlyRate = employee.payrate / hoursPerYear;
        } else if (employee.payrate_type === 'biweekly') {
            hourlyRate =
                employee.payrate /
                (settings.default_work_hours_per_day * settings.default_work_days_per_week * 2);
        } else {
            // Monthly
            hourlyRate =
                employee.payrate /
                ((settings.default_work_hours_per_day * settings.default_work_days_per_week * 52) / 12);
        }

        // Calculate earnings
        const regularPay = hours.regular * hourlyRate;
        const overtimePay = settings.overtime_enabled
            ? hours.overtime * hourlyRate * settings.overtime_multiplier
            : hours.overtime * hourlyRate;
        const vacationPay = hours.vacation * hourlyRate;
        const statutoryHolidayPay = hours.statutory_holiday * hourlyRate;

        const other =
            (otherEarnings?.bonus || 0) +
            (otherEarnings?.commission || 0) +
            (otherEarnings?.retroactive || 0) +
            (otherEarnings?.other || 0);

        const grossPay = regularPay + overtimePay + vacationPay + statutoryHolidayPay + other;

        return {
            regularPay: round(regularPay),
            overtimePay: round(overtimePay),
            vacationPay: round(vacationPay),
            statutoryHolidayPay: round(statutoryHolidayPay),
            otherEarnings: round(other),
            grossPay: round(grossPay),
            hourlyRate,
        };
    }

    /**
     * Calculate CPP (Canada Pension Plan) contribution
     */
    private calculateCPP(grossPay: number, ytd: EmployeeYTD) {
        const {
            cpp_rate,
            cpp_employer_rate,
            cpp_basic_exemption,
            cpp_ympe,
            cpp_max_contribution,
        } = this.taxConstants;

        // Check if already maxed out
        if (ytd.cpp_contributions >= cpp_max_contribution) {
            return {
                pensionableEarnings: 0,
                contribution: 0,
                employerContribution: 0,
                ytdAfter: ytd.cpp_contributions,
                maxedOut: true,
            };
        }

        // Calculate pensionable earnings for this period
        const exemptionPerPeriod = cpp_basic_exemption / this.payPeriodsPerYear;
        const ympePerPeriod = cpp_ympe / this.payPeriodsPerYear;

        const pensionableEarnings = Math.min(grossPay, ympePerPeriod);
        const contributionBase = Math.max(0, pensionableEarnings - exemptionPerPeriod);

        // Calculate contribution
        let contribution = contributionBase * cpp_rate;

        // Check against remaining room
        const remainingRoom = cpp_max_contribution - ytd.cpp_contributions;
        contribution = Math.min(contribution, remainingRoom);

        // Employer matches
        const employerContribution = contribution * (cpp_employer_rate / cpp_rate);

        return {
            pensionableEarnings: round(pensionableEarnings),
            contribution: round(contribution),
            employerContribution: round(employerContribution),
            ytdAfter: round(ytd.cpp_contributions + contribution),
            maxedOut: ytd.cpp_contributions + contribution >= cpp_max_contribution,
        };
    }

    /**
     * Calculate CPP2 (Second Canada Pension Plan) contribution
     * Applies to earnings between YMPE and YAMPE. Employer matches 1:1.
     */
    private calculateCPP2(grossPay: number, ytd: EmployeeYTD) {
        const { cpp2_rate, cpp_ympe, cpp2_yampe, cpp2_max_contribution } = this.taxConstants;

        // Check if already maxed out
        if (ytd.cpp2_contributions >= cpp2_max_contribution) {
            return {
                earnings: 0,
                contribution: 0,
                employerContribution: 0,
                ytdAfter: ytd.cpp2_contributions,
                maxedOut: true,
            };
        }

        const ympePerPeriod = cpp_ympe / this.payPeriodsPerYear;
        const yampePerPeriod = cpp2_yampe / this.payPeriodsPerYear;

        // CPP2 earnings are the portion between YMPE and YAMPE
        const cpp2Earnings = Math.max(0, Math.min(grossPay, yampePerPeriod) - ympePerPeriod);

        if (cpp2Earnings <= 0) {
            return {
                earnings: 0,
                contribution: 0,
                employerContribution: 0,
                ytdAfter: ytd.cpp2_contributions,
                maxedOut: false,
            };
        }

        let contribution = cpp2Earnings * cpp2_rate;

        // Check against remaining room
        const remainingRoom = cpp2_max_contribution - ytd.cpp2_contributions;
        contribution = Math.min(contribution, remainingRoom);

        return {
            earnings: round(cpp2Earnings),
            contribution: round(contribution),
            employerContribution: round(contribution),
            ytdAfter: round(ytd.cpp2_contributions + contribution),
            maxedOut: ytd.cpp2_contributions + contribution >= cpp2_max_contribution,
        };
    }

    /**
     * Calculate EI (Employment Insurance) premium
     */
    private calculateEI(grossPay: number, ytd: EmployeeYTD, eiExempt: boolean) {
        if (eiExempt) {
            return {
                insurableEarnings: 0,
                premium: 0,
                employerPremium: 0,
                ytdAfter: ytd.ei_premiums,
                maxedOut: false,
            };
        }

        const {
            ei_employee_rate,
            ei_employer_multiplier,
            ei_max_insurable,
            ei_max_premium,
        } = this.taxConstants;

        // Check if already maxed out
        if (ytd.ei_premiums >= ei_max_premium) {
            return {
                insurableEarnings: 0,
                premium: 0,
                employerPremium: 0,
                ytdAfter: ytd.ei_premiums,
                maxedOut: true,
            };
        }

        const maxInsurablePerPeriod = ei_max_insurable / this.payPeriodsPerYear;
        const insurableEarnings = Math.min(grossPay, maxInsurablePerPeriod);

        let premium = insurableEarnings * ei_employee_rate;

        // Check against remaining room
        const remainingRoom = ei_max_premium - ytd.ei_premiums;
        premium = Math.min(premium, remainingRoom);

        // Employer pays 1.4x
        const employerPremium = premium * ei_employer_multiplier;

        return {
            insurableEarnings: round(insurableEarnings),
            premium: round(premium),
            employerPremium: round(employerPremium),
            ytdAfter: round(ytd.ei_premiums + premium),
            maxedOut: ytd.ei_premiums + premium >= ei_max_premium,
        };
    }

    /**
     * Calculate income tax (federal and provincial) using T4032-ON methodology.
     * Enhanced CPP + CPP2 reduce taxable income; base CPP, EI, TD1, and CEA are credits.
     */
    private calculateIncomeTax(
        grossPay: number,
        cppContribution: number,
        cpp2Contribution: number,
        eiDeduction: number,
        taxCredits: { federal_total_claim: number; provincial_total_claim: number; claim_tax_exempt: boolean },
        province: string
    ) {
        // If employee claims tax exempt
        if (taxCredits.claim_tax_exempt) {
            return {
                federalTax: 0,
                provincialTax: 0,
                ontarioHealthPremium: 0,
                details: {
                    annualizedIncome: 0,
                    annualTaxableIncome: 0,
                    annualFederalTax: 0,
                    annualProvincialTax: 0,
                    federalCreditsUsed: 0,
                    provincialCreditsUsed: 0,
                },
            };
        }

        const { cpp_rate } = this.taxConstants;
        const cppBaseRate = Math.max(0, cpp_rate - CPP_ENHANCED_RATE);
        const cppBaseShare = cpp_rate > 0 ? cppBaseRate / cpp_rate : 0;
        const cppEnhancedShare = cpp_rate > 0 ? CPP_ENHANCED_RATE / cpp_rate : 0;

        // Step 1: Annualize period amounts
        const annualGross = grossPay * this.payPeriodsPerYear;
        const annualCppBase = cppContribution * cppBaseShare * this.payPeriodsPerYear;
        const annualCppEnhanced = cppContribution * cppEnhancedShare * this.payPeriodsPerYear;
        const annualCpp2 = cpp2Contribution * this.payPeriodsPerYear;
        const annualEi = eiDeduction * this.payPeriodsPerYear;

        // Step 2: Taxable income — only enhanced CPP + CPP2 are deductions (T4032)
        const annualTaxableIncome = Math.max(0, annualGross - annualCppEnhanced - annualCpp2);

        // Step 3: Federal tax
        const annualFederalRaw = calculateBracketTax(annualTaxableIncome, this.federalBrackets);
        const lowestFederalRate = this.federalBrackets[0]?.rate || 0.14;
        const cea = Math.min(this.taxConstants.federal_employment_amount || 0, annualGross);
        const federalCreditBase =
            taxCredits.federal_total_claim + annualCppBase + annualEi + cea;
        const federalCredits = federalCreditBase * lowestFederalRate;
        const netFederalTax = Math.max(0, annualFederalRaw - federalCredits);

        // Step 4: Provincial tax
        const annualProvincialRaw = calculateBracketTax(annualTaxableIncome, this.provincialBrackets);
        const lowestProvincialRate = this.provincialBrackets[0]?.rate || 0.0505;
        const provincialCreditBase =
            taxCredits.provincial_total_claim + annualCppBase + annualEi;
        const provincialCredits = provincialCreditBase * lowestProvincialRate;
        const basicProvincialTax = Math.max(0, annualProvincialRaw - provincialCredits);

        let ontarioSurtax = 0;
        let ontarioTaxReduction = 0;
        let ontarioHealthPremiumAnnual = 0;

        if (province === 'ON') {
            ontarioSurtax = this.calculateOntarioSurtax(basicProvincialTax);
            const taxWithSurtax = basicProvincialTax + ontarioSurtax;
            const reductionBase =
                this.provincialConstants.tax_reduction_base ?? CRA_2026.ontarioTaxReductionBase;
            ontarioTaxReduction = Math.min(
                taxWithSurtax,
                Math.max(0, 2 * reductionBase - taxWithSurtax)
            );

            if (this.provincialConstants.health_premium_enabled) {
                ontarioHealthPremiumAnnual = this.calculateOntarioHealthPremium(annualTaxableIncome);
            }
        }

        const netProvincialTaxBeforeOhp = Math.max(
            0,
            basicProvincialTax + ontarioSurtax - ontarioTaxReduction
        );
        const netProvincialTax = netProvincialTaxBeforeOhp + ontarioHealthPremiumAnnual;

        // Step 5: De-annualize back to pay period
        const federalTax = round(netFederalTax / this.payPeriodsPerYear);
        const ontarioHealthPremium = round(ontarioHealthPremiumAnnual / this.payPeriodsPerYear);
        const provincialTax = round(netProvincialTax / this.payPeriodsPerYear);

        return {
            federalTax,
            provincialTax,
            ontarioHealthPremium,
            details: {
                annualizedIncome: round(annualGross),
                annualTaxableIncome: round(annualTaxableIncome),
                annualFederalTax: round(annualFederalRaw),
                annualProvincialTax: round(annualProvincialRaw),
                federalCreditsUsed: round(federalCredits),
                provincialCreditsUsed: round(provincialCredits),
                ontarioSurtax: round(ontarioSurtax),
                ontarioTaxReduction: round(ontarioTaxReduction),
                ontarioHealthPremium: round(ontarioHealthPremiumAnnual),
            },
        };
    }

    /**
     * Ontario surtax (CRA): 20% of basic tax over threshold1 + 36% over threshold2
     */
    private calculateOntarioSurtax(basicTax: number): number {
        const threshold1 = this.provincialConstants.surtax_threshold_1 ?? 5818;
        const threshold2 = this.provincialConstants.surtax_threshold_2 ?? 7446;
        const rate1 = this.provincialConstants.surtax_rate_1 ?? 0.20;
        const rate2 = this.provincialConstants.surtax_rate_2 ?? 0.36;

        let surtax = 0;
        if (basicTax > threshold1) {
            surtax += (basicTax - threshold1) * rate1;
        }
        if (basicTax > threshold2) {
            surtax += (basicTax - threshold2) * rate2;
        }
        return surtax;
    }

    /**
     * Ontario Health Premium tiers (CRA T4032-ON) based on taxable income
     */
    private calculateOntarioHealthPremium(taxableIncome: number): number {
        if (taxableIncome <= 20000) return 0;
        if (taxableIncome <= 36000) return Math.min(300, (taxableIncome - 20000) * 0.06);
        if (taxableIncome <= 48000) return Math.min(450, 300 + (taxableIncome - 36000) * 0.06);
        if (taxableIncome <= 72000) return Math.min(600, 450 + (taxableIncome - 48000) * 0.25);
        if (taxableIncome <= 200000) return Math.min(750, 600 + (taxableIncome - 72000) * 0.25);
        return Math.min(900, 750 + (taxableIncome - 200000) * 0.25);
    }

    /**
     * Calculate vacation accrual
     */
    private calculateVacation(grossPay: number, input: PayrollInput) {
        const { settings, employee } = input;

        if (!settings.vacation_tracking_enabled) {
            return { accrued: 0, rate: 0 };
        }

        // Calculate years of service
        const hireDate = new Date(employee.hire_date);
        const now = new Date();
        const yearsOfService = (now.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

        // Determine rate
        const rate =
            yearsOfService >= 5
                ? settings.vacation_rate_5_plus_years
                : settings.vacation_rate_under_5_years;

        const accrued = grossPay * rate;

        return {
            accrued: round(accrued),
            rate,
        };
    }
}

/**
 * Factory function to create a PayrollCalculator instance
 * Loads all required data from the database
 */
export async function createPayrollCalculator(
    companyId: number,
    taxYear: number = new Date().getFullYear(),
    province: string = 'ON'
): Promise<PayrollCalculator> {
    const api = (await import('./api')).default;

    // Load all required data
    const [taxConstants, federalBrackets, provincialBrackets, provincialConstants, { settings: payrollSettings }] =
        await Promise.all([
            api.getTaxConstants(taxYear),
            api.getTaxRates(taxYear, 'federal'),
            api.getTaxRates(taxYear, province),
            api.getProvincialTaxConstants(taxYear, province),
            api.ensurePayrollSettings(companyId),
        ]);

    if (!taxConstants) {
        throw new Error(`Tax constants for year ${taxYear} not found`);
    }

    if (!provincialConstants) {
        throw new Error(`Provincial tax constants for year ${taxYear} and province ${province} not found`);
    }

    return new PayrollCalculator(
        taxConstants,
        federalBrackets,
        provincialBrackets,
        provincialConstants,
        payrollSettings.pay_frequency
    );
}
