import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockDeleteProduct,
	mockRefreshProducts,
	mockToggleProductStatus,
	mockBulkArchiveProducts,
	mockBulkChangeProductStatus,
	mockBulkDeleteProducts,
	mockClearRecentSearches,
	mockDuplicateProduct,
	mockUpdateProductCollections,
	mockAddRecentSearch,
	mockRemoveRecentSearch,
} = vi.hoisted(() => ({
	mockDeleteProduct: vi.fn(),
	mockRefreshProducts: vi.fn(),
	mockToggleProductStatus: vi.fn(),
	mockBulkArchiveProducts: vi.fn(),
	mockBulkChangeProductStatus: vi.fn(),
	mockBulkDeleteProducts: vi.fn(),
	mockClearRecentSearches: vi.fn(),
	mockDuplicateProduct: vi.fn(),
	mockUpdateProductCollections: vi.fn(),
	mockAddRecentSearch: vi.fn(),
	mockRemoveRecentSearch: vi.fn(),
}));

vi.mock("@/modules/products/actions/delete-product", () => ({
	deleteProduct: mockDeleteProduct,
}));
vi.mock("@/modules/products/actions/refresh-products", () => ({
	refreshProducts: mockRefreshProducts,
}));
vi.mock("@/modules/products/actions/toggle-product-status", () => ({
	toggleProductStatus: mockToggleProductStatus,
}));
vi.mock("@/modules/products/actions/bulk-archive-products", () => ({
	bulkArchiveProducts: mockBulkArchiveProducts,
}));
vi.mock("@/modules/products/actions/bulk-change-product-status", () => ({
	bulkChangeProductStatus: mockBulkChangeProductStatus,
}));
vi.mock("@/modules/products/actions/bulk-delete-products", () => ({
	bulkDeleteProducts: mockBulkDeleteProducts,
}));
vi.mock("@/modules/products/actions/clear-recent-searches", () => ({
	clearRecentSearches: mockClearRecentSearches,
}));
vi.mock("@/modules/products/actions/duplicate-product", () => ({
	duplicateProduct: mockDuplicateProduct,
}));
vi.mock("@/modules/products/actions/update-product-collections", () => ({
	updateProductCollections: mockUpdateProductCollections,
}));
vi.mock("@/modules/products/actions/add-recent-search", () => ({
	addRecentSearch: mockAddRecentSearch,
}));
vi.mock("@/modules/products/actions/remove-recent-search", () => ({
	removeRecentSearch: mockRemoveRecentSearch,
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

import { useDeleteProduct } from "../use-delete-product";
import { useRefreshProducts } from "../use-refresh-products";
import { useToggleProductStatus } from "../use-toggle-product-status";
import { useBulkArchiveProducts } from "../use-bulk-archive-products";
import { useBulkChangeProductStatus } from "../use-bulk-change-product-status";
import { useBulkDeleteProducts } from "../use-bulk-delete-products";
import { useClearRecentSearches } from "../use-clear-recent-search";
import { useDuplicateProduct } from "../use-duplicate-product";
import { useUpdateProductCollections } from "../use-update-product-collections";
import { useAddRecentSearch } from "../use-add-recent-search";
import { useRecentSearches } from "../use-recent-searches";
import { useRemoveRecentSearch } from "../use-remove-recent-search";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS = { status: "success" as const, message: "OK" };
const ERROR = { status: "error" as const, message: "Failed" };

// ============================================================================
// useDeleteProduct
// ============================================================================

describe("useDeleteProduct", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteProduct.mockResolvedValue(SUCCESS);
	});

	it("returns action and isPending", () => {
		const { result } = renderHook(() => useDeleteProduct());
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteProduct({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockDeleteProduct.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteProduct({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useRefreshProducts
// ============================================================================

describe("useRefreshProducts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRefreshProducts.mockResolvedValue(SUCCESS);
	});

	it("returns action, isPending, and refresh", () => {
		const { result } = renderHook(() => useRefreshProducts());
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.refresh).toBe("function");
	});

	it("calls the refreshProducts action when refresh is invoked", async () => {
		const { result } = renderHook(() => useRefreshProducts());

		await act(async () => {
			result.current.refresh();
		});

		expect(mockRefreshProducts).toHaveBeenCalledTimes(1);
	});

	it("calls onSuccess when refresh succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshProducts({ onSuccess }));

		await act(async () => {
			result.current.refresh();
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockRefreshProducts.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshProducts({ onSuccess }));

		await act(async () => {
			result.current.refresh();
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useToggleProductStatus
// ============================================================================

describe("useToggleProductStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockToggleProductStatus.mockResolvedValue({ ...SUCCESS, message: "Produit publié" });
	});

	it("returns state, action, isPending, and toggleStatus", () => {
		const { result } = renderHook(() => useToggleProductStatus());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.toggleStatus).toBe("function");
	});

	it("toggleStatus appends productId and currentStatus to FormData", async () => {
		const { result } = renderHook(() => useToggleProductStatus());

		await act(async () => {
			result.current.toggleStatus("product-123", "DRAFT");
		});

		const formData = mockToggleProductStatus.mock.calls[0]?.[1] as FormData;
		expect(formData.get("productId")).toBe("product-123");
		expect(formData.get("currentStatus")).toBe("DRAFT");
	});

	it("toggleStatus appends optional targetStatus when provided", async () => {
		const { result } = renderHook(() => useToggleProductStatus());

		await act(async () => {
			result.current.toggleStatus("product-123", "DRAFT", "PUBLIC");
		});

		const formData = mockToggleProductStatus.mock.calls[0]?.[1] as FormData;
		expect(formData.get("targetStatus")).toBe("PUBLIC");
	});

	it("toggleStatus does not append targetStatus when omitted", async () => {
		const { result } = renderHook(() => useToggleProductStatus());

		await act(async () => {
			result.current.toggleStatus("product-123", "PUBLIC");
		});

		const formData = mockToggleProductStatus.mock.calls[0]?.[1] as FormData;
		expect(formData.get("targetStatus")).toBeNull();
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useToggleProductStatus({ onSuccess }));

		await act(async () => {
			result.current.toggleStatus("product-123", "DRAFT");
		});

		expect(onSuccess).toHaveBeenCalledWith("Produit publié");
	});

	it("calls onError when action fails", async () => {
		mockToggleProductStatus.mockResolvedValue(ERROR);
		const onError = vi.fn();
		const { result } = renderHook(() => useToggleProductStatus({ onError }));

		await act(async () => {
			result.current.toggleStatus("product-123", "DRAFT");
		});

		expect(onError).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockToggleProductStatus.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useToggleProductStatus({ onSuccess }));

		await act(async () => {
			result.current.toggleStatus("product-123", "DRAFT");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useBulkArchiveProducts
// ============================================================================

describe("useBulkArchiveProducts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBulkArchiveProducts.mockResolvedValue({ ...SUCCESS, message: "3 produits archivés" });
	});

	it("returns state, action, isPending, and archiveProducts", () => {
		const { result } = renderHook(() => useBulkArchiveProducts());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.archiveProducts).toBe("function");
	});

	it("archiveProducts sends productIds and targetStatus=ARCHIVED by default", async () => {
		const { result } = renderHook(() => useBulkArchiveProducts());

		await act(async () => {
			result.current.archiveProducts(["id-1", "id-2"]);
		});

		const formData = mockBulkArchiveProducts.mock.calls[0]?.[1] as FormData;
		expect(formData.get("productIds")).toBe(JSON.stringify(["id-1", "id-2"]));
		expect(formData.get("targetStatus")).toBe("ARCHIVED");
	});

	it("archiveProducts sends targetStatus=PUBLIC when specified", async () => {
		const { result } = renderHook(() => useBulkArchiveProducts());

		await act(async () => {
			result.current.archiveProducts(["id-1"], "PUBLIC");
		});

		const formData = mockBulkArchiveProducts.mock.calls[0]?.[1] as FormData;
		expect(formData.get("targetStatus")).toBe("PUBLIC");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkArchiveProducts({ onSuccess }));

		await act(async () => {
			result.current.archiveProducts(["id-1"]);
		});

		expect(onSuccess).toHaveBeenCalledWith("3 produits archivés");
	});

	it("does not call onSuccess when action fails", async () => {
		mockBulkArchiveProducts.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkArchiveProducts({ onSuccess }));

		await act(async () => {
			result.current.archiveProducts(["id-1"]);
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useBulkChangeProductStatus
// ============================================================================

describe("useBulkChangeProductStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBulkChangeProductStatus.mockResolvedValue({ ...SUCCESS, message: "2 produits mis à jour" });
	});

	it("returns state, action, isPending, and changeProductStatus", () => {
		const { result } = renderHook(() => useBulkChangeProductStatus());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.changeProductStatus).toBe("function");
	});

	it("changeProductStatus sends productIds and targetStatus to FormData", async () => {
		const { result } = renderHook(() => useBulkChangeProductStatus());

		await act(async () => {
			result.current.changeProductStatus(["id-1", "id-2"], "PUBLIC");
		});

		const formData = mockBulkChangeProductStatus.mock.calls[0]?.[1] as FormData;
		expect(formData.get("productIds")).toBe(JSON.stringify(["id-1", "id-2"]));
		expect(formData.get("targetStatus")).toBe("PUBLIC");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkChangeProductStatus({ onSuccess }));

		await act(async () => {
			result.current.changeProductStatus(["id-1"], "DRAFT");
		});

		expect(onSuccess).toHaveBeenCalledWith("2 produits mis à jour");
	});

	it("does not call onSuccess when action fails", async () => {
		mockBulkChangeProductStatus.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkChangeProductStatus({ onSuccess }));

		await act(async () => {
			result.current.changeProductStatus(["id-1"], "PUBLIC");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useBulkDeleteProducts
// ============================================================================

describe("useBulkDeleteProducts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBulkDeleteProducts.mockResolvedValue({ ...SUCCESS, message: "2 produits supprimés" });
	});

	it("returns state, action, isPending, and deleteProducts", () => {
		const { result } = renderHook(() => useBulkDeleteProducts());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.deleteProducts).toBe("function");
	});

	it("deleteProducts sends productIds as JSON in FormData", async () => {
		const { result } = renderHook(() => useBulkDeleteProducts());

		await act(async () => {
			result.current.deleteProducts(["id-1", "id-2"]);
		});

		const formData = mockBulkDeleteProducts.mock.calls[0]?.[1] as FormData;
		expect(formData.get("productIds")).toBe(JSON.stringify(["id-1", "id-2"]));
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkDeleteProducts({ onSuccess }));

		await act(async () => {
			result.current.deleteProducts(["id-1"]);
		});

		expect(onSuccess).toHaveBeenCalledWith("2 produits supprimés");
	});

	it("does not call onSuccess when action fails", async () => {
		mockBulkDeleteProducts.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkDeleteProducts({ onSuccess }));

		await act(async () => {
			result.current.deleteProducts(["id-1"]);
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useClearRecentSearches
// ============================================================================

describe("useClearRecentSearches", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockClearRecentSearches.mockResolvedValue(SUCCESS);
	});

	it("returns state, searches, clear, isPending, isEmpty, isSuccess, isError", () => {
		const { result } = renderHook(() =>
			useClearRecentSearches({ initialSearches: ["bague", "collier"] }),
		);
		expect(Array.isArray(result.current.searches)).toBe(true);
		expect(typeof result.current.clear).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.isEmpty).toBe("boolean");
		expect(typeof result.current.isSuccess).toBe("boolean");
		expect(typeof result.current.isError).toBe("boolean");
	});

	it("initialSearches are reflected in searches", () => {
		const { result } = renderHook(() =>
			useClearRecentSearches({ initialSearches: ["bague", "collier"] }),
		);
		expect(result.current.searches).toEqual(["bague", "collier"]);
		expect(result.current.isEmpty).toBe(false);
	});

	it("isEmpty is true when initialSearches is empty", () => {
		const { result } = renderHook(() => useClearRecentSearches({ initialSearches: [] }));
		expect(result.current.isEmpty).toBe(true);
	});

	it("calls onSuccess when clear succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() =>
			useClearRecentSearches({ initialSearches: ["bague"], onSuccess }),
		);

		await act(async () => {
			result.current.clear();
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("calls onError when clear fails", async () => {
		mockClearRecentSearches.mockResolvedValue(ERROR);
		const onError = vi.fn();
		const { result } = renderHook(() =>
			useClearRecentSearches({ initialSearches: ["bague"], onError }),
		);

		await act(async () => {
			result.current.clear();
		});

		expect(onError).toHaveBeenCalled();
	});
});

// ============================================================================
// useDuplicateProduct
// ============================================================================

describe("useDuplicateProduct", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDuplicateProduct.mockResolvedValue({ ...SUCCESS, message: "Produit dupliqué" });
	});

	it("returns state, action, isPending, and doDuplicate", () => {
		const { result } = renderHook(() => useDuplicateProduct());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.doDuplicate).toBe("function");
	});

	it("doDuplicate appends productId to FormData", async () => {
		const { result } = renderHook(() => useDuplicateProduct());

		await act(async () => {
			result.current.doDuplicate("product-123");
		});

		const formData = mockDuplicateProduct.mock.calls[0]?.[1] as FormData;
		expect(formData.get("productId")).toBe("product-123");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDuplicateProduct({ onSuccess }));

		await act(async () => {
			result.current.doDuplicate("product-123");
		});

		expect(onSuccess).toHaveBeenCalledWith("Produit dupliqué");
	});

	it("does not call onSuccess when action fails", async () => {
		mockDuplicateProduct.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDuplicateProduct({ onSuccess }));

		await act(async () => {
			result.current.doDuplicate("product-123");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useUpdateProductCollections
// ============================================================================

describe("useUpdateProductCollections", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateProductCollections.mockResolvedValue(SUCCESS);
	});

	it("returns update and isPending", () => {
		const { result } = renderHook(() => useUpdateProductCollections());
		expect(typeof result.current.update).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("update appends productId and collectionIds to FormData", async () => {
		const { result } = renderHook(() => useUpdateProductCollections());

		await act(async () => {
			result.current.update("product-123", ["col-1", "col-2"]);
		});

		const formData = mockUpdateProductCollections.mock.calls[0]?.[1] as FormData;
		expect(formData.get("productId")).toBe("product-123");
		expect(formData.get("collectionIds")).toBe(JSON.stringify(["col-1", "col-2"]));
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateProductCollections({ onSuccess }));

		await act(async () => {
			result.current.update("product-123", ["col-1"]);
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("calls onError with message when action fails", async () => {
		mockUpdateProductCollections.mockResolvedValue(ERROR);
		const onError = vi.fn();
		const { result } = renderHook(() => useUpdateProductCollections({ onError }));

		await act(async () => {
			result.current.update("product-123", []);
		});

		expect(onError).toHaveBeenCalledWith("Failed");
	});
});

// ============================================================================
// useAddRecentSearch
// ============================================================================

describe("useAddRecentSearch", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockAddRecentSearch.mockResolvedValue({
			...SUCCESS,
			data: { searches: ["bague", "collier"] },
		});
	});

	it("returns state, add, isPending, isSuccess, isError", () => {
		const { result } = renderHook(() => useAddRecentSearch());
		expect(typeof result.current.add).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.isSuccess).toBe("boolean");
		expect(typeof result.current.isError).toBe("boolean");
	});

	it("add sends term in FormData", async () => {
		const { result } = renderHook(() => useAddRecentSearch());

		await act(async () => {
			result.current.add("bague argent");
		});

		const formData = mockAddRecentSearch.mock.calls[0]?.[1] as FormData;
		expect(formData.get("term")).toBe("bague argent");
	});

	it("calls onSuccess with updated searches when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useAddRecentSearch({ onSuccess }));

		await act(async () => {
			result.current.add("bague argent");
		});

		expect(onSuccess).toHaveBeenCalledWith(["bague", "collier"]);
	});

	it("calls onError when action fails", async () => {
		mockAddRecentSearch.mockResolvedValue(ERROR);
		const onError = vi.fn();
		const { result } = renderHook(() => useAddRecentSearch({ onError }));

		await act(async () => {
			result.current.add("bague argent");
		});

		expect(onError).toHaveBeenCalled();
	});
});

// ============================================================================
// useRemoveRecentSearch
// ============================================================================

describe("useRemoveRecentSearch", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRemoveRecentSearch.mockResolvedValue({
			...SUCCESS,
			data: { searches: ["collier"] },
		});
	});

	it("returns state, searches, remove, isPending, isSuccess, isError", () => {
		const { result } = renderHook(() =>
			useRemoveRecentSearch({ initialSearches: ["bague", "collier"] }),
		);
		expect(Array.isArray(result.current.searches)).toBe(true);
		expect(typeof result.current.remove).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.isSuccess).toBe("boolean");
		expect(typeof result.current.isError).toBe("boolean");
	});

	it("remove sends term in FormData", async () => {
		const { result } = renderHook(() =>
			useRemoveRecentSearch({ initialSearches: ["bague", "collier"] }),
		);

		await act(async () => {
			result.current.remove("bague");
		});

		const formData = mockRemoveRecentSearch.mock.calls[0]?.[1] as FormData;
		expect(formData.get("term")).toBe("bague");
	});

	it("calls onSuccess with remaining searches when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() =>
			useRemoveRecentSearch({ initialSearches: ["bague", "collier"], onSuccess }),
		);

		await act(async () => {
			result.current.remove("bague");
		});

		expect(onSuccess).toHaveBeenCalledWith(["collier"]);
	});

	it("calls onError when action fails", async () => {
		mockRemoveRecentSearch.mockResolvedValue(ERROR);
		const onError = vi.fn();
		const { result } = renderHook(() =>
			useRemoveRecentSearch({ initialSearches: ["bague", "collier"], onError }),
		);

		await act(async () => {
			result.current.remove("bague");
		});

		expect(onError).toHaveBeenCalled();
	});
});

// ============================================================================
// useRecentSearches
// ============================================================================

describe("useRecentSearches", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRemoveRecentSearch.mockResolvedValue({
			...SUCCESS,
			data: { searches: ["collier"] },
		});
		mockClearRecentSearches.mockResolvedValue(SUCCESS);
	});

	it("returns searches, remove, clear, isPending, isEmpty, removeState, clearState", () => {
		const { result } = renderHook(() =>
			useRecentSearches({ initialSearches: ["bague", "collier"] }),
		);
		expect(Array.isArray(result.current.searches)).toBe(true);
		expect(typeof result.current.remove).toBe("function");
		expect(typeof result.current.clear).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.isEmpty).toBe("boolean");
	});

	it("reflects initialSearches and isEmpty correctly", () => {
		const { result } = renderHook(() =>
			useRecentSearches({ initialSearches: ["bague", "collier"] }),
		);
		expect(result.current.searches).toEqual(["bague", "collier"]);
		expect(result.current.isEmpty).toBe(false);
	});

	it("isEmpty is true when initialSearches is empty", () => {
		const { result } = renderHook(() => useRecentSearches({ initialSearches: [] }));
		expect(result.current.isEmpty).toBe(true);
	});

	it("remove sends term in FormData via removeRecentSearch", async () => {
		const { result } = renderHook(() =>
			useRecentSearches({ initialSearches: ["bague", "collier"] }),
		);

		await act(async () => {
			result.current.remove("bague");
		});

		const formData = mockRemoveRecentSearch.mock.calls[0]?.[1] as FormData;
		expect(formData.get("term")).toBe("bague");
	});

	it("calls onRemoveSuccess with remaining searches when remove succeeds", async () => {
		const onRemoveSuccess = vi.fn();
		const { result } = renderHook(() =>
			useRecentSearches({ initialSearches: ["bague", "collier"], onRemoveSuccess }),
		);

		await act(async () => {
			result.current.remove("bague");
		});

		expect(onRemoveSuccess).toHaveBeenCalledWith(["collier"]);
	});

	it("calls onClearSuccess when clear succeeds", async () => {
		const onClearSuccess = vi.fn();
		const { result } = renderHook(() =>
			useRecentSearches({ initialSearches: ["bague"], onClearSuccess }),
		);

		await act(async () => {
			result.current.clear();
		});

		expect(onClearSuccess).toHaveBeenCalled();
	});

	it("calls onClearError when clear fails", async () => {
		mockClearRecentSearches.mockResolvedValue(ERROR);
		const onClearError = vi.fn();
		const { result } = renderHook(() =>
			useRecentSearches({ initialSearches: ["bague"], onClearError }),
		);

		await act(async () => {
			result.current.clear();
		});

		expect(onClearError).toHaveBeenCalled();
	});
});
