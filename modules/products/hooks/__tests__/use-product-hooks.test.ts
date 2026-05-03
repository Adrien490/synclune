import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockDeleteProduct,
	mockRefreshProducts,
	mockToggleProductStatus,
	mockClearRecentSearches,
	mockDuplicateProduct,
	mockUpdateProductCollections,
	mockAddRecentSearch,
	mockRemoveRecentSearch,
} = vi.hoisted(() => ({
	mockDeleteProduct: vi.fn(),
	mockRefreshProducts: vi.fn(),
	mockToggleProductStatus: vi.fn(),
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

const mockConsentState: { accepted: boolean | null; _hasHydrated: boolean } = {
	accepted: true,
	_hasHydrated: true,
};

vi.mock("@/shared/providers/cookie-consent-store-provider", () => ({
	useCookieConsentStore: (
		selector: (s: { accepted: boolean | null; _hasHydrated: boolean }) => unknown,
	) => selector(mockConsentState),
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useDeleteProduct } from "../use-delete-product";
import { useRefreshProducts } from "../use-refresh-products";
import { useToggleProductStatus } from "../use-toggle-product-status";
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
	const DUPLICATE_DATA = {
		productId: "new-prod-1",
		title: "Copie de Bague Lune",
		slug: "copie-de-bague-lune",
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockDuplicateProduct.mockResolvedValue({
			...SUCCESS,
			message: "Produit dupliqué",
			data: DUPLICATE_DATA,
		});
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

	it("calls onSuccess with message and duplicated product data when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDuplicateProduct({ onSuccess }));

		await act(async () => {
			result.current.doDuplicate("product-123");
		});

		expect(onSuccess).toHaveBeenCalledWith("Produit dupliqué", DUPLICATE_DATA);
	});

	it("does not call onSuccess when data payload is missing or malformed", async () => {
		mockDuplicateProduct.mockResolvedValue({ ...SUCCESS, message: "Produit dupliqué" });
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDuplicateProduct({ onSuccess }));

		await act(async () => {
			result.current.doDuplicate("product-123");
		});

		expect(onSuccess).not.toHaveBeenCalled();
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
		mockConsentState.accepted = true;
		mockConsentState._hasHydrated = true;
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

	it("skips action silently when RGPD consent is not accepted", async () => {
		mockConsentState.accepted = false;
		const { result } = renderHook(() => useAddRecentSearch());

		await act(async () => {
			result.current.add("bague argent");
		});

		expect(mockAddRecentSearch).not.toHaveBeenCalled();
	});

	it("skips action when consent store has not hydrated yet", async () => {
		mockConsentState.accepted = true;
		mockConsentState._hasHydrated = false;
		const { result } = renderHook(() => useAddRecentSearch());

		await act(async () => {
			result.current.add("bague argent");
		});

		expect(mockAddRecentSearch).not.toHaveBeenCalled();
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
