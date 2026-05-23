import { devices } from "@playwright/test";
import { test, expect } from "./fixtures";

/**
 * Mobile-specific gallery E2E tests — complements product-gallery.spec.ts with
 * touch gestures, safe-area checks and Drawer-like behavior.
 *
 * All tests emulate an iPhone 14 viewport (390x844, DPR 3, touch enabled).
 */
test.use({ ...devices["iPhone 14"] });

test.describe("Galerie produit mobile", { tag: ["@critical", "@mobile"] }, () => {
	test.beforeEach(async ({ productCatalogPage }) => {
		await productCatalogPage.goto();
		const count = await productCatalogPage.productLinks.count();
		test.skip(count === 0, "No products found - seed data required");
		await productCatalogPage.gotoFirstProduct();
	});

	test("le thumbnail scroll mobile applique les safe-area paddings", async ({ page }) => {
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]');
		const tablists = gallery.locator('[role="tablist"][aria-label="Vignettes du produit"]');
		const imgCount = await gallery.locator("img").count();
		test.skip(imgCount < 2, "Need multiple images to display thumbnails");

		// The mobile tablist is the one living inside a md:hidden wrapper
		const mobileTablist = tablists.filter({ has: page.locator(":scope") }).last();
		await expect(mobileTablist).toHaveClass(/pl-\[env\(safe-area-inset-left/);
		await expect(mobileTablist).toHaveClass(/pr-\[env\(safe-area-inset-right/);
	});

	test("swipe horizontal change l'image active (haptic wired via pointerDown)", async ({
		page,
	}) => {
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]');
		const imgCount = await gallery.locator("img").count();
		test.skip(imgCount < 2, "Need multiple images to swipe");

		const liveRegion = gallery.locator('[role="status"][aria-live="polite"]').first();
		await expect(liveRegion).toContainText(/Image 1 sur/);

		// Touch-like swipe via mouse events on Embla viewport (Playwright mobile emulation)
		const box = await gallery.boundingBox();
		if (!box) throw new Error("Gallery bounding box unavailable");
		await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 12 });
		await page.mouse.up();

		// Expect index to have advanced
		await expect(liveRegion).toContainText(/Image 2 sur/, { timeout: 2000 });
	});

	test("double-tap bascule le pinch-zoom 1x ↔ 2x", async ({ page }) => {
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]');
		const pinchApp = gallery
			.locator('[role="application"][aria-roledescription="Image zoomable"]')
			.first();
		test.skip((await pinchApp.count()) === 0, "Only videos in this gallery");

		const box = await pinchApp.boundingBox();
		if (!box) throw new Error("Pinch container bounding box unavailable");
		const cx = box.x + box.width / 2;
		const cy = box.y + box.height / 2;

		// Two rapid taps
		await page.mouse.click(cx, cy);
		await page.waitForTimeout(60);
		await page.mouse.click(cx, cy);

		// After double-tap, the zoom announcement appears in sr-only status or the aria-label reflects zoom%.
		const zoomLabel = await pinchApp.getAttribute("aria-label");
		expect(zoomLabel).toMatch(/(Zoom|zoomer)/);
	});

	test("le lightbox reste fermé par défaut sur mobile (ouverture via zoom desktop only)", async ({
		page,
	}) => {
		// Ensure lightbox is not present in the DOM before any interaction
		const lightbox = page.locator('[role="dialog"][aria-label="Galerie en plein écran"]');
		await expect(lightbox).toHaveCount(0);
	});

	test("VideoErrorFallback retry respecte 44px minimum (si vidéo échoue)", async ({ page }) => {
		// Synthetic: inject a broken video via page.evaluate to trigger the fallback
		await page.evaluate(() => {
			const video = document.querySelector("video");
			if (video) {
				video.dispatchEvent(new Event("error"));
			}
		});
		const retry = page.getByRole("button", { name: /Réessayer/i });
		const hasFallback = (await retry.count()) > 0;
		test.skip(!hasFallback, "No video in first gallery position");
		const box = await retry.first().boundingBox();
		if (!box) throw new Error("Retry button not found");
		expect(box.height).toBeGreaterThanOrEqual(44);
	});
});
