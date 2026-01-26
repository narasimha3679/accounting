/**
 * Pay Myself Optimizer Types
 * 
 * TypeScript interfaces for the withdrawal optimization API
 */

export interface PayMyselfOptimizeRequest {
    corporateCost: number;
    owedToOwner?: number;
    province?: string;
    taxYear?: number;
    ytdPersonalIncome?: number;
    dividendType?: 'eligible' | 'non_eligible';
}

export interface ReimbursementOption {
    amount: number;
    availableToReimburse: number;
    netInPocket: number;
    tax: number;
    efficiency: number;
    note: string;
    available: boolean;
}

export interface DividendOption {
    cashPaid: number;
    grossedUp: number;
    dividendType: string;
    grossUpRate: number;
    federalTaxBeforeCredits: number;
    federalDividendCredit: number;
    federalCreditRate: number;
    provincialTaxBeforeCredits: number;
    provincialDividendCredit: number;
    provincialCreditRate: number;
    ontarioSurtax: number;
    netFederalTax: number;
    netProvincialTax: number;
    netTax: number;
    netInPocket: number;
    efficiency: number;
    amount: number;
    note: string;
}

export interface SalaryOption {
    corporateCost: number;
    grossSalary: number;
    employerCpp: number;
    employerEi: number;
    employeeCpp: number;
    employeeEi: number;
    federalTax: number;
    provincialTax: number;
    ontarioSurtax: number;
    healthPremium: number;
    totalDeductions: number;
    netInPocket: number;
    rrspRoomCreated: number;
    efficiency: number;
    amount: number;
    note: string;
}

export interface PayMyselfRecommendation {
    strategy: string;
    totalNetInPocket: number;
    totalEfficiency: string;
    breakdown: Array<{ type: string; amount: number }>;
    explanation: string;
}

export interface PayMyselfOptimizeResponse {
    input: {
        corporateCost: number;
        owedToOwner: number;
        province: string;
        taxYear: number;
        ytdPersonalIncome: number;
        dividendType: string;
    };
    options: {
        reimbursement: ReimbursementOption;
        dividend: DividendOption;
        salary: SalaryOption;
    };
    recommendation: PayMyselfRecommendation;
    disclaimer: string;
}
