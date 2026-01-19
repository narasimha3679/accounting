/**
 * Tax Tables Helper Functions
 * 
 * Helper functions for fetching and working with tax brackets.
 */

import api from './api';
import type { TaxBracket } from './payrollTypes';

/**
 * Get federal tax brackets for a specific tax year
 */
export async function getFederalBrackets(taxYear: number): Promise<TaxBracket[]> {
    return api.getTaxRates(taxYear, 'federal');
}

/**
 * Get provincial tax brackets for a specific tax year and province
 */
export async function getProvincialBrackets(taxYear: number, province: string): Promise<TaxBracket[]> {
    return api.getTaxRates(taxYear, province);
}

/**
 * Find the applicable tax bracket for a given income
 * Returns the bracket that contains the income, or null if income is below all brackets
 */
export function findBracket(income: number, brackets: TaxBracket[]): TaxBracket | null {
    for (const bracket of brackets) {
        const maxIncome = bracket.max_income ?? Infinity;
        if (income >= bracket.min_income && income <= maxIncome) {
            return bracket;
        }
    }
    return null;
}

/**
 * Calculate tax using progressive brackets
 * Applies each bracket rate to the portion of income within that bracket
 */
export function calculateBracketTax(income: number, brackets: TaxBracket[]): number {
    let tax = 0;
    let remainingIncome = income;

    for (const bracket of brackets) {
        if (remainingIncome <= 0) break;

        const bracketMax = bracket.max_income ?? Infinity;
        const bracketSize = bracketMax - bracket.min_income;
        const taxableInBracket = Math.min(remainingIncome, bracketSize);

        tax += taxableInBracket * bracket.rate;
        remainingIncome -= taxableInBracket;
    }

    return tax;
}
