import { describe, it, expect } from "vitest";
import { isCatalogueRoute, isProductDetailRoute, isRouteActive } from "../navigation";

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

/**
 * Le « rayon catalogue » — SSOT de ce qu'un onglet unique « Créations » doit
 * représenter. Née de l'audit design du 2026-08-04 : la barre du bas décidait son
 * onglet Accueil par égalité stricte sur `/`, et aucun de ses onglets ne couvrait
 * `/produits`, `/creations/*` ni `/collections/*` — donc rien n'était allumé sur
 * l'essentiel du parcours.
 */
describe("isCatalogueRoute", () => {
	it.each([
		["/produits"],
		["/produits/bagues"],
		["/creations/collier-maree-basse"],
		["/collections"],
		["/collections/ete"],
	])("couvre %s", (pathname) => {
		expect(isCatalogueRoute(pathname)).toBe(true);
	});

	it.each([["/"], ["/favoris"], ["/panier"], ["/cgv"], ["/aide"], ["/paiement"]])(
		"ne couvre pas %s",
		(pathname) => {
			expect(isCatalogueRoute(pathname)).toBe(false);
		},
	);

	// Le piège classique du `startsWith` sans slash : une route voisine dont le
	// nom commence par le même préfixe ne fait PAS partie du rayon.
	it("ne mord pas sur une route voisine au préfixe commun", () => {
		expect(isCatalogueRoute("/produits-du-terroir")).toBe(false);
		expect(isCatalogueRoute("/collections-privees")).toBe(false);
	});
});

describe("isProductDetailRoute", () => {
	it("reconnaît une fiche produit", () => {
		expect(isProductDetailRoute("/creations/bague-fougere")).toBe(true);
	});

	it("ne reconnaît ni la racine du rayon ni une route voisine", () => {
		expect(isProductDetailRoute("/creations")).toBe(false);
		expect(isProductDetailRoute("/creations-speciales/x")).toBe(false);
	});
});
