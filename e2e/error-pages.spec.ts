import { test, expect } from "./fixtures";

test.describe("Pages d'erreur", { tag: ["@regression"] }, () => {
	test("une URL inexistante affiche la page 404", async ({ page }) => {
		const response = await page.goto("/page-inexistante-e2e-test-xyz");

		// In dev mode, Next.js may return 200 for not-found pages
		const status = response?.status();
		expect(status === 404 || status === 200).toBe(true);

		// Should show error content
		const body = await page.textContent("body");
		expect(body).toMatch(/404|introuvable|n'existe pas|page non trouvée/i);
	});

	test("la page 404 contient un lien vers l'accueil", async ({ page }) => {
		await page.goto("/page-inexistante-e2e-test-xyz");

		const homeLink = page
			.getByRole("link", { name: /accueil|retour/i })
			.or(page.getByRole("link", { name: /boutique/i }));
		await expect(homeLink.first()).toBeVisible();
	});

	test("la page d'erreur auth gère les erreurs de connexion", async ({ page }) => {
		// Navigate to auth error page with error param
		await page.goto("/connexion?error=unknown");
		await page.waitForLoadState("domcontentloaded");

		// Should show the login page (potentially with error message)
		const heading = page.getByRole("heading", { level: 1 });
		await expect(heading).toBeVisible();
	});

	test("un produit inexistant affiche une erreur", async ({ page }) => {
		const response = await page.goto("/creations/produit-inexistant-e2e-xyz");

		// Should show 404 or error page
		const status = response?.status();
		expect(status === 404 || status === 200).toBe(true);

		if (status === 200) {
			// If 200, should show a "not found" message in the page
			const body = await page.textContent("body");
			expect(body).toMatch(/introuvable|n'existe|pas trouvé|erreur/i);
		}
	});

	test("une collection inexistante affiche une erreur", async ({ page }) => {
		const response = await page.goto("/collections/collection-inexistante-e2e-xyz");

		const status = response?.status();
		expect(status === 404 || status === 200).toBe(true);

		if (status === 200) {
			const body = await page.textContent("body");
			expect(body).toMatch(/introuvable|n'existe|pas trouvé|erreur/i);
		}
	});

	test("la page 404 ne contient pas d'erreurs JS dans la console", async ({ page }) => {
		const consoleErrors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				consoleErrors.push(msg.text());
			}
		});

		await page.goto("/page-inexistante-e2e-test-xyz");
		await page.waitForLoadState("domcontentloaded");

		// Filter out expected errors (like favicon 404)
		const unexpectedErrors = consoleErrors.filter(
			(err) => !err.includes("favicon") && !err.includes("404"),
		);
		expect(unexpectedErrors.length, `Console errors found: ${unexpectedErrors.join("\n")}`).toBe(0);
	});

	/*
	 * L'assertion précédente était `expect(isOnAdmin || isOnLogin).toBe(true)` :
	 * l'URL contient forcément `/admin` (on vient d'y naviguer) OU `/connexion`.
	 * Le seul moyen d'échouer aurait été une redirection vers une troisième URL —
	 * le test ne vérifiait donc PAS que l'accès était refusé.
	 *
	 * On vérifie maintenant le refus lui-même : un visiteur non authentifié ne doit
	 * jamais voir le contenu admin.
	 */
	test("les routes admin protégées ne servent pas le contenu à un visiteur", async ({ page }) => {
		await page.goto("/admin/catalogue/produits");
		await page.waitForLoadState("domcontentloaded");

		// Redirigé hors de l'admin, ou resté sur /admin sans en servir le contenu.
		const url = page.url();
		if (url.includes("/admin")) {
			// Pas de shell admin rendu : ni sidebar, ni table produits.
			await expect(page.getByRole("navigation", { name: /administration/i })).toHaveCount(0);
			await expect(page.getByRole("button", { name: /Nouveau produit/i })).toHaveCount(0);
		} else {
			expect(url).toMatch(/\/connexion/);
		}
	});

	test("un 404 admin garde le chrome admin et non celui de la boutique", async ({ page }) => {
		/*
		 * `app/admin/not-found.tsx` — ajouté par l'audit « Système de feedback ».
		 * Avant, `notFound()` (atteignable sur chaque détail `[slug]`/`[id]`)
		 * retombait sur `app/not-found.tsx`, stylé boutique, avec des CTA vers `/` et
		 * `/produits` : l'admin perdait son shell et sa navigation.
		 *
		 * Test volontairement tolérant à l'authentification : non connecté, on est
		 * redirigé et il n'y a rien à vérifier (skip explicite plutôt qu'un faux
		 * vert).
		 */
		await page.goto("/admin/catalogue/produits/slug-inexistant-e2e-xyz");
		await page.waitForLoadState("domcontentloaded");

		test.skip(!page.url().includes("/admin"), "Non authentifié — 404 admin non atteignable");

		const body = await page.textContent("body");
		expect(body).toMatch(/n'existe pas|introuvable/i);

		// Le CTA doit ramener au tableau de bord, PAS à la boutique.
		await expect(page.getByRole("link", { name: /tableau de bord/i })).toBeVisible();
		await expect(page.getByRole("link", { name: /^Voir toutes les créations$/i })).toHaveCount(0);
	});
});
