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

		// Le panier est vide : message «Ton panier est encore vide»
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

	/**
	 * Ce test existe parce que le bouton de fermeture MANQUAIT entièrement sur la
	 * branche mobile (`DrawerContent` n'en rend pas, contrairement à
	 * `SheetContent`) et que rien ne le voyait : le déclencheur ciblé par la page
	 * object était `display:none` sous 64 rem, donc la suite ne s'ouvrait même pas
	 * sur les projets mobiles.
	 *
	 * L'assertion porte sur la SORTIE, pas sur le bouton : sur un panneau qui
	 * recouvrirait de nouveau tout le scrim, avec `handleOnly` actif, il ne
	 * resterait aucune affordance de fermeture visible.
	 */
	test("le bouton de fermeture est visible et atteignable au clavier", async ({ cartPage }) => {
		await cartPage.open();

		await expect(cartPage.closeButton).toBeVisible();
		await cartPage.closeButton.focus();
		await expect(cartPage.closeButton).toBeFocused();
	});

	test("le scrim reste tapable — le panneau ne recouvre pas tout l'écran", async ({
		page,
		cartPage,
	}) => {
		await cartPage.open();

		const panel = cartPage.dialog;
		const panelBox = await panel.boundingBox();
		const viewport = page.viewportSize();
		expect(panelBox).not.toBeNull();
		expect(viewport).not.toBeNull();

		// Au moins une bande de scrim doit rester découverte : c'est elle qui rend
		// la fermeture par tap-à-côté possible. À 100 dvh il n'en restait aucune.
		const uncovered =
			(panelBox?.y ?? 0) > 0 ||
			(panelBox?.x ?? 0) > 0 ||
			(panelBox?.x ?? 0) + (panelBox?.width ?? 0) < (viewport?.width ?? 0);
		expect(uncovered).toBe(true);
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

test.describe("Panier — reduced motion", { tag: ["@regression"] }, () => {
	// @regression sheet-reduced-motion — le panneau glisse par TRANSITION (Base UI
	// partage la propriété `transform` entre l'entrée, la sortie et le suivi du
	// doigt). Or le killswitch d'`animations.css` ne neutralise que `animation` :
	// c'est la règle `[data-slot="sheet-content"] { transition: none !important }`
	// d'`app/styles/pwa.css` qui doit couper le glissement sous réduction.
	// (Avant la migration, le même test gardait le style injecté par Vaul.)
	test("le cart sheet s'ouvre sans transition sous prefers-reduced-motion", async ({
		page,
		cartPage,
	}) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		await cartPage.open();
		// Sheet sur desktop, Drawer sur mobile : les deux slots portent la règle.
		const drawer = page
			.locator('[data-slot="sheet-content"], [data-slot="drawer-content"]')
			.first();
		await expect(drawer).toBeVisible();

		const styles = await drawer.evaluate((el) => {
			const cs = getComputedStyle(el);
			return {
				transitionProperty: cs.transitionProperty,
				animationName: cs.animationName,
			};
		});
		expect(styles.transitionProperty).toBe("none");
		expect(styles.animationName).toBe("none");
	});
});
