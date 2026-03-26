import { test, expect } from '@playwright/test';
import { ROUTES, TEST_USER_PASSWORD } from './constants';
import { createTestUser, createTestHousehold } from './helpers';

async function setupSettingsUser(page: any) {
  const user = await createTestUser();
  user.password = TEST_USER_PASSWORD;
  const { token } = await (await import('./helpers')).loginUser(user.email, user.password);
  const household = await createTestHousehold(token, 'Settings Test Household', user.id);

  await page.goto(ROUTES.LOGIN);
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(ROUTES.DASHBOARD);

  await page.goto(ROUTES.SETTINGS);
  await page.waitForLoadState('networkidle');

  return { user, token, household };
}

test.describe('Settings Page', () => {
  test('should display settings page', async ({ page }) => {
    await setupSettingsUser(page);
    await expect(page.getByTestId('settings-page')).toBeVisible({ timeout: 5000 });
  });

  test('should show household settings', async ({ page }) => {
    await setupSettingsUser(page);
    await expect(page.getByTestId('household-section')).toBeVisible();
  });

  test('should show invite section', async ({ page }) => {
    await setupSettingsUser(page);
    await expect(page.getByTestId('invite-section')).toBeVisible();
  });

  test('should generate invite code', async ({ page }) => {
    await setupSettingsUser(page);
    await page.getByTestId('generate-invite-code-btn').click();
    await page.waitForTimeout(1000);
    await expect(page.getByTestId('invite-code')).toBeVisible({ timeout: 3000 });
  });

  test('should show member list', async ({ page }) => {
    await setupSettingsUser(page);
    await expect(page.getByTestId('members-section')).toBeVisible();
  });
});

test.describe('Settings Navigation', () => {
  test('should navigate back to dashboard from settings', async ({ page }) => {
    await setupSettingsUser(page);
    const dashboardLink = page.locator('nav a, aside a').filter({ hasText: /dashboard|home/i }).first();
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
      await expect(page).toHaveURL(ROUTES.DASHBOARD);
    }
  });
});