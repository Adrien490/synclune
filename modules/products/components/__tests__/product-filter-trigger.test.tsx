import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockOpen,
	mockSearchParams,
	mockPathname,
	mockCountActiveFilters,
	mockIsProductCategoryPage,
} = vi.hoisted(() => ({
	mockOpen: vi.fn(),
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
	useDialog: () => ({ open: mockOpen, close: vi.fn(), isOpen: false }),
}));

vi.mock("@/modules/products/services/product-filter-params.service", () => ({
	countActiveFilters: mockCountActiveFilters,
	isProductCategoryPage: mockIsProductCategoryPage,
}));

vi.mock("@/modules/products/constants/product.constants", () => ({
	PRODUCT_FILTER_DIALOG_ID: "product-filter-sheet",
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		"aria-label": ariaLabel,
		variant,
		...props
	}: {
		children?: React.ReactNode;
		onClick?: () => void;
		"aria-label"?: string;
		variant?: string;
		[key: string]: unknown;
	}) => (
		<button onClick={onClick} aria-label={ariaLabel} data-variant={variant} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<span data-testid="filter-count-badge" className={className}>
			{children}
		</span>
	),
}));

vi.mock("lucide-react", () => ({
	Filter: () => <span data-testid="filter-icon" />,
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { ProductFilterTrigger } from "../product-filter-trigger";

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockCountActiveFilters.mockReturnValue({ hasActiveFilters: false, activeFiltersCount: 0 });
	mockIsProductCategoryPage.mockReturnValue(false);
});

describe("ProductFilterTrigger", () => {
	describe("full variant (default)", () => {
		it("renders a button with 'Filtres' text", () => {
			render(<ProductFilterTrigger />);
			expect(screen.getByText("Filtres")).toBeInTheDocument();
		});

		it("does not show filter count badge when no active filters", () => {
			mockCountActiveFilters.mockReturnValue({ hasActiveFilters: false, activeFiltersCount: 0 });
			render(<ProductFilterTrigger />);
			expect(screen.queryByTestId("filter-count-badge")).not.toBeInTheDocument();
		});

		it("shows filter count badge when active filters are present", () => {
			mockCountActiveFilters.mockReturnValue({ hasActiveFilters: true, activeFiltersCount: 3 });
			render(<ProductFilterTrigger />);
			const badge = screen.getByTestId("filter-count-badge");
			expect(badge).toBeInTheDocument();
			expect(badge.textContent).toBe("3");
		});

		it("calls dialog open when button is clicked", () => {
			render(<ProductFilterTrigger />);
			fireEvent.click(screen.getByText("Filtres"));
			expect(mockOpen).toHaveBeenCalledOnce();
		});

		it("sets aria-label with active count when filters are active", () => {
			mockCountActiveFilters.mockReturnValue({ hasActiveFilters: true, activeFiltersCount: 2 });
			render(<ProductFilterTrigger />);
			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("aria-label", "Filtres (2 actifs)");
		});

		it("sets aria-label without count when no active filters", () => {
			render(<ProductFilterTrigger />);
			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("aria-label", "Filtres");
		});
	});

	describe("icon variant", () => {
		it("renders a button without 'Filtres' text when variant is icon", () => {
			render(<ProductFilterTrigger variant="icon" />);
			// Icon variant has no visible text label (only an sr-only aria-label)
			expect(screen.queryByText("Filtres")).not.toBeInTheDocument();
		});

		it("shows active dot indicator when filters are active in icon variant", () => {
			mockCountActiveFilters.mockReturnValue({ hasActiveFilters: true, activeFiltersCount: 1 });
			const { container } = render(<ProductFilterTrigger variant="icon" />);
			// The active indicator is a <span> with aria-hidden="true"
			const dot = container.querySelector('span[aria-hidden="true"]');
			expect(dot).toBeInTheDocument();
		});

		it("does not show active dot when no active filters in icon variant", () => {
			mockCountActiveFilters.mockReturnValue({ hasActiveFilters: false, activeFiltersCount: 0 });
			const { container } = render(<ProductFilterTrigger variant="icon" />);
			const dot = container.querySelector('span[aria-hidden="true"]');
			expect(dot).not.toBeInTheDocument();
		});

		it("calls dialog open when icon button is clicked", () => {
			render(<ProductFilterTrigger variant="icon" />);
			fireEvent.click(screen.getByRole("button"));
			expect(mockOpen).toHaveBeenCalledOnce();
		});
	});

	describe("category page adds implicit filter count", () => {
		it("increments activeFiltersCount by 1 on a category page", () => {
			mockIsProductCategoryPage.mockReturnValue(true);
			mockCountActiveFilters.mockReturnValue({ hasActiveFilters: false, activeFiltersCount: 0 });
			render(<ProductFilterTrigger />);
			// count becomes 0 + 1 = 1; badge should be rendered with "1"
			const badge = screen.getByTestId("filter-count-badge");
			expect(badge.textContent).toBe("1");
		});
	});
});
