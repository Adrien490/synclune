import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOpenFilter, mockSearchParams, mockCountActiveFilters, mockIsProductCategoryPage } =
	vi.hoisted(() => ({
		mockOpenFilter: vi.fn(),
		mockSearchParams: new URLSearchParams(),
		mockCountActiveFilters: vi
			.fn()
			.mockReturnValue({ hasActiveFilters: false, activeFiltersCount: 0 }),
		mockIsProductCategoryPage: vi.fn().mockReturnValue(false),
	}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useSearchParams: () => mockSearchParams,
	usePathname: () => "/produits",
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: (id: string) => {
		if (id === "product-filter-sheet") {
			return { open: mockOpenFilter, close: vi.fn(), isOpen: false };
		}
		return { open: vi.fn(), close: vi.fn(), isOpen: false };
	},
}));

vi.mock("@/modules/products/services/product-filter-params.service", () => ({
	countActiveFilters: mockCountActiveFilters,
	isProductCategoryPage: mockIsProductCategoryPage,
}));

vi.mock("@/modules/products/constants/product.constants", () => ({
	PRODUCT_FILTER_DIALOG_ID: "product-filter-sheet",
	PRODUCTS_SORT_LABELS: {
		"price-ascending": "Prix croissant",
		"price-descending": "Prix décroissant",
		"created-descending": "Plus récents",
	},
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	SlidersHorizontalIcon: () => <span data-testid="filter-icon" />,
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { ProductFilterBar } from "../product-filter-bar";

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockCountActiveFilters.mockReturnValue({ hasActiveFilters: false, activeFiltersCount: 0 });
	mockIsProductCategoryPage.mockReturnValue(false);
});

describe("ProductFilterBar", () => {
	describe("rendering", () => {
		it("renders as a nav with the single Filtrer button — no sort, no search", () => {
			render(<ProductFilterBar />);
			expect(screen.getByRole("navigation", { name: "Filtres" })).toBeInTheDocument();
			expect(screen.getByText("Filtrer")).toBeInTheDocument();
			// Le tri vit dans le compartiment « Trier par » du meuble de filtres, la
			// recherche dans le quick-search navbar : la barre n'en remonte aucun.
			expect(screen.queryByText("Trier")).not.toBeInTheDocument();
			expect(screen.queryByText("Rechercher")).not.toBeInTheDocument();
			expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
		});

		it("colle sous la navbar, à une hauteur qui ne bouge PAS au défilement", () => {
			render(<ProductFilterBar />);
			const nav = screen.getByRole("navigation", { name: "Filtres" });

			expect(nav.className).toContain("sticky");
			// `--navbar-height` se contracte de 5rem à 4rem au scroll : une barre qui en
			// dérive remonte de 16px au premier pixel scrollé. `--navbar-height-static`
			// est le token créé pour ça (cf. `hero-section.tsx`).
			expect(nav.className).toContain("top-[var(--navbar-height-static)]");
			expect(nav.className).not.toContain("var(--navbar-height)]");
		});

		it("est le meuble < lg : masquée à desktop, jamais sous md", () => {
			render(<ProductFilterBar />);
			const nav = screen.getByRole("navigation", { name: "Filtres" });

			// À `lg`, le rail de filtres (qui porte aussi le tri) couvre le geste.
			expect(nav.className).toContain("lg:hidden");
			// Masquer la barre sous `md` laisserait mobile/tablette sans Filtrer.
			expect(nav.className).not.toContain("md:hidden");
		});
	});

	describe("filter button", () => {
		it("calls openFilter when filter button is clicked", () => {
			render(<ProductFilterBar />);
			fireEvent.click(screen.getByText("Filtrer"));
			expect(mockOpenFilter).toHaveBeenCalledOnce();
		});

		it("renders filter icon", () => {
			render(<ProductFilterBar />);
			expect(screen.getByTestId("filter-icon")).toBeInTheDocument();
		});

		it("shows an active filter count badge when filters are active", () => {
			mockCountActiveFilters.mockReturnValue({ hasActiveFilters: true, activeFiltersCount: 2 });
			render(<ProductFilterBar />);
			const filterButton = screen.getByRole("button", { name: /2 filtres actifs/ });
			expect(filterButton).toBeInTheDocument();
			expect(filterButton.textContent).toContain("2");
		});

		it("sans filtre actif, le nom accessible EST le libellé visible « Filtrer » (WCAG 2.5.3)", () => {
			render(<ProductFilterBar />);
			expect(screen.getByRole("button", { name: "Filtrer" })).toBeInTheDocument();
		});

		it("avec filtres actifs, le nom accessible COMMENCE par le libellé visible", () => {
			mockCountActiveFilters.mockReturnValue({ hasActiveFilters: true, activeFiltersCount: 2 });
			render(<ProductFilterBar />);
			expect(
				screen.getByRole("button", { name: /^Filtrer — 2 filtres actifs$/ }),
			).toBeInTheDocument();
		});

		it("expose aria-expanded reflétant l'état du sheet (fermé par défaut)", () => {
			render(<ProductFilterBar />);
			expect(screen.getByRole("button", { name: "Filtrer" })).toHaveAttribute(
				"aria-expanded",
				"false",
			);
		});
	});

	describe("live region", () => {
		it("renders a polite live region for screen reader announcements", () => {
			render(<ProductFilterBar />);
			const liveRegion = screen.getByRole("status");
			expect(liveRegion).toBeInTheDocument();
			expect(liveRegion).toHaveAttribute("aria-live", "polite");
		});

		it("vit HORS du <nav> lg:hidden — l'annonce doit survivre à desktop", () => {
			render(<ProductFilterBar />);
			// Sous un ancêtre `display: none`, une live region sort de l'arbre
			// d'accessibilité : dans le `<nav>` masqué à `lg`, les annonces
			// (recherche, tri, filtres — dérivées de l'URL) mouraient à desktop.
			const nav = screen.getByRole("navigation", { name: "Filtres" });
			expect(nav).not.toContainElement(screen.getByRole("status"));
		});
	});
});
