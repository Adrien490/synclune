import type { Page } from "@playwright/test";

import { test, expect } from "./fixtures";
import { TIMEOUTS, VIEWPORTS } from "./constants";

/**
 * Les frontières `<ViewTransition>` des layouts — existent-elles, et animent-
 * elles ce qu'il faut, quand il faut ?
 *
 * Aucun test unitaire ne peut le dire : jsdom n'implémente pas
 * `document.startViewTransition`, et le `react` installé (19.2.x stable)
 * n'exporte même pas le composant — c'est le canary vendoré par Next qui le
 * fournit, à l'exécution seulement.
 *
 * Ces trois tests instrumentent `document.startViewTransition` avant tout
 * script de page et comptent les appels. Le troisième est le plus important :
 * il verrouille la POLARITÉ. Une frontière en `update: "auto"` nu anime aussi
 * chaque tronçon streamé par PPR — 4 transitions enchaînées de ~300 ms au
 * premier rendu de `/produits`, mesurées le 2026-08-18 — soit ~1,5 s de contenu
 * figé sur le chemin du LCP, pour une animation que personne n'a demandée.
 */

declare global {
	interface Window {
		__viewTransitionCount?: number;
	}
}

const countViewTransitions = async (page: Page) => {
	await page.addInitScript(() => {
		window.__viewTransitionCount = 0;
		if (typeof document.startViewTransition !== "function") return;
		const original = document.startViewTransition.bind(document);
		document.startViewTransition = ((...args: Parameters<typeof original>) => {
			window.__viewTransitionCount = (window.__viewTransitionCount ?? 0) + 1;
			return original(...args);
		}) as typeof document.startViewTransition;
	});
};

const readCount = (page: Page) => page.evaluate(() => window.__viewTransitionCount ?? 0);
const resetCount = (page: Page) =>
	page.evaluate(() => {
		window.__viewTransitionCount = 0;
	});

/** Attend que le streaming PPR soit retombé : sinon on compte ses commits. */
const settle = async (page: Page) => {
	await expect(page.locator("article.product-card").first()).toBeVisible({
		timeout: TIMEOUTS.FEEDBACK,
	});
	await page.waitForLoadState("networkidle");
};

test.describe("View Transitions — frontières React", { tag: ["@regression"] }, () => {
	test.skip(
		({ browserName }) => browserName !== "chromium",
		"View Transitions API is currently Chromium-only",
	);

	test.use({ viewport: VIEWPORTS.DESKTOP });

	// Le killswitch CSS de `pwa.css` coupe toute animation sous réduction de
	// mouvement : on fixe la préférence pour tester ce qu'on croit tester.
	test.beforeEach(async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "no-preference" });
	});

	test("une carte produit démarre la transition (et réveille le morph)", async ({ page }) => {
		await countViewTransitions(page);
		await page.goto("/produits");
		await settle(page);
		await resetCount(page);

		await page
			.locator("article.product-card")
			.first()
			.locator('a[href*="/creations/"]')
			.first()
			.click();
		await page.waitForURL(/\/creations\//, { timeout: TIMEOUTS.DATA_LOAD });

		await expect
			.poll(() => readCount(page), {
				timeout: TIMEOUTS.FEEDBACK,
				message:
					"Aucune transition : la frontière <ViewTransition> a disparu, le <main> " +
					"est passé hors d'elle, ou le lien de ProductCard a perdu ses `transitionTypes`.",
			})
			.toBeGreaterThan(0);
	});

	test("le streaming PPR, lui, n'en démarre AUCUNE", async ({ page }) => {
		await countViewTransitions(page);
		await page.goto("/produits");
		await settle(page);

		expect(
			await readCount(page),
			'Une frontière repassée en `update: "auto"` nu : chaque tronçon streamé ' +
				"rejoue le fondu, et le LCP paie l'addition.",
		).toBe(0);
	});

	test("cocher un filtre du rail n'en démarre AUCUNE", async ({ page }) => {
		await countViewTransitions(page);
		await page.goto("/produits");
		await settle(page);

		const colorsSection = page.locator('section[aria-labelledby="filter-compartment-rail-colors"]');
		await expect(colorsSection).toBeVisible();
		await resetCount(page);

		await colorsSection.getByRole("checkbox").first().click();
		await expect(page).toHaveURL(/[?&]color=/, { timeout: TIMEOUTS.FEEDBACK });
		await page.waitForLoadState("networkidle");

		expect(
			await readCount(page),
			"Le rail applique à la coche : son retour est le grisage `data-pending`, " +
				"pas un fondu. Une navigation du rail a réclamé `PAGE_FADE_NAVIGATION`.",
		).toBe(0);
	});
});
