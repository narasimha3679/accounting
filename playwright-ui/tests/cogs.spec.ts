import { test, expect } from '@playwright/test';
import { goToExpenses, goToReports, loginAsTestUser } from './helpers/auth';

const COGS_CATEGORY = 'Cost of Goods Sold';
const COGS_GUIDANCE =
  /Cost of goods sold.*100% deductible|Do not use Meals & Entertainment/i;

async function deleteExpenseRowsMatching(page: import('@playwright/test').Page, marker: string) {
  await goToExpenses(page);
  // Keep deleting while matching rows remain (handles leftover PW runs too)
  for (let i = 0; i < 10; i++) {
    const row = page.locator('tbody tr', { hasText: marker }).first();
    if ((await row.count()) === 0) break;
    page.once('dialog', (dialog) => dialog.accept());
    await row.locator('td').last().locator('button').last().click();
    await expect(row).toHaveCount(0, { timeout: 20_000 }).catch(() => undefined);
    await page.waitForTimeout(500);
  }
}

test.describe('COGS category + Gross Profit', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('Cost of Goods Sold appears in expense categories with CRA guidance', async ({
    page,
  }) => {
    await goToExpenses(page);

    await page.getByRole('button', { name: 'Add Expense' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Expense' })).toBeVisible();

    const modal = page.locator('.fixed.inset-0').filter({
      has: page.getByRole('heading', { name: 'Add New Expense' }),
    });

    const categorySelect = modal.locator('select').filter({
      has: page.locator(`option:text-is("${COGS_CATEGORY}")`),
    }).first();

    await expect(categorySelect.locator(`option:text-is("${COGS_CATEGORY}")`)).toHaveCount(1);

    await categorySelect.selectOption({ label: COGS_CATEGORY });
    await expect(page.getByText('Category Guidance:')).toBeVisible();
    await expect(page.getByText(COGS_GUIDANCE)).toBeVisible();

    // Close without saving (X button in modal header)
    await modal.locator('div.flex.items-center.justify-between').getByRole('button').click();
    await expect(page.getByRole('heading', { name: 'Add New Expense' })).toBeHidden();
  });

  test('creating a COGS expense shows Gross Profit on Reports P&L', async ({
    page,
  }) => {
    const marker = `PW COGS ${Date.now()}`;
    const amount = '123.45';

    // Avoid leftover PW COGS from prior failed runs skewing P&L totals
    await deleteExpenseRowsMatching(page, 'PW COGS');

    await goToExpenses(page);
    await page.getByRole('button', { name: 'Add Expense' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Expense' })).toBeVisible();

    const modal = page.locator('.fixed.inset-0').filter({
      has: page.getByRole('heading', { name: 'Add New Expense' }),
    });

    await modal.locator('label:has-text("Description")').locator('..').locator('input').fill(marker);

    const categorySelect = modal.locator('select').filter({
      has: page.locator(`option:text-is("${COGS_CATEGORY}")`),
    }).first();
    await categorySelect.selectOption({ label: COGS_CATEGORY });

    await expect(page.getByText(COGS_GUIDANCE)).toBeVisible();

    await modal
      .locator('label:has-text("Amount (before HST)")')
      .locator('..')
      .locator('input[type="number"]')
      .fill(amount);

    // Uncheck HST to keep totals simple and predictable
    const taxCheckbox = modal.locator('#tax_applies');
    if (await taxCheckbox.isChecked()) {
      await taxCheckbox.uncheck();
    }

    await modal.getByRole('button', { name: 'Create Expense' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Expense' })).toBeHidden({
      timeout: 20_000,
    });

    // Expense list should show the new COGS row
    const expenseRow = page.locator('tbody tr', { hasText: marker });
    await expect(expenseRow).toBeVisible({ timeout: 20_000 });
    await expect(expenseRow).toContainText(COGS_CATEGORY);
    await expect(expenseRow).toContainText('$123.45');

    // Reports P&L should surface COGS + Gross Profit
    // Card structure: header (h3) is a sibling of the metrics list — scope to the card.
    await goToReports(page);
    const pnl = page
      .locator('div.p-6')
      .filter({ has: page.getByRole('heading', { name: 'Profit & Loss' }) });
    await expect(pnl.getByText('Cost of Goods Sold:')).toBeVisible();
    await expect(pnl.getByText('Gross Profit:')).toBeVisible();
    await expect(pnl.getByText('Operating Expenses:')).toBeVisible();
    await expect(pnl.getByText('Total Expenses:')).toHaveCount(0);

    // Label and amount are separate spans — assert COGS amount on its row
    const cogsRow = pnl.locator('div.flex.justify-between').filter({
      hasText: 'Cost of Goods Sold:',
    });
    await expect(cogsRow.getByText('$123.45')).toBeVisible();

    const grossProfitRow = pnl.locator('div.flex.justify-between').filter({
      hasText: 'Gross Profit:',
    });
    await expect(grossProfitRow.getByText('-$123.45')).toBeVisible();

    // Expense breakdown includes COGS category
    await expect(page.getByRole('heading', { name: 'Expense Breakdown by Category' })).toBeVisible();
    await expect(
      page.locator('table').filter({ hasText: 'Category' }).getByText(COGS_CATEGORY),
    ).toBeVisible();

    // Cleanup
    await deleteExpenseRowsMatching(page, marker);
    await expect(page.locator('tbody tr', { hasText: marker })).toHaveCount(0);
  });
});
