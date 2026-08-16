import fs from "node:fs";
import type { Page, TestInfo } from "@playwright/test";
import { test, expect } from "./fixtures";
import { requireSeedData } from "./constants";
import { preseedCookieConsent } from "./helpers/consent";

/**
 * Régression visuelle — pages clés + un état d'overlay.
 *
 * Deux règles issues de l'audit e2e 2026-08-16 :
 *
 * 1. **Pas de baseline pour la plateforme ⇒ skip EXPLICITE**, jamais de
 *    comparaison contre un snapshot auto-écrit au premier essai. C'est ce qui
 *    se produisait en CI Linux (seuls des `-darwin` sont commités) : échec au
 *    1er essai + écriture du fichier, puis retry « vert » contre le snapshot
 *    fraîchement créé — jusqu'à 20 pass flaky vides de sens par run, qui
 *    pulvérisaient le budget du flakiness-reporter. Les baselines Linux se
 *    génèrent via le workflow `visual-regression.yml` (5 projets) et se
 *    committent par PR.
 *
 * 2. **Les photos sont masquées** : elles viennent du seed (banque d'images),
 *    pas de la mise en page. Ce que le snapshot doit garder, c'est le layout,
 *    la typographie et les couleurs — d'où aussi la tolérance resserrée
 *    (0.02 : ~20 000 px sur 1280×800, contre ~51 000 avant, où un bouton
 *    entier pouvait changer sous le seuil).
 */
const SNAPSHOT_OPTIONS = {
	fullPage: false,
	maxDiffPixelRatio: 0.02,
	animations: "disabled",
} as const;

function maskPhotos(page: Page) {
	return { ...SNAPSHOT_OPTIONS, mask: [page.locator("main img")] };
}

/** Skip lisible quand la baseline n'existe pas encore pour cette plateforme. */
function requireBaseline(testInfo: TestInfo, name: string) {
	const updating =
		testInfo.config.updateSnapshots === "all" || testInfo.config.updateSnapshots === "changed";
	if (updating) return;
	const baseline = testInfo.snapshotPath(name);
	test.skip(
		!fs.existsSync(baseline),
		`Baseline absente pour cette plateforme (${baseline}) — la générer via ` +
			`\`pnpm e2e visual-regression.spec.ts --update-snapshots\` (local) ou le workflow visual-regression (CI).`,
	);
}

test.describe("Visual regression - Pages cles", { tag: ["@slow"] }, () => {
	// Sans pré-seed, le bandeau cookies (chunk lazy) se monte à un instant
	// VARIABLE — présent sur une capture, absent de la suivante : les snapshots
	// mobiles flappaient de ~10% d'un run à l'autre (diff mesuré : le bandeau).
	test.beforeEach(async ({ page }) => {
		await preseedCookieConsent(page);
	});

	test("homepage - snapshot", async ({ page }, testInfo) => {
		requireBaseline(testInfo, "homepage.png");
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// Wait for above-the-fold content to stabilize
		const heading = page.getByRole("heading", { level: 1 });
		await expect(heading).toBeVisible();

		await expect(page).toHaveScreenshot("homepage.png", maskPhotos(page));
	});

	test("page produits - snapshot", async ({ page }, testInfo) => {
		requireBaseline(testInfo, "products-page.png");
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const heading = page.getByRole("heading", { level: 1 });
		await expect(heading).toBeVisible();

		await expect(page).toHaveScreenshot("products-page.png", maskPhotos(page));
	});

	test("page detail produit - snapshot", async ({ page, productCatalogPage }, testInfo) => {
		requireBaseline(testInfo, "product-detail.png");
		await productCatalogPage.goto();

		const productCount = await productCatalogPage.productLinks.count();
		requireSeedData(test, productCount > 0, "No products found");

		await productCatalogPage.gotoFirstProduct();
		await page.waitForLoadState("domcontentloaded");

		const heading = page.getByRole("heading", { level: 1 });
		await expect(heading).toBeVisible();

		await expect(page).toHaveScreenshot("product-detail.png", maskPhotos(page));
	});

	test("page collections - snapshot", async ({ page }, testInfo) => {
		requireBaseline(testInfo, "collections-page.png");
		await page.goto("/collections");
		await page.waitForLoadState("domcontentloaded");

		const heading = page.getByRole("heading", { level: 1 });
		await expect(heading).toBeVisible();

		await expect(page).toHaveScreenshot("collections-page.png", maskPhotos(page));
	});

	// L'état d'overlay le plus fréquent du parcours d'achat. Panier VIDE :
	// contenu 100 % déterministe (pas de lignes issues du seed à masquer).
	test("sheet panier ouvert (vide) - snapshot", async ({ page, cartPage }, testInfo) => {
		requireBaseline(testInfo, "cart-sheet-empty.png");
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		await cartPage.open();
		await expect(cartPage.emptyMessage).toBeVisible();

		await expect(page).toHaveScreenshot("cart-sheet-empty.png", SNAPSHOT_OPTIONS);
	});
});
