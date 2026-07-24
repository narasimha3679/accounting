import { test, expect } from '@playwright/test';
import { createPwEmployee, deletePwEmployee } from './helpers/employees';
import { goToTimeManagement } from './helpers/nav';

test.describe('Time Management', () => {
  test('time management page is usable with an employee', async ({ page }) => {
    const employee = await createPwEmployee(page);

    try {
      await goToTimeManagement(page);

      const modeHeading = page.getByRole('heading', { name: /Choose your time management style/i });
      if (await modeHeading.isVisible().catch(() => false)) {
        await page.getByText('Employees enter time').click();
        await page.getByRole('button', { name: 'Use this mode' }).click();
        await expect(modeHeading).toBeHidden({ timeout: 15_000 });
      }

      await expect(page.getByRole('heading', { name: 'Time Management', level: 1 })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add Time Entry' })).toBeVisible({
        timeout: 15_000,
      });
    } finally {
      await deletePwEmployee(page, employee);
    }
  });
});
