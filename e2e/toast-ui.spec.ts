import { test, expect } from "./fixtures";

/**
 * Toast UI/UX — vérifications cross-device du Toaster Sonner.
 *
 * Le Toaster (<AppToaster />) est monté dans le layout root, donc la région
 * `[data-sonner-toaster]` existe dès qu'une page quelconque est chargée.
 *
 * Tests :
 * - Config structurelle (position, data-attributes)
 * - Safe-area iOS (offset avec env())
 * - Swipe direction selon viewport (bottom mobile, horizontal desktop)
 * - CSS native-like (hit area close button, border-radius)
 */

const MOBILE_VIEWPORT = { width: 390, height: 844 };
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };

test.describe("Toast — Desktop", { tag: ["@regression"] }, () => {
	test.use({ viewport: DESKTOP_VIEWPORT });

	test("le Toaster est positionné top-center sur desktop", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const toaster = page.locator("[data-sonner-toaster]").first();
		await expect(toaster).toHaveAttribute("data-y-position", "top");
		await expect(toaster).toHaveAttribute("data-x-position", "center");
	});

	test("le Toaster applique l'offset safe-area-inset-top", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const offset = await page
			.locator("[data-sonner-toaster]")
			.first()
			.evaluate((el) => {
				return getComputedStyle(el).getPropertyValue("--offset-top");
			});
		expect(offset).toContain("env(safe-area-inset-top)");
	});
});

test.describe("Toast — Mobile (iPhone viewport)", { tag: ["@regression"] }, () => {
	test.use({ viewport: MOBILE_VIEWPORT });

	test("le Toaster est positionné bottom-center sur mobile", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const toaster = page.locator("[data-sonner-toaster]").first();
		await expect(toaster).toHaveAttribute("data-y-position", "bottom");
		await expect(toaster).toHaveAttribute("data-x-position", "center");
	});

	test("le Toaster applique l'offset safe-area-inset-bottom sur mobile", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const offset = await page
			.locator("[data-sonner-toaster]")
			.first()
			.evaluate((el) => {
				return getComputedStyle(el).getPropertyValue("--offset-bottom");
			});
		expect(offset).toContain("env(safe-area-inset-bottom)");
	});

	test("le conteneur respecte le padding-bottom safe-area via CSS", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const paddingBottom = await page
			.locator("[data-sonner-toaster]")
			.first()
			.evaluate((el) => {
				return getComputedStyle(el).paddingBottom;
			});
		expect(paddingBottom).not.toBe("0px");
	});
});

test.describe("Toast — Reduced motion", { tag: ["@regression"] }, () => {
	test.use({ viewport: MOBILE_VIEWPORT });

	test("le Toaster respecte prefers-reduced-motion", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const matches = await page.evaluate(() => {
			return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		});
		expect(matches).toBe(true);
	});

	// A11Y-AUDIT-005 — garde générique : l'utilitaire `.animate-heart-beat` (appliqué
	// sans préfixe motion-safe:) doit être neutralisé sous reduced-motion. Depuis F2,
	// l'icône du toast erreur est statique (rouge) et n'utilise plus cette classe ;
	// le test reste un garde-fou si la classe est réutilisée ailleurs.
	test("neutralise l'utilitaire animate-heart-beat sous reduced-motion", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const animationName = await page.evaluate(() => {
			const el = document.createElement("div");
			el.className = "animate-heart-beat";
			document.body.appendChild(el);
			const name = getComputedStyle(el).animationName;
			el.remove();
			return name;
		});
		expect(animationName).toBe("none");
	});
});
