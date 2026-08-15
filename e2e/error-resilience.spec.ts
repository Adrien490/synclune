import { test, expect } from "./fixtures";

test.describe("Resilience aux erreurs", { tag: ["@critical"] }, () => {
	test("la page 404 affiche un message utilisateur", async ({ page }) => {
		// ⚠️ PPR : statut 200 (shell streamé), le CONTENU fait foi (cf. lot 5).
		await page.goto("/page-inexistante-xyz");
		await page.waitForLoadState("domcontentloaded");

		const heading = page.getByRole("heading");
		await expect(heading.first()).toBeVisible();

		// Should offer navigation back
		const homeLink = page.getByRole("link", { name: /accueil|retour|boutique/i });
		await expect(homeLink.first()).toBeVisible();
	});

	test("une route API inexistante ne rend pas de contenu applicatif", async ({ page }) => {
		// Le proxy default-deny redirige les /api inconnues vers l'accueil.
		await page.goto("/api/nonexistent-route");
		await expect(page.locator("main").first()).toBeAttached();
	});

	test("les pages critiques ne retournent pas d'erreur 500", async ({ page }) => {
		const criticalPages = ["/", "/produits", "/collections", "/admin/connexion"];

		for (const route of criticalPages) {
			const response = await page.goto(route);
			expect(
				response?.status(),
				`${route} returned ${response?.status()}, expected < 500`,
			).toBeLessThan(500);
		}
	});

	test("un produit inexistant affiche une page 404", async ({ page }) => {
		// PPR : statut 200 (shell streamé) et URL inchangée — c'est le CONTENU
		// 404 du segment `/creations/[slug]` qui fait foi.
		await page.goto("/creations/produit-inexistant-xyz-12345");
		await expect(page.getByRole("heading", { name: /n'existe plus/i })).toBeVisible();
	});

	test("une collection inexistante affiche une page 404", async ({ page }) => {
		// Même logique PPR : contenu 404 du segment `/collections/[slug]`.
		await page.goto("/collections/collection-inexistante-xyz");
		await expect(page.getByRole("heading", { name: /n'existe pas/i })).toBeVisible();
	});

	// l'ajout panier est une Server Action, pas un appel /api — test retiré, il passait pour la mauvaise raison

	/*
	 * Retiré : « les erreurs reseau sur la recherche sont gerees gracieusement ».
	 * Le test interceptait `**​/api/search**`, or la recherche passe par une Server
	 * Action (`modules/products/actions/quick-search.ts`) — la route ne matchait
	 * jamais, et sa seule assertion (« le h1 est toujours visible ») était vide même
	 * si elle avait matché. Ré-intercepter une Server Action est fragile (les ids
	 * d'action sont hashés au build) ; la branche d'erreur est couverte en jsdom
	 * (`isSearchError`) et par le test « Réessayer » de quick-search-content.
	 */

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
