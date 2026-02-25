import { test as setup, expect } from "@playwright/test"

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@synclune.fr"
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "password123"
const USER_EMAIL = process.env.E2E_USER_EMAIL ?? "user2@synclune.fr"
const USER_PASSWORD = process.env.E2E_USER_PASSWORD ?? "password123"

setup("authenticate as admin", async ({ page }) => {
	await page.goto("/connexion")
	await page.waitForLoadState("domcontentloaded")

	await page.getByRole("textbox", { name: /Email/i }).fill(ADMIN_EMAIL)
	await page.locator('input[type="password"]').fill(ADMIN_PASSWORD)
	await page.getByRole("button", { name: /Se connecter/i }).click()

	// Wait for successful redirect away from login
	await expect(page).not.toHaveURL(/\/connexion/, { timeout: 15000 })

	await page.context().storageState({ path: "e2e/.auth/admin.json" })
})

setup("authenticate as user", async ({ page }) => {
	await page.goto("/connexion")
	await page.waitForLoadState("domcontentloaded")

	await page.getByRole("textbox", { name: /Email/i }).fill(USER_EMAIL)
	await page.locator('input[type="password"]').fill(USER_PASSWORD)
	await page.getByRole("button", { name: /Se connecter/i }).click()

	// Wait for successful redirect away from login
	await expect(page).not.toHaveURL(/\/connexion/, { timeout: 15000 })

	await page.context().storageState({ path: "e2e/.auth/user.json" })
})
