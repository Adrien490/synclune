import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockState } = vi.hoisted(() => ({
	mockState: {
		cartCount: 0,
		cartBump: null as { delta: number; key: number } | null,
	},
}));

// ============================================================================
// MODULE MOCKS — mock CountBadge to spy on the props passed by the wrapper.
// We're only validating the wrapper's wiring; CountBadge internals have their
// own test suite at shared/components/ui/__tests__/count-badge.test.tsx.
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
		bumpKey?: number | null;
		bumpDelta?: number | null;
	}) => (
		<div
			data-testid="count-badge"
			data-count={props.count}
			data-size={props.size}
			data-type={props.type ?? "count"}
			data-variant={props.variant ?? "raised"}
			data-bump-key={props.bumpKey ?? ""}
			data-bump-delta={props.bumpDelta ?? ""}
			data-singular={props.singularLabel}
			data-plural={props.pluralLabel}
		/>
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CartBadge } from "../cart-badge";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockState.cartCount = 0;
	mockState.cartBump = null;
});

// ============================================================================
// TESTS
// ============================================================================

describe("CartBadge", () => {
	it("forwards the cart count to CountBadge", () => {
		mockState.cartCount = 5;
		render(<CartBadge />);
		const badge = screen.getByTestId("count-badge");
		expect(badge.dataset["count"]).toBe("5");
	});

	it("uses size=lg + count type for the cart (Synclune brand consistency)", () => {
		mockState.cartCount = 3;
		render(<CartBadge />);
		const badge = screen.getByTestId("count-badge");
		expect(badge.dataset["size"]).toBe("lg");
		expect(badge.dataset["type"]).toBe("count");
	});

	it("passes French singular/plural labels", () => {
		mockState.cartCount = 1;
		render(<CartBadge />);
		const badge = screen.getByTestId("count-badge");
		expect(badge.dataset["singular"]).toBe("article dans ton panier");
		expect(badge.dataset["plural"]).toBe("articles dans ton panier");
	});

	it("forwards cartBump to drive the +N flash on optimistic add", () => {
		mockState.cartCount = 2;
		mockState.cartBump = { delta: 2, key: 12345 };
		render(<CartBadge />);
		const badge = screen.getByTestId("count-badge");
		expect(badge.dataset["bumpKey"]).toBe("12345");
		expect(badge.dataset["bumpDelta"]).toBe("2");
	});

	it("renders even at count 0 (CountBadge owns hide-on-empty logic)", () => {
		mockState.cartCount = 0;
		render(<CartBadge />);
		const badge = screen.getByTestId("count-badge");
		expect(badge.dataset["count"]).toBe("0");
	});
});
