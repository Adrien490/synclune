import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { requireSeedData } from "./constants";
import { expectNoA11yViolations } from "./helpers/axe";

test.describe("Accessibilité - Tunnel de paiement", { tag: ["@slow"] }, () => {
	// Retrait de l'espace client (2026-07-31) : `/commandes` et `/parametres`
	// n'existent plus. Le suivi de commande invité prend leur place — sans token
	// valide la page rend son état 404, ce qui reste une surface à auditer.
	const guestPages = [{ path: "/suivi-commande", name: "Suivi de commande" }];

	for (const { path, name } of guestPages) {
		test(`${name} (${path}) passe l'audit axe-core WCAG AA`, async ({ page }) => {
			await page.goto(path);
			await page.waitForLoadState("domcontentloaded");

			await expectNoA11yViolations(page, { context: name });
		});
	}

	test("Page checkout passe l'audit axe-core WCAG AA", async ({
		page,
		checkoutPage,
		productCatalogPage,
		cartPage,
	}) => {
		const seeded = await checkoutPage.gotoWithSeededCart(productCatalogPage, cartPage);
		requireSeedData(test, !seeded.skipped, seeded.skipped ? seeded.reason : "");
		if (seeded.skipped) return;

		await expectNoA11yViolations(page, {
			exclude: ["iframe[src*='stripe']"],
			context: "Checkout",
		});
	});

	/**
	 * `/paiement/retour` sans session rend l'état « Commande introuvable » — une
	 * vraie surface (plus de redirect depuis le checkout hébergé, lot 3) : elle
	 * s'audite directement.
	 */
	test("La landing de retour (état introuvable) passe l'audit axe-core WCAG AA", async ({
		page,
	}) => {
		await page.goto("/paiement/retour");
		await page.waitForLoadState("domcontentloaded");
		await expect(page.getByRole("heading", { name: /Commande introuvable/i })).toBeVisible();

		await expectNoA11yViolations(page, { context: "Retour checkout (introuvable)" });
	});
});

// Dark mode tests for authenticated pages
async function enableDarkMode(page: Page) {
	await page.evaluate(() => document.documentElement.classList.add("dark"));
	await page.waitForTimeout(100);
}

test.describe("Accessibilité - Tunnel de paiement (dark mode)", { tag: ["@slow"] }, () => {
	const guestDarkPages = [{ path: "/suivi-commande", name: "Suivi de commande" }];

	for (const { path, name } of guestDarkPages) {
		test(`${name} (${path}) passe l'audit axe-core WCAG AA en dark mode`, async ({ page }) => {
			await page.goto(path);
			await page.waitForLoadState("domcontentloaded");
			await enableDarkMode(page);

			await expectNoA11yViolations(page, { context: `${name} (dark mode)` });
		});
	}

	test("Checkout passe l'audit axe-core WCAG AA en dark mode", async ({
		page,
		checkoutPage,
		productCatalogPage,
		cartPage,
	}) => {
		const seeded = await checkoutPage.gotoWithSeededCart(productCatalogPage, cartPage);
		requireSeedData(test, !seeded.skipped, seeded.skipped ? seeded.reason : "");
		if (seeded.skipped) return;

		await enableDarkMode(page);

		await expectNoA11yViolations(page, {
			exclude: ["iframe[src*='stripe']"],
			context: "Checkout (dark mode)",
		});
	});

	test("Annulation paiement passe l'audit axe-core WCAG AA en dark mode", async ({ page }) => {
		await page.goto("/paiement/annulation");
		await page.waitForLoadState("domcontentloaded");
		await enableDarkMode(page);

		await expectNoA11yViolations(page, { context: "Annulation paiement (dark mode)" });
	});
});
