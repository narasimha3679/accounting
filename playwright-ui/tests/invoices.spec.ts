import { test, expect } from '@playwright/test';
import { goToClients, goToInvoices } from './helpers/nav';
import { acceptNextDialog, modalByHeading, pwMarker } from './helpers/ui';

test.describe('Invoices', () => {
  test('create invoice, mark sent/paid, and delete', async ({ page }) => {
    const clientName = pwMarker('InvClient');
    const itemDesc = pwMarker('Line');

    await goToClients(page);
    await page.getByRole('button', { name: 'Add Client' }).click();
    const clientModal = modalByHeading(page, 'Add New Client');
    await clientModal.locator('#client-name').fill(clientName);
    await clientModal.getByRole('button', { name: 'Create Client' }).click();
    await expect(page.getByRole('heading', { name: clientName })).toBeVisible({ timeout: 20_000 });

    await goToInvoices(page);
    await page.getByRole('button', { name: 'Create Invoice' }).click();
    const modal = modalByHeading(page, 'Create New Invoice');
    await modal.locator('#invoice-client').selectOption({ label: clientName });
    await modal.locator('#item-description').fill(itemDesc);
    await modal.locator('#item-quantity').fill('1');
    await modal.locator('#item-unit-price').fill('100');
    await modal.getByRole('button', { name: 'Add' }).click();
    await expect(modal.locator('tbody tr', { hasText: itemDesc })).toBeVisible();
    await modal.getByRole('button', { name: 'Create Invoice' }).click();
    await expect(page.getByRole('heading', { name: 'Create New Invoice' })).toBeHidden({
      timeout: 20_000,
    });

    const row = page.locator('tbody tr', { hasText: clientName }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row.getByText(/draft/i)).toBeVisible();

    await row.getByTitle('Mark as Sent').click();
    await expect(row.getByText(/sent/i)).toBeVisible({ timeout: 20_000 });

    page.once('dialog', async (dialog) => {
      await dialog.accept('2026-07-24');
    });
    await row.getByTitle('Mark as Paid').click();
    await expect(row.getByText(/paid/i)).toBeVisible({ timeout: 20_000 });

    acceptNextDialog(page);
    await row.getByTitle('Delete').click();
    await expect(page.locator('tbody tr', { hasText: clientName })).toHaveCount(0, {
      timeout: 20_000,
    });

    await goToClients(page);
    acceptNextDialog(page);
    await page.getByRole('heading', { name: clientName }).locator('..').getByRole('button').nth(1).click();
  });

  test('recurring templates tab opens create modal', async ({ page }) => {
    await goToInvoices(page);
    await page.getByRole('button', { name: 'Recurring Templates' }).click();
    await page.getByRole('button', { name: 'Create Template' }).click();
    const modal = modalByHeading(page, /Create Recurring Invoice Template/);
    await expect(modal.getByText('Template Name')).toBeVisible();
    await expect(modal.getByText('Frequency')).toBeVisible();
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: /Create Recurring/i })).toBeHidden();
  });
});
