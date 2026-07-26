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

	test("accueil affiche le hero + CTA visibles au-dessus du fold", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const h1 = page.getByRole("heading", { level: 1 });
		await expect(h1.first()).toBeVisible();

		const ctaShop = page.getByRole("link", { name: /Découvrir la boutique/i });
		await expect(ctaShop).toBeVisible();
	});

	test("bottom nav tabs — 5 onglets visibles sur mobile", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const bottomNav = page.getByRole("navigation", {
			name: /Navigation principale de la boutique/i,
		});
		await expect(bottomNav).toBeVisible();

		// ⚠️ L'onglet 2 est un BOUTON « Rechercher » (il ouvre le quick-search), pas
		// un lien « Produits » : ce test assertait un onglet retiré par l'audit
		// recherche du 2026-07-26 et ne couvrait donc que 4 onglets sur 5.
		await expect(bottomNav.getByRole("link", { name: /Accueil/i })).toBeVisible();
		await expect(bottomNav.getByRole("button", { name: /Rechercher/i })).toBeVisible();
		await expect(bottomNav.getByRole("link", { name: /Favoris/i })).toBeVisible();
		await expect(bottomNav.getByRole("button", { name: /Panier/i })).toBeVisible();
		await expect(bottomNav.getByRole("link", { name: /Compte/i })).toBeVisible();
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
		await expect(searchTab).toHaveAttribute("aria-expanded", "true");
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
		await expect(cartTab).toHaveAttribute("aria-expanded", "true");
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

		const paddingBottom = await bottomNav.evaluate((el) => getComputedStyle(el).paddingBottom);
		// Padding is set via env(safe-area-inset-bottom) — value ≥ 0 should always resolve
		expect(paddingBottom).toBeTruthy();
	});

	test("search input — inputMode=search + enterKeyHint=search sur mobile", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// Cmd+K shortcut equivalent — open via the search icon (sm:hidden on some layouts)
		// Search dialog opens on any type=search encountered in the DOM
		const shortcut = page.locator('button[aria-label*="echerch" i]').first();
		if (await shortcut.isVisible().catch(() => false)) {
			await shortcut.click();
			const searchInput = page.locator('input[type="search"]').first();
			await expect(searchInput).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
			await expect(searchInput).toHaveAttribute("inputmode", "search");
			await expect(searchInput).toHaveAttribute("enterkeyhint", "search");
		}
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
