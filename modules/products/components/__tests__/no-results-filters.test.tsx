import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOptimisticActiveFilters, mockRemoveFilterOptimistic, mockRemoveFiltersOptimistic } =
	vi.hoisted(() => ({
		mockOptimisticActiveFilters: [] as {
			id: string;
			key: string;
			value: string;
			label: string;
			displayValue: string;
		}[],
		mockRemoveFilterOptimistic: vi.fn(),
		mockRemoveFiltersOptimistic: vi.fn(),
	}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useSearchParams: () => new URLSearchParams(),
	useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
	usePathname: () => "/produits",
}));

vi.mock("@/shared/hooks/use-filter", () => ({
	useFilter: () => ({
		optimisticActiveFilters: mockOptimisticActiveFilters,
		removeFilterOptimistic: mockRemoveFilterOptimistic,
		removeFiltersOptimistic: mockRemoveFiltersOptimistic,
	}),
}));

vi.mock("motion/react", () => ({
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	m: {
		div: ({
			children,
			...props
		}: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
			<div {...props}>{children}</div>
		),
	},
}));

vi.mock("@/shared/components/filter-badge", () => ({
	FilterBadge: ({
		filter,
		onRemove,
	}: {
		filter: { id: string; key: string; value: string; label: string };
		formatFilter?: unknown;
		onRemove: (key: string, value?: string) => void;
	}) => (
		<button
			data-testid={`filter-badge-${filter.key}`}
			onClick={() => onRemove(filter.key, filter.value)}
		>
			{filter.label}: {filter.value}
		</button>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
		...props
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		[key: string]: unknown;
	}) => {
		if (asChild) {
			// Render children directly when asChild is true
			return <>{children}</>;
		}
		return <button {...props}>{children}</button>;
	},
}));

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		className,
	}: {
		href: string;
		children: React.ReactNode;
		className?: string;
	}) => (
		<a href={href} className={className}>
			{children}
		</a>
	),
}));

vi.mock("@/modules/products/constants/filter-labels.constants", () => ({
	FILTER_LABELS: {
		color: "Couleur",
		material: "Matériau",
		type: "Type",
		rating: "Note",
		stockStatus: "Stock",
		onSale: "Promotion",
	},
}));

vi.mock("@/modules/products/utils/format-price", () => ({
	formatPrice: (value: number | string) => `${Number(value).toFixed(2)} €`,
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { NoResultsFilters } from "../no-results-filters";

// ============================================================================
// HELPERS
// ============================================================================

function setActiveFilters(
	filters: { id: string; key: string; value: string; label: string; displayValue: string }[],
) {
	mockOptimisticActiveFilters.length = 0;
	mockOptimisticActiveFilters.push(...filters);
}

function clearActiveFilters() {
	mockOptimisticActiveFilters.length = 0;
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	clearActiveFilters();
});

describe("NoResultsFilters", () => {
	describe("empty state", () => {
		it("renders nothing when there are no active filters", () => {
			clearActiveFilters();
			const { container } = render(<NoResultsFilters />);
			expect(container.firstChild).toBeNull();
		});
	});

	describe("with active filters", () => {
		beforeEach(() => {
			setActiveFilters([
				{ id: "color-or", key: "color", value: "or", label: "Couleur", displayValue: "Or" },
				{
					id: "material-acier",
					key: "material",
					value: "acier",
					label: "Matériau",
					displayValue: "Acier",
				},
			]);
		});

		it("renders the active filters region", () => {
			render(<NoResultsFilters />);
			expect(screen.getByRole("region", { name: "Filtres actifs" })).toBeInTheDocument();
		});

		it("renders a filter badge for each active filter", () => {
			render(<NoResultsFilters />);
			expect(screen.getByTestId("filter-badge-color")).toBeInTheDocument();
			expect(screen.getByTestId("filter-badge-material")).toBeInTheDocument();
		});

		it("renders the 'Effacer les filtres' reset button", () => {
			render(<NoResultsFilters />);
			expect(screen.getByText("Effacer les filtres")).toBeInTheDocument();
		});

		it("reset button links to the default /produits URL", () => {
			render(<NoResultsFilters />);
			const link = screen.getByRole("link", { name: "Effacer les filtres" });
			expect(link.getAttribute("href")).toBe("/produits");
		});

		it("reset button links to a custom resetUrl when provided", () => {
			render(<NoResultsFilters resetUrl="/boutique/bijoux" />);
			const link = screen.getByRole("link", { name: "Effacer les filtres" });
			expect(link.getAttribute("href")).toBe("/boutique/bijoux");
		});
	});

	describe("filter removal", () => {
		it("calls removeFilterOptimistic when a filter badge is clicked", () => {
			setActiveFilters([
				{ id: "color-or", key: "color", value: "or", label: "Couleur", displayValue: "Or" },
			]);
			render(<NoResultsFilters />);
			fireEvent.click(screen.getByTestId("filter-badge-color"));
			expect(mockRemoveFilterOptimistic).toHaveBeenCalledWith("color", "or");
		});

		it("calls removeFiltersOptimistic for both priceMin and priceMax when price filter is removed", () => {
			setActiveFilters([
				{
					id: "priceMin-50",
					key: "priceMin",
					value: "50",
					label: "Prix",
					displayValue: "50",
				},
			]);
			render(<NoResultsFilters />);
			fireEvent.click(screen.getByTestId("filter-badge-priceMin"));
			expect(mockRemoveFiltersOptimistic).toHaveBeenCalledWith(["priceMin", "priceMax"]);
		});
	});

	describe("accessibility", () => {
		it("renders a polite live region for screen reader announcements", () => {
			setActiveFilters([
				{ id: "color-or", key: "color", value: "or", label: "Couleur", displayValue: "Or" },
			]);
			render(<NoResultsFilters />);
			const liveRegion = screen.getByRole("region").querySelector("[aria-live='polite']");
			expect(liveRegion).toBeInTheDocument();
		});

		it("announces correct filter count text for a single filter", () => {
			setActiveFilters([
				{ id: "color-or", key: "color", value: "or", label: "Couleur", displayValue: "Or" },
			]);
			render(<NoResultsFilters />);
			// The sr-only live region should say "1 filtre actif"
			const region = screen.getByRole("region");
			expect(region.textContent).toContain("1 filtre actif");
		});

		it("announces correct filter count text for multiple filters", () => {
			setActiveFilters([
				{ id: "color-or", key: "color", value: "or", label: "Couleur", displayValue: "Or" },
				{
					id: "material-acier",
					key: "material",
					value: "acier",
					label: "Matériau",
					displayValue: "Acier",
				},
			]);
			render(<NoResultsFilters />);
			const region = screen.getByRole("region");
			expect(region.textContent).toContain("2 filtres actifs");
		});
	});
});
