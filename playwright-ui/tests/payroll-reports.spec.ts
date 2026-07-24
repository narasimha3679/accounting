import { test, expect } from '@playwright/test';
import { goToPayrollReports } from './helpers/nav';

test.describe('Payroll Reports', () => {
  test('tabs render report views', async ({ page }) => {
    await goToPayrollReports(page);

    for (const tab of ['Summary Report', 'Employee Earnings', 'Deductions', 'Journal Entry']) {
      await page.getByRole('button', { name: tab }).click();
      await expect(page.getByRole('heading', { name: 'Payroll Reports' })).toBeVisible();
    }

    await page.getByRole('button', { name: 'Journal Entry' }).click();
    await expect(
      page.getByText(/Please select a pay run|Journal/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
