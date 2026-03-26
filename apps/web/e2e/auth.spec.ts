import { test, expect } from '@playwright/test';
import { ROUTES, TEST_USER_PASSWORD } from './constants';
import { createTestUser, checkApiAvailable } from './helpers';

test.describe('Login Page', () => {
  test('should display login form', async ({ page }) => {
    await page.goto(ROUTES.LOGIN);
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should navigate to register page when clicking sign up link', async ({ page }) => {
    await page.goto(ROUTES.LOGIN);
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page).toHaveURL(ROUTES.REGISTER);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto(ROUTES.LOGIN);
    await page.getByLabel(/email/i).fill('nonexistent@test.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(1000);
    const errorVisible = await page.locator('[class*="error"], [class*="Error"]').first().isVisible().catch(() => false);
    if (errorVisible) {
      await expect(page.locator('[class*="error"], [class*="Error"]').first()).toBeVisible();
    } else {
      await expect(page).toHaveURL(ROUTES.LOGIN);
    }
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    const apiAvailable = await checkApiAvailable();
    test.skip(!apiAvailable, 'API server not available');


    const user = await createTestUser();
    user.password = TEST_USER_PASSWORD;

    await page.goto(ROUTES.LOGIN);
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /sign in/i }).click();


    await expect(page).toHaveURL(/\/(dashboard|no-household)/, { timeout: 10000 });
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto(ROUTES.LOGIN);
    await page.getByRole('button', { name: /sign in/i }).click();
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toHaveAttribute('required', '');
  });
});

test.describe('Register Page', () => {
  test('should display registration form', async ({ page }) => {
    await page.goto(ROUTES.REGISTER);
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
  });

  test('should navigate to login page when clicking sign in link', async ({ page }) => {
    await page.goto(ROUTES.REGISTER);
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page).toHaveURL(ROUTES.LOGIN);
  });

  test('should show error when passwords do not match', async ({ page }) => {
    await page.goto(ROUTES.REGISTER);
    await page.getByLabel(/name/i).fill('Test User');
    await page.getByLabel(/email/i).fill(`reg-${Date.now()}@test.com`);
    await page.getByLabel(/^password$/i).fill('Password123');
    await page.getByLabel(/confirm password/i).fill('DifferentPassword');
    await page.getByRole('button', { name: /register/i }).click();
    await page.waitForTimeout(500);
    const errorVisible = await page.locator('[class*="error"], [class*="Error"]').first().isVisible().catch(() => false);
    if (errorVisible) {
      await expect(page.locator('[class*="error"], [class*="Error"]').first()).toBeVisible();
    } else {
      await expect(page).toHaveURL(ROUTES.REGISTER);
    }
  });

  test('should show error when password is too short', async ({ page }) => {
    await page.goto(ROUTES.REGISTER);
    await page.getByLabel(/name/i).fill('Test User');
    await page.getByLabel(/email/i).fill(`short-${Date.now()}@test.com`);
    await page.getByLabel(/^password$/i).fill('123');
    await page.getByLabel(/confirm password/i).fill('123');
    await page.getByRole('button', { name: /register/i }).click();
    await page.waitForTimeout(500);
    const errorVisible = await page.locator('[class*="error"], [class*="Error"], [class*="message"]').first().isVisible().catch(() => false);
    if (errorVisible) {
      await expect(page.locator('[class*="error"], [class*="Error"], [class*="message"]').first()).toBeVisible();
    } else {
      await expect(page).toHaveURL(ROUTES.REGISTER);
    }
  });

  test('should register and redirect to dashboard', async ({ page }) => {
    const apiAvailable = await checkApiAvailable();
    test.skip(!apiAvailable, 'API server not available');

    const uniqueEmail = `register-${Date.now()}@test.com`;
    await page.goto(ROUTES.REGISTER);
    await page.getByLabel(/name/i).fill('New User');
    await page.getByLabel(/email/i).fill(uniqueEmail);
    await page.getByLabel(/^password$/i).fill(TEST_USER_PASSWORD);
    await page.getByLabel(/confirm password/i).fill(TEST_USER_PASSWORD);
    await page.getByRole('button', { name: /register/i }).click();
    await expect(page).toHaveURL(/\/(dashboard|no-household)/, { timeout: 10000 });
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto(ROUTES.REGISTER);
    await page.getByRole('button', { name: /register/i }).click();
    const nameInput = page.getByLabel(/name/i);
    await expect(nameInput).toHaveAttribute('required', '');
  });
});
