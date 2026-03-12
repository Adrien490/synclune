import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockNavState = vi.hoisted(() => ({
	pathname: "/",
	searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
	usePathname: () => mockNavState.pathname,
	useSearchParams: () => mockNavState.searchParams,
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks are set up)
// ---------------------------------------------------------------------------

import { useActiveNavbarItem } from "../use-active-navbar-item";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setPath(pathname: string, search = "") {
	mockNavState.pathname = pathname;
	mockNavState.searchParams = new URLSearchParams(search);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useActiveNavbarItem", () => {
	// -------------------------------------------------------------------------
	// isMenuItemActive
	// -------------------------------------------------------------------------

	describe("isMenuItemActive", () => {
		// Home page — exact match only
		describe("home page (/)", () => {
			it("is active when pathname is /", () => {
				setPath("/");
				const { result } = renderHook(() => useActiveNavbarItem());
				expect(result.current.isMenuItemActive("/")).toBe(true);
			});

			it("is NOT active on a non-root pathname", () => {
				setPath("/produits");
				const { result } = renderHook(() => useActiveNavbarItem());
				expect(result.current.isMenuItemActive("/")).toBe(false);
			});

			it("is NOT active on a subpath like /produits/bague", () => {
				setPath("/produits/bague");
				const { result } = renderHook(() => useActiveNavbarItem());
				expect(result.current.isMenuItemActive("/")).toBe(false);
			});
		});

		// Exact path matching
		describe("exact path matching", () => {
			it("returns true for an exact pathname match", () => {
				setPath("/produits");
				const { result } = renderHook(() => useActiveNavbarItem());
				expect(result.current.isMenuItemActive("/produits")).toBe(true);
			});

			it("returns false when pathname does not match", () => {
				setPath("/collections");
				const { result } = renderHook(() => useActiveNavbarItem());
				expect(result.current.isMenuItemActive("/produits")).toBe(false);
			});
		});

		// Subpath matching
		describe("subpath matching", () => {
			it("is active when pathname starts with href + /", () => {
				setPath("/produits/bagues");
				const { result } = renderHook(() => useActiveNavbarItem());
				expect(result.current.isMenuItemActive("/produits")).toBe(true);
			});

			it("is active for deeply nested subpaths", () => {
				setPath("/produits/bagues/bague-or-18k");
				const { result } = renderHook(() => useActiveNavbarItem());
				expect(result.current.isMenuItemActive("/produits")).toBe(true);
			});

			it("does not match a path that starts with href but lacks the separator slash", () => {
				// /produitsExtra does NOT start with /produits/ so should be false
				setPath("/produitsExtra");
				const { result } = renderHook(() => useActiveNavbarItem());
				expect(result.current.isMenuItemActive("/produits")).toBe(false);
			});

			it("is active for /collections subpaths", () => {
				setPath("/collections/printemps-2026");
				const { result } = renderHook(() => useActiveNavbarItem());
				expect(result.current.isMenuItemActive("/collections")).toBe(true);
			});

			it("is active for /commandes subpaths", () => {
				setPath("/commandes/ORD-001");
				const { result } = renderHook(() => useActiveNavbarItem());
				expect(result.current.isMenuItemActive("/commandes")).toBe(true);
			});
		});

		// Query param matching
		describe("query param matching", () => {
			it("is active when pathname and query params both match", () => {
				setPath("/produits", "sortBy=best-selling");
				const { result } = renderHook(() => useActiveNavbarItem());
				expect(result.current.isMenuItemActive("/produits?sortBy=best-selling")).toBe(true);
			});

			it("is still active when pathname matches but query param value differs (general path match fallback)", () => {
				// The hook tries the query-param branch first; if params don't match it falls
				// through to the general branch (lines 52-61) which matches on path alone.
				setPath("/produits", "sortBy=newest");
				const { result } = renderHook(() => useActiveNavbarItem());
				expect(result.current.isMenuItemActive("/produits?sortBy=best-selling")).toBe(true);
			});

			it("is still active when query param is missing from current URL (general path match fallback)", () => {
				// Same fallback: the query branch doesn't match, but the general branch does.
				setPath("/produits");
				const { result } = renderHook(() => useActiveNavbarItem());
				expect(result.current.isMenuItemActive("/produits?sortBy=best-selling")).toBe(true);
			});

			it("is active when pathname is a subpath and query params match", () => {
				setPath("/produits/bagues", "sortBy=best-selling");
				const { result } = renderHook(() => useActiveNavbarItem());
				expect(result.current.isMenuItemActive("/produits?sortBy=best-selling")).toBe(true);
			});

			it("is active when multiple query params all match", () => {
				setPath("/produits", "sortBy=newest&category=bagues");
				const { result } = renderHook(() => useActiveNavbarItem());
				expect(result.current.isMenuItemActive("/produits?sortBy=newest&category=bagues")).toBe(
					true,
				);
			});

			it("is still active when one required query param does not match (general path match fallback)", () => {
				// The hook's query-param branch fails (category param absent) then falls
				// through to the general path branch, which matches /produits exactly.
				setPath("/produits", "sortBy=newest");
				const { result } = renderHook(() => useActiveNavbarItem());
				expect(result.current.isMenuItemActive("/produits?sortBy=newest&category=bagues")).toBe(
					true,
				);
			});
		});

		// Special case: /creations/* maps to /produits
		describe("special case: /creations/* → /produits", () => {
			it("makes /produits active when on a /creations/* detail page", () => {
				setPath("/creations/bague-or-rose-18k");
				const { result } = renderHook(() => useActiveNavbarItem());
				expect(result.current.isMenuItemActive("/produits")).toBe(true);
			});

			it("makes /produits active for deeply nested /creations paths", () => {
				setPath("/creations/category/bague-or-rose-18k");
				const { result } = renderHook(() => useActiveNavbarItem());
				expect(result.current.isMenuItemActive("/produits")).toBe(true);
			});

			it("does NOT make /collections active when on a /creations/* page", () => {
				setPath("/creations/bague-or-rose-18k");
				const { result } = renderHook(() => useActiveNavbarItem());
				expect(result.current.isMenuItemActive("/collections")).toBe(false);
			});

			it("does NOT make /creations active (no /creations nav item)", () => {
				// Visiting /creations itself is different from /creations/*
				// The hook checks pathname.startsWith("/creations/") – note the trailing slash
				setPath("/creations");
				const { result } = renderHook(() => useActiveNavbarItem());
				// /produits is NOT active because /creations !== /produits
				// and /creations does not start with /creations/
				expect(result.current.isMenuItemActive("/produits")).toBe(false);
			});
		});

		// Negative cases
		describe("negative cases", () => {
			it("returns false when href is /produits and pathname is /collections", () => {
				setPath("/collections");
				const { result } = renderHook(() => useActiveNavbarItem());
				expect(result.current.isMenuItemActive("/produits")).toBe(false);
			});

			it("returns false when href is /personnalisation and pathname is /produits", () => {
				setPath("/produits");
				const { result } = renderHook(() => useActiveNavbarItem());
				expect(result.current.isMenuItemActive("/personnalisation")).toBe(false);
			});
		});
	});

	// -------------------------------------------------------------------------
	// getCurrentScope
	// -------------------------------------------------------------------------

	describe("getCurrentScope", () => {
		it("returns null for the home page", () => {
			setPath("/");
			const { result } = renderHook(() => useActiveNavbarItem());
			expect(result.current.getCurrentScope()).toBeNull();
		});

		it("returns 'Les créations' scope for /produits", () => {
			setPath("/produits");
			const { result } = renderHook(() => useActiveNavbarItem());
			const scope = result.current.getCurrentScope();
			expect(scope).not.toBeNull();
			expect(scope?.label).toBe("Les créations");
			expect(scope?.href).toBe("/produits");
		});

		it("returns 'Les créations' scope for /produits subpaths", () => {
			setPath("/produits/bagues");
			const { result } = renderHook(() => useActiveNavbarItem());
			const scope = result.current.getCurrentScope();
			expect(scope?.label).toBe("Les créations");
		});

		it("returns 'Les créations' scope for /creations/* detail pages", () => {
			setPath("/creations/bague-or-rose");
			const { result } = renderHook(() => useActiveNavbarItem());
			const scope = result.current.getCurrentScope();
			expect(scope?.label).toBe("Les créations");
			expect(scope?.href).toBe("/produits");
		});

		it("returns 'Les collections' scope for /collections", () => {
			setPath("/collections");
			const { result } = renderHook(() => useActiveNavbarItem());
			const scope = result.current.getCurrentScope();
			expect(scope?.label).toBe("Les collections");
			expect(scope?.href).toBe("/collections");
		});

		it("returns 'Les collections' scope for /collections subpaths", () => {
			setPath("/collections/printemps-2026");
			const { result } = renderHook(() => useActiveNavbarItem());
			const scope = result.current.getCurrentScope();
			expect(scope?.label).toBe("Les collections");
		});

		it("returns 'Personnalisation' scope for /personnalisation", () => {
			setPath("/personnalisation");
			const { result } = renderHook(() => useActiveNavbarItem());
			const scope = result.current.getCurrentScope();
			expect(scope?.label).toBe("Personnalisation");
			expect(scope?.href).toBe("/personnalisation");
		});

		it("returns null for a /personnalisation subpath (exact match only)", () => {
			setPath("/personnalisation/details");
			const { result } = renderHook(() => useActiveNavbarItem());
			// /personnalisation check is pathname === "/personnalisation" (exact)
			const scope = result.current.getCurrentScope();
			expect(scope).toBeNull();
		});

		it("returns 'Mon compte' scope for /commandes", () => {
			setPath("/commandes/ORD-001");
			const { result } = renderHook(() => useActiveNavbarItem());
			const scope = result.current.getCurrentScope();
			expect(scope?.label).toBe("Mon compte");
		});

		it("returns 'Mon compte' scope for /favoris", () => {
			setPath("/favoris");
			const { result } = renderHook(() => useActiveNavbarItem());
			const scope = result.current.getCurrentScope();
			expect(scope?.label).toBe("Mon compte");
		});

		it("returns 'Mon compte' scope for /adresses", () => {
			setPath("/adresses");
			const { result } = renderHook(() => useActiveNavbarItem());
			const scope = result.current.getCurrentScope();
			expect(scope?.label).toBe("Mon compte");
		});

		it("returns 'Mon compte' scope for /parametres", () => {
			setPath("/parametres");
			const { result } = renderHook(() => useActiveNavbarItem());
			const scope = result.current.getCurrentScope();
			expect(scope?.label).toBe("Mon compte");
		});

		it("returns 'Paiement' scope for /paiement", () => {
			setPath("/paiement");
			const { result } = renderHook(() => useActiveNavbarItem());
			const scope = result.current.getCurrentScope();
			expect(scope?.label).toBe("Paiement");
			expect(scope?.href).toBe("/paiement");
		});

		it("returns 'Paiement' scope for /paiement subpaths", () => {
			setPath("/paiement/confirmation");
			const { result } = renderHook(() => useActiveNavbarItem());
			const scope = result.current.getCurrentScope();
			expect(scope?.label).toBe("Paiement");
		});

		it("returns null for an unknown path like /about", () => {
			setPath("/about");
			const { result } = renderHook(() => useActiveNavbarItem());
			expect(result.current.getCurrentScope()).toBeNull();
		});

		it("returns null for /legal paths", () => {
			setPath("/legal/cgv");
			const { result } = renderHook(() => useActiveNavbarItem());
			expect(result.current.getCurrentScope()).toBeNull();
		});
	});

	// -------------------------------------------------------------------------
	// Integration: both functions used together
	// -------------------------------------------------------------------------

	describe("integration", () => {
		it("correctly identifies active item and scope on a product detail page", () => {
			setPath("/creations/bague-or-18k");
			const { result } = renderHook(() => useActiveNavbarItem());

			// /produits nav item should be active
			expect(result.current.isMenuItemActive("/produits")).toBe(true);
			// scope should be 'Les créations'
			expect(result.current.getCurrentScope()?.label).toBe("Les créations");
		});

		it("correctly identifies active item and scope on a collection page", () => {
			setPath("/collections/ete-2026");
			const { result } = renderHook(() => useActiveNavbarItem());

			expect(result.current.isMenuItemActive("/collections")).toBe(true);
			expect(result.current.getCurrentScope()?.label).toBe("Les collections");
		});

		it("correctly identifies home as active on the root path", () => {
			setPath("/");
			const { result } = renderHook(() => useActiveNavbarItem());

			expect(result.current.isMenuItemActive("/")).toBe(true);
			expect(result.current.getCurrentScope()).toBeNull();
		});
	});
});
