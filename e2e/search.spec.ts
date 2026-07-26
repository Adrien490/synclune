import { VIEWPORTS, requireSeedData } from "./constants";
import { test, expect } from "./fixtures";

/**
 * Recherche produits — champ inline de `/produits`.
 *
 * ⚠️ Ce champ vit dans une toolbar `hidden md:flex` (`product-catalog.tsx`) :
 * `SearchPage.open()` épingle donc le viewport desktop. Les anciens
 * `test.skip(inputCount === 0)` désactivaient silencieusement TOUTE cette
 * couverture `@critical` sur mobile-chrome / mobile-webkit ; l'entrée mobile
 * réelle (barre de tri → dialog) est couverte par le dernier test du fichier.
 */
test.describe("Recherche produits", { tag: ["@critical"] }, () => {
	test("le champ de recherche est visible sur la page produits", async ({ searchPage }) => {
		await searchPage.open();

		await expect(searchPage.searchInput.first()).toBeVisible();
	});

	test("la recherche met a jour les resultats", async ({ searchPage }) => {
		await searchPage.open();

		await searchPage.search("bague");

		// Either products or empty state should be visible
		const results = await searchPage.getResults();
		const emptyState = searchPage.page.getByText(/aucun (résultat|produit)/i);

		await expect(results.first().or(emptyState)).toBeVisible({ timeout: 5000 });
	});

	test("la recherche sans resultats affiche un etat vide", async ({ searchPage }) => {
		await searchPage.open();

		await searchPage.search("xyznonexistent12345");

		const emptyState = searchPage.page.getByText(/aucun (résultat|produit)/i);
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
		await searchPage.clearSearch();

		// URL should no longer contain search param
		await expect(searchPage.page).not.toHaveURL(/search=/, { timeout: 5000 });
	});

	test("sur mobile, la barre de tri ouvre le dialog et la recherche aboutit", async ({ page }) => {
		// Il n'y a PAS de champ inline sous md — l'entrée mobile de `/produits` est
		// le bouton « Rechercher » de `ProductSortBar`, qui ouvre le quick search.
		await page.setViewportSize(VIEWPORTS.MOBILE);
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		await page
			.getByRole("button", { name: /ouvrir la recherche/i })
			.first()
			.click();
		await expect(page.getByRole("dialog")).toBeVisible();

		const input = page.getByRole("combobox", { name: /rechercher un bijou/i });
		await input.fill("bague");
		await page.keyboard.press("Enter");

		await expect(page).toHaveURL(/\/produits\?search=bague/i, { timeout: 5000 });
	});
});
