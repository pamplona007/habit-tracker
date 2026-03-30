import { test, expect, Page } from '@playwright/test';
import { ROUTES, TEST_USER_PASSWORD } from './constants';
import { createTestUser, createTestHousehold, createTestTask, createTestNotice, createTestShoppingList, addShoppingItem } from './helpers';

const API_URL = process.env.E2E_API_URL || 'http://localhost:3000';

async function setupUser(page: Page) {
  const user = await createTestUser();
  user.password = TEST_USER_PASSWORD;
  const { token } = await (await import('./helpers')).loginUser(user.email, user.password);
  const household = await createTestHousehold(token, 'Optimistic UI Household', user.id);

  await page.goto(ROUTES.LOGIN);
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(ROUTES.DASHBOARD);

  return { user, token, household };
}

test.describe('Tasks Optimistic UI', () => {
  test('should show task immediately after create before API response', async ({ page }) => {
    const { token, household } = await setupUser(page);
    await createTestTask(token, household.id, { name: 'Anchor Task', type: 'DAILY' });

    await page.goto(ROUTES.TASKS);
    await page.waitForLoadState('networkidle');

    await page.getByTestId('create-task-btn').click();
    await page.waitForSelector('form');
    await page.getByTestId('task-name-input').fill('Optimistic Task');
    page.getByTestId('create-task-submit-btn').click();

    await expect(page.getByText(/optimistic task/i)).toBeVisible({ timeout: 500 });
  });

  test('should remove task immediately after delete before API response', async ({ page }) => {
    const { token, household } = await setupUser(page);
    const task = await createTestTask(token, household.id, { name: 'Task To Delete', type: 'DAILY' });

    await page.goto(ROUTES.TASKS);
    await page.waitForLoadState('networkidle');

    const taskCard = page.locator(`[data-testid="task-card-${task.id}"]`);
    await expect(taskCard).toBeVisible();

    taskCard.locator('[data-testid^="delete-btn-"]').click();
    await page.getByTestId('confirm-dialog-confirm').click();

    await expect(taskCard).not.toBeVisible({ timeout: 500 });
  });

  test('should rollback task after failed create', async ({ page }) => {
    const { token, household } = await setupUser(page);
    await createTestTask(token, household.id, { name: 'Anchor Task', type: 'DAILY' });

    await page.route(`${API_URL}/households/${household.id}/tasks`, async (route) => {
      await route.abort('failed');
    });

    await page.goto(ROUTES.TASKS);
    await page.waitForLoadState('networkidle');

    await page.getByTestId('create-task-btn').click();
    await page.waitForSelector('form');
    await page.getByTestId('task-name-input').fill('Should Rollback');
    page.getByTestId('create-task-submit-btn').click();

    await expect(page.getByText(/should rollback/i)).not.toBeVisible({ timeout: 2000 });
  });

  test('should rollback task after failed delete', async ({ page }) => {
    const { token, household } = await setupUser(page);
    const task = await createTestTask(token, household.id, { name: 'Task To Fail Delete', type: 'DAILY' });

    await page.route(`${API_URL}/households/${household.id}/tasks/${task.id}`, async (route) => {
      await route.abort('failed');
    });

    await page.goto(ROUTES.TASKS);
    await page.waitForLoadState('networkidle');

    const taskCard = page.locator(`[data-testid="task-card-${task.id}"]`);
    await expect(taskCard).toBeVisible();
    await taskCard.locator('[data-testid^="delete-btn-"]').click();
    await page.getByTestId('confirm-dialog-confirm').click();

    await expect(taskCard).toBeVisible({ timeout: 2000 });
  });
});

// ─── NOTICES ─────────────────────────────────────────────────────────────────

test.describe('Notices Optimistic UI', () => {
  test('should show notice immediately after create before API response', async ({ page }) => {
    const { token, household } = await setupUser(page);
    await createTestNotice(token, household.id, { title: 'Anchor Notice', content: 'content' });

    await page.goto(ROUTES.NOTICES);
    await page.waitForLoadState('networkidle');

    await page.getByTestId('add-notice-btn').click();
    await page.waitForSelector('form');
    await page.getByTestId('notice-title-input').fill('Optimistic Notice');
    await page.getByTestId('notice-content-input').fill('Some content');
    page.getByTestId('create-notice-submit-btn').click();

    await expect(page.getByText(/optimistic notice/i)).toBeVisible({ timeout: 500 });
  });

  test('should remove notice immediately after delete before API response', async ({ page }) => {
    const { token, household } = await setupUser(page);
    const notice = await createTestNotice(token, household.id, { title: 'Notice To Delete', content: 'content' });

    await page.goto(ROUTES.NOTICES);
    await page.waitForLoadState('networkidle');

    const noticeCard = page.locator(`[data-testid="notice-card-${notice.id}"]`);
    await expect(noticeCard).toBeVisible();

    noticeCard.locator('[data-testid^="delete-notice-btn-"]').click();
    await page.getByTestId('confirm-dialog-confirm').click();

    await expect(noticeCard).not.toBeVisible({ timeout: 500 });
  });

  test('should rollback notice after failed create', async ({ page }) => {
    const { token, household } = await setupUser(page);
    await createTestNotice(token, household.id, { title: 'Anchor Notice', content: 'content' });

    await page.route(`${API_URL}/households/${household.id}/notices`, async (route) => {
      await route.abort('failed');
    });

    await page.goto(ROUTES.NOTICES);
    await page.waitForLoadState('networkidle');

    await page.getByTestId('add-notice-btn').click();
    await page.waitForSelector('form');
    await page.getByTestId('notice-title-input').fill('Should Rollback Notice');
    await page.getByTestId('notice-content-input').fill('content');
    page.getByTestId('create-notice-submit-btn').click();

    await expect(page.getByText(/should rollback notice/i)).not.toBeVisible({ timeout: 2000 });
  });
});

// ─── SHOPPING ─────────────────────────────────────────────────────────────────

test.describe('Shopping Optimistic UI', () => {
  test('should show shopping list immediately after create before API response', async ({ page }) => {
    const { token, household } = await setupUser(page);
    await createTestShoppingList(token, household.id, 'Anchor List');

    await page.goto(ROUTES.SHOPPING);
    await page.waitForLoadState('networkidle');

    await page.getByTestId('create-list-btn').click();
    await page.waitForSelector('form');
    await page.getByTestId('list-name-input').fill('Optimistic List');
    page.getByTestId('create-list-submit-btn').click();

    await expect(page.getByText(/optimistic list/i).first()).toBeVisible({ timeout: 500 });
  });

  test('should remove shopping list immediately after delete before API response', async ({ page }) => {
    const { token, household } = await setupUser(page);
    const list = await createTestShoppingList(token, household.id, 'List To Delete');

    await page.goto(ROUTES.SHOPPING);
    await page.waitForLoadState('networkidle');

    const listCard = page.locator(`[data-testid="shopping-list-${list.id}"]`);
    await expect(listCard).toBeVisible();

    listCard.locator('[data-testid^="delete-list-btn-"]').click();
    await page.getByTestId('confirm-dialog-confirm').click();

    await expect(listCard).not.toBeVisible({ timeout: 500 });
  });

  test('should show shopping item immediately after add before API response', async ({ page }) => {
    const { token, household } = await setupUser(page);
    const list = await createTestShoppingList(token, household.id, 'My List');
    await addShoppingItem(token, household.id, list.id, 'Anchor Item');

    await page.goto(ROUTES.SHOPPING);
    await page.waitForLoadState('networkidle');
    await page.getByText(/my list/i).first().click();
    await page.waitForLoadState('networkidle');

    await page.getByTestId('add-item-input').fill('Optimistic Item');
    page.getByTestId('add-item-btn').click();

    await expect(page.getByText(/optimistic item/i)).toBeVisible({ timeout: 500 });
  });

  test('should remove shopping item immediately after delete before API response', async ({ page }) => {
    const { token, household } = await setupUser(page);
    const list = await createTestShoppingList(token, household.id, 'My List');
    const item = await addShoppingItem(token, household.id, list.id, 'Item To Delete');

    await page.goto(ROUTES.SHOPPING);
    await page.waitForLoadState('networkidle');
    await page.getByText(/my list/i).first().click();
    await page.waitForLoadState('networkidle');

    const itemRow = page.locator(`[data-testid="shopping-item-${item.id}"]`);
    await expect(itemRow).toBeVisible();

    itemRow.locator('[data-testid^="delete-item-btn-"]').click();

    await expect(itemRow).not.toBeVisible({ timeout: 500 });
  });

  test('should rollback shopping list after failed create', async ({ page }) => {
    const { token, household } = await setupUser(page);
    await createTestShoppingList(token, household.id, 'Anchor List');

    await page.route(`${API_URL}/households/${household.id}/shopping`, async (route) => {
      await route.abort('failed');
    });

    await page.goto(ROUTES.SHOPPING);
    await page.waitForLoadState('networkidle');

    await page.getByTestId('create-list-btn').click();
    await page.waitForSelector('form');
    await page.getByTestId('list-name-input').fill('Should Rollback List');
    page.getByTestId('create-list-submit-btn').click();

    await expect(page.getByText(/should rollback list/i)).not.toBeVisible({ timeout: 2000 });
  });
});
