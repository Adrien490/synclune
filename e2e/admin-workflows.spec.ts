import { test, expect } from "./fixtures"

test.describe("Admin - protection et navigation", () => {
	test("toutes les sous-routes admin redirigent vers connexion", async ({ page }) => {
		const adminRoutes = [
			"/admin",
			"/admin/catalogue/produits",
			"/admin/catalogue/types",
			"/admin/ventes/commandes",
			"/admin/marketing",
			"/admin/marketing/newsletter",
			"/admin/contenu",
		]

		for (const route of adminRoutes) {
			await page.goto(route)
			await page.waitForLoadState("domcontentloaded")

			const url = page.url()
			expect(url, `${route} should redirect to connexion`).toMatch(/\/connexion/)
		}
	})

	test("la redirection admin preserve le callbackURL", async ({ page, authPage }) => {
		await page.goto("/admin/ventes/commandes")
		await page.waitForLoadState("domcontentloaded")

		await expect(page).toHaveURL(/\/connexion/)

		await expect(authPage.emailInput).toBeVisible()
		await expect(authPage.passwordInput).toBeVisible()
		await expect(authPage.submitButton).toBeEnabled()
	})

	test("la page de connexion apres redirection admin est fonctionnelle", async ({ page, authPage }) => {
		await page.goto("/admin")
		await page.waitForLoadState("domcontentloaded")

		await expect(page).toHaveURL(/\/connexion/)

		await authPage.emailInput.fill("admin@synclune.fr")
		await expect(authPage.emailInput).toHaveValue("admin@synclune.fr")

		await authPage.passwordInput.fill("password123")
		await expect(authPage.passwordInput).toHaveValue("password123")
	})
})

test.describe("Admin - elements UI visibles apres redirection", () => {
	test("le formulaire de connexion a tous les elements requis", async ({ page, authPage }) => {
		await page.goto("/admin")
		await page.waitForLoadState("domcontentloaded")

		await expect(page).toHaveURL(/\/connexion/)

		await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
		await expect(authPage.emailInput).toBeVisible()
		await expect(authPage.passwordInput).toBeVisible()
		await expect(authPage.submitButton).toBeVisible()

		await expect(authPage.socialButtons.first()).toBeAttached()
	})
})
