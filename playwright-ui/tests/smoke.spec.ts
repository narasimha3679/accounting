import { test, expect } from '@playwright/test';
import {
  goToCapitalAssets,
  goToClients,
  goToDashboard,
  goToDividends,
  goToEmployees,
  goToExpenses,
  goToIncome,
  goToInvoices,
  goToOwnerPayments,
  goToPayRuns,
  goToPayrollReports,
  goToROE,
  goToRemittances,
  goToReports,
  goToSettings,
  goToT4,
  goToTaxSummary,
  goToTimeManagement,
} from './helpers/nav';

test.describe('Feature flags and route smoke', () => {
  test('sidebar shows key features when all features are enabled', async ({ page }) => {
    await goToDashboard(page);

    // Prefer the main app sidebar links by href to avoid ambiguous names
    const links: Array<{ name: string; href: string }> = [
      { name: 'Invoices', href: '/invoices' },
      { name: 'Income', href: '/income' },
      { name: 'Expenses', href: '/expenses' },
      { name: 'Capital Assets', href: '/capital-assets' },
      { name: 'Dividends', href: '/dividends' },
      { name: 'Owner Reimbursement', href: '/owner-payments' },
      { name: 'Clients', href: '/clients' },
      { name: 'Employees', href: '/employees' },
      { name: 'Time Management', href: '/time-management' },
      { name: 'Pay Runs', href: '/payroll/runs' },
      { name: 'Payroll Reports', href: '/payroll/reports' },
      { name: 'Remittances', href: '/payroll/remittances' },
      { name: 'ROEs', href: '/payroll/roe' },
      { name: 'T4 Generation', href: '/payroll/t4' },
      { name: 'Reports', href: '/reports' },
      { name: 'Tax Summary', href: '/reports/tax-summary' },
      { name: 'Settings', href: '/settings' },
    ];

    for (const { name, href } of links) {
      await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.locator(`a[href="${href}"]`).first()).toContainText(name);
    }
  });

  test('major company routes load with expected headings', async ({ page }) => {
    await goToDashboard(page);
    await goToClients(page);
    await expect(page.getByRole('button', { name: 'Add Client' })).toBeVisible();

    await goToInvoices(page);
    await expect(page.getByRole('button', { name: 'Create Invoice' })).toBeVisible();

    await goToIncome(page);
    await expect(page.getByRole('button', { name: 'Add Income Entry' })).toBeVisible();

    await goToExpenses(page);
    await expect(page.getByRole('button', { name: 'Add Expense' })).toBeVisible();

    await goToCapitalAssets(page);
    await expect(page.getByRole('button', { name: 'Add Capital Asset' })).toBeVisible();

    await goToDividends(page);
    await expect(page.getByRole('button', { name: 'Create Dividend' }).first()).toBeVisible();

    await goToOwnerPayments(page);
    await expect(page.getByRole('button', { name: 'Add Payment' }).first()).toBeVisible();

    await goToEmployees(page);
    await expect(page.getByRole('button', { name: 'Add Employee' })).toBeVisible();

    await goToTimeManagement(page);

    await goToPayRuns(page);
    await expect(page.getByRole('button', { name: 'Create New Pay Run' })).toBeVisible();

    await goToPayrollReports(page);
    await expect(page.getByRole('button', { name: 'Summary Report' })).toBeVisible();

    await goToRemittances(page);
    await goToROE(page);
    await goToT4(page);
    await goToReports(page);
    await goToTaxSummary(page);

    await goToSettings(page, 'general');
    await expect(page.getByText('Company Information')).toBeVisible();

    await goToSettings(page, 'features');
    await expect(page.getByText('Feature Management')).toBeVisible();
  });
});
