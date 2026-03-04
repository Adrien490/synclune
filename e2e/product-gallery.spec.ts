import { test, expect } from "./fixtures";

test.describe("Galerie produit", { tag: ["@critical"] }, () => {
	test.beforeEach(async ({ productCatalogPage }) => {
		await productCatalogPage.goto();
		const count = await productCatalogPage.productLinks.count();
		test.skip(count === 0, "No products found - seed data required");
		await productCatalogPage.gotoFirstProduct();
	});

	test("la galerie est visible sur la page produit", async ({ page }) => {
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]');
		await expect(gallery).toBeVisible();
	});

	test("la galerie a les attributs ARIA corrects", async ({ page }) => {
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]');
		await expect(gallery).toHaveAttribute("aria-label", /Galerie photos/);
	});

	test("la galerie affiche au moins une image", async ({ page }) => {
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]');
		const images = gallery.locator("img");
		const count = await images.count();
		expect(count).toBeGreaterThan(0);
	});

	test("le compteur d'images est visible quand il y a plusieurs images", async ({ page }) => {
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]');
		const images = gallery.locator("img");
		const imgCount = await images.count();

		if (imgCount > 1) {
			const counter = gallery.locator('[class*="counter"], [data-gallery-counter]');
			const liveRegion = gallery.locator('[role="status"][aria-live="polite"]');
			// Either the visual counter or the SR live region should be present
			await expect(counter.or(liveRegion).first()).toBeAttached();
		}
	});

	test("les vignettes sont affichées quand il y a plusieurs images", async ({ page }) => {
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]');
		const thumbnails = gallery.locator('[role="tablist"]');

		const images = gallery.locator("img");
		const imgCount = await images.count();

		if (imgCount > 1) {
			await expect(thumbnails.first()).toBeVisible();

			const tabs = thumbnails.first().locator('[role="tab"]');
			expect(await tabs.count()).toBeGreaterThan(1);
		}
	});

	test("cliquer sur une vignette change l'image active", async ({ page }) => {
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]');
		const tablist = gallery.locator('[role="tablist"]').first();
		const tabs = tablist.locator('[role="tab"]');
		const tabCount = await tabs.count();

		test.skip(tabCount < 2, "Product has only one image - cannot test navigation");

		// First tab should be selected initially
		await expect(tabs.first()).toHaveAttribute("aria-selected", "true");

		// Click the second tab
		await tabs.nth(1).click();

		// Second tab should now be selected
		await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
		await expect(tabs.first()).toHaveAttribute("aria-selected", "false");
	});

	test("la région live annonce le changement d'image", async ({ page }) => {
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]');
		const liveRegion = gallery.locator('[role="status"][aria-live="polite"]');

		await expect(liveRegion).toBeAttached();
		await expect(liveRegion).toContainText(/Image \d+ sur \d+/);
	});

	test("la navigation clavier fonctionne dans la galerie", async ({ page }) => {
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]');
		const tablist = gallery.locator('[role="tablist"]').first();
		const tabs = tablist.locator('[role="tab"]');
		const tabCount = await tabs.count();

		test.skip(tabCount < 2, "Product has only one image - cannot test keyboard navigation");

		// Focus the gallery container
		await gallery.focus();

		// Press ArrowRight to go to next slide
		await page.keyboard.press("ArrowRight");

		// Allow carousel animation to settle
		await page.waitForTimeout(500);

		// Verify the second tab is now selected
		await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");

		// Press ArrowLeft to go back
		await page.keyboard.press("ArrowLeft");
		await page.waitForTimeout(500);

		await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
	});

	test("les vignettes ont des aria-label accessibles", async ({ page }) => {
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]');
		const tablist = gallery.locator('[role="tablist"]').first();
		const tabs = tablist.locator('[role="tab"]');
		const tabCount = await tabs.count();

		if (tabCount > 0) {
			const firstLabel = await tabs.first().getAttribute("aria-label");
			expect(firstLabel).toBeTruthy();
			expect(firstLabel).toMatch(/Voir (photo|vidéo) 1|Photo 1|Vidéo 1/);
		}
	});

	test("les touches Home et End naviguent vers la première et dernière image", async ({ page }) => {
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]');
		const tablist = gallery.locator('[role="tablist"]').first();
		const tabs = tablist.locator('[role="tab"]');
		const tabCount = await tabs.count();

		test.skip(tabCount < 3, "Need at least 3 images to test Home/End navigation");

		await gallery.focus();

		// Press End to go to last slide
		await page.keyboard.press("End");
		await page.waitForTimeout(500);
		await expect(tabs.last()).toHaveAttribute("aria-selected", "true");

		// Press Home to go to first slide
		await page.keyboard.press("Home");
		await page.waitForTimeout(500);
		await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
	});
});
