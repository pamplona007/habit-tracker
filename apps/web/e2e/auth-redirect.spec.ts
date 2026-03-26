import { test, expect } from '@playwright/test';
import { ROUTES } from './constants';

test.describe('Protected Routes', () => {
  test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
    await page.goto(ROUTES.DASHBOARD);
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to login when accessing tasks without auth', async ({ page }) => {
    await page.goto(ROUTES.TASKS);
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to login when accessing notices without auth', async ({ page }) => {
    await page.goto(ROUTES.NOTICES);
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to login when accessing shopping without auth', async ({ page }) => {
    await page.goto(ROUTES.SHOPPING);
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to login when accessing settings without auth', async ({ page }) => {
    await page.goto(ROUTES.SETTINGS);
    await expect(page).toHaveURL(/\/login/);
  });

  test('should redirect to login when accessing no-household without auth', async ({ page }) => {
    await page.goto(ROUTES.NO_HOUSEHOLD);
    await expect(page).toHaveURL(/\/login/);
  });

  test('should allow access to login page without auth', async ({ page }) => {
    await page.goto(ROUTES.LOGIN);
    await page.waitForSelector('form, [class*="loading"], [class*="spinner"]', { timeout: 15000 });

    await expect(page.locator('form')).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('should allow access to register page without auth', async ({ page }) => {
    await page.goto(ROUTES.REGISTER);
    await page.waitForSelector('form, [class*="loading"], [class*="spinner"]', { timeout: 15000 });
    await expect(page.locator('form')).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel(/name/i)).toBeVisible();
  });

  test('should allow access to landing page without auth', async ({ page }) => {
    await page.goto(ROUTES.LANDING);
    await expect(page).toHaveURL(ROUTES.LANDING);
  });
});

test.describe('Post-Login Redirect', () => {
  test('should redirect to dashboard after login', async ({ page }) => {
    await page.goto(ROUTES.LOGIN);
    await page.waitForSelector('form, [class*="loading"], [class*="spinner"]', { timeout: 15000 });

    await expect(page.locator('form')).toBeVisible({ timeout: 15000 });
  });
});
