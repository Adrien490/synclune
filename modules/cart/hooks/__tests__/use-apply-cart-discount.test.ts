import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockApplyCartDiscount, mockToast } = vi.hoisted(() => ({
	mockApplyCartDiscount: vi.fn(),
	mockToast: {
		loading: vi.fn(),
		dismiss: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		warning: vi.fn(),
	},
}));

vi.mock("@/modules/cart/actions/apply-cart-discount", () => ({
	applyCartDiscount: mockApplyCartDiscount,
}));

vi.mock("@/shared/utils/toast", () => ({ toast: mockToast }));

// Prevent auth/Stripe initialization during module evaluation
vi.mock("@/modules/auth/lib/auth", () => ({ auth: {} }));
vi.mock("next/headers", () => ({ headers: vi.fn(), cookies: vi.fn() }));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useApplyCartDiscount } from "../use-apply-cart-discount";
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

const SUCCESS_RESULT = { status: ActionStatus.SUCCESS, message: "Code applique" };
const ERROR_RESULT = { status: ActionStatus.ERROR, message: "Code invalide" };

// ============================================================================
// Tests
// ============================================================================

describe("useApplyCartDiscount", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockApplyCartDiscount.mockResolvedValue(SUCCESS_RESULT);
	});

	describe("return shape", () => {
		it("returns state, action, and isPending", () => {
			const { result } = renderHook(() => useApplyCartDiscount());
			expect(result.current.state).toBeUndefined();
			expect(typeof result.current.action).toBe("function");
			expect(typeof result.current.isPending).toBe("boolean");
		});

		it("isPending is false initially", () => {
			const { result } = renderHook(() => useApplyCartDiscount());
			expect(result.current.isPending).toBe(false);
		});
	});

	describe("toast callbacks", () => {
		it("shows loading toast with custom message on action start", async () => {
			const { result } = renderHook(() => useApplyCartDiscount());

			await act(async () => {
				result.current.action(makeFormData({ code: "SUMMER10" }));
			});

			expect(mockToast.loading).toHaveBeenCalledWith("Vérification du code…");
		});

		it("dismisses loading toast on completion", async () => {
			mockToast.loading.mockReturnValue("toast-id-1");
			const { result } = renderHook(() => useApplyCartDiscount());

			await act(async () => {
				result.current.action(makeFormData({ code: "SUMMER10" }));
			});

			expect(mockToast.dismiss).toHaveBeenCalledWith("toast-id-1");
		});

		it("shows success toast with result message", async () => {
			const { result } = renderHook(() => useApplyCartDiscount());

			await act(async () => {
				result.current.action(makeFormData({ code: "SUMMER10" }));
			});

			expect(mockToast.success).toHaveBeenCalledWith("Code applique");
		});

		it("shows error toast on failure", async () => {
			mockApplyCartDiscount.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useApplyCartDiscount());

			await act(async () => {
				result.current.action(makeFormData({ code: "INVALID" }));
			});

			expect(mockToast.error).toHaveBeenCalledWith("Code invalide");
		});

		it("does not show success toast on error", async () => {
			mockApplyCartDiscount.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useApplyCartDiscount());

			await act(async () => {
				result.current.action(makeFormData({ code: "INVALID" }));
			});

			expect(mockToast.success).not.toHaveBeenCalled();
		});
	});

	describe("action state", () => {
		it("reflects success result after call", async () => {
			const { result } = renderHook(() => useApplyCartDiscount());

			await act(async () => {
				result.current.action(makeFormData({ code: "SUMMER10" }));
			});

			expect(result.current.state).toEqual(SUCCESS_RESULT);
		});

		it("reflects error result after failed call", async () => {
			mockApplyCartDiscount.mockResolvedValue(ERROR_RESULT);
			const { result } = renderHook(() => useApplyCartDiscount());

			await act(async () => {
				result.current.action(makeFormData({ code: "INVALID" }));
			});

			expect(result.current.state).toEqual(ERROR_RESULT);
		});

		it("calls applyCartDiscount with FormData from action", async () => {
			const { result } = renderHook(() => useApplyCartDiscount());
			const fd = makeFormData({ code: "SUMMER10" });

			await act(async () => {
				result.current.action(fd);
			});

			expect(mockApplyCartDiscount).toHaveBeenCalledTimes(1);
			expect(mockApplyCartDiscount).toHaveBeenCalledWith(undefined, fd);
		});
	});

	describe("error handling", () => {
		it("converts thrown exception to error ActionState", async () => {
			mockApplyCartDiscount.mockRejectedValue(new Error("Network error"));
			const { result } = renderHook(() => useApplyCartDiscount());

			await act(async () => {
				result.current.action(makeFormData({ code: "SUMMER10" }));
			});

			expect(result.current.state?.status).toBe(ActionStatus.ERROR);
			expect(mockToast.error).toHaveBeenCalledWith("Network error");
		});
	});
});
