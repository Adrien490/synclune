import { test, expect } from "./fixtures";

/**
 * Mega menu desktop — UI/UX comportements clés.
 *
 * Le mega menu (Base UI `NavigationMenu` depuis 2026-08-04) n'est rendu qu'à
 * partir de `lg` (1024px). Il s'ouvre au survol du trigger et se ferme sur
 * Échap, clic extérieur ou Tab vers l'extérieur.
 *
 * ⚠️ **Contrat du déclencheur — corrigé le 2026-08-04.** Cet en-tête et deux
 * tests affirmaient l'inverse de ce que fait le code : « le clic souris
 * n'effectue PAS de navigation (seul Enter le fait) ». L'implémentation
 * (`desktop-nav.tsx`) et les tests unitaires (`desktop-nav.test.tsx`) disent
 * depuis toujours le contraire, et c'est le comportement voulu (F3) :
 *
 * - **clic souris** sur pointeur fin → navigue vers la page section (le survol a
 *   déjà montré le panneau) ;
 * - **Entrée / Espace** (clic synthétisé, `detail === 0`) → OUVRE le panneau,
 *   sans quoi ses liens seraient injoignables au clavier ;
 * - **tap tactile** → ouvre le panneau, le CTA interne prenant le relais.
 *
 * La contradiction était restée invisible parce que la suite ne peut pas
 * s'exécuter sur une base sans type de produit : `hasDropdown` est alors faux, le
 * trigger est rendu en `<a>` et tous les tests échouent sur le locator. D'où le
 * garde d'environnement ci-dessous, qui saute explicitement plutôt que d'expirer.
 *
 * Structurel : on vérifie présence/absence d'éléments, attributs ARIA et états.
 */

const DESKTOP_VIEWPORT = { width: 1280, height: 800 };

test.describe("Mega menu desktop", { tag: ["@regression"] }, () => {
	test.use({ viewport: DESKTOP_VIEWPORT });

	// Garde d'environnement. `getDesktopNavItems` ne pose `hasDropdown` que s'il
	// existe au moins un type de produit actif : sur une base non seedée, l'entrée
	// est rendue en `<a>` et les dix tests expiraient sur le locator au bout de
	// 30s chacun, en masquant leur vraie cause. On saute explicitement.
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");
		const triggerCount = await page.getByRole("button", { name: /Les créations/i }).count();
		test.skip(
			triggerCount === 0,
			"Catalogue vide (aucun type de produit publié) : le mega-menu n'est pas monté.",
		);
	});

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

	test("clic souris sur le trigger navigue vers la page section", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const trigger = page.getByRole("button", { name: /Les créations/i }).first();
		await trigger.click();

		// Le survol a déjà révélé le panneau : le clic va droit au catalogue.
		await page.waitForURL(/\/produits$/, { timeout: 5000 });
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

	test("la touche Enter sur le trigger ouvre le panneau au lieu de naviguer", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");
		const initialUrl = page.url();

		const trigger = page.getByRole("button", { name: /Les créations/i }).first();
		await trigger.focus();
		await page.keyboard.press("Enter");

		// Naviguer ici rendrait les liens du panneau injoignables au clavier : ils
		// ne sont montés que panneau ouvert.
		await expect(trigger).toHaveAttribute("aria-expanded", "true", { timeout: 2000 });
		expect(page.url()).toBe(initialUrl);
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

		// Le panneau anime désormais par TRANSITION (`data-starting-style` /
		// `data-ending-style` de Base UI), toutes gatées `motion-safe:`. Sous
		// reduced-motion, on attend donc les DEUX : aucune keyframe n'a été
		// réintroduite, et aucune transition n'est appliquée.
		const popup = page.locator('[data-slot="navigation-menu-popup"][data-open]').first();
		await expect(popup).toBeVisible();
		const { animationName, transitionDuration } = await popup.evaluate((el) => {
			const style = getComputedStyle(el);
			return { animationName: style.animationName, transitionDuration: style.transitionDuration };
		});
		expect(animationName).toBe("none");
		expect(transitionDuration).toBe("0s");

		// Le killswitch `.animate-out` reste vérifié ici bien que le panneau ne s'en
		// serve plus : il avait échappé au `animations.css`, et le compensatoire
		// `motion-reduce:animate-none` perdait en spécificité contre
		// `data-[state=closed]:animate-out` (0,1,0 vs 0,2,0).
		const animationNameOut = await page.evaluate(() => {
			const el = document.createElement("div");
			el.className = "animate-out";
			document.body.appendChild(el);
			const name = getComputedStyle(el).animationName;
			el.remove();
			return name;
		});
		expect(animationNameOut).toBe("none");
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
