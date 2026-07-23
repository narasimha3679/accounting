import { expect, type Page } from '@playwright/test';

export function testCredentials() {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD in playwright-ui/.env',
    );
  }
  return { email, password };
}

/** Sign in and wait until the app dashboard is ready. */
export async function loginAsTestUser(page: Page) {
  const { email, password } = testCredentials();

  await page.goto('/login');
  await page.getByPlaceholder('Email address').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
}

export async function goToExpenses(page: Page) {
  await page.goto('/expenses');
  await expect(page.getByRole('button', { name: 'Add Expense' })).toBeVisible({
    timeout: 20_000,
  });
}

export async function goToReports(page: Page) {
  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: 'Profit & Loss' })).toBeVisible({
    timeout: 20_000,
  });
}
