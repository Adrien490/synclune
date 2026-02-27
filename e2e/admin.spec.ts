import { test, expect } from "./fixtures"

test.describe("Acces admin - protection des routes", { tag: ["@critical"] }, () => {
	test("toutes les routes admin redirigent vers connexion pour les non-authentifies", async ({ page }) => {
		const adminRoutes = [
			"/admin",
			"/admin/catalogue/produits",
			"/admin/ventes/commandes",
			"/admin/marketing",
		]

		for (const route of adminRoutes) {
			await page.goto(route)
			await page.waitForLoadState("domcontentloaded")

			const url = page.url()
			expect(url, `${route} should redirect to connexion`).toMatch(/\/connexion/)
		}
	})

	test("la redirection depuis /admin inclut le callbackURL", async ({ page }) => {
		await page.goto("/admin")
		await page.waitForLoadState("domcontentloaded")

		const url = page.url()
		expect(url).toMatch(/callbackURL.*admin|connexion/)
	})

	test("la page de connexion affiche le formulaire apres la redirection depuis /admin", async ({ page, authPage }) => {
		await page.goto("/admin")
		await page.waitForLoadState("domcontentloaded")

		await expect(page).toHaveURL(/\/connexion/)
		await expect(page).toHaveTitle(/Connexion.*Synclune|Synclune.*Connexion/i)

		await expect(authPage.emailInput).toBeVisible()
	})
})
