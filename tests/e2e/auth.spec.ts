import { test, expect } from "@playwright/test"

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("should register a new user", async ({ page, browserName }) => {
    // Generate email based on browser name only
    const email = `test-${browserName}@example.com`;
    console.log(`Using email for ${browserName}: ${email}`);

    // Intercept the registration API call
    await page.route('**/api/auth/register', async (route) => {
      console.log('Intercepted registration request');
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: `test-user-${browserName}`,
            name: `Test User ${browserName}`,
            email: email,
            department: 'IT'
          },
          token: `test-jwt-token-${browserName}`
        })
      });
    });

    // Mock the dashboard API call
    await page.route('**/api/auth/me', async (route) => {
      console.log('Intercepted auth/me request');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: `test-user-${browserName}`,
          name: `Test User ${browserName}`,
          email: email,
          department: 'IT'
        })
      });
    });

    await page.goto("/register");
    await page.fill('#name', `Test User ${browserName}`);
    await page.fill('#email', email);
    
    // Handle department selection
    await page.click('[role="combobox"]');
    await page.waitForSelector('div[role="option"]');
    await page.click('div[role="option"]:has-text("IT")');
    
    await page.fill('#password', "test123");
    await page.fill('#confirmPassword', "test123");

    // Submit the form with a more reliable wait strategy
    const [response] = await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('/api/auth/register') && 
        response.status() === 201
      ),
      page.click('button[type="submit"]')
    ]);

    console.log('Registration response status:', response.status());
    
    // Wait for navigation to complete with a reasonable timeout
    try {
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      console.log('Successfully navigated to dashboard');
    } catch (error) {
      console.log('Current URL:', page.url());
      console.log('Page content:', await page.content());
      throw error;
    }

    // Verify we're on the dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("text=Dashboard").or(page.locator("text=Welcome")).first()).toBeVisible();
  })

  test("should login existing user", async ({ page, browserName }) => {
    // Use the same email format as registration test
    const email = `test-${browserName}@example.com`;
    
    // Mock the registration API call
    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: `test-user-${browserName}`,
            name: `Test User ${browserName}`,
            email: email,
            department: 'IT'
          },
          token: `test-jwt-token-${browserName}`
        })
      });
    });

    // First register a user
    await page.goto("/register");
    await page.fill('#name', `Test User ${browserName}`);
    await page.fill('#email', email);
    
    // Use the Select component properly
    await page.click('[role="combobox"]');
    await page.waitForSelector('div[role="option"]');
    await page.click('div[role="option"]:has-text("IT")');
    
    await page.fill('#password', "test123");
    await page.fill('#confirmPassword', "test123");
    
    // Submit registration form
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button[type="submit"]')
    ]);

    // Verify registration was successful
    await expect(page).toHaveURL("/dashboard");

    // Logout
    const userMenu = page.locator('button[aria-label="User menu"]').or(
      page.locator('text=Logout').or(
        page.locator('[data-testid="user-menu"]')
      )
    );
    
    if (await userMenu.first().isVisible()) {
      await userMenu.first().click();
      await page.click("text=Logout");
    } else {
      await page.goto("/login");
    }

    // Mock the login API call
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: `test-user-${browserName}`,
            name: `Test User ${browserName}`,
            email: email,
            department: 'IT'
          },
          token: `test-jwt-token-${browserName}-login`
        })
      });
    });

    // Login again
    await page.goto("/login");
    await page.fill('#email', email);
    await page.fill('#password', "test123");
    
    // Submit login form
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button[type="submit"]')
    ]);

    // Verify login was successful
    await expect(page).toHaveURL("/dashboard");
    await expect(page.locator("text=Dashboard").or(page.locator("text=Welcome")).first()).toBeVisible();
  });

  test("should show error for invalid login", async ({ page }) => {
    await page.goto("/login")
    await page.fill('#email', "invalid@example.com")
    await page.fill('#password', "wrongpassword")
    await page.click('button[type="submit"]')

    // Look for the actual error message from the login page
    await expect(page.locator("text=You can not access this page").or(
      page.locator("text=Invalid email or password").or(
        page.locator("text=Login failed")
      )
    ).first()).toBeVisible()
    await expect(page).toHaveURL("/login")
  })
})
