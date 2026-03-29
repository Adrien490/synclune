import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockRefreshProductTypes,
	mockDeleteProductType,
	mockToggleProductTypeStatus,
	mockBulkActivateProductTypes,
	mockBulkDeactivateProductTypes,
	mockBulkDeleteProductTypes,
} = vi.hoisted(() => ({
	mockRefreshProductTypes: vi.fn(),
	mockDeleteProductType: vi.fn(),
	mockToggleProductTypeStatus: vi.fn(),
	mockBulkActivateProductTypes: vi.fn(),
	mockBulkDeactivateProductTypes: vi.fn(),
	mockBulkDeleteProductTypes: vi.fn(),
}));

vi.mock("@/modules/product-types/actions/refresh-product-types", () => ({
	refreshProductTypes: mockRefreshProductTypes,
}));
vi.mock("@/modules/product-types/actions/delete-product-type", () => ({
	deleteProductType: mockDeleteProductType,
}));
vi.mock("@/modules/product-types/actions/toggle-product-type-status", () => ({
	toggleProductTypeStatus: mockToggleProductTypeStatus,
}));
vi.mock("@/modules/product-types/actions/bulk-activate-product-types", () => ({
	bulkActivateProductTypes: mockBulkActivateProductTypes,
}));
vi.mock("@/modules/product-types/actions/bulk-deactivate-product-types", () => ({
	bulkDeactivateProductTypes: mockBulkDeactivateProductTypes,
}));
vi.mock("@/modules/product-types/actions/bulk-delete-product-types", () => ({
	bulkDeleteProductTypes: mockBulkDeleteProductTypes,
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
import { useBulkActivateProductTypes } from "../use-bulk-activate-product-types";
import { useBulkDeactivateProductTypes } from "../use-bulk-deactivate-product-types";
import { useBulkDeleteProductTypes } from "../use-bulk-delete-product-types";

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

// ============================================================================
// useBulkActivateProductTypes
// ============================================================================

describe("useBulkActivateProductTypes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBulkActivateProductTypes.mockResolvedValue({
			...SUCCESS,
			message: "2 types de produit activés",
		});
	});

	it("returns state, action, isPending, and activateProductTypes", () => {
		const { result } = renderHook(() => useBulkActivateProductTypes());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.activateProductTypes).toBe("function");
	});

	it("activateProductTypes sends ids as JSON in FormData", async () => {
		const { result } = renderHook(() => useBulkActivateProductTypes());

		await act(async () => {
			result.current.activateProductTypes(["pt-1", "pt-2"]);
		});

		const formData = mockBulkActivateProductTypes.mock.calls[0]?.[1] as FormData;
		expect(formData.get("ids")).toBe(JSON.stringify(["pt-1", "pt-2"]));
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkActivateProductTypes({ onSuccess }));

		await act(async () => {
			result.current.activateProductTypes(["pt-1"]);
		});

		expect(onSuccess).toHaveBeenCalledWith("2 types de produit activés");
	});

	it("does not call onSuccess when action fails", async () => {
		mockBulkActivateProductTypes.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkActivateProductTypes({ onSuccess }));

		await act(async () => {
			result.current.activateProductTypes(["pt-1"]);
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useBulkDeactivateProductTypes
// ============================================================================

describe("useBulkDeactivateProductTypes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBulkDeactivateProductTypes.mockResolvedValue({
			...SUCCESS,
			message: "2 types de produit désactivés",
		});
	});

	it("returns state, action, isPending, and deactivateProductTypes", () => {
		const { result } = renderHook(() => useBulkDeactivateProductTypes());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.deactivateProductTypes).toBe("function");
	});

	it("deactivateProductTypes sends ids as JSON in FormData", async () => {
		const { result } = renderHook(() => useBulkDeactivateProductTypes());

		await act(async () => {
			result.current.deactivateProductTypes(["pt-1", "pt-2"]);
		});

		const formData = mockBulkDeactivateProductTypes.mock.calls[0]?.[1] as FormData;
		expect(formData.get("ids")).toBe(JSON.stringify(["pt-1", "pt-2"]));
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkDeactivateProductTypes({ onSuccess }));

		await act(async () => {
			result.current.deactivateProductTypes(["pt-1"]);
		});

		expect(onSuccess).toHaveBeenCalledWith("2 types de produit désactivés");
	});

	it("does not call onSuccess when action fails", async () => {
		mockBulkDeactivateProductTypes.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkDeactivateProductTypes({ onSuccess }));

		await act(async () => {
			result.current.deactivateProductTypes(["pt-1"]);
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useBulkDeleteProductTypes
// ============================================================================

describe("useBulkDeleteProductTypes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBulkDeleteProductTypes.mockResolvedValue({
			...SUCCESS,
			message: "2 types de produit supprimés",
		});
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useBulkDeleteProductTypes());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkDeleteProductTypes({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("2 types de produit supprimés");
	});

	it("does not call onSuccess when action fails", async () => {
		mockBulkDeleteProductTypes.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkDeleteProductTypes({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});
