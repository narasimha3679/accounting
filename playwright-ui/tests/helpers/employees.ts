import { expect, type Page } from '@playwright/test';
import { goToEmployees } from './nav';
import { modalByHeading } from './ui';

export type CreatedEmployee = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  displayName: string;
};

/** Create an employee via UI. Returns credentials for portal login. */
export async function createPwEmployee(
  page: Page,
  overrides?: Partial<CreatedEmployee>,
): Promise<CreatedEmployee> {
  const stamp = Date.now();
  const employee: CreatedEmployee = {
    firstName: overrides?.firstName ?? 'PW',
    lastName: overrides?.lastName ?? `Emp${stamp}`,
    email: overrides?.email ?? `pw.emp.${stamp}@example.com`,
    password: overrides?.password ?? `PwTest!${stamp.toString().slice(-6)}aA1`,
    displayName: '',
  };
  employee.displayName = `${employee.firstName} ${employee.lastName}`;

  await goToEmployees(page);

  const search = page.getByPlaceholder('Search employees...');
  if (await search.isVisible().catch(() => false)) {
    await search.fill('pw.emp.');
    await page.waitForTimeout(500);
    for (let i = 0; i < 8; i++) {
      const del = page.getByRole('button', { name: 'Delete' }).first();
      if ((await del.count()) === 0) break;
      page.once('dialog', async (d) => {
        try {
          await d.accept();
        } catch {
          /* ignore */
        }
      });
      await del.click();
      await page.waitForTimeout(700);
    }
    await search.fill('');
  }

  await page.getByRole('button', { name: 'Add Employee' }).click();
  await expect(page.getByRole('heading', { name: 'Add New Employee' })).toBeVisible();

  const modal = modalByHeading(page, 'Add New Employee');
  await modal.locator('#first_name').fill(employee.firstName);
  await modal.locator('#last_name').fill(employee.lastName);
  await modal.locator('#email').fill(employee.email);
  await modal.locator('#hire_date').fill('2024-01-15');
  await modal.locator('#payrate_type').selectOption('hourly');
  await modal.locator('#payrate').fill('25');
  await modal.locator('#initialPassword').fill(employee.password);
  await modal.getByRole('button', { name: 'Create Employee' }).click();

  await expect(page.getByRole('heading', { name: 'Add New Employee' })).toBeHidden({
    timeout: 30_000,
  });

  const pwdModal = modalByHeading(page, 'Employee Password');
  if (await pwdModal.isVisible().catch(() => false)) {
    await pwdModal.locator('button').first().click();
  }

  await expect(page.getByText(employee.email)).toBeVisible({ timeout: 20_000 });
  return employee;
}

export async function openEmployeeEdit(page: Page, employee: CreatedEmployee) {
  await goToEmployees(page);
  const search = page.getByPlaceholder('Search employees...');
  if (await search.isVisible().catch(() => false)) {
    await search.fill(employee.email);
    await page.waitForTimeout(500);
  }
  await expect(page.getByText(employee.email)).toBeVisible({ timeout: 20_000 });
  // Header row: name + action buttons are siblings under a justify-between flex
  await page
    .getByRole('heading', { name: employee.displayName })
    .locator('xpath=ancestor::div[contains(@class,"justify-between")][1]')
    .getByRole('button', { name: 'Edit' })
    .click();
  await expect(page.getByRole('heading', { name: 'Edit Employee' })).toBeVisible();
}

export async function deletePwEmployee(page: Page, employee: CreatedEmployee | string) {
  await goToEmployees(page);
  const email = typeof employee === 'string' ? employee : employee.email;
  const displayName = typeof employee === 'string' ? employee : employee.displayName;
  const search = page.getByPlaceholder('Search employees...');
  if (await search.isVisible().catch(() => false)) {
    await search.fill(email.includes('@') ? email : displayName);
    await page.waitForTimeout(500);
  }

  const deleteBtn = page
    .getByRole('heading', { name: displayName })
    .locator('xpath=ancestor::div[contains(@class,"justify-between")][1]')
    .getByRole('button', { name: 'Delete' });

  if ((await deleteBtn.count()) === 0) {
    const fallback = page.getByRole('button', { name: 'Delete' }).first();
    if ((await fallback.count()) === 0) return;
    page.once('dialog', async (d) => {
      try {
        await d.accept();
      } catch {
        /* ignore */
      }
    });
    await fallback.click();
  } else {
    page.once('dialog', async (d) => {
      try {
        await d.accept();
      } catch {
        /* ignore */
      }
    });
    await deleteBtn.click();
  }
  await page.waitForTimeout(800);
}
