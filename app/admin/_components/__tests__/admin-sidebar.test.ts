import { describe, it, expect } from "vitest";
import { getAllNavItems, navigationData } from "../navigation-config";
import { generateBreadcrumbs } from "../dashboard-breadcrumb";

// ============================================================================
// getAllNavItems
// ============================================================================

describe("getAllNavItems", () => {
	it("returns a flat list of all nav items", () => {
		const items = getAllNavItems();
		expect(items.length).toBeGreaterThan(0);

		// Every item has required properties
		for (const item of items) {
			expect(item.id).toBeTruthy();
			expect(item.title).toBeTruthy();
			expect(item.url).toBeTruthy();
			expect(item.icon).toBeDefined();
		}
	});

	it("returns items from all groups plus standalone items", () => {
		const items = getAllNavItems();
		const totalFromGroups = navigationData.navGroups.reduce(
			(sum, group) => sum + group.items.length,
			0,
		);
		// +1 for DASHBOARD_ITEM (standalone, not in navGroups)
		expect(items).toHaveLength(totalFromGroups + 1);
	});

	it("has no duplicate IDs", () => {
		const items = getAllNavItems();
		const ids = items.map((item) => item.id);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(ids.length);
	});

	it("all URLs start with /admin", () => {
		const items = getAllNavItems();
		for (const item of items) {
			expect(item.url).toMatch(/^\/admin/);
		}
	});
});

// ============================================================================
// Navigation config integrity
// ============================================================================

describe("navigation config integrity", () => {
	it("all URLs are valid paths (start with / and contain no spaces)", () => {
		const items = getAllNavItems();
		for (const item of items) {
			expect(item.url).toMatch(/^\/[^\s]*$/);
		}
	});

	it("all groups have a label", () => {
		for (const group of navigationData.navGroups) {
			expect(group.label).toBeTruthy();
		}
	});

	it("all groups have at least one item", () => {
		for (const group of navigationData.navGroups) {
			expect(group.items.length).toBeGreaterThan(0);
		}
	});

	it("collapsible groups are Catalogue and Marketing (shop-live mode)", () => {
		// SHOP_LIVE=true expose les groupes Marketing et Contenu. Si SHOP_LIVE
		// repasse à false, restreindre cette liste à ["Catalogue"].
		const collapsibleGroups = navigationData.navGroups
			.filter((g) => g.collapsible)
			.map((g) => g.label);
		expect(collapsibleGroups).toEqual(["Catalogue", "Marketing"]);
	});
});

// ============================================================================
// generateBreadcrumbs
// ============================================================================

describe("generateBreadcrumbs", () => {
	it("returns only dashboard for /admin", () => {
		const crumbs = generateBreadcrumbs("/admin");
		expect(crumbs).toHaveLength(1);
		expect(crumbs[0]!.label).toBe("Tableau de bord");
		expect(crumbs[0]!.isCurrentPage).toBe(true);
	});

	it("returns dashboard + matched nav item for a known route", () => {
		const crumbs = generateBreadcrumbs("/admin/ventes/commandes");
		expect(crumbs).toHaveLength(3);
		expect(crumbs[0]!.label).toBe("Tableau de bord");
		expect(crumbs[0]!.isCurrentPage).toBe(false);
		expect(crumbs[2]!.label).toBe("Commandes");
		expect(crumbs[2]!.isCurrentPage).toBe(true);
	});

	it("formats unknown segments from kebab-case", () => {
		const crumbs = generateBreadcrumbs("/admin/unknown-section/some-page");
		expect(crumbs).toHaveLength(3);
		expect(crumbs[1]!.label).toBe("Unknown Section");
		expect(crumbs[2]!.label).toBe("Some Page");
	});

	it("handles special 'nouveau' segment", () => {
		const crumbs = generateBreadcrumbs("/admin/catalogue/produits/nouveau");
		expect(crumbs).toHaveLength(4);
		expect(crumbs[3]!.label).toBe("Nouveau");
		expect(crumbs[3]!.isCurrentPage).toBe(true);
	});

	it("handles special 'modifier' segment", () => {
		const crumbs = generateBreadcrumbs("/admin/catalogue/produits/modifier");
		expect(crumbs).toHaveLength(4);
		expect(crumbs[3]!.label).toBe("Modifier");
	});

	it("handles special 'variantes' segment", () => {
		const crumbs = generateBreadcrumbs("/admin/catalogue/produits/variantes");
		expect(crumbs).toHaveLength(4);
		expect(crumbs[3]!.label).toBe("Variantes");
	});

	it("builds correct hrefs for each segment", () => {
		const crumbs = generateBreadcrumbs("/admin/ventes/commandes");
		expect(crumbs[0]!.href).toBe("/admin");
		expect(crumbs[1]!.href).toBe("/admin/ventes");
		expect(crumbs[2]!.href).toBe("/admin/ventes/commandes");
	});

	it("only last segment is current page", () => {
		const crumbs = generateBreadcrumbs("/admin/catalogue/produits/nouveau");
		const currentPages = crumbs.filter((c) => c.isCurrentPage);
		expect(currentPages).toHaveLength(1);
		expect(currentPages[0]!.href).toBe("/admin/catalogue/produits/nouveau");
	});

	it("handles deep routes (5+ segments)", () => {
		const crumbs = generateBreadcrumbs("/admin/catalogue/produits/123/variantes/456");
		expect(crumbs).toHaveLength(6);
		expect(crumbs[5]!.isCurrentPage).toBe(true);
	});
});
