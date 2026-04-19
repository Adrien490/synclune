import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockRefreshProductTypes, mockDeleteProductType, mockToggleProductTypeStatus } = vi.hoisted(
	() => ({
		mockRefreshProductTypes: vi.fn(),
		mockDeleteProductType: vi.fn(),
		mockToggleProductTypeStatus: vi.fn(),
	}),
);

vi.mock("@/modules/product-types/actions/refresh-product-types", () => ({
	refreshProductTypes: mockRefreshProductTypes,
}));
vi.mock("@/modules/product-types/actions/delete-product-type", () => ({
	deleteProductType: mockDeleteProductType,
}));
vi.mock("@/modules/product-types/actions/toggle-product-type-status", () => ({
	toggleProductTypeStatus: mockToggleProductTypeStatus,
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

import { useRefreshProductTypes } from "../use-refresh-product-types";
import { useDeleteProductType } from "../use-delete-product-type";
import { useToggleProductTypeStatus } from "../use-toggle-product-type-status";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS = { status: "success" as const, message: "OK" };
const ERROR = { status: "error" as const, message: "Failed" };

// ============================================================================
// useRefreshProductTypes
// ============================================================================

describe("useRefreshProductTypes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRefreshProductTypes.mockResolvedValue(SUCCESS);
	});

	it("returns action, isPending, and refresh", () => {
		const { result } = renderHook(() => useRefreshProductTypes());
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.refresh).toBe("function");
	});

	it("calls the refreshProductTypes action when refresh is invoked", async () => {
		const { result } = renderHook(() => useRefreshProductTypes());

		await act(async () => {
			result.current.refresh();
		});

		expect(mockRefreshProductTypes).toHaveBeenCalledTimes(1);
	});

	it("calls onSuccess when refresh succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshProductTypes({ onSuccess }));

		await act(async () => {
			result.current.refresh();
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockRefreshProductTypes.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshProductTypes({ onSuccess }));

		await act(async () => {
			result.current.refresh();
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useDeleteProductType
// ============================================================================

describe("useDeleteProductType", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteProductType.mockResolvedValue({ ...SUCCESS, message: "Type de produit supprimé" });
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useDeleteProductType());
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteProductType({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("Type de produit supprimé");
	});

	it("does not call onSuccess when action fails", async () => {
		mockDeleteProductType.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteProductType({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useToggleProductTypeStatus
// ============================================================================

describe("useToggleProductTypeStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockToggleProductTypeStatus.mockResolvedValue({
			...SUCCESS,
			message: "Type de produit activé",
		});
	});

	it("returns state, action, isPending, and toggleStatus", () => {
		const { result } = renderHook(() => useToggleProductTypeStatus());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.toggleStatus).toBe("function");
	});

	it("toggleStatus appends productTypeId and isActive=true to FormData", async () => {
		const { result } = renderHook(() => useToggleProductTypeStatus());

		await act(async () => {
			result.current.toggleStatus("pt-123", true);
		});

		const formData = mockToggleProductTypeStatus.mock.calls[0]?.[1] as FormData;
		expect(formData.get("productTypeId")).toBe("pt-123");
		expect(formData.get("isActive")).toBe("true");
	});

	it("toggleStatus appends isActive=false when deactivating", async () => {
		const { result } = renderHook(() => useToggleProductTypeStatus());

		await act(async () => {
			result.current.toggleStatus("pt-123", false);
		});

		const formData = mockToggleProductTypeStatus.mock.calls[0]?.[1] as FormData;
		expect(formData.get("isActive")).toBe("false");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useToggleProductTypeStatus({ onSuccess }));

		await act(async () => {
			result.current.toggleStatus("pt-123", true);
		});

		expect(onSuccess).toHaveBeenCalledWith("Type de produit activé");
	});

	it("calls onError when action fails", async () => {
		mockToggleProductTypeStatus.mockResolvedValue(ERROR);
		const onError = vi.fn();
		const { result } = renderHook(() => useToggleProductTypeStatus({ onError }));

		await act(async () => {
			result.current.toggleStatus("pt-123", true);
		});

		expect(onError).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockToggleProductTypeStatus.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useToggleProductTypeStatus({ onSuccess }));

		await act(async () => {
			result.current.toggleStatus("pt-123", true);
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});
