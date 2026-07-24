import { test, expect } from '@playwright/test';
import { createPwEmployee, deletePwEmployee, openEmployeeEdit } from './helpers/employees';
import { modalByHeading } from './helpers/ui';

test.describe('Employees', () => {
  test('create, edit, and delete an employee', async ({ page }) => {
    const employee = await createPwEmployee(page);

    await openEmployeeEdit(page, employee);
    const editModal = modalByHeading(page, 'Edit Employee');
    await editModal.locator('#position').fill('PW Tester');
    await editModal.getByRole('button', { name: 'Update Employee' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Employee' })).toBeHidden({
      timeout: 20_000,
    });
    await expect(page.getByText('PW Tester')).toBeVisible({ timeout: 20_000 });

    await deletePwEmployee(page, employee);
    await expect(page.getByText(employee.email)).toHaveCount(0, { timeout: 20_000 });
  });

  test('set employee inactive', async ({ page }) => {
    const employee = await createPwEmployee(page);

    try {
      await openEmployeeEdit(page, employee);
      const editModal = modalByHeading(page, 'Edit Employee');
      // Dismiss ROE prompt if shown when status changes
      page.once('dialog', async (d) => {
        try {
          await d.dismiss();
        } catch {
          /* ignore */
        }
      });
      await editModal.locator('#status').selectOption('inactive');
      await editModal.getByRole('button', { name: 'Update Employee' }).click();
      await expect(page.getByRole('heading', { name: 'Edit Employee' })).toBeHidden({
        timeout: 20_000,
      });
      await expect(page.getByText(/inactive/i).first()).toBeVisible({ timeout: 20_000 });
    } finally {
      await deletePwEmployee(page, employee);
    }
  });
});
