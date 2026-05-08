import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks — must be declared before any imports that use them
// ============================================================================

const {
	mockApplyDiscountCode,
	mockDeleteDiscount,
	mockToggleDiscountStatus,
	mockDuplicateDiscount,
	mockRefreshDiscounts,
} = vi.hoisted(() => ({
	mockApplyDiscountCode: vi.fn(),
	mockDeleteDiscount: vi.fn(),
	mockToggleDiscountStatus: vi.fn(),
	mockDuplicateDiscount: vi.fn(),
	mockRefreshDiscounts: vi.fn(),
}));

const { mockToastSuccess, mockToastError, mockToastLoading, mockToastDismiss, mockToastWarning } =
	vi.hoisted(() => ({
		mockToastSuccess: vi.fn(),
		mockToastError: vi.fn(),
		mockToastLoading: vi.fn(() => "loading-id"),
		mockToastDismiss: vi.fn(),
		mockToastWarning: vi.fn(),
	}));

vi.mock("@/modules/discounts/actions/apply-discount-code", () => ({
	applyDiscountCode: mockApplyDiscountCode,
}));
vi.mock("@/modules/discounts/actions/delete-discount", () => ({
	deleteDiscount: mockDeleteDiscount,
}));
vi.mock("@/modules/discounts/actions/toggle-discount-status", () => ({
	toggleDiscountStatus: mockToggleDiscountStatus,
}));
vi.mock("@/modules/discounts/actions/admin/duplicate-discount", () => ({
	duplicateDiscount: mockDuplicateDiscount,
}));
vi.mock("@/modules/discounts/actions/refresh-discounts", () => ({
	refreshDiscounts: mockRefreshDiscounts,
}));

vi.mock("@/shared/utils/toast", () => ({
	toast: {
		loading: mockToastLoading,
		dismiss: mockToastDismiss,
		success: mockToastSuccess,
		error: mockToastError,
		warning: mockToastWarning,
	},
}));

// Prevent redirect errors from propagating in test environment
vi.mock("next/dist/client/components/redirect-error", () => ({
	isRedirectError: () => false,
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useApplyDiscountCode } from "../use-apply-discount-code";
import { useDeleteDiscount } from "../use-delete-discount";
import { useToggleDiscountStatus } from "../use-toggle-discount-status";
import { useDuplicateDiscount } from "../use-duplicate-discount";
import { useRefreshDiscounts } from "../use-refresh-discounts";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// Shared fixtures
// ============================================================================

const SUCCESS = { status: "success" as const, message: "OK" };
const ERROR = { status: "error" as const, message: "Failed" };
const WARNING = { status: "warning" as const, message: "Attention" };

// ============================================================================
// useApplyDiscountCode
// ============================================================================

describe("useApplyDiscountCode", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockApplyDiscountCode.mockResolvedValue(SUCCESS);
	});

	// --------------------------------------------------------------------------
	// Return value shape
	// --------------------------------------------------------------------------

	describe("return value shape", () => {
		it("returns applyCode, state, action, and isPending", () => {
			const { result } = renderHook(() => useApplyDiscountCode());

			expect(typeof result.current.applyCode).toBe("function");
			expect(typeof result.current.action).toBe("function");
			expect(typeof result.current.isPending).toBe("boolean");
			expect(result.current.state).toBeUndefined();
		});

		it("isPending starts as false", () => {
			const { result } = renderHook(() => useApplyDiscountCode());
			expect(result.current.isPending).toBe(false);
		});
	});

	// --------------------------------------------------------------------------
	// FormData construction in applyCode
	// --------------------------------------------------------------------------

	describe("applyCode FormData construction", () => {
		it("trims and uppercases the code", async () => {
			const { result } = renderHook(() => useApplyDiscountCode());

			await act(async () => {
				result.current.applyCode("  promo10  ", 5000);
			});

			const formData = mockApplyDiscountCode.mock.calls[0]?.[1] as FormData;
			expect(formData.get("code")).toBe("PROMO10");
		});

		it("leaves already-uppercase code unchanged", async () => {
			const { result } = renderHook(() => useApplyDiscountCode());

			await act(async () => {
				result.current.applyCode("SUMMER20", 5000);
			});

			const formData = mockApplyDiscountCode.mock.calls[0]?.[1] as FormData;
			expect(formData.get("code")).toBe("SUMMER20");
		});

		it("rounds the subtotal to the nearest integer", async () => {
			const { result } = renderHook(() => useApplyDiscountCode());

			await act(async () => {
				result.current.applyCode("CODE", 4999.7);
			});

			const formData = mockApplyDiscountCode.mock.calls[0]?.[1] as FormData;
			expect(formData.get("subtotal")).toBe("5000");
		});

		it("rounds down when subtotal decimal is below 0.5", async () => {
			const { result } = renderHook(() => useApplyDiscountCode());

			await act(async () => {
				result.current.applyCode("CODE", 1000.4);
			});

			const formData = mockApplyDiscountCode.mock.calls[0]?.[1] as FormData;
			expect(formData.get("subtotal")).toBe("1000");
		});

		it("appends userId when provided", async () => {
			const { result } = renderHook(() => useApplyDiscountCode());

			await act(async () => {
				result.current.applyCode("CODE", 5000, "user-123");
			});

			const formData = mockApplyDiscountCode.mock.calls[0]?.[1] as FormData;
			expect(formData.get("userId")).toBe("user-123");
		});

		it("omits userId when not provided", async () => {
			const { result } = renderHook(() => useApplyDiscountCode());

			await act(async () => {
				result.current.applyCode("CODE", 5000);
			});

			const formData = mockApplyDiscountCode.mock.calls[0]?.[1] as FormData;
			expect(formData.get("userId")).toBeNull();
		});

		it("appends customerEmail when provided", async () => {
			const { result } = renderHook(() => useApplyDiscountCode());

			await act(async () => {
				result.current.applyCode("CODE", 5000, undefined, "guest@example.com");
			});

			const formData = mockApplyDiscountCode.mock.calls[0]?.[1] as FormData;
			expect(formData.get("customerEmail")).toBe("guest@example.com");
		});

		it("omits customerEmail when not provided", async () => {
			const { result } = renderHook(() => useApplyDiscountCode());

			await act(async () => {
				result.current.applyCode("CODE", 5000);
			});

			const formData = mockApplyDiscountCode.mock.calls[0]?.[1] as FormData;
			expect(formData.get("customerEmail")).toBeNull();
		});

		it("appends both userId and customerEmail when both are provided", async () => {
			const { result } = renderHook(() => useApplyDiscountCode());

			await act(async () => {
				result.current.applyCode("CODE", 5000, "user-1", "user@example.com");
			});

			const formData = mockApplyDiscountCode.mock.calls[0]?.[1] as FormData;
			expect(formData.get("userId")).toBe("user-1");
			expect(formData.get("customerEmail")).toBe("user@example.com");
		});
	});

	// --------------------------------------------------------------------------
	// Callback behavior
	// --------------------------------------------------------------------------

	describe("callbacks", () => {
		it("calls onSuccess with discount data when action returns data", async () => {
			const discountData = {
				id: "d1",
				code: "PROMO10",
				type: "PERCENTAGE",
				value: 10,
				discountAmount: 500,
			};
			mockApplyDiscountCode.mockResolvedValue({
				status: "success" as const,
				message: "Code appliqué",
				data: discountData,
			});

			const onSuccess = vi.fn();
			const { result } = renderHook(() => useApplyDiscountCode({ onSuccess }));

			await act(async () => {
				result.current.applyCode("PROMO10", 5000);
			});

			expect(onSuccess).toHaveBeenCalledWith(discountData);
		});

		it("does not call onSuccess when action succeeds with no data", async () => {
			// Success without a data payload — onSuccess should not fire
			mockApplyDiscountCode.mockResolvedValue({ status: "success" as const, message: "OK" });
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useApplyDiscountCode({ onSuccess }));

			await act(async () => {
				result.current.applyCode("PROMO10", 5000);
			});

			expect(onSuccess).not.toHaveBeenCalled();
		});

		it("calls onError when action returns an error status", async () => {
			mockApplyDiscountCode.mockResolvedValue(ERROR);
			const onError = vi.fn();
			const { result } = renderHook(() => useApplyDiscountCode({ onError }));

			await act(async () => {
				result.current.applyCode("INVALID", 5000);
			});

			expect(onError).toHaveBeenCalled();
		});

		it("does not call onSuccess when action fails", async () => {
			mockApplyDiscountCode.mockResolvedValue(ERROR);
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useApplyDiscountCode({ onSuccess }));

			await act(async () => {
				result.current.applyCode("INVALID", 5000);
			});

			expect(onSuccess).not.toHaveBeenCalled();
		});

		it("works without options (no callbacks)", async () => {
			const { result } = renderHook(() => useApplyDiscountCode());

			// Should not throw when no callbacks are provided
			await act(async () => {
				result.current.applyCode("CODE", 5000);
			});

			expect(mockApplyDiscountCode).toHaveBeenCalledTimes(1);
		});
	});

	// --------------------------------------------------------------------------
	// Toast behavior
	// --------------------------------------------------------------------------

	describe("toast behavior", () => {
		it("shows a success toast with the action message on success", async () => {
			mockApplyDiscountCode.mockResolvedValue({ ...SUCCESS, message: "Code appliqué" });
			const { result } = renderHook(() => useApplyDiscountCode());

			await act(async () => {
				result.current.applyCode("CODE", 5000);
			});

			expect(mockToastSuccess).toHaveBeenCalledWith("Code appliqué");
		});

		it("shows an error toast with the action message on failure", async () => {
			mockApplyDiscountCode.mockResolvedValue(ERROR);
			const { result } = renderHook(() => useApplyDiscountCode());

			await act(async () => {
				result.current.applyCode("INVALID", 5000);
			});

			expect(mockToastError).toHaveBeenCalledWith("Failed");
		});
	});

	// --------------------------------------------------------------------------
	// State update
	// --------------------------------------------------------------------------

	describe("state update", () => {
		it("state reflects the action result after a successful call", async () => {
			const { result } = renderHook(() => useApplyDiscountCode());

			await act(async () => {
				result.current.applyCode("CODE", 5000);
			});

			expect(result.current.state).toEqual(SUCCESS);
		});

		it("state reflects the action result after a failed call", async () => {
			mockApplyDiscountCode.mockResolvedValue(ERROR);
			const { result } = renderHook(() => useApplyDiscountCode());

			await act(async () => {
				result.current.applyCode("BAD", 5000);
			});

			expect(result.current.state).toEqual(ERROR);
		});
	});
});

// ============================================================================
// useDeleteDiscount
// ============================================================================

describe("useDeleteDiscount", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteDiscount.mockResolvedValue(SUCCESS);
	});

	// --------------------------------------------------------------------------
	// Return value shape
	// --------------------------------------------------------------------------

	describe("return value shape", () => {
		it("returns state, action, and isPending", () => {
			const { result } = renderHook(() => useDeleteDiscount());

			expect(result.current.state).toBeUndefined();
			expect(typeof result.current.action).toBe("function");
			expect(typeof result.current.isPending).toBe("boolean");
		});

		it("isPending starts as false", () => {
			const { result } = renderHook(() => useDeleteDiscount());
			expect(result.current.isPending).toBe(false);
		});
	});

	// --------------------------------------------------------------------------
	// Callback behavior
	// --------------------------------------------------------------------------

	describe("callbacks", () => {
		it("calls onSuccess with the action message when action succeeds", async () => {
			mockDeleteDiscount.mockResolvedValue({ ...SUCCESS, message: "Code supprimé" });
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useDeleteDiscount({ onSuccess }));

			await act(async () => {
				result.current.action(new FormData());
			});

			expect(onSuccess).toHaveBeenCalledWith("Code supprimé");
		});

		it("does not call onSuccess when action fails", async () => {
			mockDeleteDiscount.mockResolvedValue(ERROR);
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useDeleteDiscount({ onSuccess }));

			await act(async () => {
				result.current.action(new FormData());
			});

			expect(onSuccess).not.toHaveBeenCalled();
		});

		it("works without options (no callbacks)", async () => {
			const { result } = renderHook(() => useDeleteDiscount());

			await act(async () => {
				result.current.action(new FormData());
			});

			expect(mockDeleteDiscount).toHaveBeenCalledTimes(1);
		});
	});

	// --------------------------------------------------------------------------
	// Toast behavior
	// --------------------------------------------------------------------------

	describe("toast behavior", () => {
		it("shows a success toast with the action message", async () => {
			mockDeleteDiscount.mockResolvedValue({ ...SUCCESS, message: "Supprimé avec succès" });
			const { result } = renderHook(() => useDeleteDiscount());

			await act(async () => {
				result.current.action(new FormData());
			});

			expect(mockToastSuccess).toHaveBeenCalledWith("Supprimé avec succès");
		});

		it("shows an error toast when action fails", async () => {
			mockDeleteDiscount.mockResolvedValue(ERROR);
			const { result } = renderHook(() => useDeleteDiscount());

			await act(async () => {
				result.current.action(new FormData());
			});

			expect(mockToastError).toHaveBeenCalledWith("Failed");
		});
	});

	// --------------------------------------------------------------------------
	// State update
	// --------------------------------------------------------------------------

	describe("state update", () => {
		it("state reflects the success result after action completes", async () => {
			const { result } = renderHook(() => useDeleteDiscount());

			await act(async () => {
				result.current.action(new FormData());
			});

			expect(result.current.state).toEqual(SUCCESS);
		});

		it("state reflects the error result after a failed action", async () => {
			mockDeleteDiscount.mockResolvedValue(ERROR);
			const { result } = renderHook(() => useDeleteDiscount());

			await act(async () => {
				result.current.action(new FormData());
			});

			expect(result.current.state).toEqual(ERROR);
		});
	});
});

// ============================================================================
// useToggleDiscountStatus
// ============================================================================

describe("useToggleDiscountStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockToggleDiscountStatus.mockResolvedValue({ ...SUCCESS, message: "Code promo activé" });
	});

	// --------------------------------------------------------------------------
	// Return value shape
	// --------------------------------------------------------------------------

	describe("return value shape", () => {
		it("returns state, action, and isPending", () => {
			const { result } = renderHook(() => useToggleDiscountStatus());

			expect(result.current.state).toBeUndefined();
			expect(typeof result.current.action).toBe("function");
			expect(typeof result.current.isPending).toBe("boolean");
		});

		it("isPending starts as false", () => {
			const { result } = renderHook(() => useToggleDiscountStatus());
			expect(result.current.isPending).toBe(false);
		});
	});

	// --------------------------------------------------------------------------
	// Callback behavior
	// --------------------------------------------------------------------------

	describe("callbacks", () => {
		it("calls onSuccess with the action message when action succeeds", async () => {
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useToggleDiscountStatus({ onSuccess }));

			await act(async () => {
				result.current.action(new FormData());
			});

			expect(onSuccess).toHaveBeenCalledWith("Code promo activé");
		});

		it("calls onSuccess with deactivation message", async () => {
			mockToggleDiscountStatus.mockResolvedValue({ ...SUCCESS, message: "Code promo désactivé" });
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useToggleDiscountStatus({ onSuccess }));

			await act(async () => {
				result.current.action(new FormData());
			});

			expect(onSuccess).toHaveBeenCalledWith("Code promo désactivé");
		});

		it("does not call onSuccess when action fails", async () => {
			mockToggleDiscountStatus.mockResolvedValue(ERROR);
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useToggleDiscountStatus({ onSuccess }));

			await act(async () => {
				result.current.action(new FormData());
			});

			expect(onSuccess).not.toHaveBeenCalled();
		});

		it("works without options (no callbacks)", async () => {
			const { result } = renderHook(() => useToggleDiscountStatus());

			await act(async () => {
				result.current.action(new FormData());
			});

			expect(mockToggleDiscountStatus).toHaveBeenCalledTimes(1);
		});
	});

	// --------------------------------------------------------------------------
	// Toast behavior
	// --------------------------------------------------------------------------

	describe("toast behavior", () => {
		it("shows a success toast with the action message", async () => {
			const { result } = renderHook(() => useToggleDiscountStatus());

			await act(async () => {
				result.current.action(new FormData());
			});

			expect(mockToastSuccess).toHaveBeenCalledWith("Code promo activé");
		});

		it("shows an error toast when action fails", async () => {
			mockToggleDiscountStatus.mockResolvedValue(ERROR);
			const { result } = renderHook(() => useToggleDiscountStatus());

			await act(async () => {
				result.current.action(new FormData());
			});

			expect(mockToastError).toHaveBeenCalledWith("Failed");
		});

		it("shows a warning toast for WARNING status", async () => {
			mockToggleDiscountStatus.mockResolvedValue(WARNING);
			const { result } = renderHook(() => useToggleDiscountStatus());

			await act(async () => {
				result.current.action(new FormData());
			});

			expect(mockToastWarning).toHaveBeenCalledWith("Attention");
		});
	});

	// --------------------------------------------------------------------------
	// State update
	// --------------------------------------------------------------------------

	describe("state update", () => {
		it("state reflects the success result after action completes", async () => {
			const { result } = renderHook(() => useToggleDiscountStatus());

			await act(async () => {
				result.current.action(new FormData());
			});

			expect(result.current.state?.status).toBe(ActionStatus.SUCCESS);
		});

		it("state reflects the error result after a failed action", async () => {
			mockToggleDiscountStatus.mockResolvedValue(ERROR);
			const { result } = renderHook(() => useToggleDiscountStatus());

			await act(async () => {
				result.current.action(new FormData());
			});

			expect(result.current.state?.status).toBe(ActionStatus.ERROR);
		});
	});
});

// ============================================================================
// useDuplicateDiscount
// ============================================================================

describe("useDuplicateDiscount", () => {
	const duplicateSuccessResponse = {
		status: "success" as const,
		message: "Code dupliqué",
		data: { id: "new-id", code: "PROMO10-COPY-1" },
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockDuplicateDiscount.mockResolvedValue(duplicateSuccessResponse);
	});

	// --------------------------------------------------------------------------
	// Return value shape
	// --------------------------------------------------------------------------

	describe("return value shape", () => {
		it("returns duplicate and isPending", () => {
			const { result } = renderHook(() => useDuplicateDiscount());

			expect(typeof result.current.duplicate).toBe("function");
			expect(typeof result.current.isPending).toBe("boolean");
		});

		it("isPending starts as false", () => {
			const { result } = renderHook(() => useDuplicateDiscount());
			expect(result.current.isPending).toBe(false);
		});
	});

	// --------------------------------------------------------------------------
	// FormData construction in duplicate
	// --------------------------------------------------------------------------

	describe("duplicate FormData construction", () => {
		it("appends discountId to FormData", async () => {
			const { result } = renderHook(() => useDuplicateDiscount());

			await act(async () => {
				result.current.duplicate("discount-123");
			});

			const formData = mockDuplicateDiscount.mock.calls[0]?.[1] as FormData;
			expect(formData.get("discountId")).toBe("discount-123");
		});

		it("passes the correct discountId for different IDs", async () => {
			const { result } = renderHook(() => useDuplicateDiscount());

			await act(async () => {
				result.current.duplicate("another-discount-456");
			});

			const formData = mockDuplicateDiscount.mock.calls[0]?.[1] as FormData;
			expect(formData.get("discountId")).toBe("another-discount-456");
		});
	});

	// --------------------------------------------------------------------------
	// Callback behavior
	// --------------------------------------------------------------------------

	describe("callbacks", () => {
		it("calls onSuccess with (message, { id, code }) when action succeeds with data", async () => {
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useDuplicateDiscount({ onSuccess }));

			await act(async () => {
				result.current.duplicate("discount-123");
			});

			expect(onSuccess).toHaveBeenCalledWith("Code dupliqué", {
				id: "new-id",
				code: "PROMO10-COPY-1",
			});
		});

		it("does not call onSuccess when action succeeds without data", async () => {
			mockDuplicateDiscount.mockResolvedValue({ status: "success" as const, message: "OK" });
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useDuplicateDiscount({ onSuccess }));

			await act(async () => {
				result.current.duplicate("discount-123");
			});

			expect(onSuccess).not.toHaveBeenCalled();
		});

		it("calls onError with the error message when action fails", async () => {
			mockDuplicateDiscount.mockResolvedValue(ERROR);
			const onError = vi.fn();
			const { result } = renderHook(() => useDuplicateDiscount({ onError }));

			await act(async () => {
				result.current.duplicate("discount-123");
			});

			expect(onError).toHaveBeenCalledWith("Failed");
		});

		it("does not call onSuccess when action fails", async () => {
			mockDuplicateDiscount.mockResolvedValue(ERROR);
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useDuplicateDiscount({ onSuccess }));

			await act(async () => {
				result.current.duplicate("discount-123");
			});

			expect(onSuccess).not.toHaveBeenCalled();
		});

		it("does not call onError when action succeeds", async () => {
			const onError = vi.fn();
			const { result } = renderHook(() => useDuplicateDiscount({ onError }));

			await act(async () => {
				result.current.duplicate("discount-123");
			});

			expect(onError).not.toHaveBeenCalled();
		});

		it("works without options (no callbacks)", async () => {
			const { result } = renderHook(() => useDuplicateDiscount());

			await act(async () => {
				result.current.duplicate("discount-123");
			});

			expect(mockDuplicateDiscount).toHaveBeenCalledTimes(1);
		});
	});

	// --------------------------------------------------------------------------
	// Toast behavior
	// --------------------------------------------------------------------------

	describe("toast behavior", () => {
		it("shows a loading toast during duplication", async () => {
			const { result } = renderHook(() => useDuplicateDiscount());

			await act(async () => {
				result.current.duplicate("discount-123");
			});

			expect(mockToastLoading).toHaveBeenCalledWith("Duplication en cours…");
		});

		it("dismisses the loading toast after action completes", async () => {
			const { result } = renderHook(() => useDuplicateDiscount());

			await act(async () => {
				result.current.duplicate("discount-123");
			});

			expect(mockToastDismiss).toHaveBeenCalledWith("loading-id");
		});

		it("shows an error toast when action fails", async () => {
			mockDuplicateDiscount.mockResolvedValue(ERROR);
			const { result } = renderHook(() => useDuplicateDiscount());

			await act(async () => {
				result.current.duplicate("discount-123");
			});

			expect(mockToastError).toHaveBeenCalledWith("Failed");
		});
	});
});

// ============================================================================
// useRefreshDiscounts
// ============================================================================

describe("useRefreshDiscounts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRefreshDiscounts.mockResolvedValue(SUCCESS);
	});

	// --------------------------------------------------------------------------
	// Return value shape
	// --------------------------------------------------------------------------

	describe("return value shape", () => {
		it("returns state, action, isPending, and refresh", () => {
			const { result } = renderHook(() => useRefreshDiscounts());

			expect(typeof result.current.state).not.toBe("string");
			expect(typeof result.current.action).toBe("function");
			expect(typeof result.current.isPending).toBe("boolean");
			expect(typeof result.current.refresh).toBe("function");
		});

		it("isPending starts as false", () => {
			const { result } = renderHook(() => useRefreshDiscounts());
			expect(result.current.isPending).toBe(false);
		});

		it("state starts as undefined", () => {
			const { result } = renderHook(() => useRefreshDiscounts());
			expect(result.current.state).toBeUndefined();
		});
	});

	// --------------------------------------------------------------------------
	// refresh() behavior
	// --------------------------------------------------------------------------

	describe("refresh()", () => {
		it("calls the refreshDiscounts action when refresh() is invoked", async () => {
			const { result } = renderHook(() => useRefreshDiscounts());

			await act(async () => {
				result.current.refresh();
			});

			expect(mockRefreshDiscounts).toHaveBeenCalledTimes(1);
		});

		it("calls refresh() with an empty FormData by default", async () => {
			const { result } = renderHook(() => useRefreshDiscounts());

			await act(async () => {
				result.current.refresh();
			});

			const calledFormData = mockRefreshDiscounts.mock.calls[0]?.[1] as FormData;
			expect([...calledFormData.entries()]).toHaveLength(0);
		});

		it("calls onSuccess callback when action succeeds", async () => {
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useRefreshDiscounts({ onSuccess }));

			await act(async () => {
				result.current.refresh();
			});

			expect(onSuccess).toHaveBeenCalledTimes(1);
		});

		it("does not call onSuccess when action fails", async () => {
			mockRefreshDiscounts.mockResolvedValue(ERROR);
			const onSuccess = vi.fn();
			const { result } = renderHook(() => useRefreshDiscounts({ onSuccess }));

			await act(async () => {
				result.current.refresh();
			});

			expect(onSuccess).not.toHaveBeenCalled();
		});

		it("can be called multiple times", async () => {
			const { result } = renderHook(() => useRefreshDiscounts());

			await act(async () => {
				result.current.refresh();
			});
			await act(async () => {
				result.current.refresh();
			});

			expect(mockRefreshDiscounts).toHaveBeenCalledTimes(2);
		});

		it("works without options (no callbacks)", async () => {
			const { result } = renderHook(() => useRefreshDiscounts());

			await act(async () => {
				result.current.refresh();
			});

			expect(mockRefreshDiscounts).toHaveBeenCalledTimes(1);
		});
	});

	// --------------------------------------------------------------------------
	// Toast behavior
	// --------------------------------------------------------------------------

	describe("toast behavior", () => {
		it("does not show a success toast (refresh is silent)", async () => {
			const { result } = renderHook(() => useRefreshDiscounts());

			await act(async () => {
				result.current.refresh();
			});

			expect(mockToastSuccess).not.toHaveBeenCalled();
		});
	});
});
