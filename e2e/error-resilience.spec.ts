import { test, expect } from "./fixtures";

test.describe("Resilience aux erreurs", { tag: ["@critical"] }, () => {
	test("un segment inexistant affiche la 404 avec un message utilisateur", async ({ page }) => {
		// ⚠️ Une route de PREMIER NIVEAU inconnue tombe dans le default-deny du
		// proxy (307 vers `/`) : l'ancien `/page-inexistante-xyz` faisait donc
		// passer les assertions… sur la homepage. Seul un segment public dynamique
		// rend le vrai contenu 404 — PPR : statut 200 (shell streamé), le CONTENU
		// fait foi (cf. CLAUDE.md § Testing).
		await page.goto("/creations/produit-inexistant-resilience-xyz");
		await expect(page.getByRole("heading", { name: /n'existe plus/i })).toBeVisible();

		// Should offer navigation back
		const homeLink = page.getByRole("link", { name: /Retour à l'accueil/i });
		await expect(homeLink).toBeVisible();
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

	// l'ajout panier est une Server Action, pas un appel /api — la panne réelle
	// (POST de Server Action en 500) est couverte dans error-scenarios-advanced.

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
		// Une vraie 404 de segment (pas la redirection proxy du premier niveau).
		await page.goto("/creations/produit-inexistant-navigation-xyz");

		// Chemin DÉTERMINISTE : le lien « Retour à l'accueil » de la 404 segment
		// existe toujours (l'ancien if/else menait au même état par deux chemins,
		// donc ne testait rien de précis).
		const homeLink = page.getByRole("link", { name: /Retour à l'accueil/i });
		await expect(homeLink).toBeVisible();
		await homeLink.click();

		await expect(page).toHaveURL(/\/$/);
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
	});

	/*
	 * Retiré le 2026-08-16 : « un reseau lent ne bloque pas le rendu initial ».
	 * Il retardait `**​/api/**` — un canal que la homepage n'appelle pas (tout est
	 * SSR + Server Actions) : le délai ne s'appliquait jamais et le test mesurait
	 * un chargement normal. La lenteur RÉELLE du canal mutation (Server Action
	 * retardée → état d'attente exposé) est couverte dans
	 * error-scenarios-advanced.spec.ts via `delayServerActions`.
	 */
});
