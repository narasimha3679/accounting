import { test, expect } from '@playwright/test';
import { goToRemittances } from './helpers/nav';
import { modalByHeading } from './helpers/ui';

test.describe('Remittances', () => {
  test('view remittance page and open record payment modal', async ({ page }) => {
    await goToRemittances(page);
    await expect(page.getByText('Remittance Schedule').or(page.getByText('Payment History'))).toBeVisible({
      timeout: 20_000,
    });

    const recordBtn = page.getByRole('button', { name: 'Record Payment' }).first();
    if (await recordBtn.isVisible().catch(() => false)) {
      await recordBtn.click();
      const modal = modalByHeading(page, 'Record Remittance Payment');
      await expect(modal.getByLabel(/Amount Paid/i)).toBeVisible();
      await modal.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByRole('heading', { name: 'Record Remittance Payment' })).toBeHidden();
    }
  });
});
