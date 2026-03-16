import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockUpdateCartItem, mockAdjustCart } = vi.hoisted(() => ({
	mockUpdateCartItem: vi.fn(),
	mockAdjustCart: vi.fn(),
}));

vi.mock("@/modules/cart/actions/update-cart-item", () => ({
	updateCartItem: mockUpdateCartItem,
}));

vi.mock("@/shared/stores/badge-counts-store", () => ({
	useBadgeCountsStore: (selector: (state: { adjustCart: typeof mockAdjustCart }) => unknown) =>
		selector({ adjustCart: mockAdjustCart }),
}));

vi.mock("sonner", () => ({
	toast: {
		loading: vi.fn(),
		dismiss: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		warning: vi.fn(),
	},
}));

vi.mock("@/modules/auth/lib/auth", () => ({ auth: {} }));
vi.mock("next/headers", () => ({ headers: vi.fn(), cookies: vi.fn() }));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useUpdateCartItem } from "../use-update-cart-item";

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

const SUCCESS_RESULT = { status: "success" as const, message: "Quantité mise à jour" };
const ERROR_RESULT = { status: "error" as const, message: "Erreur lors de la mise à jour" };

// ============================================================================
// Tests
// ============================================================================

describe("useUpdateCartItem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateCartItem.mockResolvedValue(SUCCESS_RESULT);
	});

	// --------------------------------------------------------------------------
	// Return shape
	// --------------------------------------------------------------------------

	describe("return shape", () => {
		it("returns state, action, and isPending", () => {
			const { result } = renderHook(() => useUpdateCartItem());
			expect(result.current.state).toBeUndefined();
			expect(typeof result.current.action).toBe("function");
			expect(typeof result.current.isPending).toBe("boolean");
		});

		it("isPending is false initially", () => {
			const { result } = renderHook(() => useUpdateCartItem());
			expect(result.current.isPending).toBe(false);
		});
	});

	// --------------------------------------------------------------------------
	// Optimistic badge update
	// --------------------------------------------------------------------------

	describe("optimistic badge update", () => {
		it("calls adjustCart with positive delta on increment", async () => {
			const { result } = renderHook(() => useUpdateCartItem());

			await act(async () => {
				result.current.action(makeFormData({ cartItemId: "item-1", quantity: "3" }), 2);
			});

			expect(mockAdjustCart).toHaveBeenCalledWith(2);
		});

		it("calls adjustCart with negative delta on decrement", async () => {
			const { result } = renderHook(() => useUpdateCartItem());

			await act(async () => {
				result.current.action(makeFormData({ cartItemId: "item-1", quantity: "1" }), -1);
			});

			expect(mockAdjustCart).toHaveBeenCalledWith(-1);
		});

		it("calls adjustCart exactly once on success (no rollback)", async () => {
			const { result } = renderHook(() => useUpdateCartItem());

			await act(async () => {
				result.current.action(makeFormData(), 3);
			});

			expect(mockAdjustCart).toHaveBeenCalledTimes(1);
			expect(mockAdjustCart).toHaveBeenCalledWith(3);
		});

		it("adjustCart is called before the server action resolves", async () => {
			// Track call order
			const callOrder: string[] = [];
			mockAdjustCart.mockImplementation(() => {
				callOrder.push("adjustCart");
			});
			let resolveAction!: (v: typeof SUCCESS_RESULT) => void;
			mockUpdateCartItem.mockReturnValue(
				new Promise<typeof SUCCESS_RESULT>((resolve) => {
					resolveAction = resolve;
				}),
			);

			const { result } = renderHook(() => useUpdateCartItem());

			act(() => {
				result.current.action(makeFormData(), 1);
			});

			// adjustCart should have fired synchronously inside startTransition
			expect(callOrder).toContain("adjustCart");

			// Resolve the action
			await act(async () => {
				resolveAction(SUCCESS_RESULT);
			});
		});
	});

	// --------------------------------------------------------------------------
	// Rollback on error
	// --------------------------------------------------------------------------

	describe("rollback on error", () => {
		it("calls adjustCart with negated delta as rollback when action fails", async () => {
			mockUpdateCartItem.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useUpdateCartItem());

			await act(async () => {
				result.current.action(makeFormData(), 3);
			});

			// First call: optimistic +3, second call: rollback -3
			expect(mockAdjustCart).toHaveBeenCalledTimes(2);
			expect(mockAdjustCart).toHaveBeenNthCalledWith(1, 3);
			expect(mockAdjustCart).toHaveBeenNthCalledWith(2, -3);
		});

		it("rolls back a negative delta correctly (decrement rollback)", async () => {
			mockUpdateCartItem.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useUpdateCartItem());

			await act(async () => {
				result.current.action(makeFormData(), -2);
			});

			// Optimistic: -2, rollback: -(-2) = +2
			expect(mockAdjustCart).toHaveBeenCalledWith(-2);
			expect(mockAdjustCart).toHaveBeenCalledWith(2);
		});

		it("does not roll back when action succeeds", async () => {
			const { result } = renderHook(() => useUpdateCartItem());

			await act(async () => {
				result.current.action(makeFormData(), 5);
			});

			expect(mockAdjustCart).toHaveBeenCalledTimes(1);
		});

		it("rolls back a large positive delta on error", async () => {
			mockUpdateCartItem.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useUpdateCartItem());

			await act(async () => {
				result.current.action(makeFormData(), 10);
			});

			expect(mockAdjustCart).toHaveBeenCalledWith(10);
			expect(mockAdjustCart).toHaveBeenCalledWith(-10);
		});
	});

	// --------------------------------------------------------------------------
	// onSuccess callback
	// --------------------------------------------------------------------------

	describe("onSuccess callback", () => {
		it("calls onSuccess with the action message on success", async () => {
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useUpdateCartItem({ onSuccess }));

			await act(async () => {
				result.current.action(makeFormData(), 1);
			});

			expect(onSuccess).toHaveBeenCalledWith("Quantité mise à jour");
		});

		it("does not call onSuccess on error", async () => {
			mockUpdateCartItem.mockResolvedValue(ERROR_RESULT);
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useUpdateCartItem({ onSuccess }));

			await act(async () => {
				result.current.action(makeFormData(), 1);
			});

			expect(onSuccess).not.toHaveBeenCalled();
		});

		it("does not call onSuccess when result has no message field", async () => {
			mockUpdateCartItem.mockResolvedValue({ status: "success" });
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useUpdateCartItem({ onSuccess }));

			await act(async () => {
				result.current.action(makeFormData(), 1);
			});

			expect(onSuccess).not.toHaveBeenCalled();
		});

		it("works correctly without options provided", async () => {
			const { result } = renderHook(() => useUpdateCartItem());

			await expect(
				act(async () => {
					result.current.action(makeFormData(), 1);
				}),
			).resolves.not.toThrow();
		});
	});

	// --------------------------------------------------------------------------
	// Action state
	// --------------------------------------------------------------------------

	describe("action state", () => {
		it("state reflects success result after successful call", async () => {
			const { result } = renderHook(() => useUpdateCartItem());

			await act(async () => {
				result.current.action(makeFormData(), 1);
			});

			expect(result.current.state).toEqual(SUCCESS_RESULT);
		});

		it("state reflects error result after failed call", async () => {
			mockUpdateCartItem.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useUpdateCartItem());

			await act(async () => {
				result.current.action(makeFormData(), 1);
			});

			expect(result.current.state).toEqual(ERROR_RESULT);
		});

		it("calls the updateCartItem server action when action is invoked", async () => {
			const { result } = renderHook(() => useUpdateCartItem());

			await act(async () => {
				result.current.action(makeFormData({ cartItemId: "abc", quantity: "2" }), 1);
			});

			expect(mockUpdateCartItem).toHaveBeenCalledTimes(1);
		});
	});
});
