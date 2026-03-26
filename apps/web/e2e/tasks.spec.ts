import { test, expect } from '@playwright/test';
import { ROUTES, TEST_USER_PASSWORD } from './constants';
import { createTestUser, createTestHousehold, createTestTask } from './helpers';

async function setupTaskUser(page: any) {
  const user = await createTestUser();
  user.password = TEST_USER_PASSWORD;
  const { token } = await (await import('./helpers')).loginUser(user.email, user.password);
  const household = await createTestHousehold(token, 'Tasks Test Household', user.id);

  await page.goto(ROUTES.LOGIN);
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(ROUTES.DASHBOARD);

  await page.goto(ROUTES.TASKS);
  await page.waitForLoadState('networkidle');

  return { user, token, household };
}

test.describe('Tasks Page', () => {
  test('should display tasks page', async ({ page }) => {
    await setupTaskUser(page);
    await expect(page.getByTestId('tasks-page')).toBeVisible({ timeout: 5000 });
  });

  test('should show empty state when no tasks', async ({ page }) => {
    await setupTaskUser(page);
    await expect(page.getByTestId('tasks-page')).toBeVisible({ timeout: 5000 });
  });

  test('should show create task button', async ({ page }) => {
    await setupTaskUser(page);
    await expect(page.getByTestId('create-task-btn')).toBeVisible();
  });

  test('should show task filters', async ({ page }) => {
    await setupTaskUser(page);
    await expect(page.getByTestId('task-filters')).toBeVisible();
  });

  test('should open create task modal', async ({ page }) => {
    await setupTaskUser(page);
    await page.getByTestId('create-task-btn').click();
    await expect(page.locator('form')).toBeVisible({ timeout: 3000 });
  });

  test('should create a task', async ({ page }) => {
    const { token, household } = await setupTaskUser(page);

    await page.getByTestId('create-task-btn').click();
    await page.waitForSelector('form');
    await page.getByTestId('task-name-input').fill('New Test Task');
    await page.getByTestId('create-task-submit-btn').click();

    await expect(page.getByText(/new test task/i)).toBeVisible({ timeout: 5000 });
  });

  test('should display created tasks', async ({ page }) => {
    const { token, household } = await setupTaskUser(page);
    await createTestTask(token, household.id, { name: 'API Task 1', type: 'DAILY' });
    await createTestTask(token, household.id, { name: 'API Task 2', type: 'WEEKLY' });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/api task 1/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/api task 2/i)).toBeVisible();
  });

  test('should filter tasks by type', async ({ page }) => {
    const { token, household } = await setupTaskUser(page);
    await createTestTask(token, household.id, { name: 'Daily Task', type: 'DAILY' });
    await createTestTask(token, household.id, { name: 'Weekly Task', type: 'WEEKLY' });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.getByTestId('filter-weekly').click();
    await expect(page.getByText(/weekly task/i)).toBeVisible({ timeout: 3000 });
  });

  test('should complete a task', async ({ page }) => {
    const { token, household } = await setupTaskUser(page);
    await createTestTask(token, household.id, { name: 'Task to Complete', type: 'DAILY' });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const taskCard = page.locator('[data-testid^="task-card-"]').filter({ hasText: /task to complete/i });
    await taskCard.locator('[data-testid^="complete-btn-"]').click();
    await page.waitForTimeout(1000);
  });

  test('should show streak information', async ({ page }) => {
    await setupTaskUser(page);
    await expect(page.getByTestId('streak-bar')).toBeVisible();
  });

  test('should cancel create task modal', async ({ page }) => {
    await setupTaskUser(page);
    await page.getByTestId('create-task-btn').click();
    await page.waitForSelector('form');
    await page.getByTestId('task-name-input').fill('Should not save');
    await page.getByTestId('cancel-task-btn').click();
    await expect(page.getByText(/should not save/i)).not.toBeVisible();
  });
});

test.describe('Task Type Options', () => {
  test('should show all task type options in modal', async ({ page }) => {
    await setupTaskUser(page);
    await page.getByTestId('create-task-btn').click();
    await page.waitForSelector('form');
    await expect(page.getByTestId('task-type-options')).toBeVisible();
  });

  test('should show priority options in modal', async ({ page }) => {
    await setupTaskUser(page);
    await page.getByTestId('create-task-btn').click();
    await page.waitForSelector('form');
    await expect(page.getByTestId('task-priority-options')).toBeVisible();
  });
});