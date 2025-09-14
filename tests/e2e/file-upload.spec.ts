// import { test, expect } from '@playwright/test'
// import path from 'path'

// test.describe('File Upload Flow', () => {
//   test.beforeEach(async ({ page }) => {
//     // Navigate to login page
//     await page.goto('/login')
//   })

//   test('should successfully upload a document with complete metadata', async ({ page }) => {
//     // Step 1: Login with demo credentials
//     await page.fill('#email', 'admin@filetracking.com')
//     await page.fill('#password', 'admin123')
//     await page.click('button[type="submit"]')
    
//     // Wait for navigation with error handling for mobile browsers
//     try {
//       await page.waitForURL('/dashboard', { timeout: 30000 })
//     } catch (error) {
//       // If direct navigation fails, check if we're already on dashboard or need to wait longer
//       const currentUrl = page.url()
//       if (!currentUrl.includes('/dashboard')) {
//         // Wait for any navigation to complete
//         await page.waitForLoadState('networkidle', { timeout: 10000 })
//         // Check URL again
//         await expect(page).toHaveURL('/dashboard', { timeout: 5000 })
//       }
//     }
    
//     // Verify we're on dashboard
//     await expect(page.locator('h1')).toContainText('File Tracking Dashboard')

//     // Step 2: Navigate to Upload Files tab
//     await page.click('button[role="tab"]:has-text("Upload Files")')
//     // Verify we're on the upload tab by checking for upload UI elements
//     await expect(page.locator('text=Drag & drop files here')).toBeVisible()

//     // Step 3: Upload file by clicking on drag & drop area
//     const fileInput = page.locator('input[type="file"]')
//     const testFilePath = path.join(__dirname, '../fixtures/test-document.pdf')
    
//     // Click on drag & drop area to trigger file selection
//     await page.click('text=Drag & drop files here')
//     await fileInput.setInputFiles(testFilePath)

//     // Verify file is selected - look for file name in the UI
//     await expect(page.locator('text=test-document.pdf')).toBeVisible()

//     // Step 4: Fill in required metadata
//     // Select category (required field) - use the dropdown button
//     await page.click('button:has-text("Select category")')
//     await page.click('text=Documents')
    
//     // Fill optional metadata
//     await page.fill('input[placeholder="Department"]', 'Engineering')
//     await page.fill('input[placeholder*="urgent, contract"]', 'test, automation, pdf')
//     await page.fill('textarea[placeholder*="Brief description"]', 'Test document for E2E upload validation')

//     // Step 5: Submit upload
//     const uploadButton = page.locator('button:has-text("Upload 1 file")')
//     await expect(uploadButton).toBeEnabled()
//     await uploadButton.click()

//     // Step 6: Verify upload success
//     // Wait for upload completion and success message
//     await expect(page.locator('text=Successfully uploaded 1 file(s)')).toBeVisible({ timeout: 10000 })
    
//     // Verify form is reset - file should be removed
//     await expect(page.locator('text=test-document.pdf')).not.toBeVisible()
//   })
// })