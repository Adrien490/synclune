import type * as ReactDomModule from "react-dom";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPush, mockIsMenuOpen, mockIsAnySheetOpen, mockSearchParams } = vi.hoisted(() => ({
	mockPush: vi.fn(),
	mockIsMenuOpen: false,
	mockIsAnySheetOpen: false,
	mockSearchParams: new URLSearchParams(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useSearchParams: () => mockSearchParams,
	useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: (id: string) => {
		if (id === "admin-menu-sheet") {
			return { isOpen: mockIsMenuOpen, open: vi.fn(), close: vi.fn() };
		}
		return { isOpen: false, open: vi.fn(), close: vi.fn() };
	},
}));

vi.mock("@/shared/providers/sheet-store-provider", () => ({
	useSheetStore: (_selector: (state: { openSheet: string | null }) => unknown) =>
		mockIsAnySheetOpen,
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
			{open &&
				options.map((opt) => (
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

vi.mock("@/shared/components/ui/drawer", () => ({
	Drawer: ({
		open,
		onOpenChange,
		children,
	}: {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		children: React.ReactNode;
	}) => (
		<div data-testid="drawer" data-open={open}>
			{open && children}
			<button data-testid="close-drawer" onClick={() => onOpenChange(false)}>
				Fermer
			</button>
		</div>
	),
	DrawerContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="drawer-content">{children}</div>
	),
	DrawerHeader: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="drawer-header">{children}</div>
	),
	DrawerTitle: ({ children }: { children: React.ReactNode }) => (
		<h2 data-testid="drawer-title">{children}</h2>
	),
	DrawerBody: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="drawer-body">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		type,
		className,
	}: {
		children: React.ReactNode;
		type?: "button" | "submit" | "reset";
		className?: string;
	}) => (
		<button type={type} className={className}>
			{children}
		</button>
	),
}));

vi.mock("../discounts-filter-drawer", () => ({
	DiscountsFilterDrawer: ({
		open,
		onOpenChange,
	}: {
		open: boolean;
		onOpenChange: (open: boolean) => void;
	}) => (
		<div data-testid="filter-drawer" data-open={open}>
			{open && <div data-testid="filter-drawer-content">Filtrer les codes promo</div>}
			<button data-testid="close-filter-drawer" onClick={() => onOpenChange(false)}>
				Fermer
			</button>
		</div>
	),
}));

vi.mock("../../constants/discount.constants", () => ({
	DISCOUNTS_SORT_LABELS: {
		"created-descending": "Plus récents",
		"created-ascending": "Plus anciens",
		"code-ascending": "Code (A-Z)",
		"code-descending": "Code (Z-A)",
		"usage-descending": "Plus utilisés",
		"usage-ascending": "Moins utilisés",
	},
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
	Search: ({ className }: { className?: string }) => (
		<span data-testid="search-icon" className={className} />
	),
	ArrowUpDown: ({ className }: { className?: string }) => (
		<span data-testid="sort-icon" className={className} />
	),
	SlidersHorizontal: ({ className }: { className?: string }) => (
		<span data-testid="filter-icon" className={className} />
	),
	X: ({ className }: { className?: string }) => <span data-testid="x-icon" className={className} />,
	Menu: ({ className }: { className?: string }) => (
		<span data-testid="menu-icon" className={className} />
	),
}));

// Mock createPortal to render children inline during tests
vi.mock("react-dom", async (importOriginal) => {
	const actual = await importOriginal<typeof ReactDomModule>();
	return {
		...actual,
		createPortal: (children: React.ReactNode) => children,
	};
});

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { DiscountsBottomBar } from "../discounts-bottom-bar";

// ============================================================================
// HELPERS
// ============================================================================

function renderDefault() {
	return render(<DiscountsBottomBar />);
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	const keys = Array.from(mockSearchParams.keys());
	for (const key of keys) {
		mockSearchParams.delete(key);
	}
});

describe("DiscountsBottomBar", () => {
	describe("rendering", () => {
		it("renders the bottom bar", () => {
			renderDefault();
			expect(screen.getByTestId("bottom-bar")).toBeInTheDocument();
		});

		it("renders the toolbar", () => {
			renderDefault();
			expect(screen.getByRole("toolbar")).toBeInTheDocument();
		});

		it("renders the three action buttons: Trier, Rechercher, Filtrer", () => {
			renderDefault();
			expect(screen.getByText("Trier")).toBeInTheDocument();
			expect(screen.getByText("Rechercher")).toBeInTheDocument();
			expect(screen.getByText("Filtrer")).toBeInTheDocument();
		});

		it("renders the sort drawer", () => {
			renderDefault();
			expect(screen.getByTestId("sort-drawer")).toBeInTheDocument();
		});

		it("renders the filter drawer", () => {
			renderDefault();
			expect(screen.getByTestId("filter-drawer")).toBeInTheDocument();
		});

		it("renders the search drawer (closed by default)", () => {
			renderDefault();
			expect(screen.getByTestId("drawer")).toBeInTheDocument();
		});

		it("does not show active dots when no params are set", () => {
			renderDefault();
			expect(screen.queryAllByTestId("active-dot")).toHaveLength(0);
		});

		it("bottom bar has correct aria-label", () => {
			renderDefault();
			expect(screen.getByTestId("bottom-bar")).toHaveAttribute(
				"aria-label",
				"Tri, recherche, filtres et menu",
			);
		});
	});

	describe("toolbar a11y", () => {
		it("toolbar has role='toolbar'", () => {
			renderDefault();
			expect(screen.getByRole("toolbar")).toBeInTheDocument();
		});

		it("toolbar has aria-orientation='horizontal'", () => {
			renderDefault();
			expect(screen.getByRole("toolbar")).toHaveAttribute("aria-orientation", "horizontal");
		});

		it("toolbar has aria-label", () => {
			renderDefault();
			expect(screen.getByRole("toolbar")).toHaveAttribute(
				"aria-label",
				"Tri, recherche, filtres et menu",
			);
		});

		it("all three buttons have aria-haspopup='dialog'", () => {
			renderDefault();
			const buttons = screen
				.getAllByRole("button")
				.filter((btn) => btn.getAttribute("aria-haspopup") === "dialog");
			expect(buttons).toHaveLength(4);
		});
	});

	describe("roving tabindex", () => {
		it("sort button has tabIndex=0 by default", () => {
			renderDefault();
			const sortButton = screen.getByRole("button", { name: /Ouvrir les options de tri/ });
			expect(sortButton).toHaveAttribute("tabindex", "0");
		});

		it("search and filter buttons have tabIndex=-1 by default", () => {
			renderDefault();
			const searchButton = screen.getByRole("button", { name: /Ouvrir la recherche/ });
			const filterButton = screen.getByRole("button", { name: /Ouvrir les filtres/ });
			expect(searchButton).toHaveAttribute("tabindex", "-1");
			expect(filterButton).toHaveAttribute("tabindex", "-1");
		});

		it("updates focused index on focus of search button", () => {
			renderDefault();
			const searchButton = screen.getByRole("button", { name: /Ouvrir la recherche/ });
			fireEvent.focus(searchButton);
			expect(searchButton).toHaveAttribute("tabindex", "0");
		});

		it("updates focused index on focus of filter button", () => {
			renderDefault();
			const filterButton = screen.getByRole("button", { name: /Ouvrir les filtres/ });
			fireEvent.focus(filterButton);
			expect(filterButton).toHaveAttribute("tabindex", "0");
		});

		it("updates focused index back to sort button on focus", () => {
			renderDefault();
			const searchButton = screen.getByRole("button", { name: /Ouvrir la recherche/ });
			fireEvent.focus(searchButton);
			const sortButton = screen.getByRole("button", { name: /Ouvrir les options de tri/ });
			fireEvent.focus(sortButton);
			expect(sortButton).toHaveAttribute("tabindex", "0");
		});
	});

	describe("keyboard navigation", () => {
		it("ArrowRight from sort button moves focus to search button", () => {
			renderDefault();
			const sortButton = screen.getByRole("button", { name: /Ouvrir les options de tri/ });
			fireEvent.keyDown(sortButton, { key: "ArrowRight" });
			const searchButton = screen.getByRole("button", { name: /Ouvrir la recherche/ });
			expect(searchButton).toHaveAttribute("tabindex", "0");
		});

		it("ArrowRight from search button moves focus to filter button", () => {
			renderDefault();
			const searchButton = screen.getByRole("button", { name: /Ouvrir la recherche/ });
			fireEvent.focus(searchButton);
			fireEvent.keyDown(searchButton, { key: "ArrowRight" });
			const filterButton = screen.getByRole("button", { name: /Ouvrir les filtres/ });
			expect(filterButton).toHaveAttribute("tabindex", "0");
		});

		it("ArrowRight from filter button moves to menu button", () => {
			renderDefault();
			const filterButton = screen.getByRole("button", { name: /Ouvrir les filtres/ });
			fireEvent.focus(filterButton);
			fireEvent.keyDown(filterButton, { key: "ArrowRight" });
			const menuButton = screen.getByRole("button", { name: /Ouvrir le menu de navigation/ });
			expect(menuButton).toHaveAttribute("tabindex", "0");
		});

		it("ArrowLeft from sort button wraps to menu button", () => {
			renderDefault();
			const sortButton = screen.getByRole("button", { name: /Ouvrir les options de tri/ });
			fireEvent.keyDown(sortButton, { key: "ArrowLeft" });
			const menuButton = screen.getByRole("button", { name: /Ouvrir le menu de navigation/ });
			expect(menuButton).toHaveAttribute("tabindex", "0");
		});

		it("ArrowLeft from search button moves focus to sort button", () => {
			renderDefault();
			const searchButton = screen.getByRole("button", { name: /Ouvrir la recherche/ });
			fireEvent.focus(searchButton);
			fireEvent.keyDown(searchButton, { key: "ArrowLeft" });
			const sortButton = screen.getByRole("button", { name: /Ouvrir les options de tri/ });
			expect(sortButton).toHaveAttribute("tabindex", "0");
		});

		it("ArrowDown behaves like ArrowRight", () => {
			renderDefault();
			const sortButton = screen.getByRole("button", { name: /Ouvrir les options de tri/ });
			fireEvent.keyDown(sortButton, { key: "ArrowDown" });
			const searchButton = screen.getByRole("button", { name: /Ouvrir la recherche/ });
			expect(searchButton).toHaveAttribute("tabindex", "0");
		});

		it("ArrowUp behaves like ArrowLeft", () => {
			renderDefault();
			const searchButton = screen.getByRole("button", { name: /Ouvrir la recherche/ });
			fireEvent.focus(searchButton);
			fireEvent.keyDown(searchButton, { key: "ArrowUp" });
			const sortButton = screen.getByRole("button", { name: /Ouvrir les options de tri/ });
			expect(sortButton).toHaveAttribute("tabindex", "0");
		});

		it("Home key moves focus to first button (sort)", () => {
			renderDefault();
			const filterButton = screen.getByRole("button", { name: /Ouvrir les filtres/ });
			fireEvent.focus(filterButton);
			fireEvent.keyDown(filterButton, { key: "Home" });
			const sortButton = screen.getByRole("button", { name: /Ouvrir les options de tri/ });
			expect(sortButton).toHaveAttribute("tabindex", "0");
		});

		it("End key moves focus to last button (menu)", () => {
			renderDefault();
			const sortButton = screen.getByRole("button", { name: /Ouvrir les options de tri/ });
			fireEvent.keyDown(sortButton, { key: "End" });
			const menuButton = screen.getByRole("button", { name: /Ouvrir le menu de navigation/ });
			expect(menuButton).toHaveAttribute("tabindex", "0");
		});
	});

	describe("active states", () => {
		describe("sort active state", () => {
			it("shows active dot when sortBy param is set", () => {
				mockSearchParams.set("sortBy", "created-descending");
				renderDefault();
				expect(screen.queryAllByTestId("active-dot").length).toBeGreaterThanOrEqual(1);
			});

			it("uses 'Tri actif' aria-label on sort button when sort is active", () => {
				mockSearchParams.set("sortBy", "created-descending");
				renderDefault();
				expect(
					screen.getByRole("button", { name: /Tri actif\. Modifier le tri/ }),
				).toBeInTheDocument();
			});

			it("uses default aria-label on sort button when no sort is active", () => {
				renderDefault();
				expect(
					screen.getByRole("button", { name: /Ouvrir les options de tri/ }),
				).toBeInTheDocument();
			});
		});

		describe("search active state", () => {
			it("shows active dot when search param is set", () => {
				mockSearchParams.set("search", "promo10");
				renderDefault();
				expect(screen.queryAllByTestId("active-dot").length).toBeGreaterThanOrEqual(1);
			});

			it("uses active aria-label on search button when search is active", () => {
				mockSearchParams.set("search", "promo10");
				renderDefault();
				expect(
					screen.getByRole("button", { name: /Recherche: "promo10"\. Modifier la recherche/ }),
				).toBeInTheDocument();
			});

			it("does not treat empty search param as active", () => {
				mockSearchParams.set("search", "");
				renderDefault();
				expect(screen.getByRole("button", { name: /Ouvrir la recherche/ })).toBeInTheDocument();
			});

			it("shows clear button in search drawer when search is active", () => {
				mockSearchParams.set("search", "noel");
				renderDefault();
				fireEvent.click(screen.getByRole("button", { name: /Recherche: "noel"/ }));
				expect(screen.getByRole("button", { name: /Effacer la recherche/ })).toBeInTheDocument();
			});

			it("does not show clear button when search is inactive", () => {
				renderDefault();
				fireEvent.click(screen.getByRole("button", { name: /Ouvrir la recherche/ }));
				expect(
					screen.queryByRole("button", { name: /Effacer la recherche/ }),
				).not.toBeInTheDocument();
			});
		});

		describe("filter active state", () => {
			it("shows active dot when filter_type is set", () => {
				mockSearchParams.set("filter_type", "PERCENTAGE");
				renderDefault();
				expect(screen.queryAllByTestId("active-dot").length).toBeGreaterThanOrEqual(1);
			});

			it("shows active dot when filter_isActive is set", () => {
				mockSearchParams.set("filter_isActive", "true");
				renderDefault();
				expect(screen.queryAllByTestId("active-dot").length).toBeGreaterThanOrEqual(1);
			});

			it("shows active dot when filter_hasUsages is set", () => {
				mockSearchParams.set("filter_hasUsages", "true");
				renderDefault();
				expect(screen.queryAllByTestId("active-dot").length).toBeGreaterThanOrEqual(1);
			});

			it("uses 'Filtre actif' aria-label on filter button when filter is active", () => {
				mockSearchParams.set("filter_isActive", "true");
				renderDefault();
				expect(
					screen.getByRole("button", { name: /Filtre actif\. Modifier le filtre/ }),
				).toBeInTheDocument();
			});

			it("uses default aria-label on filter button when no filter is active", () => {
				renderDefault();
				expect(screen.getByRole("button", { name: /Ouvrir les filtres/ })).toBeInTheDocument();
			});
		});

		it("shows multiple active dots when several states are active simultaneously", () => {
			mockSearchParams.set("sortBy", "created-descending");
			mockSearchParams.set("search", "promo");
			mockSearchParams.set("filter_isActive", "true");
			renderDefault();
			expect(screen.queryAllByTestId("active-dot")).toHaveLength(3);
		});
	});

	describe("button clicks", () => {
		it("clicking sort button opens sort drawer", () => {
			renderDefault();
			const sortButton = screen.getByRole("button", { name: /Ouvrir les options de tri/ });
			fireEvent.click(sortButton);
			expect(screen.getByTestId("sort-drawer")).toHaveAttribute("data-open", "true");
		});

		it("clicking search button opens search drawer", () => {
			renderDefault();
			const searchButton = screen.getByRole("button", { name: /Ouvrir la recherche/ });
			fireEvent.click(searchButton);
			expect(screen.getByTestId("drawer-title")).toHaveTextContent("Rechercher");
		});

		it("clicking filter button opens filter drawer", () => {
			renderDefault();
			const filterButton = screen.getByRole("button", { name: /Ouvrir les filtres/ });
			fireEvent.click(filterButton);
			expect(screen.getByTestId("filter-drawer")).toHaveAttribute("data-open", "true");
			expect(screen.getByTestId("filter-drawer-content")).toBeInTheDocument();
		});

		it("opening sort drawer closes search drawer", () => {
			renderDefault();
			fireEvent.click(screen.getByRole("button", { name: /Ouvrir la recherche/ }));
			expect(screen.getByTestId("drawer-title")).toBeInTheDocument();
			const sortButton = screen.getByRole("button", { name: /Ouvrir les options de tri/ });
			fireEvent.click(sortButton);
			expect(screen.getByTestId("sort-drawer")).toHaveAttribute("data-open", "true");
			expect(screen.queryByTestId("drawer-title")).not.toBeInTheDocument();
		});

		it("opening search drawer closes sort drawer", () => {
			renderDefault();
			fireEvent.click(screen.getByRole("button", { name: /Ouvrir les options de tri/ }));
			expect(screen.getByTestId("sort-drawer")).toHaveAttribute("data-open", "true");
			const searchButton = screen.getByRole("button", { name: /Ouvrir la recherche/ });
			fireEvent.click(searchButton);
			expect(screen.getByTestId("sort-drawer")).toHaveAttribute("data-open", "false");
		});

		it("opening filter drawer closes sort drawer", () => {
			renderDefault();
			fireEvent.click(screen.getByRole("button", { name: /Ouvrir les options de tri/ }));
			expect(screen.getByTestId("sort-drawer")).toHaveAttribute("data-open", "true");
			const filterButton = screen.getByRole("button", { name: /Ouvrir les filtres/ });
			fireEvent.click(filterButton);
			expect(screen.getByTestId("sort-drawer")).toHaveAttribute("data-open", "false");
			expect(screen.getByTestId("filter-drawer")).toHaveAttribute("data-open", "true");
		});
	});

	describe("search form", () => {
		it("submitting search form calls router.push with search param", () => {
			renderDefault();
			fireEvent.click(screen.getByRole("button", { name: /Ouvrir la recherche/ }));
			const input = screen.getByRole("searchbox", { name: /Rechercher un code promo/ });
			fireEvent.change(input, { target: { value: "promo10" } });
			const form = input.closest("form")!;
			fireEvent.submit(form);
			expect(mockPush).toHaveBeenCalledOnce();
			const url = mockPush.mock.calls[0]![0] as string;
			expect(url).toContain("search=promo10");
		});

		it("submitting search form removes cursor and direction params", () => {
			mockSearchParams.set("cursor", "abc");
			mockSearchParams.set("direction", "next");
			renderDefault();
			fireEvent.click(screen.getByRole("button", { name: /Ouvrir la recherche/ }));
			const input = screen.getByRole("searchbox", { name: /Rechercher un code promo/ });
			fireEvent.change(input, { target: { value: "noel" } });
			const form = input.closest("form")!;
			fireEvent.submit(form);
			const url = mockPush.mock.calls[0]![0] as string;
			expect(url).not.toContain("cursor");
			expect(url).not.toContain("direction");
		});

		it("submitting empty search removes search param", () => {
			mockSearchParams.set("search", "promo");
			renderDefault();
			fireEvent.click(screen.getByRole("button", { name: /Recherche: "promo"/ }));
			const input = screen.getByRole("searchbox", { name: /Rechercher un code promo/ });
			fireEvent.change(input, { target: { value: "   " } });
			const form = input.closest("form")!;
			fireEvent.submit(form);
			const url = mockPush.mock.calls[0]![0] as string;
			expect(url).not.toContain("search=");
		});

		it("submitting search form closes the search drawer", () => {
			renderDefault();
			fireEvent.click(screen.getByRole("button", { name: /Ouvrir la recherche/ }));
			const input = screen.getByRole("searchbox", { name: /Rechercher un code promo/ });
			const form = input.closest("form")!;
			fireEvent.submit(form);
			expect(screen.queryByTestId("drawer-title")).not.toBeInTheDocument();
		});

		it("search input is pre-filled with current search param value", () => {
			mockSearchParams.set("search", "noel50");
			renderDefault();
			fireEvent.click(screen.getByRole("button", { name: /Recherche: "noel50"/ }));
			const input = screen.getByRole("searchbox", {
				name: /Rechercher un code promo/,
			}) as HTMLInputElement;
			expect(input.defaultValue).toBe("noel50");
		});

		it("clicking clear button removes search param and closes drawer", () => {
			mockSearchParams.set("search", "ete25");
			renderDefault();
			fireEvent.click(screen.getByRole("button", { name: /Recherche: "ete25"/ }));
			const clearButton = screen.getByRole("button", { name: /Effacer la recherche/ });
			fireEvent.click(clearButton);
			expect(mockPush).toHaveBeenCalledOnce();
			const url = mockPush.mock.calls[0]![0] as string;
			expect(url).not.toContain("search=");
			expect(screen.queryByTestId("drawer-title")).not.toBeInTheDocument();
		});

		it("clicking clear button removes cursor and direction params", () => {
			mockSearchParams.set("search", "ete25");
			mockSearchParams.set("cursor", "xyz");
			mockSearchParams.set("direction", "prev");
			renderDefault();
			fireEvent.click(screen.getByRole("button", { name: /Recherche: "ete25"/ }));
			fireEvent.click(screen.getByRole("button", { name: /Effacer la recherche/ }));
			const url = mockPush.mock.calls[0]![0] as string;
			expect(url).not.toContain("cursor");
			expect(url).not.toContain("direction");
		});

		it("router.push is called with scroll: false option", () => {
			renderDefault();
			fireEvent.click(screen.getByRole("button", { name: /Ouvrir la recherche/ }));
			const input = screen.getByRole("searchbox", { name: /Rechercher un code promo/ });
			const form = input.closest("form")!;
			fireEvent.submit(form);
			expect(mockPush).toHaveBeenCalledWith(expect.any(String), { scroll: false });
		});
	});

	describe("hide logic", () => {
		it("passes isHidden=false to BottomBar when nothing is open", () => {
			renderDefault();
			expect(screen.getByTestId("bottom-bar")).toHaveAttribute("data-hidden", "false");
		});

		it("passes isHidden=true when sort drawer is open", () => {
			renderDefault();
			fireEvent.click(screen.getByRole("button", { name: /Ouvrir les options de tri/ }));
			expect(screen.getByTestId("bottom-bar")).toHaveAttribute("data-hidden", "true");
		});

		it("passes isHidden=true when search drawer is open", () => {
			renderDefault();
			fireEvent.click(screen.getByRole("button", { name: /Ouvrir la recherche/ }));
			expect(screen.getByTestId("bottom-bar")).toHaveAttribute("data-hidden", "true");
		});

		it("passes isHidden=true when filter drawer is open", () => {
			renderDefault();
			fireEvent.click(screen.getByRole("button", { name: /Ouvrir les filtres/ }));
			expect(screen.getByTestId("bottom-bar")).toHaveAttribute("data-hidden", "true");
		});
	});

	describe("sort drawer options", () => {
		it("renders all sort options from DISCOUNTS_SORT_LABELS inside sort drawer", () => {
			renderDefault();
			fireEvent.click(screen.getByRole("button", { name: /Ouvrir les options de tri/ }));
			expect(screen.getByText("Plus récents")).toBeInTheDocument();
			expect(screen.getByText("Plus anciens")).toBeInTheDocument();
			expect(screen.getByText("Code (A-Z)")).toBeInTheDocument();
			expect(screen.getByText("Code (Z-A)")).toBeInTheDocument();
			expect(screen.getByText("Plus utilisés")).toBeInTheDocument();
			expect(screen.getByText("Moins utilisés")).toBeInTheDocument();
		});

		it("closing sort drawer via callback hides the options", () => {
			renderDefault();
			fireEvent.click(screen.getByRole("button", { name: /Ouvrir les options de tri/ }));
			expect(screen.getByTestId("sort-drawer")).toHaveAttribute("data-open", "true");
			fireEvent.click(screen.getByTestId("close-sort-drawer"));
			expect(screen.getByTestId("sort-drawer")).toHaveAttribute("data-open", "false");
		});
	});
});
