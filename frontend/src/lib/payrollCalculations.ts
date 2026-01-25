/**
 * Payroll Calculation Engine
 * 
 * Core payroll calculation library for CRA-compliant payroll processing.
 * Calculates CPP, CPP2, EI, federal income tax, and Ontario provincial income tax.
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
        const ei = this.calculateEI(earnings.grossPay, input.ytd);

        // Step 6: Calculate income tax
        const { federalTax, provincialTax, details } = this.calculateIncomeTax(
            taxableIncome,
            cpp.contribution + cpp2.contribution,
            ei.premium,
            input.taxCredits,
            input.employee.province
        );

        // Step 7: Calculate total deductions
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

        // Step 10: Calculate employer costs
        const employerCosts = {
            cpp: cpp.employerContribution,
            ei: ei.employerPremium,
            total: earnings.grossPay + cpp.employerContribution + ei.employerPremium,
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
     * Applies to earnings between YMPE and YAMPE
     */
    private calculateCPP2(grossPay: number, ytd: EmployeeYTD) {
        const { cpp2_rate, cpp_ympe, cpp2_yampe, cpp2_max_contribution } = this.taxConstants;

        // Check if already maxed out
        if (ytd.cpp2_contributions >= cpp2_max_contribution) {
            return {
                earnings: 0,
                contribution: 0,
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
            ytdAfter: round(ytd.cpp2_contributions + contribution),
            maxedOut: ytd.cpp2_contributions + contribution >= cpp2_max_contribution,
        };
    }

    /**
     * Calculate EI (Employment Insurance) premium
     */
    private calculateEI(grossPay: number, ytd: EmployeeYTD) {
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
     * Calculate income tax (federal and provincial)
     */
    private calculateIncomeTax(
        grossPay: number,
        cppDeduction: number,
        eiDeduction: number,
        taxCredits: { federal_total_claim: number; provincial_total_claim: number; claim_tax_exempt: boolean },
        province: string
    ) {
        // If employee claims tax exempt
        if (taxCredits.claim_tax_exempt) {
            return {
                federalTax: 0,
                provincialTax: 0,
                details: {
                    annualizedIncome: 0,
                    annualFederalTax: 0,
                    annualProvincialTax: 0,
                    federalCreditsUsed: 0,
                    provincialCreditsUsed: 0,
                },
            };
        }

        // Step 1: Annualize the income
        const annualGross = grossPay * this.payPeriodsPerYear;
        const annualCpp = cppDeduction * this.payPeriodsPerYear;
        const annualEi = eiDeduction * this.payPeriodsPerYear;

        // Step 2: Calculate annual federal tax
        const federalTaxableIncome = Math.max(0, annualGross - annualCpp - annualEi);
        const annualFederalTax = calculateBracketTax(federalTaxableIncome, this.federalBrackets);

        // Apply federal tax credits (using lowest bracket rate)
        const lowestFederalRate = this.federalBrackets[0]?.rate || 0.14;
        const federalCredits = taxCredits.federal_total_claim * lowestFederalRate;
        const netFederalTax = Math.max(0, annualFederalTax - federalCredits);

        // Step 3: Calculate annual provincial tax
        const annualProvincialTax = calculateBracketTax(federalTaxableIncome, this.provincialBrackets);

        // Apply Ontario surtax if applicable
        let ontarioSurtax = 0;
        if (province === 'ON') {
            ontarioSurtax = this.calculateOntarioSurtax(annualProvincialTax);
        }

        const totalProvincialTax = annualProvincialTax + ontarioSurtax;

        // Apply provincial tax credits (using lowest bracket rate)
        const lowestProvincialRate = this.provincialBrackets[0]?.rate || 0.0505;
        const provincialCredits = taxCredits.provincial_total_claim * lowestProvincialRate;
        const netProvincialTax = Math.max(0, totalProvincialTax - provincialCredits);

        // Step 4: De-annualize back to pay period
        const federalTax = round(netFederalTax / this.payPeriodsPerYear);
        const provincialTax = round(netProvincialTax / this.payPeriodsPerYear);

        return {
            federalTax,
            provincialTax,
            details: {
                annualizedIncome: round(annualGross),
                annualFederalTax: round(annualFederalTax),
                annualProvincialTax: round(annualProvincialTax),
                federalCreditsUsed: round(federalCredits),
                provincialCreditsUsed: round(provincialCredits),
                ontarioSurtax: round(ontarioSurtax),
            },
        };
    }

    /**
     * Calculate Ontario surtax
     * - If base tax > $5,554: Add 20% of amount over $5,554
     * - If base tax > $7,108: Add additional 36% of amount over $7,108
     */
    private calculateOntarioSurtax(baseTax: number): number {
        const threshold1 = this.provincialConstants.surtax_threshold_1 ?? 5554;
        const threshold2 = this.provincialConstants.surtax_threshold_2 ?? 7108;
        const rate1 = this.provincialConstants.surtax_rate_1 ?? 0.20;
        const rate2 = this.provincialConstants.surtax_rate_2 ?? 0.36;

        let surtax = 0;

        if (baseTax > threshold1) {
            surtax += (Math.min(baseTax, threshold2) - threshold1) * rate1;
        }

        if (baseTax > threshold2) {
            surtax += (baseTax - threshold2) * rate2;
        }

        return surtax;
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
    const [taxConstants, federalBrackets, provincialBrackets, provincialConstants, payrollSettings] =
        await Promise.all([
            api.getTaxConstants(taxYear),
            api.getTaxRates(taxYear, 'federal'),
            api.getTaxRates(taxYear, province),
            api.getProvincialTaxConstants(taxYear, province),
            api.getPayrollSettings(companyId),
        ]);

    if (!payrollSettings) {
        throw new Error('Payroll settings not found for company');
    }

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
