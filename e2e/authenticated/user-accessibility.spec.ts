import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures";
import { expectNoA11yViolations } from "../helpers/axe";

test.describe("Accessibilité - Pages authentifiées", { tag: ["@slow"] }, () => {
	const authenticatedPages = [
		{ path: "/compte", name: "Compte" },
		{ path: "/compte/commandes", name: "Commandes" },
		{ path: "/compte/adresses", name: "Adresses" },
		{ path: "/parametres", name: "Paramètres" },
		// P2 - Additional authenticated pages
		{ path: "/mes-avis", name: "Mes avis" },
		{ path: "/mes-demandes", name: "Mes demandes" },
	];

	for (const { path, name } of authenticatedPages) {
		test(`${name} (${path}) passe l'audit axe-core WCAG AA`, async ({ page }) => {
			await page.goto(path);
			await page.waitForLoadState("domcontentloaded");

			await expectNoA11yViolations(page, { context: name });
		});
	}

	test("Page checkout passe l'audit axe-core WCAG AA", async ({ page }) => {
		await page.goto("/paiement");
		await page.waitForLoadState("domcontentloaded");

		// If redirected because cart is empty, skip
		if (!page.url().includes("paiement")) {
			test.skip(true, "Panier vide - redirection");
			return;
		}

		await expectNoA11yViolations(page, {
			exclude: ["iframe[src*='stripe']"],
			context: "Checkout",
		});
	});

	test("Page confirmation paiement passe l'audit axe-core WCAG AA", async ({ page }) => {
		await page.goto("/paiement/confirmation");
		await page.waitForLoadState("domcontentloaded");

		await expectNoA11yViolations(page, { context: "Confirmation paiement" });
	});

	test("Détail commande passe l'audit axe-core WCAG AA", async ({ page }) => {
		await page.goto("/compte/commandes");
		await page.waitForLoadState("domcontentloaded");

		const firstOrderLink = page.locator("a[href*='/commandes/']").first();
		if ((await firstOrderLink.count()) === 0) {
			test.skip(true, "Aucune commande existante");
			return;
		}
		const href = await firstOrderLink.getAttribute("href");
		if (!href) return;
		await page.goto(href);
		await page.waitForLoadState("domcontentloaded");

		await expectNoA11yViolations(page, { context: "Détail commande" });
	});
});

// Dark mode tests for authenticated pages
async function enableDarkMode(page: Page) {
	await page.evaluate(() => document.documentElement.classList.add("dark"));
	await page.waitForTimeout(100);
}

test.describe("Accessibilité - Pages authentifiées (dark mode)", { tag: ["@slow"] }, () => {
	const authenticatedDarkPages = [
		{ path: "/compte", name: "Compte" },
		{ path: "/compte/commandes", name: "Commandes" },
		{ path: "/compte/adresses", name: "Adresses" },
		{ path: "/parametres", name: "Paramètres" },
		{ path: "/mes-avis", name: "Mes avis" },
		{ path: "/mes-demandes", name: "Mes demandes" },
	];

	for (const { path, name } of authenticatedDarkPages) {
		test(`${name} (${path}) passe l'audit axe-core WCAG AA en dark mode`, async ({ page }) => {
			await page.goto(path);
			await page.waitForLoadState("domcontentloaded");
			await enableDarkMode(page);

			await expectNoA11yViolations(page, { context: `${name} (dark mode)` });
		});
	}

	test("Checkout passe l'audit axe-core WCAG AA en dark mode", async ({ page }) => {
		await page.goto("/paiement");
		await page.waitForLoadState("domcontentloaded");

		if (!page.url().includes("paiement")) {
			test.skip(true, "Panier vide - redirection");
			return;
		}

		await enableDarkMode(page);

		await expectNoA11yViolations(page, {
			exclude: ["iframe[src*='stripe']"],
			context: "Checkout (dark mode)",
		});
	});

	test("Confirmation paiement passe l'audit axe-core WCAG AA en dark mode", async ({ page }) => {
		await page.goto("/paiement/confirmation");
		await page.waitForLoadState("domcontentloaded");
		await enableDarkMode(page);

		await expectNoA11yViolations(page, { context: "Confirmation paiement (dark mode)" });
	});

	test("Annulation paiement passe l'audit axe-core WCAG AA en dark mode", async ({ page }) => {
		await page.goto("/paiement/annulation");
		await page.waitForLoadState("domcontentloaded");
		await enableDarkMode(page);

		await expectNoA11yViolations(page, { context: "Annulation paiement (dark mode)" });
	});

	test("Retour paiement passe l'audit axe-core WCAG AA en dark mode", async ({ page }) => {
		await page.goto("/paiement/retour");
		await page.waitForLoadState("domcontentloaded");
		await enableDarkMode(page);

		await expectNoA11yViolations(page, { context: "Retour paiement (dark mode)" });
	});

	test("Détail commande passe l'audit axe-core WCAG AA en dark mode", async ({ page }) => {
		await page.goto("/compte/commandes");
		await page.waitForLoadState("domcontentloaded");

		const firstOrderLink = page.locator("a[href*='/commandes/']").first();
		if ((await firstOrderLink.count()) === 0) {
			test.skip(true, "Aucune commande existante");
			return;
		}
		const href = await firstOrderLink.getAttribute("href");
		if (!href) return;
		await page.goto(href);
		await page.waitForLoadState("domcontentloaded");
		await enableDarkMode(page);

		await expectNoA11yViolations(page, { context: "Détail commande (dark mode)" });
	});
});
