import { test, expect } from "./fixtures"

test.describe("Resilience aux erreurs", () => {
	test("la page 404 affiche un message utilisateur", async ({ page }) => {
		const response = await page.goto("/page-inexistante-xyz")
		await page.waitForLoadState("domcontentloaded")

		expect(response?.status()).toBe(404)

		const heading = page.getByRole("heading")
		await expect(heading.first()).toBeVisible()

		// Should offer navigation back
		const homeLink = page.getByRole("link", { name: /accueil|retour|boutique/i })
		await expect(homeLink.first()).toBeVisible()
	})

	test("une route API inexistante retourne 404", async ({ page }) => {
		const response = await page.goto("/api/nonexistent-route")
		expect(response?.status()).toBe(404)
	})

	test("les pages critiques ne retournent pas d'erreur 500", async ({ page }) => {
		const criticalPages = [
			"/",
			"/produits",
			"/collections",
			"/connexion",
			"/inscription",
			"/mot-de-passe-oublie",
			"/personnalisation",
		]

		for (const route of criticalPages) {
			const response = await page.goto(route)
			expect(
				response?.status(),
				`${route} returned ${response?.status()}, expected < 500`,
			).toBeLessThan(500)
		}
	})

	test("un produit inexistant affiche une page 404", async ({ page }) => {
		const response = await page.goto("/creations/produit-inexistant-xyz-12345")
		await page.waitForLoadState("domcontentloaded")

		// Should return 404 or redirect
		const status = response?.status()
		expect(status === 404 || page.url() !== "http://localhost:3000/creations/produit-inexistant-xyz-12345").toBe(true)
	})

	test("une collection inexistante affiche une page 404", async ({ page }) => {
		const response = await page.goto("/collections/collection-inexistante-xyz")
		await page.waitForLoadState("domcontentloaded")

		const status = response?.status()
		expect(status === 404 || page.url() !== "http://localhost:3000/collections/collection-inexistante-xyz").toBe(true)
	})

	test("les erreurs reseau sont gerees gracieusement lors de l'ajout au panier", async ({ page, productCatalogPage }) => {
		await productCatalogPage.goto()

		const productCount = await productCatalogPage.productLinks.count()
		test.skip(productCount === 0, "Seed data required")

		await productCatalogPage.gotoFirstProduct()

		const addButtonCount = await productCatalogPage.addToCartButton.count()
		test.skip(addButtonCount === 0, "Product requires SKU selection")

		// Intercept cart API to simulate failure
		await page.route("**/api/**", (route) => {
			if (route.request().method() === "POST") {
				route.abort("connectionrefused")
			} else {
				route.continue()
			}
		})

		await productCatalogPage.addToCartButton.first().click()

		// Should show error feedback, not crash
		await page.waitForTimeout(2000)

		// Page should still be interactive (not frozen)
		const heading = page.getByRole("heading", { level: 1 })
		await expect(heading).toBeVisible()

		// Restore routes for subsequent tests
		await page.unroute("**/api/**")
	})

	test("la navigation fonctionne apres une erreur", async ({ page }) => {
		// Trigger a 404
		await page.goto("/page-inexistante-xyz")
		await page.waitForLoadState("domcontentloaded")

		// Navigate back to home
		const homeLink = page.getByRole("link", { name: /accueil|retour|boutique/i })
		if (await homeLink.first().isVisible()) {
			await homeLink.first().click()
		} else {
			await page.goto("/")
		}

		await page.waitForLoadState("domcontentloaded")
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
	})
})
