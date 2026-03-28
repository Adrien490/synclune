import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockUseAppBadge, mockUseBadgeCountsStore } = vi.hoisted(() => ({
	mockUseAppBadge: vi.fn(),
	mockUseBadgeCountsStore: vi.fn(),
}));

vi.mock("@/shared/hooks/use-app-badge", () => ({
	useAppBadge: mockUseAppBadge,
}));

vi.mock("@/shared/stores/badge-counts-store", () => ({
	useBadgeCountsStore: mockUseBadgeCountsStore,
}));

// Import AFTER mocks
import { AppBadgeSync } from "../app-badge-sync";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("AppBadgeSync", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseBadgeCountsStore.mockImplementation(
			(selector: (state: { cartCount: number }) => number) => selector({ cartCount: 0 }),
		);
	});

	it("renders nothing (returns null)", () => {
		const { container } = render(<AppBadgeSync />);
		expect(container.firstChild).toBeNull();
	});

	it("calls useAppBadge with the cart count from the store", () => {
		mockUseBadgeCountsStore.mockImplementation(
			(selector: (state: { cartCount: number }) => number) => selector({ cartCount: 3 }),
		);
		render(<AppBadgeSync />);
		expect(mockUseAppBadge).toHaveBeenCalledWith(3);
	});

	it("passes zero cart count to useAppBadge", () => {
		mockUseBadgeCountsStore.mockImplementation(
			(selector: (state: { cartCount: number }) => number) => selector({ cartCount: 0 }),
		);
		render(<AppBadgeSync />);
		expect(mockUseAppBadge).toHaveBeenCalledWith(0);
	});

	it("updates useAppBadge when cart count changes", () => {
		mockUseBadgeCountsStore.mockImplementation(
			(selector: (state: { cartCount: number }) => number) => selector({ cartCount: 10 }),
		);
		render(<AppBadgeSync />);
		expect(mockUseAppBadge).toHaveBeenCalledWith(10);
	});
});
