import { test, expect, Page } from '@playwright/test'

// Clear auth state before each test to prevent race conditions
test.beforeEach(async ({ page }) => {
  // Navigate to the page first so we have access to localStorage
  await page.goto('/')
  // Clear any existing auth state
  await page.evaluate(() => {
    localStorage.removeItem('dev-auth-user')
  })
})

// Helper to wait for app to fully load (past the loading spinner)
async function waitForAppLoad(page: Page) {
  // Wait for the sidebar header to appear (indicates loading is done)
  await page.waitForSelector('h1:has-text("Alameda Sidewalk Map")', { timeout: 15000 })
}

// Helper to login as a specific user type via dev auth
async function loginAs(page: Page, role: 'admin' | 'user') {
  // Set the dev auth in localStorage
  const user = role === 'admin'
    ? { id: 'dev-admin-001', email: 'admin@dev.local', username: 'DevAdmin', role: 'admin', image: null }
    : { id: 'dev-user-001', email: 'user@dev.local', username: 'DevUser', role: 'user', image: null }

  await page.evaluate((userData: typeof user) => {
    localStorage.setItem('dev-auth-user', JSON.stringify(userData))
  }, user)

  // Reload to apply the auth state
  await page.reload()
  await waitForAppLoad(page)
}

async function logout(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('dev-auth-user')
  })
  await page.reload()
  await waitForAppLoad(page)
}

test.describe('Homepage', () => {
  test('should display the map and sidebar', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)

    // Check title
    await expect(page.locator('h1')).toContainText('Alameda Sidewalk Map')

    // Check dev bar is visible
    await expect(page.locator('text=DEV MODE')).toBeVisible()

    // Check map is rendered (wait up to 10s for map to initialize)
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 })

    // Check sidebar elements
    await expect(page.locator('h3:has-text("Statistics")')).toBeVisible()
    await expect(page.locator('button:has-text("Filters"):not(:has-text("Clear"))')).toBeVisible()
  })

  test('should show sign in button when not logged in', async ({ page }) => {
    await page.goto('/')
    await logout(page)

    // The Sign In button is in the sidebar, look for the button element
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible()
  })

  test('should show welcome message when logged in', async ({ page }) => {
    await page.goto('/')
    await loginAs(page, 'user')

    await expect(page.locator('text=Welcome back')).toBeVisible()
  })
})

test.describe('Dev Auth Bar', () => {
  test('should allow login as user', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)

    // Click login as user
    await page.click('button:has-text("Login as User")')

    // Should show logged in state in dev bar
    await expect(page.locator('.fixed.top-0:has-text("DevUser")')).toBeVisible()
    await expect(page.locator('.fixed.top-0:has-text("(user)")')).toBeVisible()
  })

  test('should allow login as admin', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)

    // Click login as admin
    await page.click('button:has-text("Login as Admin")')

    // Should show logged in state in dev bar
    await expect(page.locator('.fixed.top-0:has-text("DevAdmin")')).toBeVisible()
    await expect(page.locator('.fixed.top-0:has-text("(admin)")')).toBeVisible()
  })

  test('should allow logout', async ({ page }) => {
    await page.goto('/')
    await loginAs(page, 'user')

    // Click logout in dev bar
    await page.click('button:has-text("Logout")')

    // Should show not logged in
    await expect(page.locator('.fixed.top-0:has-text("Not logged in")')).toBeVisible()
  })
})

test.describe('Filters', () => {
  test('should display filter options', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)

    // Check filter dropdown selects exist by their labels
    await expect(page.locator('label:has-text("Contractor") + select, label:has-text("Contractor") ~ select').first()).toBeVisible()
    await expect(page.locator('label:has-text("Year") + select, label:has-text("Year") ~ select').first()).toBeVisible()
    await expect(page.locator('label:has-text("Decade") + select, label:has-text("Decade") ~ select').first()).toBeVisible()
    await expect(page.locator('label:has-text("Street") + select, label:has-text("Street") ~ select').first()).toBeVisible()
  })

  test('should have a clear filters button', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)

    await expect(page.locator('button:has-text("Clear All Filters")')).toBeVisible()
  })

  test('should have a search input', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)

    const searchInput = page.locator('input[placeholder="Search contractors..."]')
    await expect(searchInput).toBeVisible()
  })
})

test.describe('Admin Page', () => {
  test('should load admin page when logged in as admin', async ({ page }) => {
    await page.goto('/')
    await loginAs(page, 'admin')

    await page.goto('/admin')
    // Wait for admin page to load
    await page.waitForSelector('h1:has-text("Admin")', { timeout: 15000 })

    // Check admin header
    await expect(page.locator('h1')).toContainText('Admin')

    // Check admin tabs (they are buttons with role="tab")
    await expect(page.locator('button[role="tab"]:has-text("Map & Segments")')).toBeVisible()
    await expect(page.locator('button[role="tab"]:has-text("Segment Approval")')).toBeVisible()
    await expect(page.locator('button[role="tab"]:has-text("Overlap Conflicts")')).toBeVisible()
    await expect(page.locator('button[role="tab"]:has-text("Statistics")')).toBeVisible()
  })

  test('should display map in admin page', async ({ page }) => {
    await page.goto('/')
    await loginAs(page, 'admin')

    await page.goto('/admin')
    await page.waitForSelector('h1:has-text("Admin")', { timeout: 15000 })

    // Check map is rendered (wait for leaflet to initialize)
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 })
  })

  test('should have Add Segment button', async ({ page }) => {
    await page.goto('/')
    await loginAs(page, 'admin')

    await page.goto('/admin')
    await page.waitForSelector('h1:has-text("Admin")', { timeout: 15000 })

    await expect(page.locator('button:has-text("Add Segment")')).toBeVisible()
  })

  test('should switch between tabs', async ({ page }) => {
    await page.goto('/')
    await loginAs(page, 'admin')

    await page.goto('/admin')
    await page.waitForSelector('h1:has-text("Admin")', { timeout: 15000 })

    // Click Segment Approval tab
    await page.click('button[role="tab"]:has-text("Segment Approval")')
    // Wait for tab content to load - look for the Segment Approval heading
    await expect(page.locator('h2:has-text("Segment Approval")')).toBeVisible({ timeout: 5000 })

    // Click Statistics tab
    await page.click('button[role="tab"]:has-text("Statistics")')
    // Wait for statistics content - look for Overview heading
    await expect(page.locator('h3:has-text("Overview")')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Toast Notifications', () => {
  test('toast container should exist', async ({ page }) => {
    // Verify the toast container exists (it's always rendered but may be empty)
    await page.goto('/')
    await waitForAppLoad(page)

    // The toast container should exist with aria-live attribute
    const toastContainer = page.locator('[aria-live="polite"]')
    // The container is always present, even if empty
    await expect(toastContainer).toHaveCount(1)
  })
})

test.describe('Mobile Responsiveness', () => {
  test('should show mobile sidebar on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await waitForAppLoad(page)

    // Sidebar should still be visible but in mobile mode
    await expect(page.locator('.sidebar')).toBeVisible()
  })
})

test.describe('Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/')
    await waitForAppLoad(page)

    // Check for aria-labels on key elements
    await expect(page.locator('[aria-label="Search contractors"]')).toBeVisible()
  })

  test('should have proper role attributes on admin tabs', async ({ page }) => {
    await page.goto('/')
    await loginAs(page, 'admin')

    await page.goto('/admin')
    await page.waitForSelector('h1:has-text("Admin")', { timeout: 15000 })

    // Check for tablist role
    await expect(page.locator('[role="tablist"]')).toBeVisible()

    // Check for tab roles
    const tabs = page.locator('[role="tab"]')
    await expect(tabs).toHaveCount(4)
  })
})
