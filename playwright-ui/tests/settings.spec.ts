import { test, expect } from '@playwright/test';
import { goToSettings } from './helpers/nav';

test.describe('Settings', () => {
  test('settings sections load and features page is available', async ({ page }) => {
    await goToSettings(page, 'general');
    await expect(page.getByText('Company Information')).toBeVisible();

    await goToSettings(page, 'tax');
    await expect(page.getByText('Tax Settings')).toBeVisible();

    // Read-only check — do not click feature toggles (they auto-save)
    await goToSettings(page, 'features');
    await expect(page.getByText('Feature Management')).toBeVisible();
    await expect(page.getByText('Financial Management')).toBeVisible();
    await expect(page.getByText('Payroll & Employees')).toBeVisible();

    await goToSettings(page, 'time');
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();

    await goToSettings(page, 'payroll');
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();

    await goToSettings(page, 'benefits');
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();

    await goToSettings(page, 'notifications');
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  });

  test('general settings shows company fields', async ({ page }) => {
    await goToSettings(page, 'general');
    const nameInput = page
      .getByLabel(/Company Name/i)
      .or(page.locator('label:has-text("Company Name")').locator('..').locator('input'))
      .first();

    await expect(nameInput).toBeVisible({ timeout: 20_000 });
    await expect(nameInput).not.toHaveValue('');
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();
  });
});
