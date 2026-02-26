import { test as setup, expect, type Page } from "@playwright/test"

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@synclune.fr"
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "password123"
const USER_EMAIL = process.env.E2E_USER_EMAIL ?? "user2@synclune.fr"
const USER_PASSWORD = process.env.E2E_USER_PASSWORD ?? "password123"

/**
 * Authenticate via Better Auth API directly (faster than UI login).
 * Falls back to UI login if the API call fails.
 */
async function authenticateViaAPI(
	page: Page,
	email: string,
	password: string,
	storagePath: string,
) {
	const baseURL = "http://localhost:3000"

	// Try API-based auth first (much faster than UI)
	const response = await page.request.post(`${baseURL}/api/auth/sign-in/email`, {
		data: { email, password, callbackURL: "/" },
		headers: { "Content-Type": "application/json" },
	})

	if (response.ok()) {
		// Navigate to a page to ensure cookies are properly set in the browser context
		await page.goto("/")
		await page.waitForLoadState("domcontentloaded")

		// Verify we're authenticated by checking we can access /compte
		await page.goto("/compte")
		await page.waitForLoadState("domcontentloaded")

		if (!page.url().includes("/connexion")) {
			// API auth worked, save state
			await page.context().storageState({ path: storagePath })
			return
		}
	}

	// Fallback: UI-based login
	await page.goto("/connexion")
	await page.waitForLoadState("domcontentloaded")

	await page.getByRole("textbox", { name: /Email/i }).fill(email)
	await page.locator('input[type="password"]').fill(password)
	await page.getByRole("button", { name: /Se connecter/i }).click()

	await expect(page).not.toHaveURL(/\/connexion/, { timeout: 15000 })
	await page.context().storageState({ path: storagePath })
}

setup("authenticate as admin", async ({ page }) => {
	await authenticateViaAPI(page, ADMIN_EMAIL, ADMIN_PASSWORD, "e2e/.auth/admin.json")
})

setup("authenticate as user", async ({ page }) => {
	await authenticateViaAPI(page, USER_EMAIL, USER_PASSWORD, "e2e/.auth/user.json")
})
