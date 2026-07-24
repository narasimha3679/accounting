import { test, expect } from '@playwright/test';
import { goToDividends } from './helpers/nav';
import { deleteTableRowsMatching, fillByLabel, modalByHeading, pwMarker } from './helpers/ui';

test.describe('Dividends', () => {
  test('create dividend with recipient and delete', async ({ page }) => {
    const notes = pwMarker('Dividend');
    const recipientName = pwMarker('Recipient');
    const amount = '500.00';

    await goToDividends(page);
    await page.getByRole('button', { name: 'Create Dividend' }).first().click();
    const modal = modalByHeading(page, 'Add New Dividend');

    await fillByLabel(modal, 'Amount *', amount);

    const declarationDate = modal
      .locator('label:has-text("Declaration Date")')
      .locator('..')
      .locator('input[type="date"]');
    await declarationDate.fill('2026-07-01');

    await fillByLabel(modal, 'Notes', notes);

    await modal.getByRole('button', { name: 'Add manually' }).click();
    const recipientModal = modalByHeading(page, 'Add Recipient');
    await fillByLabel(recipientModal, 'Recipient Name *', recipientName);
    await fillByLabel(recipientModal, 'Social Insurance Number (SIN) *', '123 456 789');
    await fillByLabel(recipientModal, 'Amount (CAD) *', amount);
    await recipientModal.getByRole('button', { name: 'Add Recipient' }).click();
    await expect(page.getByRole('heading', { name: 'Add Recipient' })).toBeHidden({
      timeout: 15_000,
    });

    await modal.getByRole('button', { name: 'Create Dividend' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Dividend' })).toBeHidden({
      timeout: 20_000,
    });

    const row = page.locator('tbody tr').filter({ hasText: /\$?500/ }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });

    await deleteTableRowsMatching(page, '500');
  });
});
