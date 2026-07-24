import { expect, type Page } from '@playwright/test';
import path from 'path';

export const AUTH_FILE = path.join(__dirname, '../../.auth/user.json');

export function testCredentials() {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD in playwright-ui/.env',
    );
  }
  return { email, password };
}

/** Sign in and wait until the app dashboard is ready. Setup only — not an auth test. */
export async function loginAsTestUser(page: Page) {
  const { email, password } = testCredentials();

  await page.goto('/login');
  await page.getByPlaceholder('Email address').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
}

/** Sign in as an employee (portal). Setup only. */
export async function loginAsEmployee(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByPlaceholder('Email address').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/employee-dashboard/, { timeout: 30_000 });
}
