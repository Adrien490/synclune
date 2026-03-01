import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures";
import { expectNoA11yViolations } from "../helpers/axe";

async function enableDarkMode(page: Page) {
	await page.evaluate(() => document.documentElement.classList.add("dark"));
	// Allow CSS transitions to settle
	await page.waitForTimeout(100);
}

test.describe("Accessibilité - Dark mode axe-core", { tag: ["@slow"] }, () => {
	const pagesToAudit = [
		{ path: "/", name: "Homepage" },
		{ path: "/produits", name: "Catalogue" },
		{ path: "/connexion", name: "Connexion" },
		{ path: "/collections", name: "Collections" },
		{ path: "/favoris", name: "Favoris" },
		{ path: "/personnalisation", name: "Personnalisation" },
		{ path: "/inscription", name: "Inscription" },
		{ path: "/mot-de-passe-oublie", name: "Mot de passe oublié" },
		// Added pages
		{ path: "/a-propos", name: "À propos" },
		{ path: "/reinitialiser-mot-de-passe", name: "Réinitialiser mot de passe" },
		{ path: "/renvoyer-verification", name: "Renvoyer vérification" },
		{ path: "/verifier-email", name: "Vérifier email" },
		{ path: "/cgv", name: "CGV" },
		{ path: "/~offline", name: "Page offline" },
	];

	for (const { path, name } of pagesToAudit) {
		test(`${name} (${path}) passe l'audit axe-core WCAG AA en dark mode`, async ({ page }) => {
			await page.goto(path);
			await page.waitForLoadState("domcontentloaded");
			await enableDarkMode(page);

			await expectNoA11yViolations(page, { context: `${name} (dark mode)` });
		});
	}

	test("Fiche produit passe l'audit axe-core WCAG AA en dark mode", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const firstLink = page.locator("article a[href*='/creations/']").first();
		if ((await firstLink.count()) === 0) {
			test.skip(true, "Pas de produits dans la base");
			return;
		}
		const href = await firstLink.getAttribute("href");
		if (!href) return;
		await page.goto(href);
		await page.waitForLoadState("domcontentloaded");
		await enableDarkMode(page);

		await expectNoA11yViolations(page, { context: "Fiche produit (dark mode)" });
	});

	test("Page catégorie passe l'audit axe-core WCAG AA en dark mode", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const categoryLink = page.locator("a[href*='/produits/']").first();
		if ((await categoryLink.count()) === 0) {
			test.skip(true, "Pas de catégories de produits");
			return;
		}
		const href = await categoryLink.getAttribute("href");
		if (!href || href === "/produits") return;
		await page.goto(href);
		await page.waitForLoadState("domcontentloaded");
		await enableDarkMode(page);

		await expectNoA11yViolations(page, { context: "Catégorie produits (dark mode)" });
	});

	test("Collection detail passe l'audit axe-core WCAG AA en dark mode", async ({ page }) => {
		await page.goto("/collections");
		await page.waitForLoadState("domcontentloaded");

		const firstLink = page.locator("a[href*='/collections/']").first();
		if ((await firstLink.count()) === 0) {
			test.skip(true, "Pas de collections dans la base");
			return;
		}
		const href = await firstLink.getAttribute("href");
		if (!href) return;
		await page.goto(href);
		await page.waitForLoadState("domcontentloaded");
		await enableDarkMode(page);

		await expectNoA11yViolations(page, { context: "Collection detail (dark mode)" });
	});

	test("Page compte passe l'audit axe-core WCAG AA en dark mode", async ({ page }) => {
		await page.goto("/compte");
		await page.waitForLoadState("domcontentloaded");

		// If redirected to login, test the login page in dark mode instead
		await enableDarkMode(page);

		await expectNoA11yViolations(page, { context: "Page compte (dark mode)" });
	});
});
