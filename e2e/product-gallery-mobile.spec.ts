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

	test("le rail de vignettes mobile est le tablist visible et opérable", async ({ page }) => {
		// Trois copies du carrousel coexistent dans le DOM (bascules CSS par
		// viewport/variante) : seule la visible est opérable.
		const gallery = page
			.locator('[role="region"][aria-roledescription="carrousel"]')
			.filter({ visible: true })
			.first();
		const imgCount = await gallery.locator("img").count();
		test.skip(imgCount < 2, "Need multiple images to display thumbnails");

		// Locator sémantique : sous `md`, seul le rail horizontal mobile est
		// visible (la colonne desktop est `hidden md:block`) — pas besoin de
		// deviner lequel par sa position DOM. L'ancien
		// `.filter({ has: locator(":scope") })` était un no-op (chaque élément se
		// contient lui-même), et les assertions de classes Tailwind
		// (`pl-[env(safe-area-inset-left…`) doublonnaient le test unitaire qui les
		// verrouille déjà (`modules/media/components/gallery/__tests__/gallery.test.tsx`)
		// — en émulation, `env()` vaut 0px : la classe n'a aucun effet observable ici.
		const mobileTablist = gallery
			.getByRole("tablist", { name: "Vignettes du produit" })
			.filter({ visible: true });
		await expect(mobileTablist).toHaveCount(1);

		// Comportement : taper une vignette change la vue active — c'est le
		// contrat du rail, quel que soit son habillage.
		const tabs = mobileTablist.getByRole("tab");
		await tabs.nth(1).click();
		await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
		await expect(tabs.first()).toHaveAttribute("aria-selected", "false");
	});

	test("swipe horizontal change l'image active (haptic wired via pointerDown)", async ({
		page,
	}) => {
		// Trois copies du carrousel coexistent dans le DOM (bascules CSS par
		// viewport/variante) : seule la visible est opérable.
		const gallery = page
			.locator('[role="region"][aria-roledescription="carrousel"]')
			.filter({ visible: true })
			.first();
		const imgCount = await gallery.locator("img").count();
		test.skip(imgCount < 2, "Need multiple images to swipe");

		const liveRegion = gallery.locator('[role="status"][aria-live="polite"]').first();
		await expect(liveRegion).toContainText(/Image 1 sur/);

		// Touch-like swipe via mouse events on Embla viewport (Playwright mobile emulation)
		const swipe = async () => {
			const box = await gallery.boundingBox();
			if (!box) throw new Error("Gallery bounding box unavailable");
			await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
			await page.mouse.down();
			await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 12 });
			await page.mouse.up();
		};

		// Sous la charge d'un run complet, Embla peut manquer le premier drag
		// (events souris throttlés → geste lu comme un clic) : on retente une
		// fois avant de conclure que le swipe est cassé.
		await swipe();
		try {
			await expect(liveRegion).toContainText(/Image 2 sur/, { timeout: 2000 });
		} catch {
			await swipe();
			await expect(liveRegion).toContainText(/Image 2 sur/, { timeout: 4000 });
		}
	});

	test("double-tap bascule le pinch-zoom 1x ↔ 2x", async ({ page }) => {
		// Trois copies du carrousel coexistent dans le DOM (bascules CSS par
		// viewport/variante) : seule la visible est opérable.
		const gallery = page
			.locator('[role="region"][aria-roledescription="carrousel"]')
			.filter({ visible: true })
			.first();
		const pinchApp = gallery
			.locator('[role="application"][aria-roledescription="Image zoomable"]')
			.first();
		test.skip((await pinchApp.count()) === 0, "Only videos in this gallery");

		const box = await pinchApp.boundingBox();
		if (!box) throw new Error("Pinch container bounding box unavailable");
		const cx = box.x + box.width / 2;
		const cy = box.y + box.height / 2;

		// État de repos : l'aria-label porte l'INVITE (« …Double-tapez ou appuyez
		// sur + pour zoomer… »). ⚠️ L'ancien motif /(Zoom|zoomer)/ matchait AUSSI
		// cette invite : l'assertion passait sans qu'aucun zoom n'ait eu lieu —
		// d'autant que les `page.mouse.click` n'émettent pas les événements touch
		// que `GalleryPinchZoom` écoute (`touchstart`/`touchend`), donc le
		// double-tap n'était même jamais déclenché.
		await expect(pinchApp).toHaveAttribute("aria-label", /Double-tapez/);

		// Deux taps TOUCH rapides. Les 60 ms entre les deux ne sont pas un wait
		// spéculatif : le composant exige `timeSinceLastTap > 0` (deux événements
		// distincts à la milliseconde près) ET `< 300 ms` (fenêtre double-tap,
		// `doubleTapDelay`) — deux taps synthétiques dos à dos peuvent tomber dans
		// la même milliseconde.
		await page.touchscreen.tap(cx, cy);
		await page.waitForTimeout(60);
		await page.touchscreen.tap(cx, cy);

		// L'état observable du zoom : l'aria-label BASCULE vers « Zoom N% »
		// (pinch-zoom.tsx recompose le label sur `isZoomed`).
		await expect(pinchApp).toHaveAttribute("aria-label", /Zoom \d+\s*%/);

		// Et le double-tap suivant réinitialise : la bascule joue dans les deux sens.
		await page.touchscreen.tap(cx, cy);
		await page.waitForTimeout(60);
		await page.touchscreen.tap(cx, cy);
		await expect(pinchApp).toHaveAttribute("aria-label", /Double-tapez/);
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
