import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "../fixtures";

test.describe("Accessibilité - Pages admin", { tag: ["@slow"] }, () => {
	const adminPages = [
		{ path: "/admin", name: "Dashboard" },
		{ path: "/admin/catalogue/produits", name: "Produits" },
		{ path: "/admin/catalogue/produits/nouveau", name: "Nouveau produit" },
		{ path: "/admin/catalogue/collections", name: "Collections" },
		{ path: "/admin/catalogue/couleurs", name: "Couleurs" },
		{ path: "/admin/catalogue/materiaux", name: "Matériaux" },
		{ path: "/admin/ventes/commandes", name: "Commandes admin" },
		{ path: "/admin/ventes/remboursements", name: "Remboursements" },
		{ path: "/admin/marketing/avis", name: "Avis" },
		{ path: "/admin/marketing/discounts", name: "Discounts" },
		{ path: "/admin/marketing/newsletter", name: "Newsletter" },
		{ path: "/admin/marketing/personnalisations", name: "Personnalisations" },
		{ path: "/admin/catalogue/types-de-produits", name: "Types de produits" },
	];

	for (const { path, name } of adminPages) {
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

	test("la navigation admin a des labels accessibles", async ({ page }) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		const navElements = page.getByRole("navigation");
		const count = await navElements.count();
		expect(count).toBeGreaterThan(0);

		for (let i = 0; i < count; i++) {
			const nav = navElements.nth(i);
			const label = await nav.getAttribute("aria-label");
			const labelledby = await nav.getAttribute("aria-labelledby");
			expect(label || labelledby, `Navigation ${i} dans l'admin sans nom accessible`).toBeTruthy();
		}
	});

	test("les tableaux admin ont des en-têtes accessibles", async ({ page }) => {
		await page.goto("/admin/ventes/commandes");
		await page.waitForLoadState("domcontentloaded");

		const tables = page.getByRole("table");
		const count = await tables.count();
		if (count === 0) return;

		for (let i = 0; i < count; i++) {
			const table = tables.nth(i);
			const headers = table.getByRole("columnheader");
			const headerCount = await headers.count();
			expect(headerCount, `Table ${i} doit avoir des en-têtes`).toBeGreaterThan(0);
		}
	});

	test("Détail commande admin passe l'audit axe-core WCAG AA", async ({ page }) => {
		await page.goto("/admin/ventes/commandes");
		await page.waitForLoadState("domcontentloaded");

		const firstLink = page.locator("a[href*='/admin/ventes/commandes/']").first();
		if ((await firstLink.count()) === 0) {
			test.skip(true, "Aucune commande dans la base");
			return;
		}
		const href = await firstLink.getAttribute("href");
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
			expect(results.violations, `Violations WCAG détail commande admin:\n${summary}`).toEqual([]);
		}
	});

	test("Modifier produit admin passe l'audit axe-core WCAG AA", async ({ page }) => {
		await page.goto("/admin/catalogue/produits");
		await page.waitForLoadState("domcontentloaded");

		const editLink = page.locator("a[href*='/modifier']").first();
		if ((await editLink.count()) === 0) {
			test.skip(true, "Aucun produit modifiable");
			return;
		}
		const href = await editLink.getAttribute("href");
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
			expect(results.violations, `Violations WCAG modifier produit:\n${summary}`).toEqual([]);
		}
	});

	test("Modifier collection admin passe l'audit axe-core WCAG AA", async ({ page }) => {
		await page.goto("/admin/catalogue/collections");
		await page.waitForLoadState("domcontentloaded");

		const editLink = page.locator("a[href*='/collections/'][href*='/modifier']").first();
		if ((await editLink.count()) === 0) {
			test.skip(true, "Aucune collection modifiable");
			return;
		}
		const href = await editLink.getAttribute("href");
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
			expect(results.violations, `Violations WCAG modifier collection:\n${summary}`).toEqual([]);
		}
	});
});
