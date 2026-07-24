import { test, expect } from '@playwright/test';
import { goToExpenses } from './helpers/nav';
import { deleteTableRowsMatching, modalByHeading, pwMarker } from './helpers/ui';

test.describe('Expenses', () => {
  test('create and delete a non-COGS expense', async ({ page }) => {
    const marker = pwMarker('Expense');

    await goToExpenses(page);
    await deleteTableRowsMatching(page, 'PW Expense');

    await page.getByRole('button', { name: 'Add Expense' }).click();
    const modal = modalByHeading(page, 'Add New Expense');

    await modal.locator('label:has-text("Description")').locator('..').locator('input').fill(marker);

    const categorySelect = modal.locator('select').filter({
      has: page.locator('option:text-is("Office Supplies")'),
    }).first();
    if ((await categorySelect.count()) > 0) {
      await categorySelect.selectOption({ label: 'Office Supplies' });
    } else {
      // Pick first real category option
      const select = modal.locator('label:has-text("Category")').locator('..').locator('select').first();
      const options = select.locator('option');
      const count = await options.count();
      for (let i = 0; i < count; i++) {
        const text = (await options.nth(i).textContent())?.trim() ?? '';
        const value = await options.nth(i).getAttribute('value');
        if (value && value !== '0' && !/cost of goods/i.test(text)) {
          await select.selectOption({ index: i });
          break;
        }
      }
    }

    await modal
      .locator('label:has-text("Amount (before HST)")')
      .locator('..')
      .locator('input[type="number"]')
      .fill('45.00');

    const taxCheckbox = modal.locator('#tax_applies');
    if (await taxCheckbox.isChecked()) {
      await taxCheckbox.uncheck();
    }

    await modal.getByRole('button', { name: 'Create Expense' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Expense' })).toBeHidden({
      timeout: 20_000,
    });
    await expect(page.locator('tbody tr', { hasText: marker })).toBeVisible({ timeout: 20_000 });

    await deleteTableRowsMatching(page, marker);
    await expect(page.locator('tbody tr', { hasText: marker })).toHaveCount(0);
  });

  test('log mileage expense', async ({ page }) => {
    const purpose = pwMarker('Mileage');

    await goToExpenses(page);
    await page.getByRole('button', { name: 'Log Mileage' }).click();
    const modal = modalByHeading(page, 'Log Mileage');

    await modal.locator('label:has-text("Distance")').locator('..').locator('input').fill('12.5');
    await modal
      .locator('label:has-text("Starting Location")')
      .locator('..')
      .locator('input')
      .fill('PW Home');
    await modal.locator('label:has-text("Destination")').locator('..').locator('input').fill('PW Office');
    await modal
      .locator('label:has-text("Purpose")')
      .locator('..')
      .locator('input, textarea')
      .first()
      .fill(purpose);

    await modal.getByRole('button', { name: 'Save Mileage' }).click();
    await expect(page.getByRole('heading', { name: 'Log Mileage' })).toBeHidden({ timeout: 20_000 });

    // Mileage creates an expense row — clean up by purpose/marker text if present
    const row = page.locator('tbody tr', { hasText: /mileage|PW Mileage|PW Home/i }).first();
    if ((await row.count()) > 0) {
      await deleteTableRowsMatching(page, 'PW Mileage');
      await deleteTableRowsMatching(page, 'Mileage');
    }
  });
});
