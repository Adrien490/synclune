import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockNav = vi.hoisted(() => ({
	pathname: "/",
	replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	usePathname: () => mockNav.pathname,
	useRouter: () => ({ replace: mockNav.replace }),
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import { useBackToListOnDelete } from "../use-back-to-list-on-delete";

function invoke(listHref: string, pathname: string) {
	mockNav.pathname = pathname;
	const { result } = renderHook(() => useBackToListOnDelete(listHref));
	result.current();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useBackToListOnDelete", () => {
	beforeEach(() => {
		mockNav.replace.mockClear();
	});

	it("redirige vers la liste depuis une page détail", () => {
		invoke("/admin/catalogue/produits", "/admin/catalogue/produits/bague-or");
		expect(mockNav.replace).toHaveBeenCalledWith("/admin/catalogue/produits");
	});

	it("ne fait rien depuis la page liste elle-même", () => {
		invoke("/admin/catalogue/produits", "/admin/catalogue/produits");
		expect(mockNav.replace).not.toHaveBeenCalled();
	});

	it("ne fait rien depuis une route hors de l'arbre de la liste", () => {
		invoke("/admin/catalogue/produits", "/admin/catalogue/collections/colliers");
		expect(mockNav.replace).not.toHaveBeenCalled();
	});

	it("gère le cas VARIANT (liste variantes dynamique)", () => {
		// href dérivé par le dialog VARIANT depuis le pathname détail
		invoke(
			"/admin/catalogue/produits/bague-or/variantes",
			"/admin/catalogue/produits/bague-or/variantes/variant_1",
		);
		expect(mockNav.replace).toHaveBeenCalledWith("/admin/catalogue/produits/bague-or/variantes");
	});

	it("ne fait rien sur la liste des variantes (href === pathname)", () => {
		invoke(
			"/admin/catalogue/produits/bague-or/variantes",
			"/admin/catalogue/produits/bague-or/variantes",
		);
		expect(mockNav.replace).not.toHaveBeenCalled();
	});
});
