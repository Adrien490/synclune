import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockUseBadgeCountsStore } = vi.hoisted(() => ({
	mockUseBadgeCountsStore: vi.fn(),
}));

vi.mock("@/shared/stores/badge-counts-store", () => ({
	useBadgeCountsStore: mockUseBadgeCountsStore,
}));

// Import AFTER mocks
import { AppBadgeSync } from "../app-badge-sync";

// ============================================================================
// navigator.setAppBadge / clearAppBadge mocks
// ============================================================================

const mockSetAppBadge = vi.fn().mockResolvedValue(undefined);
const mockClearAppBadge = vi.fn().mockResolvedValue(undefined);

function installBadgingApi() {
	Object.defineProperty(navigator, "setAppBadge", {
		value: mockSetAppBadge,
		configurable: true,
		writable: true,
	});
	Object.defineProperty(navigator, "clearAppBadge", {
		value: mockClearAppBadge,
		configurable: true,
		writable: true,
	});
}

function uninstallBadgingApi() {
	// @ts-expect-error removing optional property
	delete (navigator as Navigator & { setAppBadge?: unknown }).setAppBadge;
	// @ts-expect-error removing optional property
	delete (navigator as Navigator & { clearAppBadge?: unknown }).clearAppBadge;
}

afterEach(() => {
	cleanup();
	uninstallBadgingApi();
});

// ============================================================================
// TESTS
// ============================================================================

describe("AppBadgeSync", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		installBadgingApi();
		mockUseBadgeCountsStore.mockImplementation(
			(selector: (state: { cartCount: number }) => number) => selector({ cartCount: 0 }),
		);
	});

	it("renders nothing (returns null)", () => {
		const { container } = render(<AppBadgeSync />);
		expect(container.firstChild).toBeNull();
	});

	it("calls setAppBadge with the cart count when > 0", () => {
		mockUseBadgeCountsStore.mockImplementation(
			(selector: (state: { cartCount: number }) => number) => selector({ cartCount: 3 }),
		);
		render(<AppBadgeSync />);
		expect(mockSetAppBadge).toHaveBeenCalledWith(3);
		expect(mockClearAppBadge).not.toHaveBeenCalled();
	});

	it("calls clearAppBadge when cart count is 0", () => {
		render(<AppBadgeSync />);
		expect(mockClearAppBadge).toHaveBeenCalled();
		expect(mockSetAppBadge).not.toHaveBeenCalled();
	});

	it("no-ops on unsupported browsers (Badging API absent)", () => {
		uninstallBadgingApi();
		mockUseBadgeCountsStore.mockImplementation(
			(selector: (state: { cartCount: number }) => number) => selector({ cartCount: 5 }),
		);
		expect(() => render(<AppBadgeSync />)).not.toThrow();
	});
});
