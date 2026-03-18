import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockWishlistCount } = vi.hoisted(() => ({
	mockWishlistCount: { value: 0 },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/stores/badge-counts-store", () => ({
	useBadgeCountsStore: vi.fn((selector: (state: { wishlistCount: number }) => unknown) =>
		selector({ wishlistCount: mockWishlistCount.value }),
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
				<span aria-live="polite" aria-atomic="true" className="sr-only">
					{count === 1 ? `1 ${singularLabel}` : `${count} ${pluralLabel}`}
				</span>
				<span data-testid="badge-count">{count > 99 ? "99+" : count}</span>
			</div>
		);
	},
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { WishlistBadge } from "../wishlist-badge";

// ============================================================================
// HELPERS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockWishlistCount.value = 0;
});

// ============================================================================
// TESTS
// ============================================================================

describe("WishlistBadge", () => {
	it("renders nothing when wishlist count is zero", () => {
		mockWishlistCount.value = 0;
		const { container } = render(<WishlistBadge />);
		expect(container.firstChild).toBeNull();
	});

	it("renders the badge when wishlist count is positive", () => {
		mockWishlistCount.value = 2;
		render(<WishlistBadge />);
		expect(screen.getByTestId("item-count-badge")).toBeInTheDocument();
	});

	it("displays the correct count", () => {
		mockWishlistCount.value = 7;
		render(<WishlistBadge />);
		expect(screen.getByTestId("badge-count").textContent).toBe("7");
	});

	it("caps display at 99+ when count exceeds 99", () => {
		mockWishlistCount.value = 120;
		render(<WishlistBadge />);
		expect(screen.getByTestId("badge-count").textContent).toBe("99+");
	});

	it("provides accessible aria-live announcement for singular count", () => {
		mockWishlistCount.value = 1;
		render(<WishlistBadge />);
		expect(screen.getByText("1 article dans votre wishlist")).toBeInTheDocument();
	});

	it("provides accessible aria-live announcement for plural count", () => {
		mockWishlistCount.value = 3;
		render(<WishlistBadge />);
		expect(screen.getByText("3 articles dans votre wishlist")).toBeInTheDocument();
	});

	it("renders nothing for a negative count", () => {
		mockWishlistCount.value = -1;
		const { container } = render(<WishlistBadge />);
		expect(container.firstChild).toBeNull();
	});
});
