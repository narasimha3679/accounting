import { test, expect } from '@playwright/test';
import { createPwEmployee, deletePwEmployee } from './helpers/employees';
import { goToT4 } from './helpers/nav';

test.describe('T4 Generation', () => {
  test('T4 page loads and lists employees', async ({ page }) => {
    const employee = await createPwEmployee(page);

    try {
      await goToT4(page);
      await expect(page.getByRole('heading', { name: 'T4 Generation', level: 1 })).toBeVisible();
      await expect(
        page.getByRole('button', { name: /Generate All|Download All|View Summary/i }).first(),
      ).toBeVisible({ timeout: 20_000 });
    } finally {
      await deletePwEmployee(page, employee);
    }
  });
});
