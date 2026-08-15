import { test, expect } from "./fixtures";
import { requireSeedData } from "./constants";
import { preseedCookieConsent } from "./helpers/consent";

test.describe("Visual regression - Pages cles", { tag: ["@slow"] }, () => {
	// Sans pré-seed, le bandeau cookies (chunk lazy) se monte à un instant
	// VARIABLE — présent sur une capture, absent de la suivante : les snapshots
	// mobiles flappaient de ~10% d'un run à l'autre (diff mesuré : le bandeau).
	test.beforeEach(async ({ page }) => {
		await preseedCookieConsent(page);
	});

	test("homepage - snapshot", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// Wait for above-the-fold content to stabilize
		const heading = page.getByRole("heading", { level: 1 });
		await expect(heading).toBeVisible();

		await expect(page).toHaveScreenshot("homepage.png", {
			fullPage: false,
			maxDiffPixelRatio: 0.05,
			animations: "disabled",
		});
	});

	test("page produits - snapshot", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const heading = page.getByRole("heading", { level: 1 });
		await expect(heading).toBeVisible();

		await expect(page).toHaveScreenshot("products-page.png", {
			fullPage: false,
			maxDiffPixelRatio: 0.05,
			animations: "disabled",
		});
	});

	test("page detail produit - snapshot", async ({ page, productCatalogPage }) => {
		await productCatalogPage.goto();

		const productCount = await productCatalogPage.productLinks.count();
		requireSeedData(test, productCount > 0, "No products found");

		await productCatalogPage.gotoFirstProduct();
		await page.waitForLoadState("domcontentloaded");

		const heading = page.getByRole("heading", { level: 1 });
		await expect(heading).toBeVisible();

		await expect(page).toHaveScreenshot("product-detail.png", {
			fullPage: false,
			maxDiffPixelRatio: 0.05,
			animations: "disabled",
		});
	});

	test("page collections - snapshot", async ({ page }) => {
		await page.goto("/collections");
		await page.waitForLoadState("domcontentloaded");

		const heading = page.getByRole("heading", { level: 1 });
		await expect(heading).toBeVisible();

		await expect(page).toHaveScreenshot("collections-page.png", {
			fullPage: false,
			maxDiffPixelRatio: 0.05,
			animations: "disabled",
		});
	});
});
