import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { lastTrigger } from "@/modules/products/components/quick-search-dialog/last-trigger";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockOpenSearch,
	mockCloseSearch,
	mockOpenFilter,
	mockCloseFilter,
	mockSearchParams,
	mockPathname,
	mockCountActiveFilters,
	mockIsProductCategoryPage,
} = vi.hoisted(() => ({
	mockOpenSearch: vi.fn(),
	mockCloseSearch: vi.fn(),
	mockOpenFilter: vi.fn(),
	mockCloseFilter: vi.fn(),
	mockSearchParams: new URLSearchParams(),
	mockPathname: "/produits",
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
	usePathname: () => mockPathname,
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: (id: string) => {
		if (id === "quick-search-dialog") {
			return { open: mockOpenSearch, close: mockCloseSearch, isOpen: false };
		}
		if (id === "product-filter-sheet") {
			return { open: mockOpenFilter, close: mockCloseFilter, isOpen: false };
		}
		return { open: vi.fn(), close: vi.fn(), isOpen: false };
	},
}));

vi.mock("@/modules/products/services/product-filter-params.service", () => ({
	countActiveFilters: mockCountActiveFilters,
	isProductCategoryPage: mockIsProductCategoryPage,
}));

/**
 * La barre déplie un vrai `SearchInput` à partir de `md` (lot 1 de « L'étal
 * continue »). On le stube : ce fichier teste la BARRE — sa structure, ses trois
 * cellules, sa mécanique clavier — pas le champ, qui a sa propre suite. Sans ce
 * mock, `SearchInput` réclame `useRouter`, absent du mock `next/navigation`
 * ci-dessus, et les 15 tests tombent d'un coup.
 */
vi.mock("@/shared/components/search-input", () => ({
	SearchInput: ({ placeholder }: { placeholder?: string }) => (
		<input data-testid="search-input" placeholder={placeholder} />
	),
}));

vi.mock("@/modules/products/constants/product.constants", () => ({
	PRODUCT_FILTER_DIALOG_ID: "product-filter-sheet",
	PRODUCTS_SORT_LABELS: {
		"price-ascending": "Prix croissant",
		"price-descending": "Prix décroissant",
		"created-descending": "Plus récents",
	},
}));

vi.mock("@/modules/products/components/quick-search-dialog/constants", () => ({
	QUICK_SEARCH_DIALOG_ID: "quick-search-dialog",
}));

vi.mock("@/shared/components/sort-drawer", () => ({
	SortDrawer: ({
		open,
		onOpenChange,
		options,
	}: {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		options: { value: string; label: string }[];
		showResetOption?: boolean;
	}) => (
		<div data-testid="sort-drawer" data-open={open}>
			{options.map((opt) => (
				<button key={opt.value} onClick={() => onOpenChange(false)}>
					{opt.label}
				</button>
			))}
			<button data-testid="close-sort-drawer" onClick={() => onOpenChange(false)}>
				Fermer
			</button>
		</div>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	MagnifyingGlassIcon: () => <span data-testid="search-icon" />,
	ArrowsDownUpIcon: () => <span data-testid="sort-icon" />,
	SlidersHorizontalIcon: () => <span data-testid="filter-icon" />,
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { ProductSortBar } from "../product-sort-bar";
import type { SortOption } from "@/shared/components/sort-drawer";

// ============================================================================
// FIXTURES
// ============================================================================

const sortOptions: SortOption[] = [
	{ value: "price-ascending", label: "Prix croissant" },
	{ value: "price-descending", label: "Prix décroissant" },
	{ value: "created-descending", label: "Plus récents" },
];

function renderDefault() {
	return render(<ProductSortBar sortOptions={sortOptions} />);
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockCountActiveFilters.mockReturnValue({ hasActiveFilters: false, activeFiltersCount: 0 });
	mockIsProductCategoryPage.mockReturnValue(false);
});

describe("ProductSortBar", () => {
	describe("rendering", () => {
		it("renders as a nav with the toolbar role", () => {
			renderDefault();
			expect(
				screen.getByRole("navigation", { name: "Tri, recherche et filtres" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("toolbar", { name: "Tri, recherche et filtres" }),
			).toBeInTheDocument();
		});

		it("renders the three action buttons: Trier, Rechercher, Filtrer", () => {
			renderDefault();
			expect(screen.getByText("Trier")).toBeInTheDocument();
			expect(screen.getByText("Rechercher")).toBeInTheDocument();
			expect(screen.getByText("Filtrer")).toBeInTheDocument();
		});

		it("renders the sort drawer with the provided sort options", () => {
			renderDefault();
			expect(screen.getByTestId("sort-drawer")).toBeInTheDocument();
			for (const opt of sortOptions) {
				expect(screen.getByText(opt.label)).toBeInTheDocument();
			}
		});

		it("colle sous la navbar, à une hauteur qui ne bouge PAS au défilement", () => {
			render(<ProductSortBar sortOptions={sortOptions} />);
			const nav = screen.getByRole("navigation", { name: "Tri, recherche et filtres" });

			expect(nav.className).toContain("sticky");
			// `--navbar-height` se contracte de 5rem à 4rem au scroll : une barre qui en
			// dérive remonte de 16px au premier pixel scrollé. `--navbar-height-static`
			// est le token créé pour ça (cf. `etal-section.tsx`).
			expect(nav.className).toContain("top-[var(--navbar-height-static)]");
			expect(nav.className).not.toContain("var(--navbar-height)]");
		});

		it("n'est plus réservée au mobile — c'est la barre unique du catalogue", () => {
			render(<ProductSortBar sortOptions={sortOptions} />);
			const nav = screen.getByRole("navigation", { name: "Tri, recherche et filtres" });

			// La `Toolbar` desktop concurrente a disparu du shell : masquer celle-ci
			// sous `md` laisserait le catalogue sans aucun contrôle sur desktop.
			expect(nav.className).not.toContain("md:hidden");
		});

		it("déplie un champ de recherche à partir de md, et y masque le bouton", () => {
			render(
				<ProductSortBar sortOptions={sortOptions} searchPlaceholder="Rechercher des bagues…" />,
			);

			expect(screen.getByTestId("search-input")).toHaveAttribute(
				"placeholder",
				"Rechercher des bagues…",
			);
			// Le bouton reste rendu (il sert sous `md`) mais s'efface là où le champ
			// est déplié — sinon deux entrées pour un seul geste.
			expect(screen.getByRole("button", { name: /recherche/i }).className).toContain("md:hidden");
		});
	});

	describe("sort button", () => {
		it("opens the sort drawer when sort button is clicked", () => {
			renderDefault();
			fireEvent.click(screen.getByText("Trier"));
			expect(screen.getByTestId("sort-drawer")).toHaveAttribute("data-open", "true");
		});

		it("closes search and filter dialogs before opening the sort drawer", () => {
			renderDefault();
			fireEvent.click(screen.getByText("Trier"));
			expect(mockCloseSearch).toHaveBeenCalledOnce();
			expect(mockCloseFilter).toHaveBeenCalledOnce();
		});

		it("uses active aria-label on sort button when sort is active", () => {
			mockSearchParams.set("sortBy", "price-ascending");
			renderDefault();
			const sortButton = screen.getByRole("button", { name: /Tri actif/ });
			expect(sortButton).toBeInTheDocument();
			mockSearchParams.delete("sortBy");
		});
	});

	describe("search button", () => {
		it("calls openSearch when search button is clicked", () => {
			renderDefault();
			fireEvent.click(screen.getByText("Rechercher"));
			expect(mockOpenSearch).toHaveBeenCalledOnce();
		});

		it("renders search icon", () => {
			renderDefault();
			expect(screen.getByTestId("search-icon")).toBeInTheDocument();
		});

		/**
		 * @regression sort-bar-search-focus-restore
		 *
		 * Ce bouton ouvrait le dialog sans jamais renseigner `lastTrigger` : à la
		 * fermeture, `onCloseAutoFocus` refocalisait le dernier déclencheur connu
		 * (souvent celui d'un autre breakpoint) ou laissait le focus sur <body>.
		 */
		it("enregistre le bouton comme dernier déclencheur (restauration du focus)", () => {
			lastTrigger.el = null;
			renderDefault();

			const searchButton = screen.getByRole("button", { name: /ouvrir la recherche/i });
			fireEvent.click(searchButton);

			expect(lastTrigger.el).toBe(searchButton);
		});

		it("expose aria-expanded comme son frère « Trier »", () => {
			renderDefault();

			expect(screen.getByRole("button", { name: /ouvrir la recherche/i })).toHaveAttribute(
				"aria-expanded",
				"false",
			);
		});
	});

	describe("filter button", () => {
		it("calls openFilter when filter button is clicked", () => {
			renderDefault();
			fireEvent.click(screen.getByText("Filtrer"));
			expect(mockOpenFilter).toHaveBeenCalledOnce();
		});

		it("renders filter icon", () => {
			renderDefault();
			expect(screen.getByTestId("filter-icon")).toBeInTheDocument();
		});

		it("shows an active filter count badge when filters are active", () => {
			mockCountActiveFilters.mockReturnValue({ hasActiveFilters: true, activeFiltersCount: 2 });
			renderDefault();
			const filterButton = screen.getByRole("button", { name: /2 filtres actifs/ });
			expect(filterButton).toBeInTheDocument();
			expect(filterButton.textContent).toContain("2");
		});
	});

	describe("live region", () => {
		it("renders a polite live region for screen reader announcements", () => {
			renderDefault();
			const liveRegion = screen.getByRole("status");
			expect(liveRegion).toBeInTheDocument();
			expect(liveRegion).toHaveAttribute("aria-live", "polite");
		});
	});
});
