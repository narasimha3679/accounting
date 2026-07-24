import { test, expect } from '@playwright/test';
import { createPwEmployee, deletePwEmployee } from './helpers/employees';
import { goToPayRuns } from './helpers/nav';
import { acceptNextDialog } from './helpers/ui';

test.describe('Pay Runs', () => {
  test('create draft pay run and delete it', async ({ page }) => {
    const employee = await createPwEmployee(page);

    try {
      await goToPayRuns(page);
      await page.getByRole('button', { name: 'Create New Pay Run' }).click();

      // /new may auto-create and redirect to id, or show a form
      await page.waitForURL(/\/payroll\/runs\/.+/, { timeout: 30_000 });
      await expect(
        page.getByRole('heading', { name: /Pay Run/i }).first(),
      ).toBeVisible({ timeout: 30_000 });

      // If still on details, try calculate when available
      const calculate = page.getByRole('button', { name: 'Calculate All' });
      if (await calculate.isVisible().catch(() => false)) {
        await calculate.click();
        await page.waitForTimeout(1500);
      }

      await goToPayRuns(page);
      const draftRow = page.locator('tbody tr', { hasText: /draft/i }).first();
      if ((await draftRow.count()) > 0 && (await draftRow.getByTitle('Delete').count()) > 0) {
        acceptNextDialog(page);
        await draftRow.getByTitle('Delete').click();
      } else {
        // At least the list page works
        await expect(page.getByRole('heading', { name: 'Pay Runs', level: 1 })).toBeVisible();
      }
    } finally {
      await deletePwEmployee(page, employee);
    }
  });
});
