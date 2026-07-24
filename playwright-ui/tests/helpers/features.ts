import { expect, type Page } from '@playwright/test';
import { goToSettings } from './nav';

/** Ensure every feature toggle on Settings → Features is checked (auto-saves). */
export async function ensureAllFeaturesEnabled(page: Page) {
  await goToSettings(page, 'features');
  await expect(page.getByText('Feature Management')).toBeVisible({ timeout: 20_000 });

  const checkboxes = page.locator('input[type="checkbox"]');
  const count = await checkboxes.count();
  for (let i = 0; i < count; i++) {
    const box = checkboxes.nth(i);
    if (!(await box.isChecked())) {
      // Force click so React onChange fires (sr-only input)
      await box.click({ force: true });
      await page.waitForTimeout(500);
    }
  }
}
