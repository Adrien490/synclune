import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockCartCount } = vi.hoisted(() => ({
	mockCartCount: { value: 0 },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/stores/badge-counts-store", () => ({
	useBadgeCountsStore: vi.fn((selector: (state: { cartCount: number }) => unknown) =>
		selector({ cartCount: mockCartCount.value }),
	),
}));

vi.mock("@/shared/components/ui/item-count-badge", () => ({
	ItemCountBadge: ({
		count,
		singularLabel,
		pluralLabel,
	}: {
		count: number;
		singularLabel: string;
		pluralLabel: string;
		size?: string;
	}) => {
		if (!count || count <= 0) return null;
		return (
			<div data-testid="item-count-badge">
				<div aria-live="polite" aria-atomic="true" className="sr-only">
					{count === 1 ? `1 ${singularLabel}` : `${count} ${pluralLabel}`}
				</div>
				<span data-testid="badge-count">{count > 99 ? "99+" : count}</span>
			</div>
		);
	},
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CartBadge } from "../cart-badge";

// ============================================================================
// HELPERS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockCartCount.value = 0;
});

// ============================================================================
// TESTS
// ============================================================================

describe("CartBadge", () => {
	it("renders null when cart count is zero", () => {
		mockCartCount.value = 0;
		const { container } = render(<CartBadge />);
		expect(container.firstChild).toBeNull();
	});

	it("renders the badge when cart count is positive", () => {
		mockCartCount.value = 3;
		render(<CartBadge />);
		expect(screen.getByTestId("item-count-badge")).toBeInTheDocument();
	});

	it("displays the correct count from the store", () => {
		mockCartCount.value = 5;
		render(<CartBadge />);
		expect(screen.getByTestId("badge-count").textContent).toBe("5");
	});

	it("provides accessible aria-live announcement for singular count", () => {
		mockCartCount.value = 1;
		render(<CartBadge />);
		const liveRegion = screen.getByText("1 article dans votre panier");
		expect(liveRegion).toBeInTheDocument();
		expect(liveRegion.closest("[aria-live]")).toHaveAttribute("aria-live", "polite");
	});

	it("provides accessible aria-live announcement for plural count", () => {
		mockCartCount.value = 4;
		render(<CartBadge />);
		const liveRegion = screen.getByText("4 articles dans votre panier");
		expect(liveRegion).toBeInTheDocument();
	});

	it("caps display at 99+ when count exceeds 99", () => {
		mockCartCount.value = 150;
		render(<CartBadge />);
		expect(screen.getByTestId("badge-count").textContent).toBe("99+");
	});

	it("renders null for negative count", () => {
		mockCartCount.value = -1;
		const { container } = render(<CartBadge />);
		expect(container.firstChild).toBeNull();
	});
});
