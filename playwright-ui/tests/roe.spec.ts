import { test, expect } from '@playwright/test';
import { createPwEmployee, deletePwEmployee, openEmployeeEdit } from './helpers/employees';
import { goToROE } from './helpers/nav';
import { modalByHeading } from './helpers/ui';

test.describe('ROE', () => {
  test('open ROE flow for terminated employee', async ({ page }) => {
    const employee = await createPwEmployee(page);

    try {
      await openEmployeeEdit(page, employee);
      const editModal = modalByHeading(page, 'Edit Employee');

      page.once('dialog', async (d) => {
        try {
          await d.accept();
        } catch {
          /* ignore */
        }
      });
      await editModal.locator('#status').selectOption('terminated');
      await editModal.getByRole('button', { name: 'Update Employee' }).click();

      await page.waitForTimeout(1500);
      if (!page.url().includes('/payroll/roe')) {
        await goToROE(page);
        await page.getByRole('button', { name: /New ROE|Create First ROE/i }).first().click();
      }

      await expect(
        page.getByRole('heading', { name: /Record of Employment/i }).first(),
      ).toBeVisible({ timeout: 30_000 });

      await goToROE(page);
      await expect(page.getByRole('heading', { name: 'Records of Employment', level: 1 })).toBeVisible();
    } finally {
      await deletePwEmployee(page, employee);
    }
  });
});
