import { describe, expect, it } from "vitest";
import {
	getAllNavItems,
	getQuickAccessItems,
	navigationData,
	type NavItem as _NavItem,
} from "../navigation-config";

// ============================================================================
// TESTS
// ============================================================================

describe("navigationData", () => {
	// Mode "boutique fermée" (SHOP_LIVE=false) : seuls Catalogue + Configuration.
	// Au passage SHOP_LIVE=true, restaurer ces assertions à 6 groupes
	// (Ventes, Clients, Catalogue, Marketing, Contenu, Configuration).
	it("has 2 navigation groups in shop-closed mode", () => {
		expect(navigationData.navGroups).toHaveLength(2);
	});

	it("only includes Catalogue and Configuration groups in shop-closed mode", () => {
		const labels = navigationData.navGroups.map((g) => g.label);
		expect(labels).toEqual(["Catalogue", "Configuration"]);
	});

	it("has unique group labels", () => {
		const labels = navigationData.navGroups.map((g) => g.label);
		expect(new Set(labels).size).toBe(labels.length);
	});

	it("has unique item IDs across all groups", () => {
		const ids = navigationData.navGroups.flatMap((g) => g.items.map((i) => i.id));
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("has unique item URLs across all groups", () => {
		const urls = navigationData.navGroups.flatMap((g) => g.items.map((i) => i.url));
		expect(new Set(urls).size).toBe(urls.length);
	});

	it("all items have required fields", () => {
		const items = navigationData.navGroups.flatMap((g) => g.items);
		for (const item of items) {
			expect(item.id).toBeTruthy();
			expect(item.title).toBeTruthy();
			expect(item.url).toBeTruthy();
			expect(item.icon).toBeDefined();
		}
	});

	it("all URLs start with /admin/", () => {
		const urls = navigationData.navGroups.flatMap((g) => g.items.map((i) => i.url));
		for (const url of urls) {
			expect(url).toMatch(/^\/admin\//);
		}
	});

	it("marks Catalogue as collapsible in shop-closed mode", () => {
		const collapsibleLabels = navigationData.navGroups
			.filter((g) => g.collapsible)
			.map((g) => g.label);
		expect(collapsibleLabels).toContain("Catalogue");
		expect(collapsibleLabels).toHaveLength(1);
	});

	it("has shortTitle on items that need it", () => {
		const allItems = navigationData.navGroups.flatMap((g) => g.items);
		const withShortTitle = allItems.filter((i) => i.shortTitle);
		expect(withShortTitle.length).toBeGreaterThan(0);
		for (const item of withShortTitle) {
			expect(item.shortTitle!.length).toBeLessThan(item.title.length);
		}
	});
});

describe("getAllNavItems", () => {
	it("returns a flat array of all nav items plus dashboard", () => {
		const items = getAllNavItems();
		const groupItemCount = navigationData.navGroups.reduce((acc, g) => acc + g.items.length, 0);
		// +1 for DASHBOARD_ITEM
		expect(items).toHaveLength(groupItemCount + 1);
	});

	it("has dashboard as the first item", () => {
		const items = getAllNavItems();
		expect(items[0]!.id).toBe("dashboard");
		expect(items[0]!.title).toBe("Tableau de bord");
		expect(items[0]!.url).toBe("/admin");
	});

	it("includes all group items after dashboard", () => {
		const items = getAllNavItems();
		const groupItems = navigationData.navGroups.flatMap((g) => g.items);
		for (const groupItem of groupItems) {
			expect(items.find((i) => i.id === groupItem.id)).toBeDefined();
		}
	});
});

describe("getQuickAccessItems", () => {
	it("returns exactly 3 items", () => {
		const items = getQuickAccessItems();
		expect(items).toHaveLength(3);
	});

	it("returns dashboard, store-settings, and products in order (shop-closed mode)", () => {
		const items = getQuickAccessItems();
		expect(items.map((i) => i.id)).toEqual(["dashboard", "store-settings", "products"]);
	});

	it("returns valid NavItem objects", () => {
		const items = getQuickAccessItems();
		for (const item of items) {
			expect(item).toHaveProperty("id");
			expect(item).toHaveProperty("title");
			expect(item).toHaveProperty("url");
			expect(item).toHaveProperty("icon");
		}
	});
});
