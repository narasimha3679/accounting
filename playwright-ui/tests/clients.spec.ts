import { test, expect } from '@playwright/test';
import { goToClients } from './helpers/nav';
import { acceptNextDialog, modalByHeading, pwMarker } from './helpers/ui';

test.describe('Clients', () => {
  test('create, edit, and delete a client', async ({ page }) => {
    const name = pwMarker('Client');
    const edited = `${name} Edited`;

    await goToClients(page);

    // Clean leftovers from prior runs
    for (let i = 0; i < 10; i++) {
      const leftover = page.getByRole('heading', { name: /PW Client/ }).first();
      if ((await leftover.count()) === 0) break;
      acceptNextDialog(page);
      await leftover.locator('..').getByRole('button').nth(1).click();
      await page.waitForTimeout(500);
    }

    await page.getByRole('button', { name: 'Add Client' }).click();
    const createModal = modalByHeading(page, 'Add New Client');
    await createModal.locator('#client-name').fill(name);
    await createModal.locator('#client-contact-person').fill('PW Contact');
    await createModal.locator('#client-email').fill(`pw.client.${Date.now()}@example.com`);
    await createModal.getByRole('button', { name: 'Create Client' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Client' })).toBeHidden({
      timeout: 20_000,
    });
    await expect(page.getByRole('heading', { name: name })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('heading', { name }).locator('..').getByRole('button').first().click();
    const editModal = modalByHeading(page, 'Edit Client');
    await editModal.locator('#client-name').fill(edited);
    await editModal.getByRole('button', { name: 'Update Client' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Client' })).toBeHidden({
      timeout: 20_000,
    });
    await expect(page.getByRole('heading', { name: edited })).toBeVisible({ timeout: 20_000 });

    acceptNextDialog(page);
    await page.getByRole('heading', { name: edited }).locator('..').getByRole('button').nth(1).click();
    await expect(page.getByRole('heading', { name: edited })).toHaveCount(0, { timeout: 20_000 });
  });
});
