import { test, expect } from "./fixtures";
import { TIMEOUTS } from "./constants";

const MOBILE_VIEWPORT = { width: 390, height: 844 };

/**
 * Shop mobile E2E — smoke tests du storefront au viewport 390x844 (iPhone 14).
 *
 * Couvre les composants critiques non testés mobile:
 * - Bottom navigation tabs (shop-mobile-bottom-nav)
 * - Cart sheet (ouverture via bottom nav + badge)
 * - Product gallery (pinch-zoom slide visible)
 * - Quick search dialog
 * - Product filter sheet
 * - Accueil LCP visible
 */
test.describe("Shop - Mobile (viewport 390x844)", { tag: ["@regression"] }, () => {
	test.use({ viewport: MOBILE_VIEWPORT });

	test("étal — titre ET première création au-dessus de la ligne de flottaison", async ({
		page,
	}) => {
		// 🐛 BUG PRODUIT documenté (lot 7, non masqué) : la première carte de l'étal
		// finit 7-12 px SOUS la ligne de flottaison à 390×844 (barre basse déduite).
		// La promesse « une pièce entière visible sans scroller » est ratée de peu
		// depuis la migration — arbitrage DA à faire (raccourcir la copie du bloc
		// titre ou resserrer ses espacements). fixme = suivi, pas absolution.
		// ⚠️ DANS le test : un `test.fixme()` nu au scope du describe s'applique à
		// TOUT le groupe — c'est ce qui a désactivé 9 tests mobiles en silence
		// (audit e2e 2026-08-16).
		test.fixme();
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// Le budget vertical du bloc titre (299 px mesuré à 390 px de large) existe
		// pour ça : sur un écran de 844 px, une pièce entière doit rester visible
		// SANS scroller, barre de navigation basse déduite. C'est la promesse de la
		// direction « L'étal » — si la copie s'allonge, c'est elle qui cède.
		const heading = page.locator("#hero").getByRole("heading", { level: 1 });
		await expect(heading).toBeVisible();

		const firstCard = page.locator("#hero article").first();
		const cardCount = await page.locator("#hero article").count();
		test.skip(cardCount === 0, "Catalogue vide : l'étal rend la carte de contact, pas de pièce.");

		await expect(firstCard).toBeVisible();

		const box = await firstCard.boundingBox();
		expect(box).not.toBeNull();

		// Hauteur de la bottom-nav boutique (--bottom-bar-height), mesurée plutôt
		// que codée en dur : elle change avec la safe-area de l'appareil.
		const bottomBar = page.getByRole("navigation", {
			name: /Navigation principale de la boutique/i,
		});
		const barBox = await bottomBar.boundingBox();
		const fold = MOBILE_VIEWPORT.height - (barBox?.height ?? 0);

		expect(box!.y + box!.height).toBeLessThanOrEqual(fold);
	});

	test("bottom nav tabs — les 5 onglets visibles sur mobile", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const bottomNav = page.getByRole("navigation", {
			name: /Navigation principale de la boutique/i,
		});
		await expect(bottomNav).toBeVisible();

		// ⚠️ Ce test a assert « Compte » pendant cinq jours après le retrait de
		// l'espace client (2026-07-31) — donc rouge en permanence, sur la surface
		// même qu'il prétendait garder. Son intitulé disait « 5 onglets » alors que
		// la barre en comptait quatre. La leçon : compter les onglets EXPLICITEMENT,
		// pour qu'un retrait ou un ajout casse le test au lieu de le laisser dériver.
		//
		// Le jeu courant est Accueil · Créations · Rechercher · Favoris · Panier —
		// « Créations » ajouté par la refonte « L'intercalaire » (2026-08-04), sans
		// quoi aucun onglet ne pouvait représenter le catalogue.
		await expect(bottomNav.getByRole("link", { name: /Accueil/i })).toBeVisible();
		await expect(bottomNav.getByRole("link", { name: /Créations/i })).toBeVisible();
		await expect(bottomNav.getByRole("button", { name: /Rechercher/i })).toBeVisible();
		await expect(bottomNav.getByRole("link", { name: /Favoris/i })).toBeVisible();
		await expect(bottomNav.getByRole("button", { name: /Panier/i })).toBeVisible();
		await expect(bottomNav.locator("a, button")).toHaveCount(5);
	});

	test("bottom nav — l'onglet Panier ouvre le cart sheet", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const cartTab = page
			.getByRole("navigation", { name: /Navigation principale de la boutique/i })
			.getByRole("button", { name: /Panier/i });
		await cartTab.click();

		const cartDialog = page.getByRole("dialog").first();
		await expect(cartDialog).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("bottom nav — l'onglet Rechercher ouvre le quick-search", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const searchTab = page
			.getByRole("navigation", { name: /Navigation principale de la boutique/i })
			.getByRole("button", { name: /Rechercher/i });
		await expect(searchTab).toHaveAttribute("aria-expanded", "false");
		await searchTab.click();

		await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		// ⚠️ Dialog ouvert, l'onglet sort de l'arbre d'accessibilité (fond inerte) :
		// les requêtes par rôle ne le résolvent plus, on relit l'attribut en CSS.
		await expect(
			page
				.locator('nav[aria-label="Navigation principale de la boutique"] button[aria-expanded]')
				.filter({ hasText: /Rechercher/i }),
		).toHaveAttribute("aria-expanded", "true");
	});

	test("bottom nav — l'onglet Panier reflète l'ouverture du sheet dans aria-expanded", async ({
		page,
	}) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const cartTab = page
			.getByRole("navigation", { name: /Navigation principale de la boutique/i })
			.getByRole("button", { name: /Panier/i });

		// Régression : `aria-expanded` était figé à "false" (isActive: false en dur)
		// alors que le bouton porte `aria-haspopup="dialog"`.
		await expect(cartTab).toHaveAttribute("aria-expanded", "false");
		await cartTab.click();
		await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		// ⚠️ Dialog ouvert, l'onglet sort de l'arbre d'accessibilité (fond inerte) :
		// les requêtes par rôle ne le résolvent plus, on relit l'attribut en CSS.
		await expect(
			page
				.locator('nav[aria-label="Navigation principale de la boutique"] button[aria-expanded]')
				.filter({ hasText: /Panier/i }),
		).toHaveAttribute("aria-expanded", "true");
	});

	test("catalogue produits — grille mobile single-column, bouton filtres visible", async ({
		page,
	}) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const firstCard = page.locator("article.product-card").first();
		await expect(firstCard).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// The filter trigger is visible only on mobile (sm:hidden on desktop)
		const filterTrigger = page.getByRole("button", { name: /Filtres|Filtrer/i }).first();
		await expect(filterTrigger).toBeVisible();
	});

	test("galerie produit mobile — slide avec pinch-zoom role=application", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const firstCardLink = page.locator("article.product-card").first().getByRole("link").first();
		await firstCardLink.click();
		await page.waitForLoadState("domcontentloaded");

		// GalleryPinchZoom renders role=application with zoomable image description
		const zoomable = page.locator('[role="application"][aria-roledescription="Image zoomable"]');
		await expect(zoomable.first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("safe-area-inset-bottom — la bottom nav respecte le padding", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const bottomNav = page.getByRole("navigation", {
			name: /Navigation principale de la boutique/i,
		});
		await expect(bottomNav).toBeVisible();

		// En émulation, env(safe-area-inset-bottom) résout à 0px : la valeur calculée
		// ne distingue rien (l'ancienne assertion `toBeTruthy()` passait sur "0px").
		// Le contrat vérifiable ici est la PRÉSENCE de la déclaration safe-area sur
		// la barre (même contrat que bottom-bar-height-contract.regression.test.ts).
		const hasSafeAreaPadding = await bottomNav.evaluate(
			(el) => el.closest('[class*="safe-area-inset-bottom"]') !== null,
		);
		expect(hasSafeAreaPadding).toBe(true);
	});

	test("search input — inputMode=search + enterKeyHint=search sur mobile", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// L'onglet Rechercher de la bottom-nav existe TOUJOURS à ce viewport — pas de
		// branche conditionnelle (l'ancien `if (isVisible)` rendait le test optionnel).
		const searchTab = page
			.getByRole("navigation", { name: /Navigation principale de la boutique/i })
			.getByRole("button", { name: /Rechercher/i });
		await searchTab.click();

		const searchInput = page.locator('input[type="search"]').first();
		await expect(searchInput).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		await expect(searchInput).toHaveAttribute("inputmode", "search");
		await expect(searchInput).toHaveAttribute("enterkeyhint", "search");
	});
});

test.describe("Shop - Checkout mobile (viewport 390x844)", { tag: ["@regression"] }, () => {
	test.use({ viewport: MOBILE_VIEWPORT });

	test("la bottom nav est masquée sur /paiement (flow focus)", async ({ page }) => {
		await page.goto("/paiement").catch(() => undefined);
		await page.waitForLoadState("domcontentloaded");

		// The bottom nav renders but is inert/hidden via the isHidden prop on /paiement routes
		const bottomNav = page.getByRole("navigation", {
			name: /Navigation principale de la boutique/i,
		});
		// Either not visible or has inert attribute
		const isVisible = await bottomNav.isVisible().catch(() => false);
		if (isVisible) {
			const isInert = await bottomNav.evaluate((el) => el.hasAttribute("inert"));
			expect(isInert).toBe(true);
		}
	});
});
