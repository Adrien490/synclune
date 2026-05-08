import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockClearCart, mockToast } = vi.hoisted(() => ({
	mockClearCart: vi.fn(),
	mockToast: {
		loading: vi.fn(),
		dismiss: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		warning: vi.fn(),
	},
}));

vi.mock("@/modules/cart/actions/clear-cart", () => ({
	clearCart: mockClearCart,
}));

vi.mock("@/shared/utils/toast", () => ({ toast: mockToast }));

// Prevent auth/Stripe initialization during module evaluation
vi.mock("@/modules/auth/lib/auth", () => ({ auth: {} }));
vi.mock("next/headers", () => ({ headers: vi.fn(), cookies: vi.fn() }));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useClearCart } from "../use-clear-cart";
import { ActionStatus } from "@/shared/types/server-action";

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

const SUCCESS_RESULT = { status: ActionStatus.SUCCESS, message: "Panier vide" };
const ERROR_RESULT = { status: ActionStatus.ERROR, message: "Erreur lors du vidage" };

// ============================================================================
// Tests
// ============================================================================

describe("useClearCart", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockClearCart.mockResolvedValue(SUCCESS_RESULT);
	});

	describe("return shape", () => {
		it("returns state, action, and isPending", () => {
			const { result } = renderHook(() => useClearCart());
			expect(result.current.state).toBeUndefined();
			expect(typeof result.current.action).toBe("function");
			expect(typeof result.current.isPending).toBe("boolean");
		});

		it("isPending is false initially", () => {
			const { result } = renderHook(() => useClearCart());
			expect(result.current.isPending).toBe(false);
		});
	});

	describe("toast callbacks", () => {
		it("shows loading toast with custom message on action start", async () => {
			const { result } = renderHook(() => useClearCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockToast.loading).toHaveBeenCalledWith("Vidage du panier…");
		});

		it("dismisses loading toast on completion", async () => {
			mockToast.loading.mockReturnValue("toast-id-1");
			const { result } = renderHook(() => useClearCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockToast.dismiss).toHaveBeenCalledWith("toast-id-1");
		});

		it("shows success toast with result message", async () => {
			const { result } = renderHook(() => useClearCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockToast.success).toHaveBeenCalledWith("Panier vide");
		});

		it("shows error toast on failure", async () => {
			mockClearCart.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useClearCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(mockToast.error).toHaveBeenCalledWith("Erreur lors du vidage");
		});
	});

	describe("onSuccess callback", () => {
		it("fires onSuccess callback on SUCCESS result", async () => {
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useClearCart(onSuccess));

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(onSuccess).toHaveBeenCalledTimes(1);
		});

		it("does not fire onSuccess on ERROR result", async () => {
			mockClearCart.mockResolvedValue(ERROR_RESULT);
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useClearCart(onSuccess));

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(onSuccess).not.toHaveBeenCalled();
		});

		it("works without onSuccess callback", async () => {
			const { result } = renderHook(() => useClearCart());

			await expect(
				act(async () => {
					result.current.action(makeFormData());
				}),
			).resolves.not.toThrow();
		});
	});

	describe("action state", () => {
		it("reflects success result after call", async () => {
			const { result } = renderHook(() => useClearCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(result.current.state).toEqual(SUCCESS_RESULT);
		});

		it("reflects error result after failed call", async () => {
			mockClearCart.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useClearCart());

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(result.current.state).toEqual(ERROR_RESULT);
		});

		it("calls clearCart with prev state and FormData", async () => {
			const { result } = renderHook(() => useClearCart());
			const fd = makeFormData();

			await act(async () => {
				result.current.action(fd);
			});

			expect(mockClearCart).toHaveBeenCalledTimes(1);
			expect(mockClearCart).toHaveBeenCalledWith(undefined, fd);
		});
	});

	describe("error handling", () => {
		it("converts thrown exception to error ActionState", async () => {
			mockClearCart.mockRejectedValue(new Error("DB error"));
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useClearCart(onSuccess));

			await act(async () => {
				result.current.action(makeFormData());
			});

			expect(result.current.state?.status).toBe(ActionStatus.ERROR);
			expect(onSuccess).not.toHaveBeenCalled();
			expect(mockToast.error).toHaveBeenCalledWith("DB error");
		});
	});
});
