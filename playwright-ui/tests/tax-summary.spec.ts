import { test, expect } from '@playwright/test';
import { goToTaxSummary } from './helpers/nav';

test.describe('Tax Summary', () => {
  test('tax summary page shows CRA breakdown', async ({ page }) => {
    await goToTaxSummary(page);
    await expect(page.getByRole('heading', { name: 'Tax Summary' })).toBeVisible();
    await expect(
      page.getByText(/Total Taxes Owed to CRA|HST to Pay|Business Income Tax/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });
});
