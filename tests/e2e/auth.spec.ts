import { test, expect } from "@playwright/test"

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("should register a new user", async ({ page }) => {
    await page.click("text=Get Started")
    await page.click("text=Sign up")

    await page.fill('input[name="name"]', "Test User")
    await page.fill('input[name="email"]', "test@example.com")
    await page.fill('input[name="password"]', "password123")

    await page.click('button[type="submit"]')

    await expect(page).toHaveURL("/dashboard")
    await expect(page.locator("text=Welcome, Test User")).toBeVisible()
  })

  test("should login existing user", async ({ page }) => {
    // First register a user
    await page.goto("/register")
    await page.fill('input[name="name"]', "Test User")
    await page.fill('input[name="email"]', "test@example.com")
    await page.fill('input[name="password"]', "password123")
    await page.click('button[type="submit"]')

    // Logout
    await page.click('button[aria-label="User menu"]')
    await page.click("text=Logout")

    // Login again
    await page.goto("/login")
    await page.fill('input[name="email"]', "test@example.com")
    await page.fill('input[name="password"]', "password123")
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL("/dashboard")
    await expect(page.locator("text=Welcome, Test User")).toBeVisible()
  })

  test("should show error for invalid login", async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[name="email"]', "invalid@example.com")
    await page.fill('input[name="password"]', "wrongpassword")
    await page.click('button[type="submit"]')

    await expect(page.locator("text=Invalid credentials")).toBeVisible()
    await expect(page).toHaveURL("/login")
  })
})
