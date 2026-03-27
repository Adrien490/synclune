import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as ReactType from "react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPush, mockSearchParams } = vi.hoisted(() => ({
	mockPush: vi.fn(),
	mockSearchParams: { value: new URLSearchParams() },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
	useSearchParams: () => mockSearchParams.value,
}));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof ReactType>();
	return {
		...actual,
		useTransition: () => [false, (fn: () => void) => fn()],
	};
});

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		className,
		...rest
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		className?: string;
		[key: string]: unknown;
	}) => (
		<button disabled={disabled} className={className} {...rest}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
		<div data-testid="dropdown-trigger">{children}</div>
	),
	DropdownMenuContent: ({
		children,
	}: {
		children: React.ReactNode;
		align?: string;
		className?: string;
	}) => <div data-testid="dropdown-content">{children}</div>,
	DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dropdown-label">{children}</div>
	),
	DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
	DropdownMenuItem: ({
		children,
		onClick,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
	}) => (
		<button role="menuitem" onClick={onClick}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
	Check: ({ className }: { className?: string }) => (
		<svg data-testid="icon-check" className={className} />
	),
	ChevronDown: () => <svg data-testid="icon-chevron-down" />,
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { ProductsQuickFilters } from "../products-quick-filters";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ProductsQuickFilters", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSearchParams.value = new URLSearchParams();
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	describe("rendering", () => {
		it("renders the trigger button with default label", () => {
			render(<ProductsQuickFilters />);
			expect(screen.getAllByText("Tous les bijoux").length).toBeGreaterThanOrEqual(1);
		});

		it("renders all quick filter options", () => {
			render(<ProductsQuickFilters />);
			expect(screen.getAllByText("Tous les bijoux").length).toBeGreaterThanOrEqual(1);
			expect(screen.getByText("En rupture de stock")).toBeInTheDocument();
			expect(screen.getByText("Prix moins de 50€")).toBeInTheDocument();
		});

		it("renders 'Filtres rapides' label", () => {
			render(<ProductsQuickFilters />);
			expect(screen.getByTestId("dropdown-label")).toHaveTextContent("Filtres rapides");
		});
	});

	// ─── Active filter detection ───────────────────────────────────────────────

	describe("active filter detection", () => {
		it("shows 'Tous les bijoux' label when no filters are active", () => {
			render(<ProductsQuickFilters />);
			const button = screen.getByRole("button");
			expect(button).toHaveTextContent("Tous les bijoux");
		});

		it("shows 'En rupture de stock' label when out_of_stock filter is active", () => {
			mockSearchParams.value = new URLSearchParams("filter_stockStatus=out_of_stock");
			render(<ProductsQuickFilters />);
			const button = screen.getByRole("button");
			expect(button).toHaveTextContent("En rupture de stock");
		});

		it("shows 'Prix moins de 50€' label when price filter is active", () => {
			mockSearchParams.value = new URLSearchParams("filter_priceMin=0&filter_priceMax=5000");
			render(<ProductsQuickFilters />);
			const button = screen.getByRole("button");
			expect(button).toHaveTextContent("Prix moins de 50€");
		});

		it("falls back to 'Tous les bijoux' label for custom/unknown filter combinations", () => {
			mockSearchParams.value = new URLSearchParams("filter_color=red");
			render(<ProductsQuickFilters />);
			const button = screen.getByRole("button");
			expect(button).toHaveTextContent("Tous les bijoux");
		});
	});

	// ─── Filter application ────────────────────────────────────────────────────

	describe("filter application", () => {
		it("navigates to URL with out_of_stock filter when clicking 'En rupture de stock'", () => {
			render(<ProductsQuickFilters />);
			fireEvent.click(screen.getByText("En rupture de stock"));
			expect(mockPush).toHaveBeenCalledWith(
				expect.stringContaining("filter_stockStatus=out_of_stock"),
				{ scroll: false },
			);
		});

		it("navigates to URL with price filter when clicking 'Prix moins de 50€'", () => {
			render(<ProductsQuickFilters />);
			fireEvent.click(screen.getByText("Prix moins de 50€"));
			const call = mockPush.mock.calls[0]?.[0] as string;
			expect(call).toContain("filter_priceMin=0");
			expect(call).toContain("filter_priceMax=5000");
		});

		it("clears all filters when clicking 'Tous les bijoux'", () => {
			mockSearchParams.value = new URLSearchParams("filter_stockStatus=out_of_stock");
			render(<ProductsQuickFilters />);
			const allItems = screen.getAllByRole("menuitem");
			const allBijouxItem = allItems.find((item) => item.textContent.includes("Tous les bijoux"));
			expect(allBijouxItem).toBeDefined();
			fireEvent.click(allBijouxItem!);
			const call = mockPush.mock.calls[0]?.[0] as string;
			expect(call).not.toContain("filter_stockStatus");
		});

		it("sets page=1 when applying a filter", () => {
			render(<ProductsQuickFilters />);
			fireEvent.click(screen.getByText("En rupture de stock"));
			expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("page=1"), { scroll: false });
		});

		it("removes existing filter params before applying new filter", () => {
			mockSearchParams.value = new URLSearchParams("filter_priceMin=0&filter_priceMax=5000");
			render(<ProductsQuickFilters />);
			fireEvent.click(screen.getByText("En rupture de stock"));
			const call = mockPush.mock.calls[0]?.[0] as string;
			expect(call).not.toContain("filter_priceMin");
			expect(call).not.toContain("filter_priceMax");
			expect(call).toContain("filter_stockStatus=out_of_stock");
		});

		it("preserves non-filter params when applying a filter", () => {
			mockSearchParams.value = new URLSearchParams("search=bague&sortBy=title-ascending");
			render(<ProductsQuickFilters />);
			fireEvent.click(screen.getByText("En rupture de stock"));
			const call = mockPush.mock.calls[0]?.[0] as string;
			expect(call).toContain("search=bague");
			expect(call).toContain("sortBy=title-ascending");
		});

		it("passes scroll:false to router.push", () => {
			render(<ProductsQuickFilters />);
			fireEvent.click(screen.getByText("En rupture de stock"));
			expect(mockPush).toHaveBeenCalledWith(expect.any(String), { scroll: false });
		});
	});

	// ─── Check icon visibility ─────────────────────────────────────────────────

	describe("check icon visibility", () => {
		it("shows check icon with full opacity for active filter", () => {
			mockSearchParams.value = new URLSearchParams("filter_stockStatus=out_of_stock");
			render(<ProductsQuickFilters />);
			const checkIcons = screen.getAllByTestId("icon-check");
			const visibleCheck = checkIcons.find((icon) =>
				icon.getAttribute("class")?.includes("opacity-100"),
			);
			expect(visibleCheck).toBeDefined();
		});

		it("shows check icons with zero opacity for inactive filters", () => {
			render(<ProductsQuickFilters />);
			const checkIcons = screen.getAllByTestId("icon-check");
			const hiddenChecks = checkIcons.filter((icon) =>
				icon.getAttribute("class")?.includes("opacity-0"),
			);
			expect(hiddenChecks.length).toBeGreaterThan(0);
		});
	});
});
