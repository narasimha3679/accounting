import { describe, it, expect } from 'vitest';
import {
  compareSalaryVsDividend,
  SMALL_BUSINESS_TAX_RATE_2026,
} from '../salaryVsDividendEngine';
import { calculateDividendTaxes, calculateTaxes } from '../canadaTaxEngine';

describe('salaryVsDividendEngine', () => {
  it('handles zero profit', () => {
    const result = compareSalaryVsDividend(0);
    expect(result.salary.netCash).toBe(0);
    expect(result.dividend.netCash).toBe(0);
    expect(result.dividendCashAdvantage).toBe(0);
  });

  it('salary route spends the full profit budget (salary + employer CPP)', () => {
    const { salary } = compareSalaryVsDividend(100000);
    expect(salary.grossSalary + salary.employerCpp).toBeCloseTo(100000, 0);
    expect(salary.grossSalary).toBeLessThan(100000);
  });

  it('salary route is EI-exempt', () => {
    const { salary } = compareSalaryVsDividend(100000);
    expect(salary.personal.eiDeduction).toBe(0);
  });

  it('dividend route applies small business corporate tax then personal tax', () => {
    const { dividend } = compareSalaryVsDividend(100000);
    expect(dividend.corporateTax).toBeCloseTo(100000 * SMALL_BUSINESS_TAX_RATE_2026, 2);
    expect(dividend.dividendPaid).toBeCloseTo(100000 - dividend.corporateTax, 2);
    expect(dividend.netCash).toBeCloseTo(dividend.dividendPaid - dividend.personal.totalTax, 2);
  });

  it('non-eligible dividend gross-up is 15%', () => {
    const result = calculateDividendTaxes(10000, 'non_eligible');
    expect(result.grossedUpDividend).toBeCloseTo(11500, 2);
  });

  it('small dividends are effectively tax-free (credits + BPA cover the tax)', () => {
    const result = calculateDividendTaxes(20000, 'non_eligible');
    // Only the Ontario Health Premium should apply at this level
    expect(result.federalTax).toBe(0);
    expect(result.totalTax).toBeLessThan(1000);
  });

  it('dividends attract no CPP so the routes stay within a few points of each other', () => {
    for (const profit of [60000, 100000, 150000, 250000]) {
      const { salary, dividend } = compareSalaryVsDividend(profit);
      expect(salary.netCash).toBeGreaterThan(0);
      expect(dividend.netCash).toBeGreaterThan(0);
      // Integration means the two routes should never diverge wildly
      const gap = Math.abs(dividend.netCash - salary.netCash);
      expect(gap / profit).toBeLessThan(0.1);
    }
  });

  it('salary route generates RRSP room, dividend route none', () => {
    const { salary } = compareSalaryVsDividend(100000);
    expect(salary.rrspRoomGenerated).toBeCloseTo(salary.grossSalary * 0.18, 0);

    const bigProfit = compareSalaryVsDividend(300000);
    expect(bigProfit.salary.rrspRoomGenerated).toBe(35390); // capped at dollar limit
  });

  it('effective rates are sensible and increase with income', () => {
    const low = compareSalaryVsDividend(60000);
    const high = compareSalaryVsDividend(200000);
    expect(low.salary.effectiveRate).toBeGreaterThan(10);
    expect(low.salary.effectiveRate).toBeLessThan(40);
    expect(high.salary.effectiveRate).toBeGreaterThan(low.salary.effectiveRate);
    expect(high.dividend.effectiveRate).toBeGreaterThan(low.dividend.effectiveRate);
  });

  it('EI-exempt salary tax is lower than regular salary tax', () => {
    const regular = calculateTaxes(100000);
    const exempt = calculateTaxes(100000, { eiExempt: true });
    expect(exempt.eiDeduction).toBe(0);
    expect(exempt.totalTax).toBeLessThan(regular.totalTax);
  });
});
