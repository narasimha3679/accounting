import { expect, type Locator, type Page } from '@playwright/test';

/** Custom modal overlay scoped by heading text. */
export function modalByHeading(page: Page, heading: string | RegExp) {
  return page.locator('.fixed.inset-0').filter({
    has: page.getByRole('heading', { name: heading }),
  });
}

/** Fill the first input under a label (for forms without htmlFor). */
export async function fillByLabel(scope: Locator | Page, label: string, value: string) {
  const field = scope.locator(`label:has-text("${label}")`).locator('..').locator('input, textarea, select').first();
  await field.fill(value);
}

/** Select option by label text under a field label. */
export async function selectByLabel(scope: Locator | Page, label: string, optionLabel: string) {
  const select = scope.locator(`label:has-text("${label}")`).locator('..').locator('select').first();
  await select.selectOption({ label: optionLabel });
}

/** Accept the next native confirm/alert dialog. */
export function acceptNextDialog(page: Page) {
  page.once('dialog', (dialog) => dialog.accept());
}

/**
 * Delete list/table rows that contain marker text via the last action button (Delete).
 * Works for table rows; for card grids pass a card locator factory.
 */
export async function deleteTableRowsMatching(
  page: Page,
  marker: string,
  opts?: { max?: number; rowSelector?: string },
) {
  const max = opts?.max ?? 15;
  const rowSelector = opts?.rowSelector ?? 'tbody tr';

  for (let i = 0; i < max; i++) {
    const row = page.locator(rowSelector, { hasText: marker }).first();
    if ((await row.count()) === 0) break;
    acceptNextDialog(page);
    await row.getByTitle('Delete').click().catch(async () => {
      await row.locator('td').last().locator('button').last().click();
    });
    await expect(row)
      .toHaveCount(0, { timeout: 20_000 })
      .catch(() => undefined);
    await page.waitForTimeout(400);
  }
}

/** Delete client/employee cards that contain marker text. */
export async function deleteCardsMatching(page: Page, marker: string, max = 10) {
  for (let i = 0; i < max; i++) {
    const deleteBtn = page
      .locator('.rounded-lg, [class*="card"]')
      .filter({ hasText: marker })
      .getByTitle('Delete')
      .first();
    if ((await deleteBtn.count()) === 0) break;
    acceptNextDialog(page);
    await deleteBtn.click();
    await expect(page.getByText(marker)).toHaveCount(0, { timeout: 20_000 }).catch(() => undefined);
    await page.waitForTimeout(400);
  }
}

export function pwMarker(prefix: string) {
  return `PW ${prefix} ${Date.now()}`;
}
