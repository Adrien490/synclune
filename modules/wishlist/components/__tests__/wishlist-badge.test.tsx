import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockState } = vi.hoisted(() => ({
	mockState: {
		wishlistCount: 0,
	},
}));

// ============================================================================
// MODULE MOCKS — mock CountBadge to spy on the props passed by the wrapper.
// CountBadge internals are covered by its own test suite.
// ============================================================================

vi.mock("@/shared/stores/badge-counts-store", () => ({
	useBadgeCountsStore: vi.fn((selector: (state: typeof mockState) => unknown) =>
		selector(mockState),
	),
}));

vi.mock("@/shared/components/ui/count-badge", () => ({
	CountBadge: (props: {
		count: number;
		size?: string;
		type?: string;
		variant?: string;
		singularLabel: string;
		pluralLabel: string;
	}) => (
		<div
			data-testid="count-badge"
			data-count={props.count}
			data-size={props.size}
			data-type={props.type ?? "count"}
			data-variant={props.variant ?? "raised"}
			data-singular={props.singularLabel}
			data-plural={props.pluralLabel}
		/>
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { WishlistBadge } from "../wishlist-badge";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockState.wishlistCount = 0;
});

// ============================================================================
// TESTS
// ============================================================================

describe("WishlistBadge", () => {
	it("forwards the wishlist count to CountBadge", () => {
		mockState.wishlistCount = 7;
		render(<WishlistBadge />);
		const badge = screen.getByTestId("count-badge");
		expect(badge.dataset["count"]).toBe("7");
	});

	it("uses type=dot to reduce cognitive load alongside the cart counter", () => {
		mockState.wishlistCount = 3;
		render(<WishlistBadge />);
		const badge = screen.getByTestId("count-badge");
		expect(badge.dataset["type"]).toBe("dot");
	});

	it("uses size=sm for the wishlist dot", () => {
		mockState.wishlistCount = 1;
		render(<WishlistBadge />);
		const badge = screen.getByTestId("count-badge");
		expect(badge.dataset["size"]).toBe("sm");
	});

	it("passes French singular/plural labels (favori/favoris)", () => {
		mockState.wishlistCount = 1;
		render(<WishlistBadge />);
		const badge = screen.getByTestId("count-badge");
		expect(badge.dataset["singular"]).toBe("favori");
		expect(badge.dataset["plural"]).toBe("favoris");
	});

	it("renders even at count 0 (CountBadge owns hide-on-empty logic)", () => {
		mockState.wishlistCount = 0;
		render(<WishlistBadge />);
		const badge = screen.getByTestId("count-badge");
		expect(badge.dataset["count"]).toBe("0");
	});
});
