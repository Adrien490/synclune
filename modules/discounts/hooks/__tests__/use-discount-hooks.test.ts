import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockApplyDiscountCode,
	mockDeleteDiscount,
	mockToggleDiscountStatus,
	mockBulkDeleteDiscounts,
	mockBulkToggleDiscountStatus,
	mockDuplicateDiscount,
	mockRefreshDiscounts,
} = vi.hoisted(() => ({
	mockApplyDiscountCode: vi.fn(),
	mockDeleteDiscount: vi.fn(),
	mockToggleDiscountStatus: vi.fn(),
	mockBulkDeleteDiscounts: vi.fn(),
	mockBulkToggleDiscountStatus: vi.fn(),
	mockDuplicateDiscount: vi.fn(),
	mockRefreshDiscounts: vi.fn(),
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
vi.mock("@/modules/discounts/actions/bulk-delete-discounts", () => ({
	bulkDeleteDiscounts: mockBulkDeleteDiscounts,
}));
vi.mock("@/modules/discounts/actions/bulk-toggle-discount-status", () => ({
	bulkToggleDiscountStatus: mockBulkToggleDiscountStatus,
}));
vi.mock("@/modules/discounts/actions/admin/duplicate-discount", () => ({
	duplicateDiscount: mockDuplicateDiscount,
}));
vi.mock("@/modules/discounts/actions/refresh-discounts", () => ({
	refreshDiscounts: mockRefreshDiscounts,
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

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useApplyDiscountCode } from "../use-apply-discount-code";
import { useDeleteDiscount } from "../use-delete-discount";
import { useToggleDiscountStatus } from "../use-toggle-discount-status";
import { useBulkDeleteDiscounts } from "../use-bulk-delete-discounts";
import { useBulkToggleDiscountStatus } from "../use-bulk-toggle-discount-status";
import { useDuplicateDiscount } from "../use-duplicate-discount";
import { useRefreshDiscounts } from "../use-refresh-discounts";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS = { status: "success" as const, message: "OK" };
const ERROR = { status: "error" as const, message: "Failed" };

// ============================================================================
// useApplyDiscountCode
// ============================================================================

describe("useApplyDiscountCode", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockApplyDiscountCode.mockResolvedValue(SUCCESS);
	});

	it("returns applyCode, state, action, and isPending", () => {
		const { result } = renderHook(() => useApplyDiscountCode());
		expect(typeof result.current.applyCode).toBe("function");
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("applyCode trims and uppercases the code", async () => {
		const { result } = renderHook(() => useApplyDiscountCode());

		await act(async () => {
			result.current.applyCode("  promo10  ", 5000);
		});

		const formData = mockApplyDiscountCode.mock.calls[0]?.[1] as FormData;
		expect(formData.get("code")).toBe("PROMO10");
	});

	it("applyCode rounds the subtotal", async () => {
		const { result } = renderHook(() => useApplyDiscountCode());

		await act(async () => {
			result.current.applyCode("PROMO10", 4999.7);
		});

		const formData = mockApplyDiscountCode.mock.calls[0]?.[1] as FormData;
		expect(formData.get("subtotal")).toBe("5000");
	});

	it("applyCode appends userId when provided", async () => {
		const { result } = renderHook(() => useApplyDiscountCode());

		await act(async () => {
			result.current.applyCode("PROMO10", 5000, "user-123");
		});

		const formData = mockApplyDiscountCode.mock.calls[0]?.[1] as FormData;
		expect(formData.get("userId")).toBe("user-123");
	});

	it("applyCode omits userId when not provided", async () => {
		const { result } = renderHook(() => useApplyDiscountCode());

		await act(async () => {
			result.current.applyCode("PROMO10", 5000);
		});

		const formData = mockApplyDiscountCode.mock.calls[0]?.[1] as FormData;
		expect(formData.get("userId")).toBeNull();
	});

	it("applyCode appends customerEmail when provided", async () => {
		const { result } = renderHook(() => useApplyDiscountCode());

		await act(async () => {
			result.current.applyCode("PROMO10", 5000, undefined, "guest@example.com");
		});

		const formData = mockApplyDiscountCode.mock.calls[0]?.[1] as FormData;
		expect(formData.get("customerEmail")).toBe("guest@example.com");
	});

	it("calls onSuccess with discount data when action succeeds", async () => {
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

	it("calls onError when action fails", async () => {
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
});

// ============================================================================
// useDeleteDiscount
// ============================================================================

describe("useDeleteDiscount", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteDiscount.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useDeleteDiscount());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteDiscount({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("OK");
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

	it("state is updated after successful action", async () => {
		const { result } = renderHook(() => useDeleteDiscount());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(SUCCESS);
	});
});

// ============================================================================
// useToggleDiscountStatus
// ============================================================================

describe("useToggleDiscountStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockToggleDiscountStatus.mockResolvedValue({
			...SUCCESS,
			message: "Code promo activé",
		});
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useToggleDiscountStatus());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useToggleDiscountStatus({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("Code promo activé");
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
});

// ============================================================================
// useBulkDeleteDiscounts
// ============================================================================

describe("useBulkDeleteDiscounts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBulkDeleteDiscounts.mockResolvedValue({
			...SUCCESS,
			message: "3 code(s) promo supprimé(s)",
		});
	});

	it("returns state, action, isPending, and handle", () => {
		const { result } = renderHook(() => useBulkDeleteDiscounts());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.handle).toBe("function");
	});

	it("handle appends all IDs to FormData", async () => {
		const { result } = renderHook(() => useBulkDeleteDiscounts());

		await act(async () => {
			result.current.handle(["id-1", "id-2", "id-3"]);
		});

		const formData = mockBulkDeleteDiscounts.mock.calls[0]?.[1] as FormData;
		expect(formData.getAll("ids")).toEqual(["id-1", "id-2", "id-3"]);
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkDeleteDiscounts({ onSuccess }));

		await act(async () => {
			result.current.handle(["id-1"]);
		});

		expect(onSuccess).toHaveBeenCalledWith("3 code(s) promo supprimé(s)");
	});

	it("does not call onSuccess when action fails", async () => {
		mockBulkDeleteDiscounts.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkDeleteDiscounts({ onSuccess }));

		await act(async () => {
			result.current.handle(["id-1"]);
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useBulkToggleDiscountStatus
// ============================================================================

describe("useBulkToggleDiscountStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBulkToggleDiscountStatus.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, toggle, and isPending", () => {
		const { result } = renderHook(() => useBulkToggleDiscountStatus());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.toggle).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("toggle appends all IDs and isActive=true to FormData", async () => {
		const { result } = renderHook(() => useBulkToggleDiscountStatus());

		await act(async () => {
			result.current.toggle(["id-1", "id-2"], true);
		});

		const formData = mockBulkToggleDiscountStatus.mock.calls[0]?.[1] as FormData;
		expect(formData.getAll("ids")).toEqual(["id-1", "id-2"]);
		expect(formData.get("isActive")).toBe("true");
	});

	it("toggle appends isActive=false when deactivating", async () => {
		const { result } = renderHook(() => useBulkToggleDiscountStatus());

		await act(async () => {
			result.current.toggle(["id-1"], false);
		});

		const formData = mockBulkToggleDiscountStatus.mock.calls[0]?.[1] as FormData;
		expect(formData.get("isActive")).toBe("false");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkToggleDiscountStatus({ onSuccess }));

		await act(async () => {
			result.current.toggle(["id-1"], true);
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockBulkToggleDiscountStatus.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkToggleDiscountStatus({ onSuccess }));

		await act(async () => {
			result.current.toggle(["id-1"], true);
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useDuplicateDiscount
// ============================================================================

describe("useDuplicateDiscount", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDuplicateDiscount.mockResolvedValue({
			status: "success" as const,
			message: "Code dupliqué",
			data: { id: "new-id", code: "PROMO10-COPY-1" },
		});
	});

	it("returns duplicate and isPending", () => {
		const { result } = renderHook(() => useDuplicateDiscount());
		expect(typeof result.current.duplicate).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("duplicate appends discountId to FormData", async () => {
		const { result } = renderHook(() => useDuplicateDiscount());

		await act(async () => {
			result.current.duplicate("discount-123");
		});

		const formData = mockDuplicateDiscount.mock.calls[0]?.[1] as FormData;
		expect(formData.get("discountId")).toBe("discount-123");
	});

	it("calls onSuccess with { id, code } when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDuplicateDiscount({ onSuccess }));

		await act(async () => {
			result.current.duplicate("discount-123");
		});

		expect(onSuccess).toHaveBeenCalledWith({ id: "new-id", code: "PROMO10-COPY-1" });
	});

	it("calls onError with message when action fails", async () => {
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
});

// ============================================================================
// useRefreshDiscounts
// ============================================================================

describe("useRefreshDiscounts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRefreshDiscounts.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, isPending, and refresh", () => {
		const { result } = renderHook(() => useRefreshDiscounts());
		expect(typeof result.current.state).not.toBe("string");
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.refresh).toBe("function");
	});

	it("calls the refreshDiscounts action when refresh is invoked", async () => {
		const { result } = renderHook(() => useRefreshDiscounts());

		await act(async () => {
			result.current.refresh();
		});

		expect(mockRefreshDiscounts).toHaveBeenCalledTimes(1);
	});

	it("calls onSuccess when refresh succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshDiscounts({ onSuccess }));

		await act(async () => {
			result.current.refresh();
		});

		expect(onSuccess).toHaveBeenCalled();
	});
});
