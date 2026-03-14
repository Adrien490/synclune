import { describe, it, expect } from "vitest";
import { getAllNavItems, navigationData } from "../navigation-config";
import { getInitials } from "../sidebar-footer-user";
import { generateBreadcrumbs } from "../dashboard-breadcrumb";

// ============================================================================
// getInitials
// ============================================================================

describe("getInitials", () => {
	it("returns two initials for a two-word name", () => {
		expect(getInitials("Jean Dupont")).toBe("JD");
	});

	it("returns first initial for a single word", () => {
		expect(getInitials("Admin")).toBe("A");
	});

	it("returns at most 2 initials for 3+ word names", () => {
		expect(getInitials("Jean Claude Dupont")).toBe("JC");
	});

	it("returns uppercase initials", () => {
		expect(getInitials("jean dupont")).toBe("JD");
	});

	it("returns empty string for empty input", () => {
		expect(getInitials("")).toBe("");
	});
});

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

	it("returns items from all groups", () => {
		const items = getAllNavItems();
		const totalFromGroups = navigationData.navGroups.reduce(
			(sum, group) => sum + group.items.length,
			0,
		);
		expect(items).toHaveLength(totalFromGroups);
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

	it("collapsible groups are only Marketing and Configuration", () => {
		const collapsibleGroups = navigationData.navGroups
			.filter((g) => g.collapsible)
			.map((g) => g.label);
		expect(collapsibleGroups).toEqual(["Marketing", "Configuration"]);
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
