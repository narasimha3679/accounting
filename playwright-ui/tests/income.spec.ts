import { test, expect } from '@playwright/test';
import { goToIncome } from './helpers/nav';
import { deleteTableRowsMatching, modalByHeading, pwMarker } from './helpers/ui';

test.describe('Income', () => {
  test('create and delete an income entry', async ({ page }) => {
    const marker = pwMarker('Income');

    await goToIncome(page);
    await deleteTableRowsMatching(page, 'PW Income');

    await page.getByRole('button', { name: 'Add Income Entry' }).click();
    const modal = modalByHeading(page, 'Add Income');

    await modal.getByLabel('Description').fill(marker).catch(async () => {
      await modal.locator('label:has-text("Description")').locator('..').locator('input').fill(marker);
    });
    await modal.getByLabel('Amount').fill('250.00').catch(async () => {
      await modal.locator('label:has-text("Amount")').locator('..').locator('input').fill('250.00');
    });
    await modal.locator('#income_type').selectOption('other');
    await modal.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('heading', { name: 'Add Income' })).toBeHidden({ timeout: 20_000 });
    const row = page.locator('tbody tr', { hasText: marker });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row).toContainText('Other Income');

    await deleteTableRowsMatching(page, marker);
    await expect(page.locator('tbody tr', { hasText: marker })).toHaveCount(0);
  });
});
