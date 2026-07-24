import { expect, type Page } from '@playwright/test';

export async function goToDashboard(page: Page) {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Cockpit', level: 1 })).toBeVisible({
    timeout: 20_000,
  });
}

export async function goToClients(page: Page) {
  await page.goto('/clients');
  await expect(page.getByRole('heading', { name: 'Clients', level: 1 })).toBeVisible({
    timeout: 20_000,
  });
}

export async function goToInvoices(page: Page) {
  await page.goto('/invoices');
  await expect(page.getByRole('heading', { name: 'Invoices', level: 1 })).toBeVisible({
    timeout: 20_000,
  });
}

export async function goToIncome(page: Page) {
  await page.goto('/income');
  await expect(page.getByRole('heading', { name: 'Income Entries', level: 1 })).toBeVisible({
    timeout: 20_000,
  });
}

export async function goToExpenses(page: Page) {
  await page.goto('/expenses');
  await expect(page.getByRole('button', { name: 'Add Expense' })).toBeVisible({
    timeout: 20_000,
  });
}

export async function goToCapitalAssets(page: Page) {
  await page.goto('/capital-assets');
  await expect(page.getByRole('heading', { name: 'Capital Assets', level: 1 })).toBeVisible({
    timeout: 20_000,
  });
}

export async function goToDividends(page: Page) {
  await page.goto('/dividends');
  await expect(page.getByRole('heading', { name: 'Dividends', level: 1 })).toBeVisible({
    timeout: 20_000,
  });
}

/** Legacy /salary route redirects to pay runs. */
export async function goToSalary(page: Page) {
  await page.goto('/salary');
  await expect(page).toHaveURL(/\/payroll\/runs/, { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Pay Runs', level: 1 })).toBeVisible({
    timeout: 20_000,
  });
}

export async function goToOwnerPayments(page: Page) {
  await page.goto('/owner-payments');
  await expect(page.getByRole('heading', { name: 'Owner Reimbursement', level: 1 })).toBeVisible({
    timeout: 20_000,
  });
}

export async function goToEmployees(page: Page) {
  await page.goto('/employees');
  await expect(page.getByRole('heading', { name: 'Employees', level: 1 })).toBeVisible({
    timeout: 20_000,
  });
}

export async function goToTimeManagement(page: Page) {
  await page.goto('/time-management');
  await expect(page.getByRole('heading', { name: 'Time Management', level: 1 })).toBeVisible({
    timeout: 20_000,
  });
}

export async function goToPayRuns(page: Page) {
  await page.goto('/payroll/runs');
  await expect(page.getByRole('heading', { name: 'Pay Runs', level: 1 })).toBeVisible({
    timeout: 20_000,
  });
}

export async function goToPayrollReports(page: Page) {
  await page.goto('/payroll/reports');
  await expect(page.getByRole('heading', { name: 'Payroll Reports', level: 1 })).toBeVisible({
    timeout: 20_000,
  });
}

export async function goToRemittances(page: Page) {
  await page.goto('/payroll/remittances');
  await expect(page.getByRole('heading', { name: 'CRA Remittances', level: 1 })).toBeVisible({
    timeout: 20_000,
  });
}

export async function goToROE(page: Page) {
  await page.goto('/payroll/roe');
  await expect(page.getByRole('heading', { name: 'Records of Employment', level: 1 })).toBeVisible({
    timeout: 20_000,
  });
}

export async function goToT4(page: Page) {
  await page.goto('/payroll/t4');
  await expect(page.getByRole('heading', { name: 'T4 Generation', level: 1 })).toBeVisible({
    timeout: 20_000,
  });
}

export async function goToReports(page: Page) {
  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: 'Profit & Loss' })).toBeVisible({
    timeout: 20_000,
  });
}

export async function goToTaxSummary(page: Page) {
  await page.goto('/reports/tax-summary');
  await expect(page.getByRole('heading', { name: 'Tax Summary', level: 1 })).toBeVisible({
    timeout: 20_000,
  });
}

export async function goToSettings(page: Page, section = 'general') {
  await page.goto(`/settings/${section}`);
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible({
    timeout: 20_000,
  });
}
