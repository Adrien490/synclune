import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockAddToCart, mockAdjustCart, mockOpenSheet } = vi.hoisted(() => ({
	mockAddToCart: vi.fn(),
	mockAdjustCart: vi.fn(),
	mockOpenSheet: vi.fn(),
}));

// Mock server action
vi.mock("@/modules/cart/actions/add-to-cart", () => ({
	addToCart: mockAddToCart,
}));

// Mock badge counts store
vi.mock("@/shared/stores/badge-counts-store", () => ({
	useBadgeCountsStore: (selector: (state: { adjustCart: typeof mockAdjustCart }) => unknown) =>
		selector({ adjustCart: mockAdjustCart }),
}));

// Mock sheet store provider
vi.mock("@/shared/providers/sheet-store-provider", () => ({
	useSheetStore: (selector: (state: { open: typeof mockOpenSheet }) => unknown) =>
		selector({ open: mockOpenSheet }),
}));

// Mock sonner to prevent toast side effects
const { mockToastError } = vi.hoisted(() => ({
	mockToastError: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: {
		loading: vi.fn(),
		dismiss: vi.fn(),
		success: vi.fn(),
		error: mockToastError,
		warning: vi.fn(),
	},
}));

// Prevent auth/Stripe initialization during module evaluation
vi.mock("@/modules/auth/lib/auth", () => ({ auth: {} }));
vi.mock("next/headers", () => ({ headers: vi.fn(), cookies: vi.fn() }));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useAddToCart } from "../use-add-to-cart";
import { __resetToastCoalesce } from "@/shared/utils/toast";

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

const SUCCESS_RESULT = { status: "success" as const, message: "Article ajouté au panier" };
const ERROR_RESULT = { status: "error" as const, message: "Erreur lors de l'ajout" };

// ============================================================================
// Tests
// ============================================================================

describe("useAddToCart", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		__resetToastCoalesce();
		mockAddToCart.mockResolvedValue(SUCCESS_RESULT);
	});

	// --------------------------------------------------------------------------
	// Return shape
	// --------------------------------------------------------------------------

	describe("return shape", () => {
		it("returns state, action, and isPending", () => {
			const { result } = renderHook(() => useAddToCart());
			expect(result.current.state).toBeUndefined();
			expect(typeof result.current.action).toBe("function");
			expect(typeof result.current.isPending).toBe("boolean");
		});

		it("isPending is false initially", () => {
			const { result } = renderHook(() => useAddToCart());
			expect(result.current.isPending).toBe(false);
		});

		it("state is undefined initially (no action called yet)", () => {
			const { result } = renderHook(() => useAddToCart());
			expect(result.current.state).toBeUndefined();
		});
	});

	// --------------------------------------------------------------------------
	// Optimistic badge update
	// --------------------------------------------------------------------------

	describe("optimistic badge update", () => {
		it("calls adjustCart optimistically with the quantity from formData", async () => {
			const { result } = renderHook(() => useAddToCart());

			await act(async () => {
				result.current.action(makeFormData({ quantity: "3" }));
			});

			expect(mockAdjustCart).toHaveBeenCalledWith(3);
		});

		it("defaults quantity to 1 when formData quantity is missing", async () => {
			const { result } = renderHook(() => useAddToCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockAdjustCart).toHaveBeenCalledWith(1);
		});

		it("defaults quantity to 1 when formData quantity is not a valid number", async () => {
			const { result } = renderHook(() => useAddToCart());

			await act(async () => {
				result.current.action(makeFormData({ quantity: "abc" }));
			});

			// Number("abc") is NaN, which is falsy, so || 1 kicks in
			expect(mockAdjustCart).toHaveBeenCalledWith(1);
		});

		it("calls adjustCart with the correct quantity for large values", async () => {
			const { result } = renderHook(() => useAddToCart());

			await act(async () => {
				result.current.action(makeFormData({ quantity: "10" }));
			});

			expect(mockAdjustCart).toHaveBeenCalledWith(10);
		});

		it("calls adjustCart exactly once on success (no rollback)", async () => {
			const { result } = renderHook(() => useAddToCart());

			await act(async () => {
				result.current.action(makeFormData({ quantity: "2" }));
			});

			expect(mockAdjustCart).toHaveBeenCalledTimes(1);
			expect(mockAdjustCart).toHaveBeenCalledWith(2);
		});

		it("calls adjustCart before the server action resolves (optimistic first)", async () => {
			const callOrder: string[] = [];
			mockAdjustCart.mockImplementation(() => {
				callOrder.push("adjustCart");
			});
			let resolveAction!: (v: typeof SUCCESS_RESULT) => void;
			mockAddToCart.mockReturnValue(
				new Promise<typeof SUCCESS_RESULT>((resolve) => {
					resolveAction = resolve;
				}),
			);

			const { result } = renderHook(() => useAddToCart());

			act(() => {
				result.current.action(makeFormData({ quantity: "1" }));
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
		it("calls adjustCart with negative quantity as rollback on error", async () => {
			mockAddToCart.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useAddToCart());

			await act(async () => {
				result.current.action(makeFormData({ quantity: "2" }));
			});

			// First call: optimistic +2, second call: rollback -2
			expect(mockAdjustCart).toHaveBeenCalledTimes(2);
			expect(mockAdjustCart).toHaveBeenNthCalledWith(1, 2);
			expect(mockAdjustCart).toHaveBeenNthCalledWith(2, -2);
		});

		it("rolls back correct quantity when quantity is 5", async () => {
			mockAddToCart.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useAddToCart());

			await act(async () => {
				result.current.action(makeFormData({ quantity: "5" }));
			});

			expect(mockAdjustCart).toHaveBeenCalledWith(5);
			expect(mockAdjustCart).toHaveBeenCalledWith(-5);
		});

		it("rolls back with -1 when quantity was defaulted to 1", async () => {
			mockAddToCart.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useAddToCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockAdjustCart).toHaveBeenCalledWith(1);
			expect(mockAdjustCart).toHaveBeenCalledWith(-1);
		});

		it("does not roll back adjustCart on success", async () => {
			const { result } = renderHook(() => useAddToCart());

			await act(async () => {
				result.current.action(makeFormData({ quantity: "3" }));
			});

			// Only one adjustCart call: the optimistic one
			expect(mockAdjustCart).toHaveBeenCalledTimes(1);
			expect(mockAdjustCart).toHaveBeenCalledWith(3);
		});
	});

	// --------------------------------------------------------------------------
	// Cart sheet behavior
	// --------------------------------------------------------------------------

	describe("cart sheet behavior", () => {
		it("opens the cart sheet on success when openSheetOnSuccess is true (default)", async () => {
			const { result } = renderHook(() => useAddToCart());

			await act(async () => {
				result.current.action(makeFormData({ quantity: "1" }));
			});

			expect(mockOpenSheet).toHaveBeenCalledWith("cart");
		});

		it("opens the cart sheet when openSheetOnSuccess is explicitly true", async () => {
			const { result } = renderHook(() => useAddToCart({ openSheetOnSuccess: true }));

			await act(async () => {
				result.current.action(makeFormData({ quantity: "1" }));
			});

			expect(mockOpenSheet).toHaveBeenCalledWith("cart");
		});

		it("does not open the cart sheet when openSheetOnSuccess is false", async () => {
			const { result } = renderHook(() => useAddToCart({ openSheetOnSuccess: false }));

			await act(async () => {
				result.current.action(makeFormData({ quantity: "1" }));
			});

			expect(mockOpenSheet).not.toHaveBeenCalled();
		});

		it("does not open the cart sheet on error", async () => {
			mockAddToCart.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useAddToCart());

			await act(async () => {
				result.current.action(makeFormData({ quantity: "1" }));
			});

			expect(mockOpenSheet).not.toHaveBeenCalled();
		});

		it("does not open the cart sheet on error even with openSheetOnSuccess true", async () => {
			mockAddToCart.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useAddToCart({ openSheetOnSuccess: true }));

			await act(async () => {
				result.current.action(makeFormData({ quantity: "1" }));
			});

			expect(mockOpenSheet).not.toHaveBeenCalled();
		});
	});

	// --------------------------------------------------------------------------
	// onSuccess callback
	// --------------------------------------------------------------------------

	describe("onSuccess callback", () => {
		it("calls onSuccess callback with the action message on success", async () => {
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useAddToCart({ onSuccess }));

			await act(async () => {
				result.current.action(makeFormData({ quantity: "1" }));
			});

			expect(onSuccess).toHaveBeenCalledWith("Article ajouté au panier");
		});

		it("does not call onSuccess callback on error", async () => {
			mockAddToCart.mockResolvedValue(ERROR_RESULT);
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useAddToCart({ onSuccess }));

			await act(async () => {
				result.current.action(makeFormData({ quantity: "1" }));
			});

			expect(onSuccess).not.toHaveBeenCalled();
		});

		it("does not call onSuccess when result has no message field", async () => {
			mockAddToCart.mockResolvedValue({ status: "success" });
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useAddToCart({ onSuccess }));

			await act(async () => {
				result.current.action(makeFormData({ quantity: "1" }));
			});

			expect(onSuccess).not.toHaveBeenCalled();
		});

		it("works correctly without onSuccess option provided", async () => {
			const { result } = renderHook(() => useAddToCart());

			await expect(
				act(async () => {
					result.current.action(makeFormData({ quantity: "1" }));
				}),
			).resolves.not.toThrow();
		});
	});

	// --------------------------------------------------------------------------
	// Action state
	// --------------------------------------------------------------------------

	describe("action state", () => {
		it("state reflects success result after successful call", async () => {
			const { result } = renderHook(() => useAddToCart());

			await act(async () => {
				result.current.action(makeFormData({ quantity: "1" }));
			});

			expect(result.current.state).toEqual(SUCCESS_RESULT);
		});

		it("state reflects error result after failed call", async () => {
			mockAddToCart.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useAddToCart());

			await act(async () => {
				result.current.action(makeFormData({ quantity: "1" }));
			});

			expect(result.current.state).toEqual(ERROR_RESULT);
		});

		it("calls the addToCart server action when action is invoked", async () => {
			const { result } = renderHook(() => useAddToCart());

			await act(async () => {
				result.current.action(makeFormData({ quantity: "1" }));
			});

			expect(mockAddToCart).toHaveBeenCalledTimes(1);
		});

		it("state transitions from undefined to result object after first call", async () => {
			const { result } = renderHook(() => useAddToCart());
			expect(result.current.state).toBeUndefined();

			await act(async () => {
				result.current.action(makeFormData({ quantity: "1" }));
			});

			expect(result.current.state).toBeDefined();
			expect(result.current.state?.status).toBe("success");
		});
	});

	// --------------------------------------------------------------------------
	// Combined behaviors
	// --------------------------------------------------------------------------

	// --------------------------------------------------------------------------
	// showErrorToast option
	// --------------------------------------------------------------------------

	describe("showErrorToast option", () => {
		it("calls toast.error on error by default", async () => {
			mockAddToCart.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useAddToCart());

			await act(async () => {
				result.current.action(makeFormData({ quantity: "1" }));
			});

			expect(mockToastError).toHaveBeenCalledWith(ERROR_RESULT.message, expect.any(Object));
		});

		it("calls toast.error on error when showErrorToast is explicitly true", async () => {
			mockAddToCart.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useAddToCart({ showErrorToast: true }));

			await act(async () => {
				result.current.action(makeFormData({ quantity: "1" }));
			});

			expect(mockToastError).toHaveBeenCalledWith(ERROR_RESULT.message, expect.any(Object));
		});

		it("does not call toast.error on error when showErrorToast is false", async () => {
			mockAddToCart.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useAddToCart({ showErrorToast: false }));

			await act(async () => {
				result.current.action(makeFormData({ quantity: "1" }));
			});

			expect(mockToastError).not.toHaveBeenCalled();
		});

		it("still rolls back the badge on error when showErrorToast is false", async () => {
			mockAddToCart.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useAddToCart({ showErrorToast: false }));

			await act(async () => {
				result.current.action(makeFormData({ quantity: "2" }));
			});

			expect(mockAdjustCart).toHaveBeenCalledWith(2);
			expect(mockAdjustCart).toHaveBeenCalledWith(-2);
			expect(mockToastError).not.toHaveBeenCalled();
		});

		it("still exposes the error in state when showErrorToast is false", async () => {
			mockAddToCart.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useAddToCart({ showErrorToast: false }));

			await act(async () => {
				result.current.action(makeFormData({ quantity: "1" }));
			});

			expect(result.current.state).toEqual(ERROR_RESULT);
		});
	});

	describe("combined behaviors on success", () => {
		it("calls adjustCart, opens sheet, and calls onSuccess on a single success", async () => {
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useAddToCart({ onSuccess }));

			await act(async () => {
				result.current.action(makeFormData({ quantity: "2" }));
			});

			expect(mockAdjustCart).toHaveBeenCalledWith(2);
			expect(mockOpenSheet).toHaveBeenCalledWith("cart");
			expect(onSuccess).toHaveBeenCalledWith("Article ajouté au panier");
		});

		it("on error: rolls back badge, does not open sheet, does not call onSuccess", async () => {
			mockAddToCart.mockResolvedValue(ERROR_RESULT);
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useAddToCart({ onSuccess }));

			await act(async () => {
				result.current.action(makeFormData({ quantity: "3" }));
			});

			// Optimistic: +3, rollback: -3
			expect(mockAdjustCart).toHaveBeenCalledWith(3);
			expect(mockAdjustCart).toHaveBeenCalledWith(-3);
			expect(mockOpenSheet).not.toHaveBeenCalled();
			expect(onSuccess).not.toHaveBeenCalled();
		});
	});
});
