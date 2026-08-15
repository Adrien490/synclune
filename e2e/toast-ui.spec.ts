import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";

/**
 * Toast UI/UX — vérifications cross-device du Toaster Sonner.
 *
 * ⚠️ Sonner 2 ne monte le conteneur `[data-sonner-toaster]` qu'à partir du
 * PREMIER toast : charger une page ne suffit plus. Chaque test déclenche donc
 * un vrai toast via le seul chemin invité déterministe du storefront — le
 * retrait d'un favori (toast « Annuler », wishlist cookie, aucun effet serveur).
 *
 * Tests :
 * - Config structurelle (position, data-attributes)
 * - Safe-area iOS (offset avec env())
 */

const MOBILE_VIEWPORT = { width: 390, height: 844 };
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };

/**
 * Déclenche un toast réel : ajout puis retrait d'un favori sur une FICHE
 * produit — seul le bouton de la PDP a `enableUndoToast` (toast « Annuler »
 * sur retrait) ; la grille est volontairement muette.
 */
async function triggerToast(page: Page) {
	await page.goto("/produits");
	const firstProduct = page.locator('a[href*="/creations/"]').first();
	await expect(firstProduct).toBeVisible();
	const href = await firstProduct.getAttribute("href");
	await page.goto(href!);
	await page.waitForLoadState("networkidle");

	// Motif stable : le libellé bascule Ajouter ↔ Retirer au fil des clics.
	const toggle = page
		.getByRole("button", { name: /(Ajouter|Retirer) .* (aux|des) favoris/i })
		.first();
	await expect(toggle).toBeVisible();

	// Le clic peut précéder l'hydratation : on re-clique jusqu'à l'état pressé.
	await expect(async () => {
		if ((await toggle.getAttribute("aria-pressed")) !== "true") {
			await toggle.click();
		}
		await expect(toggle).toHaveAttribute("aria-pressed", "true", { timeout: 1500 });
	}).toPass({ timeout: 15_000 });

	// Le retrait (état pressé confirmé côté serveur) déclenche le toast « Annuler ».
	await expect(async () => {
		if ((await toggle.getAttribute("aria-pressed")) === "true") {
			await toggle.click();
		}
		await page
			.locator("[data-sonner-toaster]")
			.first()
			.waitFor({ state: "attached", timeout: 2000 });
	}).toPass({ timeout: 15_000 });
}

test.describe("Toast — Desktop", { tag: ["@regression"] }, () => {
	test.use({ viewport: DESKTOP_VIEWPORT });

	test("le Toaster est positionné top-center sur desktop", async ({ page }) => {
		await triggerToast(page);

		const toaster = page.locator("[data-sonner-toaster]").first();
		await expect(toaster).toHaveAttribute("data-y-position", "top");
		await expect(toaster).toHaveAttribute("data-x-position", "center");
	});

	test("le Toaster applique l'offset safe-area-inset-top", async ({ page }) => {
		await triggerToast(page);

		// Style INLINE, pas computed : le moteur CSS résout `env()` en `0px` hors
		// safe-area — seule la déclaration brute prouve que l'offset la respecte.
		const offset = await page
			.locator("[data-sonner-toaster]")
			.first()
			.evaluate((el) => {
				return (el as HTMLElement).style.getPropertyValue("--offset-top");
			});
		expect(offset).toContain("env(safe-area-inset-top)");
	});
});

test.describe("Toast — Mobile (iPhone viewport)", { tag: ["@regression"] }, () => {
	test.use({ viewport: MOBILE_VIEWPORT });

	test("le Toaster est positionné bottom-center sur mobile", async ({ page }) => {
		await triggerToast(page);

		const toaster = page.locator("[data-sonner-toaster]").first();
		await expect(toaster).toHaveAttribute("data-y-position", "bottom");
		await expect(toaster).toHaveAttribute("data-x-position", "center");
	});

	test("le Toaster applique l'offset safe-area-inset-bottom sur mobile", async ({ page }) => {
		await triggerToast(page);

		// Style INLINE, pas computed : le moteur CSS résout `env()` en `0px` hors
		// safe-area — seule la déclaration brute prouve que l'offset la respecte.
		const offset = await page
			.locator("[data-sonner-toaster]")
			.first()
			.evaluate((el) => {
				return (el as HTMLElement).style.getPropertyValue("--offset-bottom");
			});
		// Sans parenthèse fermante : la déclaration porte un repli
		// (`env(safe-area-inset-bottom, 0px)`).
		expect(offset).toContain("env(safe-area-inset-bottom");
	});

	test("le conteneur respecte le padding-bottom safe-area via CSS", async ({ page }) => {
		await triggerToast(page);

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

	/*
	 * Le test « le Toaster respecte prefers-reduced-motion » a été SUPPRIMÉ ici.
	 *
	 * Il appelait `page.emulateMedia({ reducedMotion: "reduce" })` puis assertait
	 * `window.matchMedia("(prefers-reduced-motion: reduce)").matches === true` :
	 * il vérifiait l'émulation de Playwright, pas le Toaster. Il passait sur
	 * `about:blank`, et aurait passé avec le Toaster entièrement supprimé.
	 *
	 * Un test qui ne peut pas échouer est plus nuisible qu'absent — il crédite une
	 * couverture inexistante. Le garde-fou réellement utile est celui qui suit :
	 * il vérifie qu'une classe d'animation est bien neutralisée par le CSS du
	 * projet sous reduced-motion.
	 */

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
