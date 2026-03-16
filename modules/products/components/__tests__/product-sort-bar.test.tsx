import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockOpenSearch,
	mockCloseSearch,
	mockOpenFilter,
	mockCloseFilter,
	mockIsSearchOpen,
	mockIsFilterOpen,
	mockIsSkuSelectorOpen,
	mockIsMenuOpen,
	mockIsAnySheetOpen,
	mockSearchParams,
	mockPathname,
	mockCountActiveFilters,
	mockIsProductCategoryPage,
} = vi.hoisted(() => ({
	mockOpenSearch: vi.fn(),
	mockCloseSearch: vi.fn(),
	mockOpenFilter: vi.fn(),
	mockCloseFilter: vi.fn(),
	mockIsSearchOpen: false,
	mockIsFilterOpen: false,
	mockIsSkuSelectorOpen: false,
	mockIsMenuOpen: false,
	mockIsAnySheetOpen: false,
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
			return {
				open: mockOpenSearch,
				close: mockCloseSearch,
				isOpen: mockIsSearchOpen,
			};
		}
		if (id === "product-filter-sheet") {
			return {
				open: mockOpenFilter,
				close: mockCloseFilter,
				isOpen: mockIsFilterOpen,
			};
		}
		// sku-selector-dialog and menu-sheet
		return { open: vi.fn(), close: vi.fn(), isOpen: false };
	},
}));

vi.mock("@/shared/providers/sheet-store-provider", () => ({
	useSheetStore: (_selector: (state: { openSheet: string | null }) => unknown) =>
		mockIsAnySheetOpen,
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

vi.mock("@/modules/cart/components/sku-selector-dialog", () => ({
	SKU_SELECTOR_DIALOG_ID: "sku-selector-dialog",
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

vi.mock("@/shared/components/bottom-bar", () => ({
	BottomBar: ({
		children,
		isHidden,
		as: As = "div",
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		isHidden?: boolean;
		as?: React.ElementType;
		"aria-label"?: string;
		breakpointClass?: string;
		zIndex?: string;
		className?: string;
	}) => (
		<As data-testid="bottom-bar" data-hidden={isHidden} aria-label={ariaLabel}>
			{children}
		</As>
	),
	ActiveDot: () => <span data-testid="active-dot" />,
	bottomBarContainerClass: "toolbar-container",
	bottomBarItemClass: "toolbar-item",
	bottomBarActiveItemClass: "toolbar-item-active",
	bottomBarIconClass: "toolbar-icon",
	bottomBarLabelClass: "toolbar-label",
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
	Search: () => <span data-testid="search-icon" />,
	ArrowUpDown: () => <span data-testid="sort-icon" />,
	SlidersHorizontal: () => <span data-testid="filter-icon" />,
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
		it("renders the bottom bar with the toolbar", () => {
			renderDefault();
			expect(screen.getByTestId("bottom-bar")).toBeInTheDocument();
			expect(screen.getByRole("toolbar")).toBeInTheDocument();
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

		it("does not show active dot indicators when no active states", () => {
			renderDefault();
			expect(screen.queryAllByTestId("active-dot")).toHaveLength(0);
		});
	});

	describe("sort button", () => {
		it("opens the sort drawer when sort button is clicked", () => {
			renderDefault();
			fireEvent.click(screen.getByText("Trier"));
			expect(screen.getByTestId("sort-drawer")).toHaveAttribute("data-open", "true");
		});

		it("shows active dot on sort button when sortBy param is set", () => {
			// Set a sortBy param on the shared mockSearchParams
			mockSearchParams.set("sortBy", "price-ascending");
			renderDefault();
			// With an active sort, at least one ActiveDot should appear
			expect(screen.queryAllByTestId("active-dot").length).toBeGreaterThanOrEqual(1);
			mockSearchParams.delete("sortBy");
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

		it("shows active dot on filter button when active filters are present", () => {
			mockCountActiveFilters.mockReturnValue({ hasActiveFilters: true, activeFiltersCount: 2 });
			renderDefault();
			// At least one active dot should be shown (for filters)
			expect(screen.queryAllByTestId("active-dot").length).toBeGreaterThanOrEqual(1);
		});
	});

	describe("visibility", () => {
		it("passes isHidden=false when no dialogs are open", () => {
			renderDefault();
			expect(screen.getByTestId("bottom-bar")).toHaveAttribute("data-hidden", "false");
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
