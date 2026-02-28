import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures";

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
	];

	for (const { path, name } of pagesToAudit) {
		test(`${name} (${path}) passe l'audit axe-core WCAG AA en dark mode`, async ({ page }) => {
			await page.goto(path);
			await page.waitForLoadState("domcontentloaded");
			await enableDarkMode(page);

			const results = await new AxeBuilder({ page })
				.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
				.analyze();

			if (results.violations.length > 0) {
				const summary = results.violations
					.map((v) => `[${v.id}] ${v.description} (${v.nodes.length} node(s))`)
					.join("\n");
				expect(results.violations, `Violations WCAG dark mode sur ${name}:\n${summary}`).toEqual(
					[],
				);
			}
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

		const results = await new AxeBuilder({ page })
			.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
			.exclude(".particle-background")
			.analyze();

		if (results.violations.length > 0) {
			const summary = results.violations
				.map((v) => `[${v.id}] ${v.description} (${v.nodes.length} node(s))`)
				.join("\n");
			expect(results.violations, `Violations WCAG dark mode fiche produit:\n${summary}`).toEqual(
				[],
			);
		}
	});

	test("Page compte passe l'audit axe-core WCAG AA en dark mode", async ({ page }) => {
		await page.goto("/compte");
		await page.waitForLoadState("domcontentloaded");

		// If redirected to login, test the login page in dark mode instead
		await enableDarkMode(page);

		const results = await new AxeBuilder({ page })
			.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
			.analyze();

		if (results.violations.length > 0) {
			const summary = results.violations
				.map((v) => `[${v.id}] ${v.description} (${v.nodes.length} node(s))`)
				.join("\n");
			expect(results.violations, `Violations WCAG dark mode page compte:\n${summary}`).toEqual([]);
		}
	});
});
