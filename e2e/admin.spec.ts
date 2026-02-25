import { test, expect } from "./fixtures"

test.describe("Accès admin - protection des routes", () => {
	test("un utilisateur non authentifié est redirigé depuis /admin vers /connexion", async ({ page }) => {
		await page.goto("/admin")
		await page.waitForLoadState("domcontentloaded")

		await expect(page).toHaveURL(/\/connexion/)
	})

	test("la redirection depuis /admin inclut le callbackURL vers /admin", async ({ page }) => {
		await page.goto("/admin")
		await page.waitForLoadState("domcontentloaded")

		const url = page.url()
		expect(url).toMatch(/callbackURL.*admin|connexion/)
	})

	test("un utilisateur non authentifié est redirigé depuis /admin/catalogue/produits", async ({ page }) => {
		await page.goto("/admin/catalogue/produits")
		await page.waitForLoadState("domcontentloaded")

		await expect(page).toHaveURL(/\/connexion/)
	})

	test("un utilisateur non authentifié est redirigé depuis /admin/ventes/commandes", async ({ page }) => {
		await page.goto("/admin/ventes/commandes")
		await page.waitForLoadState("domcontentloaded")

		await expect(page).toHaveURL(/\/connexion/)
	})

	test("un utilisateur non authentifié est redirigé depuis /admin/marketing", async ({ page }) => {
		await page.goto("/admin/marketing")
		await page.waitForLoadState("domcontentloaded")

		await expect(page).toHaveURL(/\/connexion/)
	})

	test("la page de connexion affiche le formulaire après la redirection depuis /admin", async ({ page, authPage }) => {
		await page.goto("/admin")
		await page.waitForLoadState("domcontentloaded")

		await expect(page).toHaveURL(/\/connexion/)
		await expect(page).toHaveTitle(/Connexion.*Synclune|Synclune.*Connexion/i)

		await expect(authPage.emailInput).toBeVisible()
	})
})
