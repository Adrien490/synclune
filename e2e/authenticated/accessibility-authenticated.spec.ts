import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "../fixtures";

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

			const results = await new AxeBuilder({ page })
				.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
				.analyze();

			if (results.violations.length > 0) {
				const summary = results.violations
					.map((v) => `[${v.id}] ${v.description} (${v.nodes.length} node(s))`)
					.join("\n");
				expect(results.violations, `Violations WCAG sur ${name}:\n${summary}`).toEqual([]);
			}
		});
	}

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

		const results = await new AxeBuilder({ page })
			.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
			.analyze();

		if (results.violations.length > 0) {
			const summary = results.violations
				.map((v) => `[${v.id}] ${v.description} (${v.nodes.length} node(s))`)
				.join("\n");
			expect(results.violations, `Violations WCAG détail commande:\n${summary}`).toEqual([]);
		}
	});
});
