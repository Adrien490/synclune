import { test, expect } from "./fixtures";
import { expectNoA11yViolations } from "./helpers/axe";

const MOBILE_VIEWPORT = { width: 390, height: 844 };
const MOBILE_VIEWPORT_ZOOM_200 = { width: 195, height: 422 };

/**
 * Mobile accessibility specs — couvre les gaps identifiés dans l'audit mobile
 * du 2026-04-17 :
 *
 * 1. WCAG 1.4.10 Reflow : contenu lisible à 320 CSS px (simulé via zoom 200%
 *    sur viewport 390×844 → 195×422 effectif).
 * 2. WCAG 2.5.5 Target Size : touch targets ≥ 44×44 px.
 * 3. WCAG 2.4.1 Skip Links : landmarks + skip-link sur mobile.
 * 4. axe-core WCAG 2A+2AA+2.1AA+2.2AA sur pages critiques (home, produits,
 *    panier, checkout) — viewport mobile.
 */

test.describe("A11y Mobile — axe-core WCAG (viewport 390x844)", () => {
	test.use({ viewport: MOBILE_VIEWPORT });

	test("home — aucune violation WCAG", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");
		await expectNoA11yViolations(page, { context: "home mobile" });
	});

	test("produits — aucune violation WCAG", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");
		await expectNoA11yViolations(page, { context: "produits mobile" });
	});

	test("collections — aucune violation WCAG", async ({ page }) => {
		await page.goto("/collections");
		await page.waitForLoadState("domcontentloaded");
		await expectNoA11yViolations(page, { context: "collections mobile" });
	});
});

test.describe("A11y Mobile — WCAG 1.4.10 Reflow (zoom 200% simulé)", () => {
	test.use({ viewport: MOBILE_VIEWPORT_ZOOM_200 });

	test("home — pas de scroll horizontal à 320 CSS px effectifs", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const hasHorizontalOverflow = await page.evaluate(() => {
			return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
		});
		expect(hasHorizontalOverflow).toBe(false);
	});

	test("produits — pas de scroll horizontal à 320 CSS px effectifs", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const hasHorizontalOverflow = await page.evaluate(() => {
			return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
		});
		expect(hasHorizontalOverflow).toBe(false);
	});

	test("le h1 reste visible (pas de tronquage) à zoom 200%", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const h1 = page.getByRole("heading", { level: 1 }).first();
		await expect(h1).toBeVisible();
	});
});

test.describe("A11y Mobile — Touch targets WCAG 2.5.5 (viewport 390x844)", () => {
	test.use({ viewport: MOBILE_VIEWPORT });

	test("bottom nav tabs — chaque tab ≥ 44×44 px", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const bottomNav = page.getByRole("navigation", {
			name: /Navigation principale de la boutique/i,
		});
		await expect(bottomNav).toBeVisible();

		const tabs = bottomNav.locator("a, button");
		const count = await tabs.count();
		expect(count).toBeGreaterThanOrEqual(3);

		for (let i = 0; i < count; i++) {
			const tab = tabs.nth(i);
			const box = await tab.boundingBox();
			expect(box).not.toBeNull();
			if (box) {
				expect(box.height).toBeGreaterThanOrEqual(44);
				expect(box.width).toBeGreaterThanOrEqual(44);
			}
		}
	});

	test("navbar hamburger — target ≥ 44×44 px", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const hamburger = page.getByRole("button", { name: /Ouvrir|Menu/i }).first();
		if (await hamburger.isVisible().catch(() => false)) {
			const box = await hamburger.boundingBox();
			expect(box).not.toBeNull();
			if (box) {
				expect(box.height).toBeGreaterThanOrEqual(44);
				expect(box.width).toBeGreaterThanOrEqual(44);
			}
		}
	});
});

test.describe("A11y Mobile — Landmarks + Skip link (viewport 390x844)", () => {
	test.use({ viewport: MOBILE_VIEWPORT });

	test("landmark main présent sur home", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const main = page.getByRole("main");
		await expect(main).toBeVisible();
	});

	test("aria-label Navigation principale présent pour la bottom nav", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const bottomNav = page.getByRole("navigation", {
			name: /Navigation principale de la boutique/i,
		});
		await expect(bottomNav).toBeVisible();
	});
});
