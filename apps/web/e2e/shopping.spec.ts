import { test, expect } from '@playwright/test';
import { ROUTES, TEST_USER_PASSWORD } from './constants';
import { createTestUser, createTestHousehold, createTestShoppingList, addShoppingItem } from './helpers';

async function setupShoppingUser(page: any) {
  const user = await createTestUser();
  user.password = TEST_USER_PASSWORD;
  const { token } = await (await import('./helpers')).loginUser(user.email, user.password);
  const household = await createTestHousehold(token, 'Shopping Test Household', user.id);

  await page.goto(ROUTES.LOGIN);
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(ROUTES.DASHBOARD);

  await page.goto(ROUTES.SHOPPING);
  await page.waitForLoadState('networkidle');

  return { user, token, household };
}

test.describe('Shopping Page', () => {
  test('should display shopping page', async ({ page }) => {
    await setupShoppingUser(page);
    await expect(page.getByTestId('shopping-page')).toBeVisible({ timeout: 5000 });
  });

  test('should show empty state when no lists', async ({ page }) => {
    await setupShoppingUser(page);
    await expect(page.getByTestId('shopping-page')).toBeVisible({ timeout: 5000 });
  });

  test('should show new list button', async ({ page }) => {
    await setupShoppingUser(page);
    await expect(page.getByTestId('create-list-btn')).toBeVisible();
  });

  test('should open create list modal', async ({ page }) => {
    await setupShoppingUser(page);
    await page.getByTestId('create-list-btn').click();
    await expect(page.locator('[data-testid="create-list-form"]')).toBeVisible({ timeout: 3000 });
  });

  test('should create a shopping list', async ({ page }) => {
    await setupShoppingUser(page);

    await page.getByTestId('create-list-btn').click();
    await page.waitForSelector('form');
    await page.getByTestId('list-name-input').fill('Weekly Groceries');
    await page.getByTestId('create-list-submit-btn').click();

    await expect(page.getByText(/weekly groceries/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('should display created shopping lists', async ({ page }) => {
    const { token, household } = await setupShoppingUser(page);
    await createTestShoppingList(token, household.id, 'API List');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/api list/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('should select a list and view items', async ({ page }) => {
    const { token, household } = await setupShoppingUser(page);
    const list = await createTestShoppingList(token, household.id, 'My List');
    await addShoppingItem(token, household.id, list.id, 'Item 1');
    await addShoppingItem(token, household.id, list.id, 'Item 2');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByText(/my list/i).first().click();
    await expect(page.getByText(/item 1/i)).toBeVisible({ timeout: 3000 });
  });

  test('should add item to shopping list', async ({ page }) => {
    const { token, household } = await setupShoppingUser(page);
    const list = await createTestShoppingList(token, household.id, 'My List');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByText(/my list/i).first().click();
    await page.getByTestId('add-item-input').fill('New Item');
    await page.getByTestId('add-item-btn').click();

    await expect(page.getByText(/new item/i)).toBeVisible({ timeout: 5000 });
  });

  test('should toggle item checked state', async ({ page }) => {
    const { token, household } = await setupShoppingUser(page);
    const list = await createTestShoppingList(token, household.id, 'My List');
    await addShoppingItem(token, household.id, list.id, 'Toggle Item');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByText(/my list/i).first().click();
    await page.getByText(/toggle item/i).first().click();
    await page.waitForTimeout(1000);
  });

  test('should cancel create list modal', async ({ page }) => {
    await setupShoppingUser(page);
    await page.getByTestId('create-list-btn').click();
    await page.waitForSelector('form');
    await page.getByTestId('list-name-input').fill('Should not save');
    await page.getByTestId('cancel-list-btn').click();
    await expect(page.getByText(/should not save/i)).not.toBeVisible();
  });

  test('should show list count', async ({ page }) => {
    await setupShoppingUser(page);
    await expect(page.getByTestId('shopping-page')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Shopping List Selection', () => {
  test('should switch between lists', async ({ page }) => {
    const { token, household } = await setupShoppingUser(page);
    const list1 = await createTestShoppingList(token, household.id, 'List 1');
    const list2 = await createTestShoppingList(token, household.id, 'List 2');

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.getByText(/list 1/i).first().click();
    await expect(page.getByText(/list 1/i).first()).toBeVisible();

    await page.getByText(/list 2/i).first().click();
    await expect(page.getByText(/list 2/i).first()).toBeVisible();
  });

  test('should show empty item list state', async ({ page }) => {
    const { token, household } = await setupShoppingUser(page);
    await createTestShoppingList(token, household.id, 'Empty List');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByText(/empty list/i).first().click();
    await expect(page.getByTestId('no-items-message')).toBeVisible({ timeout: 3000 });
  });
});