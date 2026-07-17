// 2026 Ontario salary vs non-eligible dividend comparison for owner-managers
// of a CCPC. Pure frontend math — no backend calls. Both routes start from the
// same corporate pre-tax profit so the comparison is apples-to-apples:
//
// Salary route:    profit − salary − employer CPP = 0 (salary is deductible)
// Dividend route:  profit − small business corp tax = dividend paid
//
// Owner-managers with >40% of voting shares are EI-exempt, so no EI on the
// salary route. Dividends never attract CPP/EI.

import {
  calculateTaxes,
  calculateDividendTaxes,
  type TaxResult,
  type DividendTaxResult,
} from './canadaTaxEngine';

// Combined federal (9%) + Ontario small business CIT rate for calendar 2026.
// Ontario's rate drops 3.2% -> 2.2% on July 1, 2026, so calendar-year filers
// pay a prorated 2.7% provincial rate (9% + 2.7% = 11.7%).
export const SMALL_BUSINESS_TAX_RATE_2026 = 0.117;

// 2026 CPP employer match (mirrors employee side in canadaTaxEngine)
const CPP_YMPE = 74600;
const CPP_EXEMPTION = 3500;
const CPP_RATE = 0.0595;
const CPP2_YAMPE = 85000;
const CPP2_RATE = 0.04;

// RRSP room earned on 2026 salary (18% of earned income, 2027 dollar limit)
const RRSP_RATE = 0.18;
const RRSP_DOLLAR_LIMIT = 35390;

export interface SalaryRoute {
  corporateProfit: number;
  grossSalary: number;
  employerCpp: number;
  personal: TaxResult;
  rrspRoomGenerated: number;
  /** Employee + employer CPP/CPP2 (retirement contributions, not pure tax) */
  totalCppContributions: number;
  /** Income tax + health premium + all CPP (employee and employer) */
  totalCost: number;
  netCash: number;
  effectiveRate: number; // percent of corporate profit
}

export interface DividendRoute {
  corporateProfit: number;
  corporateTax: number;
  dividendPaid: number;
  personal: DividendTaxResult;
  totalCost: number; // corporate tax + personal tax
  netCash: number;
  effectiveRate: number; // percent of corporate profit
}

export interface SalaryVsDividendResult {
  salary: SalaryRoute;
  dividend: DividendRoute;
  /** Positive = dividend route leaves more cash in the owner's pocket */
  dividendCashAdvantage: number;
}

function employerCppFor(salary: number): number {
  const pensionable = Math.min(Math.max(salary - CPP_EXEMPTION, 0), CPP_YMPE - CPP_EXEMPTION);
  const cpp2 =
    salary > CPP_YMPE ? (Math.min(salary, CPP2_YAMPE) - CPP_YMPE) * CPP2_RATE : 0;
  return pensionable * CPP_RATE + cpp2;
}

/** Largest gross salary such that salary + employer CPP fits in the profit budget. */
function maxSalaryWithinBudget(profit: number): number {
  let low = 0;
  let high = profit;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (mid + employerCppFor(mid) <= profit) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return low;
}

function computeSalaryRoute(profit: number): SalaryRoute {
  const grossSalary = maxSalaryWithinBudget(profit);
  const employerCpp = employerCppFor(grossSalary);
  const personal = calculateTaxes(grossSalary, { eiExempt: true });

  const totalCppContributions =
    personal.cppDeduction + personal.cpp2Deduction + employerCpp;
  const totalCost = personal.totalTax + employerCpp;

  return {
    corporateProfit: profit,
    grossSalary,
    employerCpp,
    personal,
    rrspRoomGenerated: Math.min(grossSalary * RRSP_RATE, RRSP_DOLLAR_LIMIT),
    totalCppContributions,
    totalCost,
    netCash: personal.netPay,
    effectiveRate: profit > 0 ? (totalCost / profit) * 100 : 0,
  };
}

function computeDividendRoute(profit: number): DividendRoute {
  const corporateTax = Math.max(0, profit) * SMALL_BUSINESS_TAX_RATE_2026;
  const dividendPaid = Math.max(0, profit) - corporateTax;
  const personal = calculateDividendTaxes(dividendPaid, 'non_eligible');

  const totalCost = corporateTax + personal.totalTax;

  return {
    corporateProfit: profit,
    corporateTax,
    dividendPaid,
    personal,
    totalCost,
    netCash: personal.netCash,
    effectiveRate: profit > 0 ? (totalCost / profit) * 100 : 0,
  };
}

/**
 * Compare paying out a given corporate pre-tax profit entirely as salary vs
 * entirely as a non-eligible dividend (2026, Ontario, owner-manager).
 */
export function compareSalaryVsDividend(corporateProfit: number): SalaryVsDividendResult {
  const profit = Math.max(0, corporateProfit);
  const salary = computeSalaryRoute(profit);
  const dividend = computeDividendRoute(profit);

  return {
    salary,
    dividend,
    dividendCashAdvantage: dividend.netCash - salary.netCash,
  };
}
