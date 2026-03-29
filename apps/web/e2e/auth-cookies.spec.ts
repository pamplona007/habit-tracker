import { test, expect } from '@playwright/test'
import { ROUTES, TEST_USER_PASSWORD } from './constants'
import { createTestUser, loginUser } from './helpers'

test.describe('Refresh Token Cookie Flow', () => {
  test('login stores access token in memory but refresh token in cookie', async ({ page }) => {
    const user = await createTestUser()
    user.password = TEST_USER_PASSWORD

    await page.goto(ROUTES.LOGIN)
    await page.getByLabel(/email/i).fill(user.email)
    await page.getByLabel(/password/i).fill(user.password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(ROUTES.NO_HOUSEHOLD)

    const localStorageAccessToken = await page.evaluate(() => localStorage.getItem('accessToken'))
    expect(localStorageAccessToken).toBeTruthy()

    const cookies = await page.context().cookies()
    const refreshCookie = cookies.find(c => c.name === 'refresh_token')
    expect(refreshCookie).toBeDefined()
    expect(refreshCookie?.httpOnly).toBe(true)
    expect(refreshCookie?.sameSite).toBe('Strict')
  })

  test('OAuth callback page loads and redirects correctly', async ({ page }) => {
    const user = await createTestUser()
    user.password = TEST_USER_PASSWORD
    const { token } = await loginUser(user.email, user.password)

    await page.goto(`${ROUTES.CALLBACK}#accessToken=${token}`)
    await page.waitForURL(ROUTES.NO_HOUSEHOLD, { timeout: 10000 })

    expect(page.url()).toContain(ROUTES.NO_HOUSEHOLD)
  })
})