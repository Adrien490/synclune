import { expect, test } from "./fixtures";

/**
 * View Transitions API contract: the first gallery image of a product detail page
 * has a unique `view-transition-name` of the form `product-${productId}` set server-side
 * at `modules/media/components/gallery/slide.tsx:384`.
 *
 * This enables same-element morph animations when navigating from a product listing to
 * the detail page (Chromium-only for now; Safari + Firefox degrade gracefully).
 */

test.describe("View Transition API on product detail", { tag: ["@critical"] }, () => {
	test.skip(
		({ browserName }) => browserName !== "chromium",
		"View Transitions API is currently Chromium-only",
	);

	test("first gallery image exposes a unique view-transition-name token", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const productLinks = page.locator('a[href*="/creations/"]');
		const count = await productLinks.count();
		test.skip(count === 0, "No products available to test");

		const firstHref = await productLinks.first().getAttribute("href");
		test.skip(!firstHref, "Product link has no href");

		await page.goto(firstHref!);
		await page.waitForLoadState("domcontentloaded");

		const viewTransitionNames = await page.evaluate(() => {
			const all = Array.from(
				document.querySelectorAll<HTMLElement>("[style*='view-transition-name']"),
			);
			return all.map((el) => el.style.viewTransitionName).filter(Boolean);
		});

		expect(viewTransitionNames.length).toBeGreaterThanOrEqual(1);
		const lcpToken = viewTransitionNames.find((n) => n.startsWith("product-"));
		expect(
			lcpToken,
			"Expected a 'product-<id>' view-transition-name on the LCP gallery image",
		).toBeDefined();
	});

	test("no duplicate view-transition-name on a single product page", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const productLinks = page.locator('a[href*="/creations/"]');
		const count = await productLinks.count();
		test.skip(count === 0, "No products available to test");

		const href = await productLinks.first().getAttribute("href");
		test.skip(!href, "Product link has no href");

		await page.goto(href!);
		await page.waitForLoadState("domcontentloaded");

		const viewTransitionNames = await page.evaluate(() => {
			const all = Array.from(
				document.querySelectorAll<HTMLElement>("[style*='view-transition-name']"),
			);
			return all.map((el) => el.style.viewTransitionName).filter(Boolean);
		});

		const uniqueNames = new Set(viewTransitionNames);
		expect(uniqueNames.size).toBe(viewTransitionNames.length);
	});
});
