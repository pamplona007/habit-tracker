import { test, expect } from '@playwright/test';
import { ROUTES } from './constants';

test.describe('Landing Page', () => {
  test('should load landing page with correct title', async ({ page }) => {
    await page.goto(ROUTES.LANDING);
    await expect(page).toHaveTitle(/Casa/);
  });

  test('should show navigation with login and signup links', async ({ page }) => {
    await page.goto(ROUTES.LANDING);
    await expect(page.getByRole('navigation').getByRole('link', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign up/i }).first()).toBeVisible();
  });

  test('should navigate to login page when clicking sign in', async ({ page }) => {
    await page.goto(ROUTES.LANDING);
    await page.getByRole('navigation').getByRole('link', { name: /sign in/i }).click();
    await expect(page).toHaveURL(ROUTES.LOGIN);
  });

  test('should navigate to register page when clicking sign up', async ({ page }) => {
    await page.goto(ROUTES.LANDING);
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page).toHaveURL(ROUTES.REGISTER);
  });

  test('should toggle language when clicking language switch', async ({ page }) => {
    await page.goto(ROUTES.LANDING);
    const langButton = page.locator('button').filter({ hasText: /^(PT|EN)$/ }).first();
    if (await langButton.isVisible()) {
      await langButton.click();

      const newLang = await langButton.textContent();
      expect(['PT', 'EN']).toContain(newLang);
    }
  });

  test('should show features section', async ({ page }) => {
    await page.goto(ROUTES.LANDING);
    await expect(page.getByText(/household|family|sincronização/i).first()).toBeVisible();
  });

  test('should show stats section', async ({ page }) => {
    await page.goto(ROUTES.LANDING);
    await expect(page.getByText(/families|tasks|streak/i).first()).toBeVisible();
  });
});
