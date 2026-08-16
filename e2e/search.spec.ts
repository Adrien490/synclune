import { VIEWPORTS, requireSeedData } from "./constants";
import { test, expect } from "./fixtures";

/**
 * Recherche produits — via le QUICK-SEARCH (le champ inline du catalogue a été
 * retiré le 2026-08-06 ; l'entrée de recherche est le dialog de la navbar, la
 * sortie l'étiquette « Recherche » du bandeau de filtres).
 *
 * `SearchPage.open()` épingle le viewport desktop (déclencheur navbar) ;
 * l'entrée mobile réelle est couverte par le dernier test du fichier.
 */
test.describe("Recherche produits", { tag: ["@critical"] }, () => {
	test("le quick-search s'ouvre depuis la page produits", async ({ searchPage }) => {
		await searchPage.open();

		await expect(searchPage.searchInput).toBeVisible();
	});

	test("la recherche d'un terme du seed affiche des resultats", async ({ searchPage }) => {
		await searchPage.open();

		await searchPage.search("bague");

		// Déterministe : le seed garantit des produits pour « bague », donc on
		// asserte des RÉSULTATS — l'ancienne union « résultats OU état vide »
		// acceptait les deux issues et ne pouvait pas échouer. Le cas « aucun
		// résultat » a son propre test déterministe juste en dessous (charabia).
		const results = await searchPage.getResults();
		// La grille arrive en streaming après la navigation : on attend le premier
		// lien avant de compter (un catalogue vraiment vide coûte le timeout).
		await results
			.first()
			.waitFor({ state: "attached", timeout: 15000 })
			.catch(() => {
				/* aucun résultat : requireSeedData tranche juste après */
			});
		requireSeedData(test, (await results.count()) > 0, "produits pour la recherche « bague »");
		await expect(results.first()).toBeVisible();
	});

	test("la recherche sans resultats affiche un etat vide", async ({ searchPage }) => {
		await searchPage.open();

		await searchPage.search("xyznonexistent12345");

		// `.first()` : le message d'état vide existe en deux exemplaires (mise en
		// page mobile + desktop, l'un masqué) — strict violation sinon.
		const emptyState = searchPage.page.getByText(/aucun (résultat|produit)/i).first();
		await expect(emptyState).toBeVisible({ timeout: 5000 });
	});

	test("cliquer sur un resultat de recherche navigue vers le produit", async ({ searchPage }) => {
		await searchPage.open();

		await searchPage.search("bague");

		const results = await searchPage.getResults();
		const resultCount = await results.count();
		// Le seed garantit des produits pour « bague » : en CI, une absence est un
		// défaut de seed à faire échouer, pas un test à désactiver en silence.
		requireSeedData(test, resultCount > 0, "produits pour la recherche « bague »");

		await results.first().click();
		await expect(searchPage.page).toHaveURL(/\/creations\//);
	});

	test("effacer la recherche reinitialise les resultats", async ({ searchPage }) => {
		await searchPage.open();

		await searchPage.search("bague");
		// L'étiquette « Recherche : "bague" » du bandeau est la seule affordance
		// qui efface `?search=` depuis le retrait du champ inline.
		await searchPage.clearSearch();

		// URL should no longer contain search param
		await expect(searchPage.page).not.toHaveURL(/search=/, { timeout: 5000 });
	});

	test("sur mobile, le quick search s'ouvre et la recherche aboutit", async ({ page }) => {
		// Il n'y a aucun champ inline — l'entrée mobile de `/produits` est le
		// déclencheur quick-search (navbar / bottom-nav).
		await page.setViewportSize(VIEWPORTS.MOBILE);
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		// Sur mobile, le déclencheur quick-search est l'onglet « Rechercher » de la
		// bottom-nav (le bouton navbar « Ouvrir la recherche rapide » est desktop).
		const searchTab = page
			.getByRole("navigation", { name: /Navigation principale de la boutique/i })
			.getByRole("button", { name: /Rechercher/i });
		await expect(async () => {
			await searchTab.click();
			await expect(page.getByRole("dialog")).toBeVisible({ timeout: 1500 });
		}).toPass({ timeout: 15_000 });

		const input = page.getByRole("combobox", { name: /rechercher un bijou/i });
		await input.fill("bague");
		await page.keyboard.press("Enter");

		await expect(page).toHaveURL(/\/produits\?search=bague/i, { timeout: 5000 });
	});
});
