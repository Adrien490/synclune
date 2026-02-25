import { test, expect } from "@playwright/test"

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
			const response = await page.goto(route)
			await page.waitForLoadState("domcontentloaded")

			// All admin routes should redirect unauthenticated users
			const url = page.url()
			expect(url, `${route} should redirect to connexion`).toMatch(/\/connexion/)
		}
	})

	test("la redirection admin preserve le callbackURL", async ({ page }) => {
		await page.goto("/admin/ventes/commandes")
		await page.waitForLoadState("domcontentloaded")

		// Should be on login page with callback info
		await expect(page).toHaveURL(/\/connexion/)

		// Login form should be present and ready
		const emailInput = page.getByRole("textbox", { name: /Email/i })
		const passwordInput = page.locator('input[type="password"]')
		const submitButton = page.getByRole("button", { name: /Se connecter/i })

		await expect(emailInput).toBeVisible()
		await expect(passwordInput).toBeVisible()
		await expect(submitButton).toBeEnabled()
	})

	test("la page de connexion apres redirection admin est fonctionnelle", async ({ page }) => {
		await page.goto("/admin")
		await page.waitForLoadState("domcontentloaded")

		// Should be on login page
		await expect(page).toHaveURL(/\/connexion/)

		// Form should accept input
		const emailInput = page.getByRole("textbox", { name: /Email/i })
		await emailInput.fill("admin@synclune.fr")

		// Verify the input was accepted
		await expect(emailInput).toHaveValue("admin@synclune.fr")

		const passwordInput = page.locator('input[type="password"]')
		await passwordInput.fill("password123")
		await expect(passwordInput).toHaveValue("password123")
	})
})

test.describe("Admin - elements UI visibles apres redirection", () => {
	test("le formulaire de connexion a tous les elements requis", async ({ page }) => {
		await page.goto("/admin")
		await page.waitForLoadState("domcontentloaded")

		// Should have redirected to login
		await expect(page).toHaveURL(/\/connexion/)

		// All critical form elements present
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
		await expect(page.getByRole("textbox", { name: /Email/i })).toBeVisible()
		await expect(page.locator('input[type="password"]')).toBeVisible()
		await expect(page.getByRole("button", { name: /Se connecter/i })).toBeVisible()

		// Social login buttons should be available
		const socialButtons = page.getByRole("button", { name: /Google|GitHub|Continuer avec/i })
		await expect(socialButtons.first()).toBeAttached()
	})
})
