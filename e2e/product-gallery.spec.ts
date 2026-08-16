import { test, expect } from "./fixtures";

test.describe("Galerie produit", { tag: ["@critical"] }, () => {
	test.beforeEach(async ({ productCatalogPage }) => {
		await productCatalogPage.goto();
		const count = await productCatalogPage.productLinks.count();
		test.skip(count === 0, "No products found - seed data required");
		await productCatalogPage.gotoFirstProduct();
	});

	test("la galerie est visible sur la page produit", async ({ page }) => {
		// `.first()` : pendant le streaming/hydratation PPR, la région peut être
		// brièvement dupliquée dans le DOM — le strict mode partirait en violation.
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]').first();
		await expect(gallery).toBeVisible();
	});

	test("la galerie a les attributs ARIA corrects", async ({ page }) => {
		// `.first()` : pendant le streaming/hydratation PPR, la région peut être
		// brièvement dupliquée dans le DOM — le strict mode partirait en violation.
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]').first();
		await expect(gallery).toHaveAttribute("aria-label", /Galerie photos/);
	});

	test("la galerie affiche au moins une image", async ({ page }) => {
		// `.first()` : pendant le streaming/hydratation PPR, la région peut être
		// brièvement dupliquée dans le DOM — le strict mode partirait en violation.
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]').first();
		const images = gallery.locator("img");
		const count = await images.count();
		expect(count).toBeGreaterThan(0);
	});

	// ⚠️ Ce test cherchait `[class*="counter"], [data-gallery-counter]` — le
	// composant n'émettait NI l'un NI l'autre. Seul le repli `.or(liveRegion)` le
	// faisait passer : le compteur visuel n'a jamais été couvert, et le test était
	// vert pour la mauvaise raison. Il cible désormais le sélecteur réel, et les
	// deux surfaces sont vérifiées SÉPARÉMENT — un `or` ne peut plus masquer la
	// disparition de l'une des deux.
	test("le compteur d'images est visible quand il y a plusieurs images", async ({ page }) => {
		// `.first()` : pendant le streaming/hydratation PPR, la région peut être
		// brièvement dupliquée dans le DOM — le strict mode partirait en violation.
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]').first();
		// Le nombre de VUES se lit sur les vignettes (tablist) : compter les <img>
		// gonflerait le total (vignettes + slides pour les mêmes médias).
		const tabs = gallery.locator('[role="tablist"]').first().locator('[role="tab"]');
		const viewCount = await tabs.count();

		// `test.skip` explicite plutôt que l'ancien `if` silencieux : un produit
		// mono-vue apparaît comme SKIP dans le rapport, pas comme un vert vide.
		test.skip(viewCount < 2, "Produit à une seule vue — pas de compteur");

		// Le numéro de vue vit dans la réserve basse du carton, à toutes les
		// tailles (l'ancienne pastille de verre était `hidden sm:block`).
		await expect(gallery.getByTestId("gallery-counter")).toBeVisible();
		await expect(gallery.getByTestId("gallery-counter")).toHaveText(
			new RegExp(`1\\s*/\\s*${viewCount}`),
		);
	});

	test("la région live annonce la vue courante", async ({ page }) => {
		// `.first()` : pendant le streaming/hydratation PPR, la région peut être
		// brièvement dupliquée dans le DOM — le strict mode partirait en violation.
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]').first();
		const liveRegion = gallery.locator('[role="status"][aria-live="polite"]');

		await expect(liveRegion).toHaveCount(1);
		await expect(liveRegion).toHaveText(/Image 1 sur/);
	});

	test("les vignettes sont affichées quand il y a plusieurs images", async ({ page }) => {
		// `.first()` : pendant le streaming/hydratation PPR, la région peut être
		// brièvement dupliquée dans le DOM — le strict mode partirait en violation.
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]').first();
		// `.filter({ visible: true })` : deux tablists coexistent (colonne desktop
		// + rail mobile), chacun masqué par media query hors de son viewport — le
		// `.first()` nu tombait sur le desktop caché en projet mobile.
		const thumbnails = gallery.locator('[role="tablist"]').filter({ visible: true });

		const images = gallery.locator("img");
		const imgCount = await images.count();

		// `test.skip` explicite plutôt que l'ancien `if` silencieux : un produit
		// mono-image apparaît comme SKIP dans le rapport, pas comme un vert vide.
		test.skip(imgCount < 2, "Produit à une seule image — pas de vignettes");

		await expect(thumbnails.first()).toBeVisible();

		const tabs = thumbnails.first().locator('[role="tab"]');
		expect(await tabs.count()).toBeGreaterThan(1);
	});

	test("cliquer sur une vignette change l'image active", async ({ page }) => {
		// `.first()` : pendant le streaming/hydratation PPR, la région peut être
		// brièvement dupliquée dans le DOM — le strict mode partirait en violation.
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]').first();
		const tablist = gallery.locator('[role="tablist"]').filter({ visible: true }).first();
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
		// `.first()` : pendant le streaming/hydratation PPR, la région peut être
		// brièvement dupliquée dans le DOM — le strict mode partirait en violation.
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]').first();
		const liveRegion = gallery.locator('[role="status"][aria-live="polite"]');

		await expect(liveRegion).toBeAttached();
		// « Image » ou « Vidéo » : le libellé suit le type du média courant, comme
		// dans `media-lightbox.tsx`. Le seed peut placer une vidéo en première vue.
		await expect(liveRegion).toContainText(/(?:Image|Vidéo) \d+ sur \d+/);
	});

	test("la navigation clavier fonctionne dans la galerie", async ({ page }) => {
		// `.first()` : pendant le streaming/hydratation PPR, la région peut être
		// brièvement dupliquée dans le DOM — le strict mode partirait en violation.
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]').first();
		const tablist = gallery.locator('[role="tablist"]').filter({ visible: true }).first();
		const tabs = tablist.locator('[role="tab"]');
		const tabCount = await tabs.count();

		test.skip(tabCount < 2, "Product has only one image - cannot test keyboard navigation");

		// Focus the gallery container
		await gallery.focus();

		// Press ArrowRight to go to next slide
		await page.keyboard.press("ArrowRight");

		// Verify the second tab is now selected (assertion acts as wait)
		await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");

		// Press ArrowLeft to go back
		await page.keyboard.press("ArrowLeft");
		await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
	});

	test("les vignettes ont des aria-label accessibles", async ({ page }) => {
		// `.first()` : pendant le streaming/hydratation PPR, la région peut être
		// brièvement dupliquée dans le DOM — le strict mode partirait en violation.
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]').first();
		const tablist = gallery.locator('[role="tablist"]').filter({ visible: true }).first();
		const tabs = tablist.locator('[role="tab"]');
		const tabCount = await tabs.count();

		// `test.skip` explicite plutôt que l'ancien `if` silencieux : un produit
		// sans vignettes apparaît comme SKIP dans le rapport, pas comme un vert vide.
		test.skip(tabCount === 0, "Produit à une seule vue — pas de vignettes");

		const firstLabel = await tabs.first().getAttribute("aria-label");
		expect(firstLabel).toBeTruthy();
		expect(firstLabel).toMatch(/Voir (photo|vidéo) 1|Photo 1|Vidéo 1/);
	});

	test("les touches Home et End naviguent vers la première et dernière image", async ({ page }) => {
		// `.first()` : pendant le streaming/hydratation PPR, la région peut être
		// brièvement dupliquée dans le DOM — le strict mode partirait en violation.
		const gallery = page.locator('[role="region"][aria-roledescription="carrousel"]').first();
		const tablist = gallery.locator('[role="tablist"]').filter({ visible: true }).first();
		const tabs = tablist.locator('[role="tab"]');
		const tabCount = await tabs.count();

		test.skip(tabCount < 3, "Need at least 3 images to test Home/End navigation");

		await gallery.focus();

		// Press End to go to last slide
		await page.keyboard.press("End");
		await expect(tabs.last()).toHaveAttribute("aria-selected", "true");

		// Press Home to go to first slide
		await page.keyboard.press("Home");
		await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
	});
});
