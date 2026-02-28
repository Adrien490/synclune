import { test, expect } from "./fixtures";
import { requireSeedData } from "./constants";

test.describe("Resilience aux erreurs", { tag: ["@critical"] }, () => {
	test("la page 404 affiche un message utilisateur", async ({ page }) => {
		const response = await page.goto("/page-inexistante-xyz");
		await page.waitForLoadState("domcontentloaded");

		expect(response?.status()).toBe(404);

		const heading = page.getByRole("heading");
		await expect(heading.first()).toBeVisible();

		// Should offer navigation back
		const homeLink = page.getByRole("link", { name: /accueil|retour|boutique/i });
		await expect(homeLink.first()).toBeVisible();
	});

	test("une route API inexistante retourne 404", async ({ page }) => {
		const response = await page.goto("/api/nonexistent-route");
		expect(response?.status()).toBe(404);
	});

	test("les pages critiques ne retournent pas d'erreur 500", async ({ page }) => {
		const criticalPages = [
			"/",
			"/produits",
			"/collections",
			"/connexion",
			"/inscription",
			"/mot-de-passe-oublie",
			"/personnalisation",
		];

		for (const route of criticalPages) {
			const response = await page.goto(route);
			expect(
				response?.status(),
				`${route} returned ${response?.status()}, expected < 500`,
			).toBeLessThan(500);
		}
	});

	test("un produit inexistant affiche une page 404", async ({ page }) => {
		const response = await page.goto("/creations/produit-inexistant-xyz-12345");
		await page.waitForLoadState("domcontentloaded");

		// Should return 404 or redirect
		const status = response?.status();
		expect(
			status === 404 ||
				page.url() !== "http://localhost:3000/creations/produit-inexistant-xyz-12345",
		).toBe(true);
	});

	test("une collection inexistante affiche une page 404", async ({ page }) => {
		const response = await page.goto("/collections/collection-inexistante-xyz");
		await page.waitForLoadState("domcontentloaded");

		const status = response?.status();
		expect(
			status === 404 ||
				page.url() !== "http://localhost:3000/collections/collection-inexistante-xyz",
		).toBe(true);
	});

	test("les erreurs reseau sont gerees gracieusement lors de l'ajout au panier", async ({
		page,
		productCatalogPage,
	}) => {
		await productCatalogPage.goto();

		const productCount = await productCatalogPage.productLinks.count();
		requireSeedData(test, productCount > 0, "No products found");

		await productCatalogPage.gotoFirstProduct();

		const addButtonCount = await productCatalogPage.addToCartButton.count();
		test.skip(addButtonCount === 0, "Product requires SKU selection");

		// Intercept cart API to simulate failure
		const routePattern = "**/api/**";
		await page.route(routePattern, (route) => {
			if (route.request().method() === "POST") {
				void route.abort("connectionrefused");
			} else {
				void route.continue();
			}
		});

		try {
			await productCatalogPage.addToCartButton.first().click();

			// Page should not crash - heading should remain visible
			const heading = page.getByRole("heading", { level: 1 });
			await expect(heading).toBeVisible({ timeout: 5000 });

			// Should show error feedback to the user (toast, alert, or error message)
			const errorFeedback = page
				.locator('[role="alert"]')
				.or(page.getByText(/erreur|impossible|réessayer|échoué/i));
			await expect(errorFeedback.first()).toBeVisible({ timeout: 5000 });
		} finally {
			await page.unroute(routePattern);
		}
	});

	test("les erreurs reseau sur la recherche sont gerees gracieusement", async ({
		page,
		productCatalogPage,
	}) => {
		await productCatalogPage.goto();

		const searchCount = await productCatalogPage.searchInput.count();
		test.skip(searchCount === 0, "No search input on products page");

		// Intercept search API to simulate slow then failed response
		await page.route("**/api/search**", (route) => route.abort("connectionrefused"));

		try {
			await productCatalogPage.searchInput.first().fill("bague");

			// Page should not crash
			const heading = page.getByRole("heading", { level: 1 });
			await expect(heading).toBeVisible({ timeout: 5000 });
		} finally {
			await page.unroute("**/api/search**");
		}
	});

	test("la navigation fonctionne apres une erreur", async ({ page }) => {
		// Trigger a 404
		await page.goto("/page-inexistante-xyz");
		await page.waitForLoadState("domcontentloaded");

		// Navigate back to home
		const homeLink = page.getByRole("link", { name: /accueil|retour|boutique/i });
		if (await homeLink.first().isVisible()) {
			await homeLink.first().click();
		} else {
			await page.goto("/");
		}

		await page.waitForLoadState("domcontentloaded");
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
	});

	test("un reseau lent ne bloque pas le rendu initial", async ({ page }) => {
		// Simulate slow network by delaying API responses
		await page.route("**/api/**", async (route) => {
			await new Promise((r) => setTimeout(r, 3000));
			await route.continue();
		});

		try {
			await page.goto("/");
			await page.waitForLoadState("domcontentloaded");

			// Page should render even with slow API
			const heading = page.getByRole("heading", { level: 1 });
			await expect(heading).toBeVisible({ timeout: 10000 });
		} finally {
			await page.unroute("**/api/**");
		}
	});
});
