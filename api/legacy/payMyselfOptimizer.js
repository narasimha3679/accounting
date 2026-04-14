/**
 * Pay Myself Optimizer Service
 * 
 * Comprehensive withdrawal optimization engine for Canadian CCPC owner-managers.
 * Calculates accurate after-tax outcomes for Reimbursements, Dividends, and Salary/Bonus.
 */

/**
 * Round to 2 decimal places
 */
function round(value) {
    return Math.round(value * 100) / 100;
}

/**
 * Fetch all tax constants needed for calculations
 */
async function fetchTaxConstants(taxYear, province = 'ON') {
    const dataPath = process.env.TAX_DATA_PATH;
    if (!dataPath) {
        throw new Error('TAX_DATA_PATH is required. The legacy optimizer now relies on Go-provided tax data only.');
    }
    const fs = require('fs');
    return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

/**
 * Calculate tax using progressive brackets
 */
function calculateBracketTax(taxableIncome, brackets) {
    if (!brackets || brackets.length === 0 || taxableIncome <= 0) return 0;

    let tax = 0;
    for (const bracket of brackets) {
        const minIncome = Number(bracket.min_income);
        const maxIncome = bracket.max_income ? Number(bracket.max_income) : Infinity;
        const rate = Number(bracket.rate);

        if (taxableIncome > minIncome) {
            const taxableInBracket = Math.min(taxableIncome, maxIncome) - minIncome;
            tax += taxableInBracket * rate;
        }
    }
    return round(tax);
}

/**
 * Calculate Ontario Health Premium
 */
function calculateOntarioHealthPremium(taxableIncome, tiers) {
    if (!tiers || tiers.length === 0 || taxableIncome <= 0) return 0;

    for (const tier of tiers) {
        const minIncome = Number(tier.min_income);
        const maxIncome = tier.max_income ? Number(tier.max_income) : Infinity;
        const basePremium = Number(tier.base_premium);
        const rateOnExcess = Number(tier.rate_on_excess);

        if (taxableIncome >= minIncome && taxableIncome <= maxIncome) {
            const excess = taxableIncome - minIncome;
            const calculatedPremium = basePremium + (excess * rateOnExcess);

            // Cap based on next tier if exists
            const tierIndex = tiers.indexOf(tier);
            if (tierIndex < tiers.length - 1) {
                const nextTierBase = Number(tiers[tierIndex + 1].base_premium);
                return round(Math.min(calculatedPremium, nextTierBase + (minIncome - Number(tiers[tierIndex + 1].min_income)) * rateOnExcess));
            }
            return round(calculatedPremium);
        }
    }

    // Above all tiers - return max
    const lastTier = tiers[tiers.length - 1];
    return round(Number(lastTier.base_premium));
}

/**
 * Calculate Ontario Surtax
 */
function calculateOntarioSurtax(baseProvincialTax, provincialConstants) {
    if (!provincialConstants) return 0;

    const threshold1 = Number(provincialConstants.surtax_threshold_1 || 5554);
    const threshold2 = Number(provincialConstants.surtax_threshold_2 || 7108);
    const rate1 = Number(provincialConstants.surtax_rate_1 || 0.20);
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

/**
 * Calculate salary net after all deductions
 * 
 * Input: corporateCost (what the corporation pays out including employer portions)
 * Returns detailed breakdown of gross salary, CPP/EI, taxes, and net in pocket
 */
function calculateSalaryNet(corporateCost, constants, ytdIncome = 0) {
    const { taxConstants, federalBrackets, provincialBrackets, provincialConstants, healthPremiumTiers, province } = constants;

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
            efficiency: 0
        };
    }

    // CPP and EI constants
    const cppRate = Number(taxConstants.cpp_rate || 0.0595);
    const cppEmployerRate = Number(taxConstants.cpp_employer_rate || 0.0595);
    const cppBasicExemption = Number(taxConstants.cpp_basic_exemption || 3500);
    const cppYmpe = Number(taxConstants.cpp_ympe || 74600);
    const cppMaxContribution = Number(taxConstants.cpp_max_contribution || 4237.95);

    const eiEmployeeRate = Number(taxConstants.ei_employee_rate || 0.0163);
    const eiEmployerMultiplier = Number(taxConstants.ei_employer_multiplier || 1.4);
    const eiMaxInsurable = Number(taxConstants.ei_max_insurable || 68900);
    const eiMaxPremium = Number(taxConstants.ei_max_premium || 1123.07);

    const federalBasicPersonal = Number(taxConstants.federal_basic_personal_amount || 16129);
    const provincialBasicPersonal = Number(provincialConstants.basic_personal_amount || 12399);

    // Step 1: Calculate gross salary from corporate cost
    // Corporate cost = Gross Salary + Employer CPP + Employer EI
    // Employer CPP = min((Gross - BasicExemption) * cppEmployerRate, cppMax)
    // Employer EI = min(Gross * eiEmployeeRate * eiEmployerMultiplier, eiMaxPremium * eiEmployerMultiplier)

    // Estimate gross salary iteratively
    let grossSalary = corporateCost / 1.08; // Initial estimate
    for (let i = 0; i < 10; i++) {
        const employerCpp = Math.min(Math.max(0, grossSalary - cppBasicExemption) * cppEmployerRate, cppMaxContribution);
        const employerEi = Math.min(grossSalary * eiEmployeeRate * eiEmployerMultiplier, eiMaxPremium * eiEmployerMultiplier);
        const totalEmployerCost = grossSalary + employerCpp + employerEi;
        grossSalary = grossSalary * (corporateCost / totalEmployerCost);
    }
    grossSalary = round(grossSalary);

    // Step 2: Calculate employer contributions
    const employerCpp = round(Math.min(Math.max(0, grossSalary - cppBasicExemption) * cppEmployerRate, cppMaxContribution));
    const employerEi = round(Math.min(grossSalary * eiEmployeeRate * eiEmployerMultiplier, eiMaxPremium * eiEmployerMultiplier));

    // Step 3: Calculate employee deductions
    const employeeCpp = round(Math.min(Math.max(0, grossSalary - cppBasicExemption) * cppRate, cppMaxContribution));
    const employeeEi = round(Math.min(grossSalary * eiEmployeeRate, eiMaxPremium));

    // Step 4: Calculate income taxes
    const totalIncome = grossSalary + ytdIncome;

    // Federal tax
    const federalTaxBeforeCredits = calculateBracketTax(totalIncome, federalBrackets);
    const lowestFederalRate = federalBrackets[0]?.rate || 0.15;
    const federalBasicCredit = federalBasicPersonal * lowestFederalRate;
    const federalCppCredit = employeeCpp * lowestFederalRate;
    const federalEiCredit = employeeEi * lowestFederalRate;
    const federalEmploymentCredit = Math.min(grossSalary, 1433) * lowestFederalRate;
    const federalTax = round(Math.max(0, federalTaxBeforeCredits - federalBasicCredit - federalCppCredit - federalEiCredit - federalEmploymentCredit));

    // Provincial tax
    const provincialTaxBeforeCredits = calculateBracketTax(totalIncome, provincialBrackets);
    const lowestProvincialRate = provincialBrackets[0]?.rate || 0.0505;
    const provincialBasicCredit = provincialBasicPersonal * lowestProvincialRate;
    const provincialCppCredit = employeeCpp * lowestProvincialRate;
    const provincialEiCredit = employeeEi * lowestProvincialRate;
    const baseprovincialTax = Math.max(0, provincialTaxBeforeCredits - provincialBasicCredit - provincialCppCredit - provincialEiCredit);

    // Ontario surtax
    const ontarioSurtax = province === 'ON' ? calculateOntarioSurtax(baseprovincialTax, provincialConstants) : 0;
    const provincialTax = round(baseprovincialTax + ontarioSurtax);

    // Ontario Health Premium (applies to salary income)
    const healthPremium = province === 'ON' ? calculateOntarioHealthPremium(totalIncome, healthPremiumTiers) : 0;

    // Step 5: Calculate net in pocket
    const totalDeductions = employeeCpp + employeeEi + federalTax + provincialTax + healthPremium;
    const netInPocket = round(grossSalary - totalDeductions);

    // RRSP room (18% of earned income, capped at yearly maximum)
    const rrspMaxRoom = Number(taxConstants.rrsp_max_contribution_room || 31560);
    const rrspRoomCreated = round(Math.min(grossSalary * 0.18, rrspMaxRoom));

    // Efficiency
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
        efficiency
    };
}

/**
 * Calculate dividend net after taxes
 * 
 * Input: amount (actual cash paid as dividend)
 * Returns detailed breakdown of gross-up, taxes, credits, and net in pocket
 * 
 * IMPORTANT: Efficiency is now calculated from gross corporate income (before corp tax)
 * to give users the true end-to-end picture.
 */
function calculateDividendNet(amount, constants, dividendType = 'non_eligible', ytdIncome = 0, smallBusinessRate = 0.125) {
    const { federalBrackets, provincialBrackets, provincialConstants, dividendConstants, province } = constants;

    if (amount <= 0) {
        return {
            cashPaid: 0,
            grossCorpIncome: 0,
            corporateTax: 0,
            grossedUp: 0,
            federalTaxBeforeCredits: 0,
            federalDividendCredit: 0,
            provincialTaxBeforeCredits: 0,
            provincialDividendCredit: 0,
            ontarioSurtax: 0,
            netTax: 0,
            netInPocket: 0,
            efficiency: 100,
            trueEfficiency: 100
        };
    }

    // Calculate gross corporate income needed to pay this dividend
    // Corp must first pay small business tax, then remaining is available for dividend
    const grossCorpIncome = round(amount / (1 - smallBusinessRate));
    const corporateTax = round(grossCorpIncome - amount);

    // Get dividend constants for this type
    const federalDivConstants = dividendConstants.find(d => d.province === 'federal' && d.dividend_type === dividendType);
    const provincialDivConstants = dividendConstants.find(d => d.province === province && d.dividend_type === dividendType);

    // Fallback rates if no DB data
    const grossUpRate = federalDivConstants ? Number(federalDivConstants.gross_up_rate) : (dividendType === 'eligible' ? 0.38 : 0.15);
    const federalCreditRate = federalDivConstants ? Number(federalDivConstants.federal_tax_credit_rate) : (dividendType === 'eligible' ? 0.1502 : 0.0903);
    const provincialCreditRate = provincialDivConstants ? Number(provincialDivConstants.provincial_tax_credit_rate) : (dividendType === 'eligible' ? 0.10 : 0.0287);

    // Step 1: Gross-up
    const grossedUp = round(amount * (1 + grossUpRate));

    // Step 2: Calculate taxable income (grossed-up dividends)
    const totalTaxableIncome = grossedUp + ytdIncome;

    // Step 3: Federal tax
    const federalTaxBeforeCredits = calculateBracketTax(totalTaxableIncome, federalBrackets);

    // Federal basic personal credit
    const federalBasicPersonal = Number(constants.taxConstants?.federal_basic_personal_amount || 16129);
    const lowestFederalRate = federalBrackets[0]?.rate || 0.15;
    const federalBasicCredit = federalBasicPersonal * lowestFederalRate;

    // Federal dividend tax credit (on grossed-up amount)
    const federalDividendCredit = round(grossedUp * federalCreditRate);

    const netFederalTax = round(Math.max(0, federalTaxBeforeCredits - federalBasicCredit - federalDividendCredit));

    // Step 4: Provincial tax
    const provincialTaxBeforeCredits = calculateBracketTax(totalTaxableIncome, provincialBrackets);

    // Provincial basic personal credit
    const provincialBasicPersonal = Number(constants.provincialConstants?.basic_personal_amount || 12399);
    const lowestProvincialRate = provincialBrackets[0]?.rate || 0.0505;
    const provincialBasicCredit = provincialBasicPersonal * lowestProvincialRate;

    // Provincial dividend tax credit
    const provincialDividendCredit = round(grossedUp * provincialCreditRate);

    // Base provincial tax after credits
    const baseProvincialTax = Math.max(0, provincialTaxBeforeCredits - provincialBasicCredit - provincialDividendCredit);

    // Ontario surtax: Applies to all provincial tax (including dividend tax)
    // Note: This is different from Ontario Health Premium, which only applies to salary income
    // The surtax is calculated on the base provincial tax after basic personal and dividend credits
    const ontarioSurtax = province === 'ON' ? calculateOntarioSurtax(baseProvincialTax, provincialConstants) : 0;

    const netProvincialTax = round(baseProvincialTax + ontarioSurtax);

    // Step 5: Net tax and net in pocket
    const netTax = round(netFederalTax + netProvincialTax);
    const netInPocket = round(amount - netTax);

    // Efficiency calculations
    // "efficiency" - personal tax efficiency (net / dividend amount)
    const efficiency = amount > 0 ? round((netInPocket / amount) * 100) : 100;
    // "trueEfficiency" - end-to-end efficiency from gross corp income (includes corp tax)
    const trueEfficiency = grossCorpIncome > 0 ? round((netInPocket / grossCorpIncome) * 100) : 100;
    // "totalTax" - combined corporate + personal tax paid
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
        trueEfficiency
    };
}

/**
 * Calculate reimbursement net (tax-free)
 */
function calculateReimbursementNet(amount, owedToOwner) {
    const reimbursableAmount = Math.min(amount, owedToOwner);

    return {
        amount: round(reimbursableAmount),
        availableToReimburse: round(owedToOwner),
        netInPocket: round(reimbursableAmount),
        tax: 0,
        efficiency: 100,
        note: 'Tax-free repayment of expenses you paid on behalf of the company'
    };
}

/**
 * Optimize withdrawal strategy
 * 
 * Calculates optimal mix of reimbursements, dividends, and salary
 */
async function optimizeWithdrawal(params) {
    const {
        corporateCost,
        owedToOwner = 0,
        province = 'ON',
        taxYear = new Date().getFullYear(),
        ytdPersonalIncome = 0,
        dividendType = 'non_eligible',
        smallBusinessRate = 0.125 // Default 12.5% for CCPCs
    } = params;

    // Fetch tax constants
    const constants = await fetchTaxConstants(taxYear, province);

    // 1. First, maximize reimbursements (100% efficient)
    const reimbursement = calculateReimbursementNet(corporateCost, owedToOwner);
    const reimbursementAmount = reimbursement.amount;
    const remaining = corporateCost - reimbursementAmount;

    // 2. Calculate dividend option for remaining amount
    // Note: Uses smallBusinessRate to calculate true cost including corporate tax
    const dividendResult = calculateDividendNet(remaining, constants, dividendType, ytdPersonalIncome, smallBusinessRate);

    // 3. Calculate salary option for remaining amount  
    const salaryResult = calculateSalaryNet(remaining, constants, ytdPersonalIncome);

    // 4. Determine recommendation
    let recommendation;
    let explanation;

    if (reimbursementAmount === corporateCost) {
        recommendation = 'reimbursement';
        explanation = `Take the full amount as reimbursement. This is 100% tax-free since the company owes you $${owedToOwner.toLocaleString()}.`;
    } else if (dividendResult.netInPocket > salaryResult.netInPocket) {
        const savings = round(dividendResult.netInPocket - salaryResult.netInPocket);
        recommendation = 'dividend';
        explanation = reimbursementAmount > 0
            ? `Take $${reimbursementAmount.toLocaleString()} as reimbursement (tax-free) + $${remaining.toLocaleString()} as ${dividendType === 'eligible' ? 'eligible' : 'non-eligible'} dividend. Dividends save you $${savings.toLocaleString()} compared to salary.`
            : `Take ${dividendType === 'eligible' ? 'eligible' : 'non-eligible'} dividends. You keep $${dividendResult.netInPocket.toLocaleString()} (${dividendResult.efficiency}% efficiency) vs $${salaryResult.netInPocket.toLocaleString()} with salary.`;
    } else {
        const savings = round(salaryResult.netInPocket - dividendResult.netInPocket);
        recommendation = 'salary';
        explanation = reimbursementAmount > 0
            ? `Take $${reimbursementAmount.toLocaleString()} as reimbursement (tax-free) + $${remaining.toLocaleString()} as salary. Salary is slightly better here and creates $${salaryResult.rrspRoomCreated.toLocaleString()} in RRSP room.`
            : `Take salary. You keep $${salaryResult.netInPocket.toLocaleString()} plus you get $${salaryResult.rrspRoomCreated.toLocaleString()} in RRSP contribution room.`;
    }

    // Calculate total net in pocket for recommended strategy
    let totalNetInPocket;
    let totalEfficiency;

    if (recommendation === 'dividend') {
        totalNetInPocket = round(reimbursementAmount + dividendResult.netInPocket);
    } else if (recommendation === 'salary') {
        totalNetInPocket = round(reimbursementAmount + salaryResult.netInPocket);
    } else {
        totalNetInPocket = reimbursementAmount;
    }
    totalEfficiency = corporateCost > 0 ? round((totalNetInPocket / corporateCost) * 100) : 100;

    return {
        input: {
            corporateCost: round(corporateCost),
            owedToOwner: round(owedToOwner),
            province,
            taxYear,
            ytdPersonalIncome: round(ytdPersonalIncome),
            dividendType
        },
        options: {
            reimbursement: {
                ...reimbursement,
                available: owedToOwner > 0
            },
            dividend: {
                ...dividendResult,
                amount: remaining,
                note: `Includes ${(smallBusinessRate * 100).toFixed(1)}% corp tax. No CPP/RRSP benefits.`
            },
            salary: {
                ...salaryResult,
                amount: remaining,
                note: 'Creates RRSP room and CPP benefits'
            }
        },
        recommendation: {
            strategy: reimbursementAmount > 0 && remaining > 0
                ? `Reimbursement + ${recommendation.charAt(0).toUpperCase() + recommendation.slice(1)}`
                : recommendation.charAt(0).toUpperCase() + recommendation.slice(1),
            totalNetInPocket,
            totalEfficiency: `${totalEfficiency}%`,
            breakdown: [
                ...(reimbursementAmount > 0 ? [{ type: 'reimbursement', amount: reimbursementAmount }] : []),
                ...(remaining > 0 ? [{ type: recommendation === 'salary' ? 'salary' : 'dividend', amount: remaining }] : [])
            ],
            explanation
        },
        disclaimer: 'These are estimates for planning purposes only. Consult a tax professional for your specific situation.'
    };
}

module.exports = {
    fetchTaxConstants,
    calculateSalaryNet,
    calculateDividendNet,
    calculateReimbursementNet,
    optimizeWithdrawal,
    calculateOntarioHealthPremium,
    calculateBracketTax
};


if (require.main === module) {
    const fs = require('fs');
    (async () => {
        try {
            const params = JSON.parse(process.argv[2] || '{}');
            const out = await optimizeWithdrawal(params);
            console.log(JSON.stringify(out));
        } catch (e) {
            console.error(e);
            process.exit(1);
        }
    })();
}
