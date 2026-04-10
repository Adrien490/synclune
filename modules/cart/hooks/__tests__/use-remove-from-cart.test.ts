import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockRemoveFromCart, mockAdjustCart, mockRouterRefresh, mockRemovedFromCart } = vi.hoisted(
	() => ({
		mockRemoveFromCart: vi.fn(),
		mockAdjustCart: vi.fn(),
		mockRouterRefresh: vi.fn(),
		mockRemovedFromCart: vi.fn(),
	}),
);

// Mock server action
vi.mock("@/modules/cart/actions/remove-from-cart", () => ({
	removeFromCart: mockRemoveFromCart,
}));

// Mock badge counts store
vi.mock("@/shared/stores/badge-counts-store", () => ({
	useBadgeCountsStore: (selector: (state: { adjustCart: typeof mockAdjustCart }) => unknown) =>
		selector({ adjustCart: mockAdjustCart }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: mockRouterRefresh }),
}));

// Mock PostHog events
vi.mock("@/shared/lib/posthog-events", () => ({
	posthogEvents: {
		removedFromCart: mockRemovedFromCart,
	},
}));

// Mock sonner to prevent toast side effects
vi.mock("sonner", () => ({
	toast: {
		loading: vi.fn(),
		dismiss: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		warning: vi.fn(),
	},
}));

// Prevent auth/Stripe initialization during module evaluation
vi.mock("@/modules/auth/lib/auth", () => ({ auth: {} }));
vi.mock("next/headers", () => ({ headers: vi.fn(), cookies: vi.fn() }));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useRemoveFromCart } from "../use-remove-from-cart";

// ============================================================================
// Helpers
// ============================================================================

function makeFormData(data: Record<string, string> = {}): FormData {
	const fd = new FormData();
	for (const [key, value] of Object.entries(data)) {
		fd.set(key, value);
	}
	return fd;
}

const SUCCESS_RESULT = { status: "success" as const, message: "Article retiré du panier" };
const ERROR_RESULT = { status: "error" as const, message: "Erreur lors de la suppression" };

// ============================================================================
// Tests
// ============================================================================

describe("useRemoveFromCart", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRemoveFromCart.mockResolvedValue(SUCCESS_RESULT);
	});

	// --------------------------------------------------------------------------
	// Return shape
	// --------------------------------------------------------------------------

	describe("return shape", () => {
		it("returns state, action, and isPending", () => {
			const { result } = renderHook(() => useRemoveFromCart());
			expect(result.current.state).toBeUndefined();
			expect(typeof result.current.action).toBe("function");
			expect(typeof result.current.isPending).toBe("boolean");
		});

		it("isPending is false initially", () => {
			const { result } = renderHook(() => useRemoveFromCart());
			expect(result.current.isPending).toBe(false);
		});

		it("state is undefined initially (no action called yet)", () => {
			const { result } = renderHook(() => useRemoveFromCart());
			expect(result.current.state).toBeUndefined();
		});
	});

	// --------------------------------------------------------------------------
	// Optimistic badge update
	// --------------------------------------------------------------------------

	describe("optimistic badge update", () => {
		it("calls adjustCart with -1 optimistically when no quantity option is given", async () => {
			const { result } = renderHook(() => useRemoveFromCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockAdjustCart).toHaveBeenCalledWith(-1);
		});

		it("calls adjustCart with negative of options.quantity optimistically", async () => {
			const { result } = renderHook(() => useRemoveFromCart({ quantity: 4 }));

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockAdjustCart).toHaveBeenCalledWith(-4);
		});

		it("calls adjustCart with -1 for a single item removal", async () => {
			const { result } = renderHook(() => useRemoveFromCart({ quantity: 1 }));

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockAdjustCart).toHaveBeenCalledWith(-1);
		});

		it("calls adjustCart exactly once on success (no rollback)", async () => {
			const { result } = renderHook(() => useRemoveFromCart({ quantity: 3 }));

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockAdjustCart).toHaveBeenCalledTimes(1);
			expect(mockAdjustCart).toHaveBeenCalledWith(-3);
		});

		it("calls adjustCart before the server action resolves (optimistic first)", async () => {
			const callOrder: string[] = [];
			mockAdjustCart.mockImplementation(() => {
				callOrder.push("adjustCart");
			});
			let resolveAction!: (v: typeof SUCCESS_RESULT) => void;
			mockRemoveFromCart.mockReturnValue(
				new Promise<typeof SUCCESS_RESULT>((resolve) => {
					resolveAction = resolve;
				}),
			);

			const { result } = renderHook(() => useRemoveFromCart({ quantity: 1 }));

			act(() => {
				result.current.action(makeFormData());
			});

			// adjustCart fires synchronously inside startTransition before server response
			expect(callOrder).toContain("adjustCart");

			await act(async () => {
				resolveAction(SUCCESS_RESULT);
			});
		});
	});

	// --------------------------------------------------------------------------
	// Rollback on error
	// --------------------------------------------------------------------------

	describe("rollback on error", () => {
		it("calls adjustCart with positive rollback and router.refresh on error", async () => {
			mockRemoveFromCart.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useRemoveFromCart({ quantity: 3 }));

			await act(async () => {
				result.current.action(makeFormData());
			});

			// Optimistic: -3, rollback: +3
			expect(mockAdjustCart).toHaveBeenCalledWith(-3);
			expect(mockAdjustCart).toHaveBeenCalledWith(3);
			expect(mockRouterRefresh).toHaveBeenCalled();
		});

		it("rolls back with +1 when no quantity option and action fails", async () => {
			mockRemoveFromCart.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useRemoveFromCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			// Optimistic: -1, rollback: +1
			expect(mockAdjustCart).toHaveBeenCalledWith(-1);
			expect(mockAdjustCart).toHaveBeenCalledWith(1);
		});

		it("rolls back with the exact quantity on error", async () => {
			mockRemoveFromCart.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useRemoveFromCart({ quantity: 7 }));

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockAdjustCart).toHaveBeenNthCalledWith(1, -7);
			expect(mockAdjustCart).toHaveBeenNthCalledWith(2, 7);
		});

		it("calls router.refresh to restore cart data on error", async () => {
			mockRemoveFromCart.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useRemoveFromCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockRouterRefresh).toHaveBeenCalledTimes(1);
		});

		it("does not call router.refresh on success", async () => {
			const { result } = renderHook(() => useRemoveFromCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockRouterRefresh).not.toHaveBeenCalled();
		});

		it("calls adjustCart exactly twice on error (optimistic + rollback)", async () => {
			mockRemoveFromCart.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useRemoveFromCart({ quantity: 2 }));

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockAdjustCart).toHaveBeenCalledTimes(2);
		});
	});

	// --------------------------------------------------------------------------
	// onSuccess callback
	// --------------------------------------------------------------------------

	describe("onSuccess callback", () => {
		it("calls onSuccess callback with the action message on success", async () => {
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useRemoveFromCart({ onSuccess }));

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(onSuccess).toHaveBeenCalledWith("Article retiré du panier");
		});

		it("does not call onSuccess on error", async () => {
			mockRemoveFromCart.mockResolvedValue(ERROR_RESULT);
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useRemoveFromCart({ onSuccess }));

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(onSuccess).not.toHaveBeenCalled();
		});

		it("does not call onSuccess when result has no message field", async () => {
			mockRemoveFromCart.mockResolvedValue({ status: "success" });
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useRemoveFromCart({ onSuccess }));

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(onSuccess).not.toHaveBeenCalled();
		});

		it("works correctly without any options provided", async () => {
			const { result } = renderHook(() => useRemoveFromCart());

			await expect(
				act(async () => {
					result.current.action(makeFormData());
				}),
			).resolves.not.toThrow();
		});

		it("works correctly with only quantity option provided", async () => {
			const { result } = renderHook(() => useRemoveFromCart({ quantity: 2 }));

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockAdjustCart).toHaveBeenCalledWith(-2);
		});
	});

	// --------------------------------------------------------------------------
	// PostHog tracking
	// --------------------------------------------------------------------------

	describe("PostHog tracking", () => {
		it("calls posthogEvents.removedFromCart with trackingData on success", async () => {
			const trackingData = { productId: "prod-1", productName: "Collier argent" };
			const { result } = renderHook(() => useRemoveFromCart({ trackingData }));

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockRemovedFromCart).toHaveBeenCalledWith({
				id: "prod-1",
				name: "Collier argent",
			});
		});

		it("does not call posthogEvents.removedFromCart when trackingData is not provided", async () => {
			const { result } = renderHook(() => useRemoveFromCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockRemovedFromCart).not.toHaveBeenCalled();
		});

		it("does not call posthogEvents.removedFromCart on error", async () => {
			mockRemoveFromCart.mockResolvedValue(ERROR_RESULT);
			const trackingData = { productId: "prod-1", productName: "Bague or" };
			const { result } = renderHook(() => useRemoveFromCart({ trackingData }));

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockRemovedFromCart).not.toHaveBeenCalled();
		});

		it("tracks the correct product id and name from trackingData", async () => {
			const trackingData = { productId: "prod-xyz", productName: "Bracelet plaqué or" };
			const { result } = renderHook(() => useRemoveFromCart({ trackingData }));

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockRemovedFromCart).toHaveBeenCalledWith(
				expect.objectContaining({ id: "prod-xyz", name: "Bracelet plaqué or" }),
			);
		});
	});

	// --------------------------------------------------------------------------
	// Action state
	// --------------------------------------------------------------------------

	describe("action state", () => {
		it("state reflects success result after successful call", async () => {
			const { result } = renderHook(() => useRemoveFromCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(result.current.state).toEqual(SUCCESS_RESULT);
		});

		it("state reflects error result after failed call", async () => {
			mockRemoveFromCart.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useRemoveFromCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(result.current.state).toEqual(ERROR_RESULT);
		});

		it("calls the removeFromCart server action when action is invoked", async () => {
			const { result } = renderHook(() => useRemoveFromCart());

			await act(async () => {
				result.current.action(makeFormData({ cartItemId: "item-abc" }));
			});

			expect(mockRemoveFromCart).toHaveBeenCalledTimes(1);
		});

		it("state transitions from undefined to result object after first call", async () => {
			const { result } = renderHook(() => useRemoveFromCart());
			expect(result.current.state).toBeUndefined();

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(result.current.state).toBeDefined();
			expect(result.current.state?.status).toBe("success");
		});
	});

	// --------------------------------------------------------------------------
	// Combined behaviors
	// --------------------------------------------------------------------------

	describe("combined behaviors on success", () => {
		it("calls adjustCart, posthog, and onSuccess on a single success", async () => {
			const onSuccess = vi.fn();
			const trackingData = { productId: "prod-1", productName: "Collier" };
			const { result } = renderHook(() =>
				useRemoveFromCart({ quantity: 2, onSuccess, trackingData }),
			);

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockAdjustCart).toHaveBeenCalledWith(-2);
			expect(mockRemovedFromCart).toHaveBeenCalledWith({ id: "prod-1", name: "Collier" });
			expect(onSuccess).toHaveBeenCalledWith("Article retiré du panier");
			expect(mockRouterRefresh).not.toHaveBeenCalled();
		});

		it("on error: rolls back badge, calls router.refresh, does not call onSuccess or posthog", async () => {
			mockRemoveFromCart.mockResolvedValue(ERROR_RESULT);
			const onSuccess = vi.fn();
			const trackingData = { productId: "prod-1", productName: "Collier" };
			const { result } = renderHook(() =>
				useRemoveFromCart({ quantity: 3, onSuccess, trackingData }),
			);

			await act(async () => {
				result.current.action(makeFormData());
			});

			// Optimistic: -3, rollback: +3
			expect(mockAdjustCart).toHaveBeenCalledWith(-3);
			expect(mockAdjustCart).toHaveBeenCalledWith(3);
			expect(mockRouterRefresh).toHaveBeenCalled();
			expect(onSuccess).not.toHaveBeenCalled();
			expect(mockRemovedFromCart).not.toHaveBeenCalled();
		});
	});
});
