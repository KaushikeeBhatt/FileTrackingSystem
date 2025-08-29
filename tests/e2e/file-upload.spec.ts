import { test, expect } from "@playwright/test"
import path from "path"

test.describe("File Upload Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto("/login")
    await page.fill('input[name="email"]', "test@example.com")
    await page.fill('input[name="password"]', "password123")
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL("/dashboard")
  })

  test("should upload a file successfully", async ({ page }) => {
    // Navigate to file upload
    await page.click("text=Upload Files")

    // Create a test file
    const testFilePath = path.join(__dirname, "../fixtures/test-document.pdf")

    // Upload file
    await page.setInputFiles('input[type="file"]', testFilePath)

    // Fill file details
    await page.fill('input[name="description"]', "Test document upload")
    await page.fill('input[name="tags"]', "test, document")

    await page.click('button[type="submit"]')

    // Verify upload success
    await expect(page.locator("text=File uploaded successfully")).toBeVisible()
    await expect(page.locator("text=test-document.pdf")).toBeVisible()
  })

  test("should show file in pending status", async ({ page }) => {
    // Upload a file first
    await page.click("text=Upload Files")
    const testFilePath = path.join(__dirname, "../fixtures/test-document.pdf")
    await page.setInputFiles('input[type="file"]', testFilePath)
    await page.click('button[type="submit"]')

    // Check file status
    await page.goto("/dashboard")
    await expect(page.locator("text=Pending")).toBeVisible()
    await expect(page.locator('[data-status="pending"]')).toBeVisible()
  })

  test("should search for uploaded files", async ({ page }) => {
    // Upload a file first
    await page.click("text=Upload Files")
    const testFilePath = path.join(__dirname, "../fixtures/test-document.pdf")
    await page.setInputFiles('input[type="file"]', testFilePath)
    await page.fill('input[name="description"]', "Searchable test document")
    await page.click('button[type="submit"]')

    // Search for the file
    await page.goto("/dashboard")
    await page.fill('input[placeholder="Search files..."]', "test-document")
    await page.press('input[placeholder="Search files..."]', "Enter")

    await expect(page.locator("text=test-document.pdf")).toBeVisible()
  })
})
