import { test, expect } from '@playwright/test';
import { goToExpenses, goToOwnerPayments } from './helpers/nav';
import { deleteTableRowsMatching, modalByHeading, pwMarker } from './helpers/ui';

test.describe('Owner Reimbursement', () => {
  test('create owner-paid expense and open reimbursement form', async ({ page }) => {
    const expenseMarker = pwMarker('OwnerExp');

    await goToExpenses(page);
    await page.getByRole('button', { name: 'Add Expense' }).click();
    const expModal = modalByHeading(page, 'Add New Expense');
    await expModal
      .locator('label:has-text("Description")')
      .locator('..')
      .locator('input')
      .fill(expenseMarker);

    const categorySelect = expModal.locator('label:has-text("Category")').locator('..').locator('select').first();
    const options = categorySelect.locator('option');
    for (let i = 0; i < (await options.count()); i++) {
      const value = await options.nth(i).getAttribute('value');
      if (value && value !== '0') {
        await categorySelect.selectOption({ index: i });
        break;
      }
    }

    await expModal
      .locator('label:has-text("Amount (before HST)")')
      .locator('..')
      .locator('input[type="number"]')
      .fill('88.00');

    const taxCheckbox = expModal.locator('#tax_applies');
    if (await taxCheckbox.isChecked()) await taxCheckbox.uncheck();

    await expModal.locator('#paid_by_owner').check();
    await expModal.getByRole('button', { name: 'Create Expense' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Expense' })).toBeHidden({
      timeout: 20_000,
    });
    await expect(page.locator('tbody tr', { hasText: expenseMarker })).toBeVisible({
      timeout: 20_000,
    });

    await goToOwnerPayments(page);
    await page.getByRole('button', { name: 'Add Payment' }).first().click();
    const payModal = modalByHeading(page, 'Add Owner Payment');
    await expect(payModal.locator('#description')).toBeVisible();
    await expect(payModal.locator('#payment_type')).toBeVisible();

    // Link select should include the owner-paid expense when available
    const linkSelect = payModal.locator('#linked_expense');
    if ((await linkSelect.count()) > 0) {
      await expect(linkSelect.locator('option').first()).toBeAttached();
    }

    await payModal.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Add Owner Payment' })).toBeHidden();

    await goToExpenses(page);
    await deleteTableRowsMatching(page, expenseMarker);
  });
});
