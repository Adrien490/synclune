import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockIsMenuOpen, mockIsAnySheetOpen, mockSearchParams, mockPush } = vi.hoisted(() => ({
	mockIsMenuOpen: { value: false },
	mockIsAnySheetOpen: { value: false },
	mockSearchParams: { value: new URLSearchParams() },
	mockPush: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useSearchParams: () => mockSearchParams.value,
	useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		ref,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		ref?: React.Ref<HTMLAnchorElement>;
		[key: string]: unknown;
	}) => (
		<a href={href} ref={ref} {...props}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: (id: string) => {
		if (id === "admin-menu-sheet") {
			return { open: vi.fn(), close: vi.fn(), isOpen: mockIsMenuOpen.value };
		}
		return { open: vi.fn(), close: vi.fn(), isOpen: false };
	},
}));

vi.mock("@/shared/providers/sheet-store-provider", () => ({
	useSheetStore: (_selector: (state: { openSheet: string | null }) => unknown) =>
		mockIsAnySheetOpen.value,
}));

vi.mock("@/shared/components/bottom-bar", () => ({
	BottomBar: ({
		children,
		isHidden,
		as: As = "div",
		"aria-label": ariaLabel,
		className,
	}: {
		children: React.ReactNode;
		isHidden?: boolean;
		as?: React.ElementType;
		"aria-label"?: string;
		breakpointClass?: string;
		zIndex?: string;
		className?: string;
	}) => (
		<As
			data-testid="bottom-bar"
			data-hidden={isHidden}
			aria-label={ariaLabel}
			className={className}
		>
			{children}
		</As>
	),
	ActiveDot: () => <span data-testid="active-dot" />,
	bottomBarContainerClass: "toolbar-container",
	bottomBarItemClass: "toolbar-item",
	bottomBarActiveItemClass: "toolbar-item-active",
	bottomBarIconClass: "toolbar-icon",
	bottomBarLabelClass: "toolbar-label",
	bottomBarCenterActionClass: "toolbar-center-action",
	bottomBarCenterButtonClass: "toolbar-center-button",
	bottomBarCenterLabelClass: "toolbar-center-label",
}));

vi.mock("@/shared/components/sort-drawer", () => ({
	SortDrawer: ({
		open,
		onOpenChange,
	}: {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		options: { value: string; label: string }[];
		showResetOption?: boolean;
	}) => (
		<div data-testid="sort-drawer" data-open={open}>
			<button data-testid="close-sort-drawer" onClick={() => onOpenChange(false)}>
				Fermer
			</button>
		</div>
	),
}));

vi.mock("@/shared/components/ui/drawer", () => ({
	Drawer: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange: (open: boolean) => void;
	}) => (open ? <div data-testid="drawer">{children}</div> : null),
	DrawerBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DrawerContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DrawerHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DrawerTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
		<button {...props}>{children}</button>
	),
}));

vi.mock("@/modules/products/components/admin/products-filter-sheet", () => ({
	ProductsFilterSheet: ({
		open,
		onOpenChange,
		hideTrigger,
	}: {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		hideTrigger?: boolean;
		[key: string]: unknown;
	}) => (
		<div data-testid="filter-sheet" data-open={open} data-hide-trigger={hideTrigger}>
			<button data-testid="close-filter-sheet" onClick={() => onOpenChange?.(false)}>
				Fermer filtres
			</button>
		</div>
	),
}));

vi.mock("@/modules/products/constants/product.constants", () => ({
	GET_PRODUCTS_SORT_FIELDS: ["created-descending", "title-ascending", "price-ascending"],
	ADMIN_PRODUCTS_SORT_LABELS: {
		"created-descending": "Plus récents",
		"title-ascending": "Alphabétique (A-Z)",
		"price-ascending": "Prix croissant",
	},
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
	ArrowUpDown: () => <span data-testid="sort-icon" />,
	EllipsisVertical: () => <span data-testid="menu-icon" />,
	Plus: () => <span data-testid="plus-icon" />,
	Search: () => <span data-testid="search-icon" />,
	SlidersHorizontal: () => <span data-testid="filter-icon" />,
	X: () => <span data-testid="x-icon" />,
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { ProductsBottomBar } from "../products-bottom-bar";

// ============================================================================
// HELPERS
// ============================================================================

const DEFAULT_PROPS = {
	productTypes: [{ id: "1", label: "Bague", slug: "bague" }],
	collections: [{ id: "1", name: "Été" }],
	colors: [],
	materials: [],
	maxPriceInCents: 50000,
};

function renderBar(searchParams?: URLSearchParams) {
	if (searchParams) {
		mockSearchParams.value = searchParams;
	}
	return render(<ProductsBottomBar {...DEFAULT_PROPS} />);
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockSearchParams.value = new URLSearchParams();
	mockIsMenuOpen.value = false;
	mockIsAnySheetOpen.value = false;
});

describe("ProductsBottomBar", () => {
	// -----------------------------------------------------------------------
	// Rendering
	// -----------------------------------------------------------------------

	describe("Rendering", () => {
		it("renders 4 toolbar items", () => {
			renderBar();

			const toolbar = screen.getByRole("toolbar");
			expect(toolbar).toBeInTheDocument();

			expect(screen.getByText("Filtrer")).toBeInTheDocument();
			expect(screen.getByText("Recherche")).toBeInTheDocument();
			expect(screen.getByText("Ajouter")).toBeInTheDocument();
			expect(screen.getByText("Trier")).toBeInTheDocument();
		});

		it("renders Ajouter as a link to create product page", () => {
			renderBar();

			const link = screen.getByLabelText("Créer un nouveau produit");
			expect(link).toHaveAttribute("href", "/admin/catalogue/produits/nouveau");
		});

		it("renders Plus icon in center button", () => {
			renderBar();

			expect(screen.getByTestId("plus-icon")).toBeInTheDocument();
		});

		it("renders center action with FAB classes", () => {
			renderBar();

			const link = screen.getByLabelText("Créer un nouveau produit");
			expect(link.className).toContain("toolbar-center-button");
		});

		it("renders filter sheet with hideTrigger", () => {
			renderBar();

			const filterSheet = screen.getByTestId("filter-sheet");
			expect(filterSheet).toHaveAttribute("data-hide-trigger", "true");
		});

		it("renders BottomBar with overflow-visible", () => {
			renderBar();

			const bar = screen.getByTestId("bottom-bar");
			expect(bar.className).toContain("overflow-visible");
		});

		it("renders toolbar container with overflow-visible", () => {
			renderBar();

			const toolbar = screen.getByRole("toolbar");
			expect(toolbar.className).toContain("overflow-visible");
		});
	});

	// -----------------------------------------------------------------------
	// Active states
	// -----------------------------------------------------------------------

	describe("Active states", () => {
		it("shows ActiveDot when search is active", () => {
			renderBar(new URLSearchParams("search=bague"));

			const dots = screen.getAllByTestId("active-dot");
			expect(dots.length).toBeGreaterThanOrEqual(1);
		});

		it("shows ActiveDot when sort is active", () => {
			renderBar(new URLSearchParams("sortBy=title-ascending"));

			const dots = screen.getAllByTestId("active-dot");
			expect(dots.length).toBeGreaterThanOrEqual(1);
		});

		it("shows ActiveDot when filter is active", () => {
			renderBar(new URLSearchParams("filter_status=ACTIVE"));

			const dots = screen.getAllByTestId("active-dot");
			expect(dots.length).toBeGreaterThanOrEqual(1);
		});

		it("shows no ActiveDot when nothing active", () => {
			renderBar();

			expect(screen.queryAllByTestId("active-dot")).toHaveLength(0);
		});

		it("applies active class to search button when search active", () => {
			renderBar(new URLSearchParams("search=bague"));

			const searchButton = screen.getByLabelText(/Recherche.*Modifier/);
			expect(searchButton.className).toContain("toolbar-item-active");
		});

		it("applies active class to sort button when sort active", () => {
			renderBar(new URLSearchParams("sortBy=title-ascending"));

			const sortButton = screen.getByLabelText(/Tri actif/);
			expect(sortButton.className).toContain("toolbar-item-active");
		});

		it("applies active class to filter button when filter active", () => {
			renderBar(new URLSearchParams("filter_status=ACTIVE"));

			const filterButton = screen.getByLabelText(/Filtres actifs/);
			expect(filterButton.className).toContain("toolbar-item-active");
		});
	});

	// -----------------------------------------------------------------------
	// Aria labels
	// -----------------------------------------------------------------------

	describe("Aria labels", () => {
		it("has contextual aria-label for filter button when inactive", () => {
			renderBar();

			expect(screen.getByLabelText("Ouvrir les filtres")).toBeInTheDocument();
		});

		it("has contextual aria-label for filter button when active", () => {
			renderBar(new URLSearchParams("filter_status=ACTIVE"));

			expect(screen.getByLabelText("Filtres actifs. Modifier les filtres")).toBeInTheDocument();
		});

		it("has contextual aria-label for search button when inactive", () => {
			renderBar();

			expect(screen.getByLabelText("Ouvrir la recherche")).toBeInTheDocument();
		});

		it("has contextual aria-label for search button when active", () => {
			renderBar(new URLSearchParams("search=bague"));

			expect(
				screen.getByLabelText('Recherche: "bague". Modifier la recherche'),
			).toBeInTheDocument();
		});

		it("has contextual aria-label for sort button when inactive", () => {
			renderBar();

			expect(screen.getByLabelText("Ouvrir les options de tri")).toBeInTheDocument();
		});

		it("has contextual aria-label for sort button when active", () => {
			renderBar(new URLSearchParams("sortBy=title-ascending"));

			expect(screen.getByLabelText("Tri actif. Modifier le tri")).toBeInTheDocument();
		});

		it("has aria-label on Ajouter link", () => {
			renderBar();

			expect(screen.getByLabelText("Créer un nouveau produit")).toBeInTheDocument();
		});

		it("has aria-haspopup on filter, search, sort buttons", () => {
			renderBar();

			expect(screen.getByLabelText("Ouvrir les filtres")).toHaveAttribute(
				"aria-haspopup",
				"dialog",
			);
			expect(screen.getByLabelText("Ouvrir la recherche")).toHaveAttribute(
				"aria-haspopup",
				"dialog",
			);
			expect(screen.getByLabelText("Ouvrir les options de tri")).toHaveAttribute(
				"aria-haspopup",
				"dialog",
			);
		});

		it("Ajouter link does not have aria-haspopup", () => {
			renderBar();

			expect(screen.getByLabelText("Créer un nouveau produit")).not.toHaveAttribute(
				"aria-haspopup",
			);
		});
	});

	// -----------------------------------------------------------------------
	// Drawer interactions
	// -----------------------------------------------------------------------

	describe("Drawer interactions", () => {
		it("opens filter sheet on filter button click", () => {
			renderBar();

			fireEvent.click(screen.getByLabelText("Ouvrir les filtres"));

			expect(screen.getByTestId("filter-sheet")).toHaveAttribute("data-open", "true");
		});

		it("opens search drawer on search button click", () => {
			renderBar();

			fireEvent.click(screen.getByLabelText("Ouvrir la recherche"));

			expect(screen.getAllByTestId("drawer").length).toBeGreaterThanOrEqual(1);
		});

		it("opens sort drawer on sort button click", () => {
			renderBar();

			fireEvent.click(screen.getByLabelText("Ouvrir les options de tri"));

			expect(screen.getByTestId("sort-drawer")).toHaveAttribute("data-open", "true");
		});

		it("submits search form and updates URL params", () => {
			renderBar();

			fireEvent.click(screen.getByLabelText("Ouvrir la recherche"));

			const input = screen.getByLabelText("Rechercher un produit par titre ou type");
			fireEvent.change(input, { target: { value: "collier" } });
			fireEvent.submit(input.closest("form")!);

			expect(mockPush).toHaveBeenCalledWith("?search=collier", { scroll: false });
		});

		it("clears search on clear button click", () => {
			renderBar(new URLSearchParams("search=bague"));

			fireEvent.click(screen.getByLabelText(/Modifier la recherche/));

			const clearButton = screen.getByLabelText("Effacer la recherche");
			fireEvent.click(clearButton);

			expect(mockPush).toHaveBeenCalledWith("?", { scroll: false });
		});

		it("removes cursor and direction params on search submit", () => {
			renderBar(new URLSearchParams("cursor=abc&direction=forward"));

			fireEvent.click(screen.getByLabelText("Ouvrir la recherche"));

			const input = screen.getByLabelText("Rechercher un produit par titre ou type");
			fireEvent.change(input, { target: { value: "bague" } });
			fireEvent.submit(input.closest("form")!);

			const pushArg = mockPush.mock.calls[0]?.[0] as string;
			expect(pushArg).not.toContain("cursor");
			expect(pushArg).not.toContain("direction");
		});
	});

	// -----------------------------------------------------------------------
	// Visibility
	// -----------------------------------------------------------------------

	describe("Visibility", () => {
		it("is hidden when sort drawer is open", () => {
			renderBar();

			fireEvent.click(screen.getByLabelText("Ouvrir les options de tri"));

			expect(screen.getByTestId("bottom-bar")).toHaveAttribute("data-hidden", "true");
		});

		it("is hidden when search drawer is open", () => {
			renderBar();

			fireEvent.click(screen.getByLabelText("Ouvrir la recherche"));

			expect(screen.getByTestId("bottom-bar")).toHaveAttribute("data-hidden", "true");
		});

		it("is hidden when filter sheet is open", () => {
			renderBar();

			fireEvent.click(screen.getByLabelText("Ouvrir les filtres"));

			expect(screen.getByTestId("bottom-bar")).toHaveAttribute("data-hidden", "true");
		});

		it("is hidden when admin menu sheet is open", () => {
			mockIsMenuOpen.value = true;
			renderBar();

			expect(screen.getByTestId("bottom-bar")).toHaveAttribute("data-hidden", "true");
		});

		it("is hidden when any sheet is open", () => {
			mockIsAnySheetOpen.value = true;
			renderBar();

			expect(screen.getByTestId("bottom-bar")).toHaveAttribute("data-hidden", "true");
		});

		it("is visible when nothing is open", () => {
			renderBar();

			expect(screen.getByTestId("bottom-bar")).toHaveAttribute("data-hidden", "false");
		});
	});

	// -----------------------------------------------------------------------
	// Keyboard navigation
	// -----------------------------------------------------------------------

	describe("Keyboard navigation", () => {
		it("ArrowRight moves focus to next item", () => {
			renderBar();

			const filterButton = screen.getByLabelText("Ouvrir les filtres");
			filterButton.focus();
			fireEvent.keyDown(filterButton, { key: "ArrowRight" });

			expect(screen.getByLabelText("Ouvrir la recherche")).toHaveFocus();
		});

		it("ArrowRight wraps from last to first item", () => {
			renderBar();

			const sortButton = screen.getByLabelText("Ouvrir les options de tri");
			// Need to set focusedIndex to 3 first
			sortButton.focus();
			fireEvent.keyDown(sortButton, { key: "ArrowRight" });

			expect(screen.getByLabelText("Ouvrir les filtres")).toHaveFocus();
		});

		it("ArrowLeft moves focus to previous item", () => {
			renderBar();

			const searchButton = screen.getByLabelText("Ouvrir la recherche");
			searchButton.focus();
			fireEvent.keyDown(searchButton, { key: "ArrowLeft" });

			expect(screen.getByLabelText("Ouvrir les filtres")).toHaveFocus();
		});

		it("ArrowLeft wraps from first to last item", () => {
			renderBar();

			const filterButton = screen.getByLabelText("Ouvrir les filtres");
			filterButton.focus();
			fireEvent.keyDown(filterButton, { key: "ArrowLeft" });

			expect(screen.getByLabelText("Ouvrir les options de tri")).toHaveFocus();
		});

		it("Home key moves focus to first item", () => {
			renderBar();

			const sortButton = screen.getByLabelText("Ouvrir les options de tri");
			sortButton.focus();
			fireEvent.keyDown(sortButton, { key: "Home" });

			expect(screen.getByLabelText("Ouvrir les filtres")).toHaveFocus();
		});

		it("End key moves focus to last item", () => {
			renderBar();

			const filterButton = screen.getByLabelText("Ouvrir les filtres");
			filterButton.focus();
			fireEvent.keyDown(filterButton, { key: "End" });

			expect(screen.getByLabelText("Ouvrir les options de tri")).toHaveFocus();
		});

		it("ArrowRight from search moves to Ajouter link", () => {
			renderBar();

			const searchButton = screen.getByLabelText("Ouvrir la recherche");
			searchButton.focus();
			fireEvent.keyDown(searchButton, { key: "ArrowRight" });

			expect(screen.getByLabelText("Créer un nouveau produit")).toHaveFocus();
		});

		it("ArrowRight from Ajouter moves to Trier", () => {
			renderBar();

			const addLink = screen.getByLabelText("Créer un nouveau produit");
			addLink.focus();
			fireEvent.keyDown(addLink, { key: "ArrowRight" });

			expect(screen.getByLabelText("Ouvrir les options de tri")).toHaveFocus();
		});

		it("only focused item has tabIndex 0, others have -1", () => {
			renderBar();

			const filterButton = screen.getByLabelText("Ouvrir les filtres");
			const searchButton = screen.getByLabelText("Ouvrir la recherche");
			const addLink = screen.getByLabelText("Créer un nouveau produit");
			const sortButton = screen.getByLabelText("Ouvrir les options de tri");

			// First item has tabIndex 0 by default
			expect(filterButton).toHaveAttribute("tabindex", "0");
			expect(searchButton).toHaveAttribute("tabindex", "-1");
			expect(addLink).toHaveAttribute("tabindex", "-1");
			expect(sortButton).toHaveAttribute("tabindex", "-1");
		});
	});
});
