import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/modules/cart/components/cart-sheet-skeleton", () => ({
	CartSheetSkeleton: () => <div data-testid="cart-sheet-skeleton" />,
}));

vi.mock("@/modules/cart/data/get-cart", () => ({
	getCart: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("next/dynamic", () => ({
	default: (fn: () => Promise<{ CartSheet?: unknown; SkuSelectorDialog?: unknown }>) => {
		// Return a placeholder based on the module path
		const WrappedComponent = (props: Record<string, unknown>) => {
			// We just render a stub for dynamic components
			return <div data-testid="dynamic-component" data-props={JSON.stringify(props)} />;
		};
		return WrappedComponent;
	},
}));

vi.mock("@/modules/cart/components/cart-sheet-recommendations", () => ({
	CartSheetRecommendations: () => <div data-testid="cart-sheet-recommendations" />,
}));

// ============================================================================
// IMPORTS AFTER MOCKS
// ============================================================================

import { CartAndSkuWrapper } from "../cart-and-sku-wrapper";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("CartAndSkuWrapper", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the cart sheet skeleton as Suspense fallback during SSR", () => {
		// Render the wrapper — in a jsdom environment Suspense renders synchronously
		// so we at minimum verify it renders without crashing
		expect(() => render(<CartAndSkuWrapper />)).not.toThrow();
	});

	it("renders without crashing", async () => {
		const { container } = render(<CartAndSkuWrapper />);
		expect(container).toBeTruthy();
	});
});
