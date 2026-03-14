import { describe, it, expect } from "vitest";
import { isRouteActive } from "../navigation";

describe("isRouteActive", () => {
	// Exact match
	it("returns true for exact match on /admin", () => {
		expect(isRouteActive("/admin", "/admin")).toBe(true);
	});

	it("returns true for exact match on nested route", () => {
		expect(isRouteActive("/admin/ventes/commandes", "/admin/ventes/commandes")).toBe(true);
	});

	// Dashboard special case: /admin only matches exact
	it("returns false for /admin when on nested route", () => {
		expect(isRouteActive("/admin/catalogue/produits", "/admin")).toBe(false);
	});

	it("returns false for /admin when on any admin sub-page", () => {
		expect(isRouteActive("/admin/ventes", "/admin")).toBe(false);
	});

	// Prefix match for non-dashboard routes
	it("returns true for prefix match on nested route", () => {
		expect(isRouteActive("/admin/catalogue/produits", "/admin/catalogue")).toBe(true);
	});

	it("returns true for deep prefix match", () => {
		expect(
			isRouteActive("/admin/catalogue/produits/123/modifier", "/admin/catalogue/produits"),
		).toBe(true);
	});

	// False positives prevention
	it("returns false when URL is a partial prefix but not a segment boundary", () => {
		expect(isRouteActive("/admin/catalogue-special", "/admin/catalogue")).toBe(false);
	});

	it("returns false for completely different routes", () => {
		expect(isRouteActive("/admin/ventes/commandes", "/admin/catalogue/produits")).toBe(false);
	});

	it("returns false when pathname is shorter than URL", () => {
		expect(isRouteActive("/admin/ventes", "/admin/ventes/commandes")).toBe(false);
	});
});
