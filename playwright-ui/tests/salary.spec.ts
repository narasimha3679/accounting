import { test, expect } from '@playwright/test';
import { goToSalary } from './helpers/nav';

test.describe('Salary (legacy route)', () => {
  test('/salary redirects to pay runs', async ({ page }) => {
    await goToSalary(page);
    await expect(page.getByRole('button', { name: 'Create New Pay Run' })).toBeVisible();
  });
});
