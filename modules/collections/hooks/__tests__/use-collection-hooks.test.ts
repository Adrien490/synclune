import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockDeleteCollection,
	mockRefreshCollections,
	mockSetFeaturedProduct,
	mockRemoveFeaturedProduct,
	mockUpdateCollectionStatus,
} = vi.hoisted(() => ({
	mockDeleteCollection: vi.fn(),
	mockRefreshCollections: vi.fn(),
	mockSetFeaturedProduct: vi.fn(),
	mockRemoveFeaturedProduct: vi.fn(),
	mockUpdateCollectionStatus: vi.fn(),
}));

vi.mock("@/modules/collections/actions/delete-collection", () => ({
	deleteCollection: mockDeleteCollection,
}));
vi.mock("@/modules/collections/actions/refresh-collections", () => ({
	refreshCollections: mockRefreshCollections,
}));
vi.mock("@/modules/collections/actions/set-featured-product", () => ({
	setFeaturedProduct: mockSetFeaturedProduct,
	removeFeaturedProduct: mockRemoveFeaturedProduct,
}));
vi.mock("@/modules/collections/actions/update-collection-status", () => ({
	updateCollectionStatus: mockUpdateCollectionStatus,
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

import { useDeleteCollection } from "../use-delete-collection";
import { useRefreshCollections } from "../use-refresh-collections";
import { useSetFeaturedProduct } from "../use-set-featured-product";
import { useUpdateCollectionStatus } from "../use-update-collection-status";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS = { status: "success" as const, message: "OK" };
const ERROR = { status: "error" as const, message: "Failed" };

// ============================================================================
// useDeleteCollection
// ============================================================================

describe("useDeleteCollection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteCollection.mockResolvedValue({ ...SUCCESS, message: "Collection supprimée" });
	});

	it("returns action and isPending", () => {
		const { result } = renderHook(() => useDeleteCollection());
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteCollection({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("Collection supprimée");
	});

	it("does not call onSuccess when action fails", async () => {
		mockDeleteCollection.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteCollection({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useRefreshCollections
// ============================================================================

describe("useRefreshCollections", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRefreshCollections.mockResolvedValue(SUCCESS);
	});

	it("returns action, isPending, and refresh", () => {
		const { result } = renderHook(() => useRefreshCollections());
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.refresh).toBe("function");
	});

	it("calls the refreshCollections action when refresh is invoked", async () => {
		const { result } = renderHook(() => useRefreshCollections());

		await act(async () => {
			result.current.refresh();
		});

		expect(mockRefreshCollections).toHaveBeenCalledTimes(1);
	});

	it("calls onSuccess when refresh succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshCollections({ onSuccess }));

		await act(async () => {
			result.current.refresh();
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockRefreshCollections.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshCollections({ onSuccess }));

		await act(async () => {
			result.current.refresh();
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useSetFeaturedProduct
// ============================================================================

describe("useSetFeaturedProduct", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSetFeaturedProduct.mockResolvedValue(SUCCESS);
		mockRemoveFeaturedProduct.mockResolvedValue(SUCCESS);
	});

	it("returns setFeatured, removeFeatured, and isPending", () => {
		const { result } = renderHook(() => useSetFeaturedProduct());
		expect(typeof result.current.setFeatured).toBe("function");
		expect(typeof result.current.removeFeatured).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("setFeatured appends collectionId and productId to FormData", async () => {
		const { result } = renderHook(() => useSetFeaturedProduct());

		await act(async () => {
			result.current.setFeatured("col-1", "prod-1");
		});

		const formData = mockSetFeaturedProduct.mock.calls[0]?.[1] as FormData;
		expect(formData.get("collectionId")).toBe("col-1");
		expect(formData.get("productId")).toBe("prod-1");
	});

	it("removeFeatured appends collectionId and productId to FormData", async () => {
		const { result } = renderHook(() => useSetFeaturedProduct());

		await act(async () => {
			result.current.removeFeatured("col-1", "prod-1");
		});

		const formData = mockRemoveFeaturedProduct.mock.calls[0]?.[1] as FormData;
		expect(formData.get("collectionId")).toBe("col-1");
		expect(formData.get("productId")).toBe("prod-1");
	});

	it("calls onSuccess when setFeatured succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSetFeaturedProduct({ onSuccess }));

		await act(async () => {
			result.current.setFeatured("col-1", "prod-1");
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("calls onSuccess when removeFeatured succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSetFeaturedProduct({ onSuccess }));

		await act(async () => {
			result.current.removeFeatured("col-1", "prod-1");
		});

		expect(onSuccess).toHaveBeenCalled();
	});
});

// ============================================================================
// useUpdateCollectionStatus
// ============================================================================

describe("useUpdateCollectionStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateCollectionStatus.mockResolvedValue({ ...SUCCESS, message: "Statut mis à jour" });
	});

	it("returns state, action, isPending, and updateStatus", () => {
		const { result } = renderHook(() => useUpdateCollectionStatus());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.updateStatus).toBe("function");
	});

	it("updateStatus appends id and status to FormData", async () => {
		const { result } = renderHook(() => useUpdateCollectionStatus());

		await act(async () => {
			result.current.updateStatus("col-1", "ARCHIVED");
		});

		const formData = mockUpdateCollectionStatus.mock.calls[0]?.[1] as FormData;
		expect(formData.get("id")).toBe("col-1");
		expect(formData.get("status")).toBe("ARCHIVED");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateCollectionStatus({ onSuccess }));

		await act(async () => {
			result.current.updateStatus("col-1", "PUBLIC");
		});

		expect(onSuccess).toHaveBeenCalledWith("Statut mis à jour");
	});

	it("does not call onSuccess when action fails", async () => {
		mockUpdateCollectionStatus.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateCollectionStatus({ onSuccess }));

		await act(async () => {
			result.current.updateStatus("col-1", "DRAFT");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});
