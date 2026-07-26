import { describe, expect, it } from "vitest";
import {
	badgeAriaLabel,
	getAllNavItems,
	getQuickAccessItems,
	navigationData,
	type NavItem as _NavItem,
} from "../navigation-config";

// ============================================================================
// TESTS
// ============================================================================

describe("navigationData", () => {
	// Mode "boutique en ligne" (SHOP_LIVE=true) : 6 groupes complets.
	// Si SHOP_LIVE repasse à false, restreindre à 2 groupes (Catalogue + Configuration).
	it("has 5 navigation groups in shop-live mode", () => {
		expect(navigationData.navGroups).toHaveLength(5);
	});

	/**
	 * 5 groupes et non 6 : `Clients`, `Contenu` et `Configuration` étaient des
	 * groupes MONO-ITEM — trois libellés et trois séparateurs de chrome pour trois
	 * liens. `Clients` rejoint `Pilotage` (avec le tableau de bord, qui n'avait
	 * aucune entrée nommée), `Contenu` + `Configuration` fusionnent en `Boutique`.
	 * L'ordre suit la fréquence d'usage quotidienne décroissante.
	 */
	it("includes the 5 groups in shop-live mode, ordered by daily usage", () => {
		const labels = navigationData.navGroups.map((g) => g.label);
		expect(labels).toEqual(["Pilotage", "Ventes", "Catalogue", "Marketing", "Boutique"]);
	});

	it("n'a plus aucun groupe mono-item", () => {
		const singles = navigationData.navGroups.filter((g) => g.items.length < 2).map((g) => g.label);
		expect(singles).toEqual([]);
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

	// `/admin` (tableau de bord) est la racine : elle n'a pas de segment suivant.
	it("all URLs are under /admin", () => {
		const urls = navigationData.navGroups.flatMap((g) => g.items.map((i) => i.url));
		for (const url of urls) {
			expect(url).toMatch(/^\/admin(\/|$)/);
		}
	});

	it("marks Catalogue and Marketing as collapsible in shop-live mode", () => {
		const collapsibleLabels = navigationData.navGroups
			.filter((g) => g.collapsible)
			.map((g) => g.label);
		expect(collapsibleLabels).toEqual(["Catalogue", "Marketing"]);
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
	// Plus de DASHBOARD_ITEM hors-groupe à concaténer : le tableau de bord vit dans
	// `Pilotage`. Le concaténer en tête le dupliquerait dans la recherche du menu.
	it("returns a flat array of exactly the group items (no duplicate)", () => {
		const items = getAllNavItems();
		const groupItemCount = navigationData.navGroups.reduce((acc, g) => acc + g.items.length, 0);
		expect(items).toHaveLength(groupItemCount);

		const ids = items.map((i) => i.id);
		expect(new Set(ids).size).toBe(ids.length);
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

	it("returns dashboard, orders, and products in order (shop-live mode)", () => {
		const items = getQuickAccessItems();
		expect(items.map((i) => i.id)).toEqual(["dashboard", "orders", "products"]);
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

describe("badgeAriaLabel", () => {
	it("uses the singular noun for a count of 1", () => {
		expect(badgeAriaLabel("orders", 1)).toBe("1 commande en attente");
		expect(badgeAriaLabel("refunds", 1)).toBe("1 remboursement en attente");
	});

	it("uses the plural noun for counts > 1", () => {
		expect(badgeAriaLabel("orders", 5)).toBe("5 commandes en attente");
		expect(badgeAriaLabel("refunds", 12)).toBe("12 remboursements en attente");
	});

	it("keeps the exact count even beyond the visual 99+ clamp", () => {
		expect(badgeAriaLabel("orders", 250)).toBe("250 commandes en attente");
	});

	it("falls back to a generic label for unknown ids", () => {
		expect(badgeAriaLabel("products", 3)).toBe("3 en attente");
	});
});
