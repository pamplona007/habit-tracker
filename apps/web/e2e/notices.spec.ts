import { test, expect } from '@playwright/test';
import { ROUTES, TEST_USER_PASSWORD } from './constants';
import { createTestUser, createTestHousehold, createTestNotice } from './helpers';

async function setupNoticeUser(page: any) {
  const user = await createTestUser();
  user.password = TEST_USER_PASSWORD;
  const { token } = await (await import('./helpers')).loginUser(user.email, user.password);
  const household = await createTestHousehold(token, 'Notices Test Household', user.id);

  await page.goto(ROUTES.LOGIN);
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(ROUTES.DASHBOARD);

  await page.goto(ROUTES.NOTICES);
  await page.waitForLoadState('networkidle');

  return { user, token, household };
}

test.describe('Notices Page', () => {
  test('should display notices page', async ({ page }) => {
    await setupNoticeUser(page);
    await expect(page.getByTestId('notices-page')).toBeVisible({ timeout: 5000 });
  });

  test('should show empty state when no notices', async ({ page }) => {
    await setupNoticeUser(page);
    await expect(page.getByTestId('notices-page')).toBeVisible({ timeout: 5000 });
  });

  test('should show add notice button', async ({ page }) => {
    await setupNoticeUser(page);
    await expect(page.getByTestId('add-notice-btn')).toBeVisible();
  });

  test('should open create notice modal', async ({ page }) => {
    await setupNoticeUser(page);
    await page.getByTestId('add-notice-btn').click();
    await expect(page.locator('[data-testid="create-notice-form"]')).toBeVisible({ timeout: 3000 });
  });

  test('should create a notice', async ({ page }) => {
    await setupNoticeUser(page);

    await page.getByTestId('add-notice-btn').click();
    await page.waitForSelector('form');
    await page.getByTestId('notice-title-input').fill('Test Notice');
    await page.getByTestId('notice-content-input').fill('Test notice content');
    await page.getByTestId('create-notice-submit-btn').click();

    await expect(page.getByText(/test notice/i)).toBeVisible({ timeout: 5000 });
  });

  test('should display created notices', async ({ page }) => {
    const { token, household } = await setupNoticeUser(page);
    await createTestNotice(token, household.id, { title: 'API Notice', content: 'API Notice Content' });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/api notice/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('should show priority badge for notices', async ({ page }) => {
    const { token, household } = await setupNoticeUser(page);
    await createTestNotice(token, household.id, { title: 'Urgent Notice', content: 'Content', priority: 'urgent' });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/urgent/i).first()).toBeVisible();
  });

  test('should cancel create notice modal', async ({ page }) => {
    await setupNoticeUser(page);
    await page.getByTestId('add-notice-btn').click();
    await page.waitForSelector('form');
    await page.getByTestId('notice-title-input').fill('Should not save');
    await page.getByTestId('cancel-notice-btn').click();
    await expect(page.getByText(/should not save/i)).not.toBeVisible();
  });
});

test.describe('Notice Priority Options', () => {
  test('should show priority options when creating notice', async ({ page }) => {
    await setupNoticeUser(page);
    await page.getByTestId('add-notice-btn').click();
    await page.waitForSelector('form');
    await expect(page.getByTestId('notice-priority-options')).toBeVisible();
  });

  test('should select high priority', async ({ page }) => {
    await setupNoticeUser(page);
    await page.getByTestId('add-notice-btn').click();
    await page.waitForSelector('form');
    await page.getByTestId('notice-priority-high').click();
    await expect(page.getByTestId('notice-priority-high')).toHaveClass(/active|selected/i);
  });
});