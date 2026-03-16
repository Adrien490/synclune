import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockRemoveUnavailableItems, mockAdjustCart } = vi.hoisted(() => ({
	mockRemoveUnavailableItems: vi.fn(),
	mockAdjustCart: vi.fn(),
}));

vi.mock("@/modules/cart/actions/remove-unavailable-items", () => ({
	removeUnavailableItems: mockRemoveUnavailableItems,
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

import { useRemoveUnavailableItems } from "../use-remove-unavailable-items";

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

const SUCCESS_RESULT = { status: "success" as const, message: "Articles indisponibles retirés" };
const ERROR_RESULT = { status: "error" as const, message: "Erreur lors de la suppression" };

// ============================================================================
// Tests
// ============================================================================

describe("useRemoveUnavailableItems", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRemoveUnavailableItems.mockResolvedValue(SUCCESS_RESULT);
	});

	// --------------------------------------------------------------------------
	// Return shape
	// --------------------------------------------------------------------------

	describe("return shape", () => {
		it("returns state, action, and isPending", () => {
			const { result } = renderHook(() => useRemoveUnavailableItems());
			expect(result.current.state).toBeUndefined();
			expect(typeof result.current.action).toBe("function");
			expect(typeof result.current.isPending).toBe("boolean");
		});

		it("isPending is false initially", () => {
			const { result } = renderHook(() => useRemoveUnavailableItems());
			expect(result.current.isPending).toBe(false);
		});
	});

	// --------------------------------------------------------------------------
	// Bulk removal badge update
	// --------------------------------------------------------------------------

	describe("bulk removal badge update", () => {
		it("calls adjustCart with negative unavailableQuantity on success", async () => {
			const { result } = renderHook(() => useRemoveUnavailableItems({ unavailableQuantity: 5 }));

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(mockAdjustCart).toHaveBeenCalledWith(-5);
		});

		it("calls adjustCart with -1 when unavailableQuantity is 1", async () => {
			const { result } = renderHook(() => useRemoveUnavailableItems({ unavailableQuantity: 1 }));

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(mockAdjustCart).toHaveBeenCalledWith(-1);
		});

		it("calls adjustCart with a large negative quantity for bulk removals", async () => {
			const { result } = renderHook(() => useRemoveUnavailableItems({ unavailableQuantity: 20 }));

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(mockAdjustCart).toHaveBeenCalledWith(-20);
		});

		it("does not call adjustCart when unavailableQuantity is not provided", async () => {
			const { result } = renderHook(() => useRemoveUnavailableItems());

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(mockAdjustCart).not.toHaveBeenCalled();
		});

		it("does not call adjustCart when unavailableQuantity is 0", async () => {
			const { result } = renderHook(() => useRemoveUnavailableItems({ unavailableQuantity: 0 }));

			await act(async () => {
				await result.current.action(makeFormData());
			});

			// 0 is falsy, so the guard `if (options?.unavailableQuantity)` skips it
			expect(mockAdjustCart).not.toHaveBeenCalled();
		});

		it("calls adjustCart exactly once on success", async () => {
			const { result } = renderHook(() => useRemoveUnavailableItems({ unavailableQuantity: 3 }));

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(mockAdjustCart).toHaveBeenCalledTimes(1);
		});
	});

	// --------------------------------------------------------------------------
	// No rollback on error (badge update is success-only)
	// --------------------------------------------------------------------------

	describe("no rollback on error", () => {
		it("does not call adjustCart when action fails", async () => {
			mockRemoveUnavailableItems.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useRemoveUnavailableItems({ unavailableQuantity: 3 }));

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(mockAdjustCart).not.toHaveBeenCalled();
		});

		it("does not call adjustCart when action fails with no options", async () => {
			mockRemoveUnavailableItems.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useRemoveUnavailableItems());

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(mockAdjustCart).not.toHaveBeenCalled();
		});
	});

	// --------------------------------------------------------------------------
	// onSuccess callback
	// --------------------------------------------------------------------------

	describe("onSuccess callback", () => {
		it("calls onSuccess with the action message on success", async () => {
			const onSuccess = vi.fn();
			const { result } = renderHook(() =>
				useRemoveUnavailableItems({ unavailableQuantity: 2, onSuccess }),
			);

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(onSuccess).toHaveBeenCalledWith("Articles indisponibles retirés");
		});

		it("calls onSuccess even without unavailableQuantity", async () => {
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useRemoveUnavailableItems({ onSuccess }));

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(onSuccess).toHaveBeenCalledWith("Articles indisponibles retirés");
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

		it("does not call onSuccess when result has no message field", async () => {
			mockRemoveUnavailableItems.mockResolvedValue({ status: "success" });
			const onSuccess = vi.fn();
			const { result } = renderHook(() =>
				useRemoveUnavailableItems({ unavailableQuantity: 1, onSuccess }),
			);

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(onSuccess).not.toHaveBeenCalled();
		});

		it("calls adjustCart before onSuccess callback (call order)", async () => {
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

	// --------------------------------------------------------------------------
	// Action state
	// --------------------------------------------------------------------------

	describe("action state", () => {
		it("state reflects success result after successful call", async () => {
			const { result } = renderHook(() => useRemoveUnavailableItems());

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(result.current.state).toEqual(SUCCESS_RESULT);
		});

		it("state reflects error result after failed call", async () => {
			mockRemoveUnavailableItems.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useRemoveUnavailableItems());

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(result.current.state).toEqual(ERROR_RESULT);
		});

		it("calls the removeUnavailableItems server action when action is invoked", async () => {
			const { result } = renderHook(() => useRemoveUnavailableItems());

			await act(async () => {
				await result.current.action(makeFormData());
			});

			expect(mockRemoveUnavailableItems).toHaveBeenCalledTimes(1);
		});
	});
});
