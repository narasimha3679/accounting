import { test, expect } from '@playwright/test';
import { loginAsEmployee } from './helpers/auth';
import { createPwEmployee, deletePwEmployee } from './helpers/employees';

test.describe('Employee portal', () => {
  test('employee can open portal pages', async ({ page, context }) => {
    const employee = await createPwEmployee(page);

    try {
      await context.clearCookies();
      await page.goto('/login');
      await loginAsEmployee(page, employee.email, employee.password);

      await expect(page.getByText(new RegExp(`Welcome,\\s*${employee.firstName}`, 'i'))).toBeVisible({
        timeout: 20_000,
      });

      await page.goto('/employee/pay-stubs');
      await expect(page.getByRole('heading', { name: /Pay Stubs/i })).toBeVisible({
        timeout: 20_000,
      });

      await page.goto('/employee/ytd');
      await expect(
        page.getByRole('heading', { name: /Year-to-Date Summary|YTD/i }).or(page.getByText(/No YTD data|Year-to-Date/i)),
      ).toBeVisible({ timeout: 20_000 });

      await page.goto('/employee/tax-documents');
      await expect(page.getByRole('heading', { name: /Tax Documents/i })).toBeVisible({
        timeout: 20_000,
      });

      await page.goto('/employee/info');
      await expect(page.getByRole('heading', { name: /My Information|Information/i })).toBeVisible({
        timeout: 20_000,
      });

      await page.goto('/employee/td1');
      await expect(page.getByRole('heading', { name: 'Tax Credits (TD1)' })).toBeVisible({
        timeout: 20_000,
      });

      await page.goto('/employee-time-management');
      await expect(page.getByRole('heading', { name: /My Time|My Schedule/i })).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      const email = process.env.PLAYWRIGHT_TEST_EMAIL!;
      const password = process.env.PLAYWRIGHT_TEST_PASSWORD!;
      await page.goto('/login');
      await page.getByPlaceholder('Email address').fill(email);
      await page.getByPlaceholder('Password').fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
      await deletePwEmployee(page, employee);
    }
  });
});
