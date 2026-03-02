import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockAddToCart,
	mockRemoveFromCart,
	mockUpdateCartItem,
	mockRemoveUnavailableItems,
	mockUpdateCartPrices,
	mockAdjustCart,
	mockOpenSheet,
	mockRouterRefresh,
} = vi.hoisted(() => ({
	mockAddToCart: vi.fn(),
	mockRemoveFromCart: vi.fn(),
	mockUpdateCartItem: vi.fn(),
	mockRemoveUnavailableItems: vi.fn(),
	mockUpdateCartPrices: vi.fn(),
	mockAdjustCart: vi.fn(),
	mockOpenSheet: vi.fn(),
	mockRouterRefresh: vi.fn(),
}));

// Mock server actions
vi.mock("@/modules/cart/actions/add-to-cart", () => ({
	addToCart: mockAddToCart,
}));

vi.mock("@/modules/cart/actions/remove-from-cart", () => ({
	removeFromCart: mockRemoveFromCart,
}));

vi.mock("@/modules/cart/actions/update-cart-item", () => ({
	updateCartItem: mockUpdateCartItem,
}));

vi.mock("@/modules/cart/actions/remove-unavailable-items", () => ({
	removeUnavailableItems: mockRemoveUnavailableItems,
}));

vi.mock("@/modules/cart/actions/update-cart-prices", () => ({
	updateCartPrices: mockUpdateCartPrices,
}));

// Mock the badge counts store
vi.mock("@/shared/stores/badge-counts-store", () => ({
	useBadgeCountsStore: (selector: (state: { adjustCart: typeof mockAdjustCart }) => unknown) =>
		selector({ adjustCart: mockAdjustCart }),
}));

// Mock the sheet store provider
vi.mock("@/shared/providers/sheet-store-provider", () => ({
	useSheetStore: (selector: (state: { open: typeof mockOpenSheet }) => unknown) =>
		selector({ open: mockOpenSheet }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: mockRouterRefresh }),
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

import { useAddToCart } from "../use-add-to-cart";
import { useRemoveFromCart } from "../use-remove-from-cart";
import { useUpdateCartItem } from "../use-update-cart-item";
import { useRemoveUnavailableItems } from "../use-remove-unavailable-items";
import { useUpdateCartPrices } from "../use-update-cart-prices";

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

const SUCCESS_RESULT = { status: "success" as const, message: "OK" };
const ERROR_RESULT = { status: "error" as const, message: "Failed" };

// ============================================================================
// useAddToCart
// ============================================================================

describe("useAddToCart", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockAddToCart.mockResolvedValue(SUCCESS_RESULT);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useAddToCart());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

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

	it("opens the cart sheet when openSheetOnSuccess is true (default)", async () => {
		const { result } = renderHook(() => useAddToCart());

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

	it("calls adjustCart with negative quantity as rollback on error", async () => {
		mockAddToCart.mockResolvedValue(ERROR_RESULT);
		const { result } = renderHook(() => useAddToCart());

		await act(async () => {
			result.current.action(makeFormData({ quantity: "2" }));
		});

		// First call: optimistic +2, second call: rollback -2
		expect(mockAdjustCart).toHaveBeenCalledWith(2);
		expect(mockAdjustCart).toHaveBeenCalledWith(-2);
	});

	it("calls onSuccess callback with message on success", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useAddToCart({ onSuccess }));

		await act(async () => {
			result.current.action(makeFormData({ quantity: "1" }));
		});

		expect(onSuccess).toHaveBeenCalledWith("OK");
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

	it("rolls back correct quantity when quantity > 1", async () => {
		mockAddToCart.mockResolvedValue(ERROR_RESULT);
		const { result } = renderHook(() => useAddToCart());

		await act(async () => {
			result.current.action(makeFormData({ quantity: "5" }));
		});

		expect(mockAdjustCart).toHaveBeenCalledWith(5);
		expect(mockAdjustCart).toHaveBeenCalledWith(-5);
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

// ============================================================================
// useRemoveFromCart
// ============================================================================

describe("useRemoveFromCart", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRemoveFromCart.mockResolvedValue(SUCCESS_RESULT);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useRemoveFromCart());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls adjustCart with -1 optimistically when no quantity option", async () => {
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

	it("does not call router.refresh on success", async () => {
		const { result } = renderHook(() => useRemoveFromCart());

		await act(async () => {
			result.current.action(makeFormData());
		});

		expect(mockRouterRefresh).not.toHaveBeenCalled();
	});

	it("calls onSuccess callback with message on success", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRemoveFromCart({ onSuccess }));

		await act(async () => {
			result.current.action(makeFormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("OK");
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

	it("defaults rollback quantity to 1 when no option provided", async () => {
		mockRemoveFromCart.mockResolvedValue(ERROR_RESULT);
		const { result } = renderHook(() => useRemoveFromCart());

		await act(async () => {
			result.current.action(makeFormData());
		});

		// Optimistic: -1, rollback: +1
		expect(mockAdjustCart).toHaveBeenCalledWith(-1);
		expect(mockAdjustCart).toHaveBeenCalledWith(1);
	});
});

// ============================================================================
// useUpdateCartItem
// ============================================================================

describe("useUpdateCartItem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateCartItem.mockResolvedValue(SUCCESS_RESULT);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useUpdateCartItem());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls adjustCart with delta optimistically", async () => {
		const { result } = renderHook(() => useUpdateCartItem());

		await act(async () => {
			result.current.action(makeFormData(), 2);
		});

		expect(mockAdjustCart).toHaveBeenCalledWith(2);
	});

	it("calls adjustCart with negative delta for decrements", async () => {
		const { result } = renderHook(() => useUpdateCartItem());

		await act(async () => {
			result.current.action(makeFormData(), -1);
		});

		expect(mockAdjustCart).toHaveBeenCalledWith(-1);
	});

	it("calls adjustCart with -delta rollback on error", async () => {
		mockUpdateCartItem.mockResolvedValue(ERROR_RESULT);
		const { result } = renderHook(() => useUpdateCartItem());

		await act(async () => {
			result.current.action(makeFormData(), 3);
		});

		// Optimistic: +3, rollback: -3
		expect(mockAdjustCart).toHaveBeenCalledWith(3);
		expect(mockAdjustCart).toHaveBeenCalledWith(-3);
	});

	it("does not roll back adjustCart on success", async () => {
		const { result } = renderHook(() => useUpdateCartItem());

		await act(async () => {
			result.current.action(makeFormData(), 2);
		});

		// Only one call: the optimistic one
		expect(mockAdjustCart).toHaveBeenCalledTimes(1);
		expect(mockAdjustCart).toHaveBeenCalledWith(2);
	});

	it("calls onSuccess callback with message on success", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateCartItem({ onSuccess }));

		await act(async () => {
			result.current.action(makeFormData(), 1);
		});

		expect(onSuccess).toHaveBeenCalledWith("OK");
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

	it("rolls back negative delta correctly on error", async () => {
		mockUpdateCartItem.mockResolvedValue(ERROR_RESULT);
		const { result } = renderHook(() => useUpdateCartItem());

		await act(async () => {
			result.current.action(makeFormData(), -2);
		});

		// Optimistic: -2, rollback: -(-2) = +2
		expect(mockAdjustCart).toHaveBeenCalledWith(-2);
		expect(mockAdjustCart).toHaveBeenCalledWith(2);
	});
});

// ============================================================================
// useRemoveUnavailableItems
// ============================================================================

describe("useRemoveUnavailableItems", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRemoveUnavailableItems.mockResolvedValue(SUCCESS_RESULT);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useRemoveUnavailableItems());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls adjustCart with negative unavailableQuantity on success", async () => {
		const { result } = renderHook(() => useRemoveUnavailableItems({ unavailableQuantity: 5 }));

		await act(async () => {
			await result.current.action(makeFormData());
		});

		expect(mockAdjustCart).toHaveBeenCalledWith(-5);
	});

	it("does not call adjustCart when unavailableQuantity is not provided", async () => {
		const { result } = renderHook(() => useRemoveUnavailableItems());

		await act(async () => {
			await result.current.action(makeFormData());
		});

		expect(mockAdjustCart).not.toHaveBeenCalled();
	});

	it("does not call adjustCart on error", async () => {
		mockRemoveUnavailableItems.mockResolvedValue(ERROR_RESULT);
		const { result } = renderHook(() => useRemoveUnavailableItems({ unavailableQuantity: 3 }));

		await act(async () => {
			await result.current.action(makeFormData());
		});

		expect(mockAdjustCart).not.toHaveBeenCalled();
	});

	it("calls onSuccess callback with message on success", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() =>
			useRemoveUnavailableItems({ unavailableQuantity: 2, onSuccess }),
		);

		await act(async () => {
			await result.current.action(makeFormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("OK");
	});

	it("does not call onSuccess on error", async () => {
		mockRemoveUnavailableItems.mockResolvedValue(ERROR_RESULT);
		const onSuccess = vi.fn();
		const { result } = renderHook(() =>
			useRemoveUnavailableItems({ unavailableQuantity: 2, onSuccess }),
		);

		await act(async () => {
			await result.current.action(makeFormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("adjusts badge before calling onSuccess callback", async () => {
		const callOrder: string[] = [];
		mockAdjustCart.mockImplementation(() => {
			callOrder.push("adjustCart");
		});
		const onSuccess = vi.fn(() => {
			callOrder.push("onSuccess");
		});

		const { result } = renderHook(() =>
			useRemoveUnavailableItems({ unavailableQuantity: 1, onSuccess }),
		);

		await act(async () => {
			await result.current.action(makeFormData());
		});

		expect(callOrder).toEqual(["adjustCart", "onSuccess"]);
	});
});

// ============================================================================
// useUpdateCartPrices
// ============================================================================

describe("useUpdateCartPrices", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateCartPrices.mockResolvedValue(SUCCESS_RESULT);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useUpdateCartPrices());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("isPending is false initially", () => {
		const { result } = renderHook(() => useUpdateCartPrices());
		expect(result.current.isPending).toBe(false);
	});

	it("state is updated after action is called with success result", async () => {
		const { result } = renderHook(() => useUpdateCartPrices());

		await act(async () => {
			await result.current.action(makeFormData());
		});

		expect(result.current.state).toEqual(SUCCESS_RESULT);
	});

	it("state is updated after action is called with error result", async () => {
		mockUpdateCartPrices.mockResolvedValue(ERROR_RESULT);
		const { result } = renderHook(() => useUpdateCartPrices());

		await act(async () => {
			await result.current.action(makeFormData());
		});

		expect(result.current.state).toEqual(ERROR_RESULT);
	});

	it("calls the updateCartPrices action when action is invoked", async () => {
		const { result } = renderHook(() => useUpdateCartPrices());

		await act(async () => {
			await result.current.action(makeFormData());
		});

		expect(mockUpdateCartPrices).toHaveBeenCalledTimes(1);
	});
});
