import { test, expect } from '@playwright/test';

test.describe('Public tools', () => {
  test('tax calculator loads and accepts income input', async ({ page }) => {
    await page.goto('/tax-calculator');
    await expect(
      page.getByRole('heading', { name: /Canadian Income Tax Calculator|Tax Calculator/i }),
    ).toBeVisible({ timeout: 20_000 });

    const income = page.getByLabel(/Income Amount/i).or(page.locator('input[type="number"]').first());
    await income.first().fill('75000');
    await expect(page.getByText(/Your Details|Province|FAQ|Frequently Asked/i).first()).toBeVisible();
  });

  test('salary vs dividend calculator loads and accepts profit input', async ({ page }) => {
    await page.goto('/salary-vs-dividend-calculator');
    await expect(
      page.getByRole('heading', { name: 'Salary vs Dividend Calculator' }),
    ).toBeVisible({ timeout: 20_000 });

    const profit = page.locator('#corporate-profit').or(
      page.getByLabel(/Corporate pre-tax profit/i),
    );
    await profit.first().fill('120000');
    await expect(page.getByText(/100% Salary|100% Dividends/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
