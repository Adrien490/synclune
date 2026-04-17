import { test, expect } from "./fixtures";

/**
 * Mega menu desktop — UI/UX comportements clés.
 *
 * Le mega menu Radix NavigationMenu est rendu uniquement à partir de lg (1024px).
 * Il s'ouvre au hover sur le trigger, se ferme sur Escape, clic extérieur,
 * Tab vers l'extérieur. Le clic souris n'effectue PAS de navigation
 * (seul Enter clavier le fait — la navigation passe par le CTA "Toutes les..." du panneau).
 *
 * Structurel : on vérifie présence/absence d'éléments, attributs ARIA et data-state.
 */

const DESKTOP_VIEWPORT = { width: 1280, height: 800 };

test.describe("Mega menu desktop", { tag: ["@regression"] }, () => {
	test.use({ viewport: DESKTOP_VIEWPORT });

	test("le trigger 'Les créations' est visible et accessible au clavier", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const trigger = page.getByRole("button", { name: /Les créations/i }).first();
		await expect(trigger).toBeVisible();
		await expect(trigger).toHaveAttribute("aria-expanded", "false");
	});

	test("hover sur le trigger ouvre le panneau", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const trigger = page.getByRole("button", { name: /Les créations/i }).first();
		await trigger.hover();

		await expect(trigger).toHaveAttribute("aria-expanded", "true", { timeout: 2000 });
	});

	test("Escape ferme le panneau ouvert", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const trigger = page.getByRole("button", { name: /Les créations/i }).first();
		await trigger.hover();
		await expect(trigger).toHaveAttribute("aria-expanded", "true", { timeout: 2000 });

		await page.keyboard.press("Escape");
		await expect(trigger).toHaveAttribute("aria-expanded", "false", { timeout: 2000 });
	});

	test("clic souris sur le trigger n'effectue PAS de navigation directe", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");
		const initialUrl = page.url();

		const trigger = page.getByRole("button", { name: /Les créations/i }).first();
		await trigger.click();

		// L'URL doit rester identique. Radix gère l'ouverture/fermeture du panneau.
		await page.waitForTimeout(300);
		expect(page.url()).toBe(initialUrl);
	});

	test("le CTA 'Toutes les créations' du panneau navigue vers /produits", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const trigger = page.getByRole("button", { name: /Les créations/i }).first();
		await trigger.hover();
		await expect(trigger).toHaveAttribute("aria-expanded", "true", { timeout: 2000 });

		const cta = page.getByRole("link", { name: /Toutes les créations/i }).first();
		await cta.click();

		await page.waitForURL(/\/produits$/, { timeout: 5000 });
	});

	test("la touche Enter sur le trigger navigue (intent clavier explicite)", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const trigger = page.getByRole("button", { name: /Les créations/i }).first();
		await trigger.focus();
		await page.keyboard.press("Enter");

		await page.waitForURL(/\/produits$/, { timeout: 5000 });
	});

	test("le panneau ouvert expose un region landmark pour les lecteurs d'écran", async ({
		page,
	}) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const trigger = page.getByRole("button", { name: /Les créations/i }).first();
		await trigger.hover();
		await expect(trigger).toHaveAttribute("aria-expanded", "true", { timeout: 2000 });

		// Le wrapper MegaMenuCreations est un role=region avec aria-labelledby="Créations"
		const region = page.getByRole("region", { name: /Créations/i }).first();
		await expect(region).toBeAttached();
	});

	test("le panneau Collections expose son region landmark", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const trigger = page.getByRole("button", { name: /Les collections/i }).first();
		await trigger.hover();
		await expect(trigger).toHaveAttribute("aria-expanded", "true", { timeout: 2000 });

		const region = page.getByRole("region", { name: /Collections/i }).first();
		await expect(region).toBeAttached();
	});

	test("clic en dehors ferme le panneau", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const trigger = page.getByRole("button", { name: /Les créations/i }).first();
		await trigger.hover();
		await expect(trigger).toHaveAttribute("aria-expanded", "true", { timeout: 2000 });

		// Clic dans le main content (en dehors du mega menu)
		await page.locator("body").click({ position: { x: 640, y: 600 } });
		await expect(trigger).toHaveAttribute("aria-expanded", "false", { timeout: 2000 });
	});

	test("respecte prefers-reduced-motion sur le panneau", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const matches = await page.evaluate(
			() => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
		);
		expect(matches).toBe(true);

		const trigger = page.getByRole("button", { name: /Les créations/i }).first();
		await trigger.hover();
		await expect(trigger).toHaveAttribute("aria-expanded", "true", { timeout: 2000 });
		// Sous reduced-motion, motion-reduce:animate-none désactive l'animation
		// (vérification structurelle qu'on ne crash pas).
	});
});

test.describe("Mega menu — non rendu sur mobile", { tag: ["@regression"] }, () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test("le DesktopNav est masqué (hidden lg:flex) sur mobile", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const desktopTrigger = page.getByRole("button", { name: /^Les créations$/ });
		await expect(desktopTrigger).not.toBeVisible();
	});
});
