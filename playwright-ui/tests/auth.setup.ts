import { test as setup } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { AUTH_FILE, loginAsTestUser } from './helpers/auth';
import { ensureAllFeaturesEnabled } from './helpers/features';

setup('authenticate company user', async ({ page }) => {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await loginAsTestUser(page);
  await ensureAllFeaturesEnabled(page);
  await page.goto('/dashboard');
  await page.context().storageState({ path: AUTH_FILE });
});
