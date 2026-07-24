import { test, expect } from '@playwright/test';
import { goToExpenses, goToReports } from './helpers/nav';
import { deleteTableRowsMatching, modalByHeading } from './helpers/ui';

const COGS_CATEGORY = 'Cost of Goods Sold';
const COGS_GUIDANCE =
  /Cost of goods sold.*100% deductible|Do not use Meals & Entertainment/i;

async function showYearExpenses(page: import('@playwright/test').Page) {
  await goToExpenses(page);
  const yearBtn = page.getByRole('button', { name: 'Year', exact: true });
  if (await yearBtn.isVisible().catch(() => false)) {
    await yearBtn.click();
  }
}

test.describe('COGS category + Gross Profit', () => {
  test('Cost of Goods Sold appears in expense categories with CRA guidance', async ({
    page,
  }) => {
    await goToExpenses(page);

    await page.getByRole('button', { name: 'Add Expense' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Expense' })).toBeVisible();

    const modal = modalByHeading(page, 'Add New Expense');

    const categorySelect = modal
      .locator('select')
      .filter({
        has: page.locator(`option:text-is("${COGS_CATEGORY}")`),
      })
      .first();

    await expect(categorySelect.locator(`option:text-is("${COGS_CATEGORY}")`)).toHaveCount(1);

    await categorySelect.selectOption({ label: COGS_CATEGORY });
    await expect(page.getByText('Category Guidance:')).toBeVisible();
    await expect(page.getByText(COGS_GUIDANCE)).toBeVisible();

    await modal.locator('div.flex.items-center.justify-between').getByRole('button').click();
    await expect(page.getByRole('heading', { name: 'Add New Expense' })).toBeHidden();
  });

  test('creating a COGS expense shows Gross Profit on Reports P&L', async ({ page }) => {
    const marker = `PW COGS ${Date.now()}`;
    const amount = '123.45';

    await showYearExpenses(page);
    await deleteTableRowsMatching(page, 'PW COGS');

    await page.getByRole('button', { name: 'Add Expense' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Expense' })).toBeVisible();

    const modal = modalByHeading(page, 'Add New Expense');

    await modal.locator('label:has-text("Description")').locator('..').locator('input').fill(marker);

    const categorySelect = modal
      .locator('select')
      .filter({
        has: page.locator(`option:text-is("${COGS_CATEGORY}")`),
      })
      .first();
    await categorySelect.selectOption({ label: COGS_CATEGORY });

    await expect(page.getByText(COGS_GUIDANCE)).toBeVisible();

    await modal
      .locator('label:has-text("Amount (before HST)")')
      .locator('..')
      .locator('input[type="number"]')
      .fill(amount);

    const taxCheckbox = modal.locator('#tax_applies');
    if (await taxCheckbox.isChecked()) {
      await taxCheckbox.uncheck();
    }

    await modal.getByRole('button', { name: 'Create Expense' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Expense' })).toBeHidden({
      timeout: 20_000,
    });

    const expenseRow = page.locator('tbody tr', { hasText: marker });
    await expect(expenseRow).toBeVisible({ timeout: 20_000 });
    await expect(expenseRow).toContainText(COGS_CATEGORY);
    await expect(expenseRow).toContainText('$123.45');

    await goToReports(page);
    const pnl = page
      .locator('div.p-6')
      .filter({ has: page.getByRole('heading', { name: 'Profit & Loss' }) });
    await expect(pnl.getByText('Cost of Goods Sold:')).toBeVisible();
    await expect(pnl.getByText('Gross Profit:')).toBeVisible();
    await expect(pnl.getByText('Operating Expenses:')).toBeVisible();
    await expect(pnl.getByText('Total Expenses:')).toHaveCount(0);

    const cogsRow = pnl.locator('div.flex.justify-between').filter({
      hasText: 'Cost of Goods Sold:',
    });
    const cogsText = await cogsRow.innerText();
    const cogsMatch = cogsText.match(/\$([\d,]+\.\d{2})/);
    expect(cogsMatch).toBeTruthy();
    const cogsValue = parseFloat(cogsMatch![1].replace(/,/g, ''));
    expect(cogsValue).toBeGreaterThanOrEqual(123.45);

    const grossProfitRow = pnl.locator('div.flex.justify-between').filter({
      hasText: 'Gross Profit:',
    });
    await expect(grossProfitRow).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Expense Breakdown by Category' })).toBeVisible();
    await expect(
      page.locator('table').filter({ hasText: 'Category' }).getByText(COGS_CATEGORY),
    ).toBeVisible();

    await showYearExpenses(page);
    await deleteTableRowsMatching(page, marker);
    await expect(page.locator('tbody tr', { hasText: marker })).toHaveCount(0);
  });
});
