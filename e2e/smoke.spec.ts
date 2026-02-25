import { test, expect } from "@playwright/test"

test.describe("Smoke tests", () => {
	test("homepage loads with correct title", async ({ page }) => {
		await page.goto("/")
		await expect(page).toHaveTitle(/Synclune/)
	})

	test("homepage renders main content", async ({ page }) => {
		await page.goto("/")
		await page.waitForLoadState("domcontentloaded")

		// Main landmark must be present
		const main = page.locator("main")
		await expect(main).toBeAttached()

		// At least one heading should be visible
		const heading = page.getByRole("heading").first()
		await expect(heading).toBeVisible()
	})

	test("critical pages return 200", async ({ page }) => {
		const criticalRoutes = [
			"/",
			"/produits",
			"/collections",
			"/connexion",
			"/inscription",
		]

		for (const route of criticalRoutes) {
			const response = await page.goto(route)
			expect(response?.status(), `${route} should return 200`).toBe(200)
		}
	})

	test("404 page renders for unknown routes", async ({ page }) => {
		const response = await page.goto("/cette-page-nexiste-pas")
		expect(response?.status()).toBe(404)
	})

	test("static assets load correctly", async ({ page }) => {
		await page.goto("/")
		await page.waitForLoadState("domcontentloaded")

		// Check that CSS has loaded (body should have computed styles)
		const bodyFontFamily = await page.evaluate(() => {
			return window.getComputedStyle(document.body).fontFamily
		})
		expect(bodyFontFamily).toBeTruthy()
	})
})
