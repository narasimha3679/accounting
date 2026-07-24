import { test, expect } from '@playwright/test';
import { goToCapitalAssets } from './helpers/nav';
import { deleteTableRowsMatching, modalByHeading, pwMarker } from './helpers/ui';

test.describe('Capital Assets', () => {
  test('create and delete a capital asset', async ({ page }) => {
    const marker = pwMarker('Asset');

    await goToCapitalAssets(page);
    await deleteTableRowsMatching(page, 'PW Asset');

    await page.getByRole('button', { name: 'Add Capital Asset' }).click();
    const modal = modalByHeading(page, 'Add New Capital Asset');

    await modal.locator('label:has-text("Description")').locator('..').locator('input').fill(marker);

    const categorySelect = modal.locator('select').nth(0);
    const catOptions = categorySelect.locator('option');
    for (let i = 0; i < (await catOptions.count()); i++) {
      const value = await catOptions.nth(i).getAttribute('value');
      if (value && value !== '0') {
        await categorySelect.selectOption({ index: i });
        break;
      }
    }

    await modal
      .locator('label:has-text("Purchase Amount")')
      .locator('..')
      .locator('input[type="number"]')
      .fill('1500');

    // Depreciation Class select (label sits in a flex row above the select)
    const ccaSelect = modal.locator('select').filter({ has: page.locator('option', { hasText: /Class / }) }).first();
    await expect(ccaSelect).toBeVisible();
    const ccaOpts = ccaSelect.locator('option');
    for (let i = 0; i < (await ccaOpts.count()); i++) {
      const value = await ccaOpts.nth(i).getAttribute('value');
      if (value) {
        await ccaSelect.selectOption({ index: i });
        break;
      }
    }

    await modal.getByRole('button', { name: 'Create Asset' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Capital Asset' })).toBeHidden({
      timeout: 20_000,
    });
    await expect(page.locator('tbody tr', { hasText: marker })).toBeVisible({ timeout: 20_000 });

    await deleteTableRowsMatching(page, marker);
    await expect(page.locator('tbody tr', { hasText: marker })).toHaveCount(0);
  });
});
