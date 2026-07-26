import { test, expect } from "./fixtures";

test.describe("Panier", { tag: ["@critical"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");
	});

	test("le bouton panier est présent dans la navbar", { tag: ["@smoke"] }, async ({ cartPage }) => {
		await expect(cartPage.openButton).toBeVisible();
	});

	test("cliquer sur le bouton panier ouvre le cart sheet", async ({ cartPage }) => {
		await cartPage.open();

		// Le titre «Mon panier» doit être présent
		await expect(cartPage.title).toBeVisible();
	});

	test("le panier vide affiche un message d'état vide", async ({ cartPage }) => {
		await cartPage.open();

		// Le panier est vide: message «Votre panier est vide»
		await expect(cartPage.emptyMessage).toBeVisible();
	});

	test("le panier vide propose un lien vers la boutique", async ({ cartPage }) => {
		await cartPage.open();

		await expect(cartPage.shopLink).toBeVisible();
		await expect(cartPage.shopLink).toHaveAttribute("href", "/produits");
	});

	test("le panier vide propose un lien vers les collections", async ({ cartPage }) => {
		await cartPage.open();

		await expect(cartPage.collectionsLink).toBeVisible();
		await expect(cartPage.collectionsLink).toHaveAttribute("href", "/collections");
	});

	test("le cart sheet se ferme via le bouton de fermeture", async ({ cartPage }) => {
		await cartPage.open();
		await cartPage.close();
	});

	test("le cart sheet se ferme avec la touche Escape", async ({ page, cartPage }) => {
		await cartPage.open();

		// Appuyer sur Escape
		await page.keyboard.press("Escape");

		// Le sheet doit être fermé
		await expect(cartPage.dialog).not.toBeVisible();
	});

	// Le retour matériel est la seule partie de la machinerie d'overlay qui n'est
	// pas testable en jsdom : `history.pushState` / `back()` y sont mockés, donc
	// la pile d'historique réelle n'existe pas. Audit « Overlays » 2026-07-26.

	test("le retour navigateur ferme le cart sheet au lieu de quitter la page", async ({
		page,
		cartPage,
	}) => {
		await cartPage.open();

		await page.goBack();

		await expect(cartPage.dialog).not.toBeVisible();
		await expect(page).toHaveURL("/");
	});

	// @regression overlay-history-entry — fermer par la croix reprend l'entrée
	// d'historique poussée à l'ouverture. Sans ça, elle restait enterrée avec la
	// MÊME URL que la page : le retour suivant n'affichait rien et l'utilisateur
	// devait appuyer deux fois (une pression morte par cycle ouvrir/fermer).
	test("fermer le sheet n'avale pas la pression suivante sur le retour", async ({
		page,
		cartPage,
	}) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		await cartPage.open();
		await cartPage.close();

		await page.goBack();

		await expect(page).toHaveURL("/");
	});

	test("l'attribut aria-expanded du bouton panier reflète l'état du sheet", async ({
		cartPage,
	}) => {
		// Initialement fermé
		await expect(cartPage.openButton).toHaveAttribute("aria-expanded", "false");

		// Ouvrir le sheet
		await cartPage.openButton.click();
		await expect(cartPage.openButton).toHaveAttribute("aria-expanded", "true");
	});

	test("le badge panier affiche 0 ou aucun badge quand le panier est vide", async ({
		cartPage,
	}) => {
		await expect(cartPage.openButton).toBeVisible();

		const badgeText = await cartPage.openButton.textContent();
		const numbers = badgeText?.match(/\d+/);
		const count = numbers ? parseInt(numbers[0], 10) : 0;
		expect(count).toBe(0);
	});
});
