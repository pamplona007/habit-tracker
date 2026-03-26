import { test, expect, Page } from '@playwright/test';
import { ROUTES, TEST_USER_PASSWORD } from './constants';
import { createTestUser, createTestHousehold, getInviteCode, checkApiAvailable } from './helpers';

async function loginAsUser(page: Page, email: string, password: string) {
  await page.goto(ROUTES.LOGIN);
  await page.waitForSelector('form');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/(dashboard|no-household)/, { timeout: 10000 });
}

test.describe('No Household Page', () => {
  test.beforeEach(async () => {
    const apiAvailable = await checkApiAvailable();
    test.skip(!apiAvailable, 'API server not available');
  });

  test('should be shown when user has no household', async ({ page }) => {
    const user = await createTestUser();
    user.password = TEST_USER_PASSWORD;

    await loginAsUser(page, user.email, user.password);
    await expect(page).toHaveURL(ROUTES.NO_HOUSEHOLD);
  });

  test('should show create household option', async ({ page }) => {
    const user = await createTestUser();
    user.password = TEST_USER_PASSWORD;

    await loginAsUser(page, user.email, user.password);
    await expect(page.getByRole('button', { name: /create.*household/i })).toBeVisible();
  });

  test('should show join household option', async ({ page }) => {
    const user = await createTestUser();
    user.password = TEST_USER_PASSWORD;

    await loginAsUser(page, user.email, user.password);
    await expect(page.getByRole('button', { name: /join.*household/i })).toBeVisible();
  });

  test('should create household and redirect to dashboard', async ({ page }) => {
    const user = await createTestUser();
    user.password = TEST_USER_PASSWORD;

    await loginAsUser(page, user.email, user.password);
    await page.getByRole('button', { name: /create.*household/i }).click();
    await page.getByLabel(/household name/i).fill('My Test Household');
    await page.getByRole('button', { name: /create/i }).click();

    await expect(page).toHaveURL(ROUTES.DASHBOARD, { timeout: 10000 });
    await expect(page.getByText(/my test household/i)).toBeVisible({ timeout: 5000 });
  });

  test('should switch to join mode', async ({ page }) => {
    const user = await createTestUser();
    user.password = TEST_USER_PASSWORD;

    await loginAsUser(page, user.email, user.password);
    await page.getByRole('button', { name: /join.*household/i }).click();
    await expect(page.getByLabel(/invite code/i)).toBeVisible();
  });

  test('should show error for invalid join code', async ({ page }) => {
    const user = await createTestUser();
    user.password = TEST_USER_PASSWORD;

    await loginAsUser(page, user.email, user.password);
    await page.getByRole('button', { name: /join.*household/i }).click();
    await page.getByLabel(/invite code/i).fill('INVALIDCODE123');
    await page.getByRole('button', { name: /join/i }).click();
    await expect(page.getByText(/404|invalid|error|failed/i)).toBeVisible({ timeout: 5000 });
  });

  test('should go back from create mode', async ({ page }) => {
    const user = await createTestUser();
    user.password = TEST_USER_PASSWORD;

    await loginAsUser(page, user.email, user.password);
    await page.getByRole('button', { name: /create.*household/i }).click();
    await page.getByRole('button', { name: /back/i }).click();
    await expect(page.getByRole('button', { name: /create.*household/i })).toBeVisible();
  });
});

test.describe('Join Household Flow', () => {
  test.beforeEach(async () => {
    const apiAvailable = await checkApiAvailable();
    test.skip(!apiAvailable, 'API server not available');
  });

  test('should join household with valid invite code', async ({ page }) => {
    const owner = await createTestUser({ email: `owner-${Date.now()}@test.com` });
    owner.password = TEST_USER_PASSWORD;
    const { token } = await (await import('./helpers')).loginUser(owner.email, owner.password);
    const household = await createTestHousehold(token, 'Owner Household', owner.id);
    const inviteCode = await getInviteCode(token, household.id);

    const joiner = await createTestUser({ email: `joiner-${Date.now()}@test.com` });
    joiner.password = TEST_USER_PASSWORD;

    await loginAsUser(page, joiner.email, joiner.password);
    await page.getByRole('button', { name: /join.*household/i }).click();
    await page.getByLabel(/invite code/i).fill(inviteCode);
    await page.getByRole('button', { name: /join/i }).click();

    await expect(page).toHaveURL(ROUTES.DASHBOARD, { timeout: 10000 });
  });
});
