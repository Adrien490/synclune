import { test, expect } from "./fixtures";

/**
 * Pages d'erreur — les VRAIES 404 de segment.
 *
 * ⚠️ Réécrit le 2026-08-16 : une URL inconnue de PREMIER NIVEAU
 * (`/page-inexistante-xyz`) ne rend PAS de 404 — le proxy default-deny la
 * redirige en 307 vers `/`. Les anciens tests asservaient donc leurs
 * assertions à la homepage (et `expect(status === 404 || status === 200)`
 * acceptait n'importe quoi). Le contenu 404 n'existe que sous les segments
 * publics dynamiques : `/creations/[slug]`, `/collections/[slug]`,
 * `/produits/[productTypeSlug]`. PPR : le statut HTTP reste 200 (shell
 * streamé), on assert le CONTENU (cf. CLAUDE.md § Testing).
 */
test.describe("Pages d'erreur", { tag: ["@regression"] }, () => {
	test("un produit inexistant affiche la 404 du segment créations", async ({ page }) => {
		await page.goto("/creations/produit-inexistant-e2e-xyz");

		await expect(page.getByRole("heading", { name: /n'existe plus/i })).toBeVisible();
		// Les deux sorties réelles de la page.
		await expect(page.getByRole("link", { name: /Découvrir mes créations/i })).toBeVisible();
		await expect(page.getByRole("link", { name: /Retour à l'accueil/i })).toBeVisible();
	});

	test("une collection inexistante affiche la 404 du segment collections", async ({ page }) => {
		await page.goto("/collections/collection-inexistante-e2e-xyz");

		await expect(page.getByRole("heading", { name: /n'existe pas/i })).toBeVisible();
		await expect(page.getByRole("link", { name: /Retour à l'accueil/i })).toBeVisible();
	});

	test("une catégorie inexistante affiche la 404 du segment produits", async ({ page }) => {
		await page.goto("/produits/categorie-inexistante-e2e-xyz");

		await expect(page.getByRole("heading", { name: /n'existe pas/i })).toBeVisible();
		await expect(page.getByRole("link", { name: /Retour à l'accueil/i })).toBeVisible();
	});

	test("une URL de premier niveau inconnue est renvoyée vers l'accueil", async ({ page }) => {
		// Le default-deny du proxy est le comportement ATTENDU ici — pas une 404.
		await page.goto("/page-inexistante-e2e-test-xyz");
		await expect(page).toHaveURL(/\/$/);
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
	});

	test("la page de connexion admin est servie", async ({ page }) => {
		const response = await page.goto("/admin/connexion");
		await page.waitForLoadState("domcontentloaded");

		expect(response?.status()).toBe(200);
		await expect(page.getByRole("heading", { level: 1, name: /Connexion/i })).toBeVisible();
	});

	test("la page 404 de segment ne contient pas d'erreurs JS dans la console", async ({ page }) => {
		const consoleErrors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				consoleErrors.push(msg.text());
			}
		});

		await page.goto("/creations/produit-inexistant-e2e-console-xyz");
		await expect(page.getByRole("heading", { name: /n'existe plus/i })).toBeVisible();

		// Filter out expected errors : favicon, 404, et les images picsum du seed
		// refusées par l'optimiseur en PROD (hôte autorisé en dev seulement —
		// le seed conforme à la DA du lot 8 remplace ces visuels).
		const unexpectedErrors = consoleErrors.filter(
			(err) => !err.includes("favicon") && !err.includes("404") && !err.includes("status of 400"),
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
});
