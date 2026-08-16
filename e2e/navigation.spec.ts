import { test, expect } from "./fixtures";

test.describe("Navigation principale", { tag: ["@critical"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");
	});

	test("la homepage charge avec navbar, étal et footer", { tag: ["@smoke"] }, async ({ page }) => {
		// Le titre de la page doit contenir Synclune
		await expect(page).toHaveTitle(/Synclune/);

		// `exact: true` : sur mobile, « Navigation principale de la boutique »
		// (bottom-nav) matche aussi le nom en mode non-exact — strict violation.
		const navbar = page.getByRole("navigation", { name: "Navigation principale", exact: true });
		await expect(navbar).toBeVisible();

		// Ancre de la home réintroduite avec le premier écran « L'étal »
		// (2026-08-04) : le bloc titre est rendu hors de la frontière Suspense
		// de la grille, il est donc là même catalogue vide.
		const etal = page.locator("#hero");
		await expect(etal).toBeVisible();
		await expect(etal.getByRole("heading", { level: 1 })).toHaveText(/Des bijoux colorés/);

		const footer = page.getByRole("contentinfo");
		await expect(footer).toBeAttached();
	});

	test("le logo de la navbar est un lien vers l'accueil", async ({ page }) => {
		// Le nom accessible vient du gabarit unique `brandLinkLabel("/")`
		// (« Synclune - Accueil », logo.tsx) — plus précis que l'ancien CSS
		// `nav a[href="/"]`, qui matchait n'importe quel lien vers l'accueil.
		// `.filter({ visible: true })` : le logo existe en variantes masquées
		// selon le viewport.
		const logoLink = page
			.getByRole("link", { name: "Synclune - Accueil", exact: true })
			.filter({ visible: true })
			.first();
		await expect(logoLink).toBeVisible();
		await expect(logoLink).toHaveAttribute("href", "/");
	});

	test("la navbar contient les liens de navigation desktop", async ({ page }) => {
		// Les créations
		const creationsLink = page.getByRole("link", { name: /Les créations/i }).first();
		await expect(creationsLink).toBeVisible();

		// Les collections
		const collectionsLink = page.getByRole("link", { name: /Les collections/i }).first();
		await expect(collectionsLink).toBeVisible();
	});

	test("la navbar contient les icônes d'action (favoris, panier)", async ({ page, cartPage }) => {
		// Icône favoris — navbar sur desktop (« Accéder à mes favoris »),
		// onglet « Favoris » de la bottom-nav sur mobile.
		const favoritesLink = page
			.getByRole("link", { name: /Accéder à mes favoris/i })
			.or(page.getByRole("link", { name: /^Favoris/ }))
			.filter({ visible: true })
			.first();
		await expect(favoritesLink).toBeVisible();

		// Bouton panier
		await expect(cartPage.openButton).toBeVisible();
	});

	test("navigation vers /produits", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		// Vérifier que la page est chargée en cherchant un header de page
		await expect(page).toHaveURL(/\/produits/);

		// La page doit contenir du contenu
		const main = page.locator("main, [role='main']").first();
		await expect(main).toBeVisible();
	});

	test("navigation vers /collections", async ({ page }) => {
		await page.goto("/collections");
		await page.waitForLoadState("domcontentloaded");

		await expect(page).toHaveURL(/\/collections/);
	});

	test("navigation depuis la navbar vers /produits", async ({ page, isMobile }) => {
		// Sur appareil TACTILE (projets mobile-*, même avec le viewport desktop
		// forcé), le premier tap sur le trigger du mega-menu OUVRE le panneau au
		// lieu de naviguer — comportement produit voulu (cf. mega-menu-desktop).
		test.skip(isMobile, "Pas de survol sur tactile : le premier tap ouvre le panneau");
		// Cliquer sur le lien «Les créations» dans la navbar desktop
		// On attend un écran desktop pour le test
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// ⚠️ « Les créations » est le DÉCLENCHEUR du méga-menu (un bouton), pas un
		// lien : quand des types de produits existent, `getDesktopNavItems` pose
		// `hasDropdown` (shared/constants/navigation.ts). Le lien vers le catalogue
		// est « Toutes les créations », DANS le panneau. Chercher un rôle `link`
		// nommé « Les créations » expirait donc au bout de 30 s.
		const mainNav = page.getByRole("navigation", { name: "Navigation principale", exact: true });
		const creationsTrigger = mainNav.getByRole("button", { name: /Les créations/i }).first();
		await expect(creationsTrigger).toBeVisible({ timeout: 15_000 });
		await creationsTrigger.click();

		const allCreationsLink = page.getByRole("link", { name: "Toutes les créations", exact: true });
		await expect(allCreationsLink).toBeVisible({ timeout: 10_000 });
		await allCreationsLink.click();

		await page.waitForLoadState("domcontentloaded");
		await expect(page).toHaveURL(/\/produits/);
	});

	test("le menu mobile s'ouvre et se ferme", async ({ page }) => {
		// Réduire la fenêtre pour activer le mobile
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// Le bouton burger doit être visible sur mobile.
		// ⚠️ Le nom accessible est « Menu de navigation » (et « Fermer le menu de
		// navigation » à l'état ouvert) — PAS « Ouvrir le menu… », qui n'a jamais
		// existé côté boutique et laissait ce test échouer au timeout.
		const menuButton = page.getByRole("button", { name: /Menu de navigation/i });
		await expect(menuButton).toBeVisible();

		// Ouvrir le menu
		await menuButton.click();

		// Le dialog du menu doit s'ouvrir (SheetContent = role dialog)
		const menuDialog = page.getByRole("dialog");
		await expect(menuDialog).toBeVisible();

		// Le menu doit contenir les items de navigation.
		// ⚠️ `exact: true` : en regex, `/Accueil/i` matcherait AUSSI le lien de marque
		// du panneau, dont le nom accessible est « Synclune - Accueil » (gabarit unique
		// `brandLinkLabel()`) — deux éléments, donc violation du strict mode.
		await expect(menuDialog.getByRole("link", { name: "Accueil", exact: true })).toBeVisible();

		// Fermer par Échap. Le bouton « × » du SheetContent existe (rétabli le
		// 2026-08-04 — le panneau recouvre le burger au doigt, cf. menu-sheet.tsx),
		// mais Échap est le chemin CLAVIER, et c'est celui qui doit rester garanti.
		await page.keyboard.press("Escape");

		// Le menu doit être fermé
		await expect(menuDialog).not.toBeVisible();
	});

	test("le footer est présent avec les liens de navigation", async ({ page }) => {
		// Pas de scrollIntoViewIfNeeded : `toBeAttached` n'exige pas le viewport,
		// et le scroll levait « Element is not attached to the DOM » quand un
		// re-rendu (hydratation streamée) recréait le nœud sous lui.
		const footer = page.getByRole("contentinfo");
		await expect(footer).toBeAttached();

		// Le footer doit contenir un lien vers les créations
		const footerCreationsLink = footer.getByRole("link", { name: /Les créations/i });
		await expect(footerCreationsLink).toBeAttached();
	});

	test("le footer contient les liens légaux", async ({ page }) => {
		const footer = page.getByRole("contentinfo");
		await expect(footer).toBeAttached();

		// Liens légaux
		const cgvLink = footer.getByRole("link", { name: /CGV/i });
		await expect(cgvLink).toBeAttached();

		const mentionsLink = footer.getByRole("link", { name: /Mentions légales/i });
		await expect(mentionsLink).toBeAttached();

		// Le libellé VISIBLE est « Confidentialité » depuis la refonte du footer
		// (2026-08-04) ; c'est le nom accessible qui porte la forme longue
		// (« Confidentialité — Politique de confidentialité », WCAG 2.5.3). Ce
		// sélecteur cible bien le nom accessible : raccourcir l'`ariaLabel` de
		// `legalLinks` casserait ce test, et c'est voulu.
		const confidentialiteLink = footer.getByRole("link", { name: /Politique de confidentialité/i });
		await expect(confidentialiteLink).toBeAttached();
	});

	test("le footer affiche les informations de contact", async ({ page }) => {
		const footer = page.getByRole("contentinfo");

		// Le footer doit contenir un lien email
		const emailLink = footer.locator('a[href^="mailto:"]');
		await expect(emailLink).toBeAttached();
	});

	test("le footer contient les icônes de moyens de paiement", async ({ page }) => {
		const footer = page.getByRole("contentinfo");

		// La liste des moyens de paiement doit être présente
		const paymentList = footer.getByRole("list", { name: /Moyens de paiement/i });
		await expect(paymentList).toBeAttached();
	});
});
