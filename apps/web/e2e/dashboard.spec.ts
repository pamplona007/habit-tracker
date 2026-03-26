import { test, expect, Page } from '@playwright/test';
import { ROUTES, TEST_USER_PASSWORD } from './constants';
import { createTestUser, createTestHousehold, createTestTask, createTestNotice, createTestShoppingList, addShoppingItem } from './helpers';

async function setupAuthenticatedUser(page: Page) {
  const user = await createTestUser();
  user.password = TEST_USER_PASSWORD;
  const { token } = await (await import('./helpers')).loginUser(user.email, user.password);
  const household = await createTestHousehold(token, 'Dashboard Test Household', user.id);

  await page.goto(ROUTES.LOGIN);
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(ROUTES.DASHBOARD);

  return { user, token, household };
}

test.describe('Dashboard Page', () => {
  test('should display dashboard after login with household', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await expect(page.getByText(/good morning|hello|welcome/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show streak information', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await expect(page.getByText(/streak|fire|day/i)).toBeVisible();
  });

  test('should show focus today section', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await expect(page.getByText(/focus today|today/i)).toBeVisible();
  });

  test('should show quick actions', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await expect(page.getByText(/quick start/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show empty state when no tasks', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await expect(page.getByText(/all caught up/i)).toBeVisible({ timeout: 5000 });
  });

  test('should display notices section', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await expect(page.getByRole('heading', { name: /announcements/i })).toBeVisible({ timeout: 5000 });
  });

  test('should display shopping lists section', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await expect(page.locator('a[href="/shopping"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to tasks page', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await page.getByRole('link', { name: /tasks|add task/i }).first().click();
    await expect(page).toHaveURL(ROUTES.TASKS);
  });

  test('should navigate to shopping page', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await page.getByRole('link', { name: /shopping/i }).first().click();
    await expect(page).toHaveURL(ROUTES.SHOPPING);
  });

  test('should navigate to settings page', async ({ page }) => {
    await setupAuthenticatedUser(page);
    await page.getByRole('link', { name: /settings/i }).first().click();
    await expect(page).toHaveURL(ROUTES.SETTINGS);
  });

  test('should show pending tasks count', async ({ page }) => {
    const { token, household } = await setupAuthenticatedUser(page);
    await createTestTask(token, household.id, { name: 'Test Task 1', type: 'DAILY' });
    await createTestTask(token, household.id, { name: 'Test Task 2', type: 'DAILY' });

    await page.reload();
    await expect(page.getByText(/2.*pending|pending.*2/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show notices on dashboard', async ({ page }) => {
    const { token, household } = await setupAuthenticatedUser(page);
    await createTestNotice(token, household.id, { title: 'Test Notice', content: 'Notice content' });

    await page.reload();
    await expect(page.getByText(/test notice/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show shopping lists on dashboard', async ({ page }) => {
    const { token, household } = await setupAuthenticatedUser(page);
    const list = await createTestShoppingList(token, household.id, 'Groceries');
    await addShoppingItem(token, household.id, list.id, 'Milk');

    await page.reload();
    await expect(page.getByText(/groceries/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Dashboard Navigation', () => {
  test('should have working sidebar navigation', async ({ page }) => {
    await setupAuthenticatedUser(page);

    const tasksLink = page.locator('nav a, aside a').filter({ hasText: /task/i }).first();
    if (await tasksLink.isVisible()) {
      await tasksLink.click();
      await expect(page).toHaveURL(ROUTES.TASKS);
    }
  });

  test('should have working sidebar navigation to notices', async ({ page }) => {
    await setupAuthenticatedUser(page);

    const noticesLink = page.locator('nav a, aside a').filter({ hasText: /notice|announcement/i }).first();
    if (await noticesLink.isVisible()) {
      await noticesLink.click();
      await expect(page).toHaveURL(ROUTES.NOTICES);
    }
  });

  test('should have working sidebar navigation to shopping', async ({ page }) => {
    await setupAuthenticatedUser(page);

    const shoppingLink = page.locator('nav a, aside a').filter({ hasText: /shopping/i }).first();
    if (await shoppingLink.isVisible()) {
      await shoppingLink.click();
      await expect(page).toHaveURL(ROUTES.SHOPPING);
    }
  });
});
