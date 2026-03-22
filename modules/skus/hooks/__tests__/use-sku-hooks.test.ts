import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockRefreshSkus,
	mockUpdateProductSkuStatus,
	mockAdjustSkuStock,
	mockBulkActivateSkus,
	mockBulkAdjustStock,
	mockBulkDeactivateSkus,
	mockBulkDeleteSkus,
	mockBulkUpdatePrice,
	mockDeleteProductSku,
	mockDuplicateSku,
	mockSetDefaultSku,
	mockUpdateProductSku,
	mockUpdateSkuPrice,
} = vi.hoisted(() => ({
	mockRefreshSkus: vi.fn(),
	mockUpdateProductSkuStatus: vi.fn(),
	mockAdjustSkuStock: vi.fn(),
	mockBulkActivateSkus: vi.fn(),
	mockBulkAdjustStock: vi.fn(),
	mockBulkDeactivateSkus: vi.fn(),
	mockBulkDeleteSkus: vi.fn(),
	mockBulkUpdatePrice: vi.fn(),
	mockDeleteProductSku: vi.fn(),
	mockDuplicateSku: vi.fn(),
	mockSetDefaultSku: vi.fn(),
	mockUpdateProductSku: vi.fn(),
	mockUpdateSkuPrice: vi.fn(),
}));

vi.mock("@/modules/skus/actions/refresh-skus", () => ({
	refreshSkus: mockRefreshSkus,
}));
vi.mock("@/modules/skus/actions/update-sku-status", () => ({
	updateProductSkuStatus: mockUpdateProductSkuStatus,
}));
vi.mock("@/modules/skus/actions/adjust-sku-stock", () => ({
	adjustSkuStock: mockAdjustSkuStock,
}));
vi.mock("@/modules/skus/actions/bulk-activate-skus", () => ({
	bulkActivateSkus: mockBulkActivateSkus,
}));
vi.mock("@/modules/skus/actions/bulk-adjust-stock", () => ({
	bulkAdjustStock: mockBulkAdjustStock,
}));
vi.mock("@/modules/skus/actions/bulk-deactivate-skus", () => ({
	bulkDeactivateSkus: mockBulkDeactivateSkus,
}));
vi.mock("@/modules/skus/actions/bulk-delete-skus", () => ({
	bulkDeleteSkus: mockBulkDeleteSkus,
}));
vi.mock("@/modules/skus/actions/bulk-update-price", () => ({
	bulkUpdatePrice: mockBulkUpdatePrice,
}));
vi.mock("@/modules/skus/actions/delete-sku", () => ({
	deleteProductSku: mockDeleteProductSku,
}));
vi.mock("@/modules/skus/actions/duplicate-sku", () => ({
	duplicateSku: mockDuplicateSku,
}));
vi.mock("@/modules/skus/actions/set-default-sku", () => ({
	setDefaultSku: mockSetDefaultSku,
}));
vi.mock("@/modules/skus/actions/update-sku", () => ({
	updateProductSku: mockUpdateProductSku,
}));
vi.mock("@/modules/skus/actions/update-sku-price", () => ({
	updateSkuPrice: mockUpdateSkuPrice,
}));

vi.mock("@/shared/components/forms", () => ({
	useAppForm: vi.fn(() => ({
		store: {
			subscribe: vi.fn(),
			getState: vi.fn(() => ({ values: { adjustment: 0 }, errors: [] })),
		},
	})),
}));

vi.mock("@tanstack/react-form-nextjs", () => ({
	mergeForm: vi.fn((base) => base),
	useStore: vi.fn((store, selector) => selector({ values: { adjustment: 0 }, errors: [] })),
	useTransform: vi.fn((fn) => fn),
}));

vi.mock("@/modules/skus/utils/form-options", () => ({
	getUpdateProductSkuFormOpts: vi.fn(() => ({ defaultValues: {} })),
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

import { useRefreshSkus } from "../use-refresh-skus";
import { useUpdateProductSkuStatus } from "../use-update-sku-status";
import { useAdjustStockForm } from "../use-adjust-stock-form";
import { useBulkActivateSkus } from "../use-bulk-activate-skus";
import { useBulkAdjustStock } from "../use-bulk-adjust-stock";
import { useBulkDeactivateSkus } from "../use-bulk-deactivate-skus";
import { useBulkDeleteSkus } from "../use-bulk-delete-skus";
import { useBulkUpdatePrice } from "../use-bulk-update-price";
import { useDeleteProductSku } from "../use-delete-sku";
import { useDuplicateSku } from "../use-duplicate-sku";
import { useSetDefaultSku } from "../use-set-default-sku";
import { useUpdateProductSkuForm } from "../use-update-sku-form";
import { useUpdateSkuPrice } from "../use-update-sku-price";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS = { status: "success" as const, message: "OK" };
const ERROR = { status: "error" as const, message: "Erreur" };

const MOCK_SKU = {
	id: "sku-1",
	sku: "REF-001",
	productId: "product-1",
	isActive: true,
	isDefault: false,
	priceInclTax: 3000,
	compareAtPrice: null,
	stock: 10,
	images: [],
} as unknown as Parameters<typeof useUpdateProductSkuForm>[0]["sku"];

// ============================================================================
// useRefreshSkus
// ============================================================================

describe("useRefreshSkus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRefreshSkus.mockResolvedValue(SUCCESS);
	});

	it("returns action, isPending, and refresh", () => {
		const { result } = renderHook(() => useRefreshSkus());
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.refresh).toBe("function");
	});

	it("calls the refreshSkus action when refresh is invoked", async () => {
		const { result } = renderHook(() => useRefreshSkus());

		await act(async () => {
			result.current.refresh();
		});

		expect(mockRefreshSkus).toHaveBeenCalledTimes(1);
	});

	it("appends productId to FormData when provided", async () => {
		const { result } = renderHook(() => useRefreshSkus({ productId: "product-42" }));

		await act(async () => {
			result.current.refresh();
		});

		const formData = mockRefreshSkus.mock.calls[0]?.[1] as FormData;
		expect(formData.get("productId")).toBe("product-42");
	});

	it("calls onSuccess when refresh succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshSkus({ onSuccess }));

		await act(async () => {
			result.current.refresh();
		});

		expect(onSuccess).toHaveBeenCalledTimes(1);
	});

	it("does not call onSuccess when action fails", async () => {
		mockRefreshSkus.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshSkus({ onSuccess }));

		await act(async () => {
			result.current.refresh();
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useUpdateProductSkuStatus
// ============================================================================

describe("useUpdateProductSkuStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateProductSkuStatus.mockResolvedValue({ ...SUCCESS, message: "SKU activé" });
	});

	it("returns state, isPending, and toggleStatus", () => {
		const { result } = renderHook(() => useUpdateProductSkuStatus());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.toggleStatus).toBe("function");
	});

	it("toggleStatus appends skuId and isActive to FormData", async () => {
		const { result } = renderHook(() => useUpdateProductSkuStatus());

		await act(async () => {
			result.current.toggleStatus("sku-123", true);
		});

		const formData = mockUpdateProductSkuStatus.mock.calls[0]?.[1] as FormData;
		expect(formData.get("skuId")).toBe("sku-123");
		expect(formData.get("isActive")).toBe("true");
	});

	it("toggleStatus appends isActive=false when deactivating", async () => {
		const { result } = renderHook(() => useUpdateProductSkuStatus());

		await act(async () => {
			result.current.toggleStatus("sku-123", false);
		});

		const formData = mockUpdateProductSkuStatus.mock.calls[0]?.[1] as FormData;
		expect(formData.get("isActive")).toBe("false");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateProductSkuStatus({ onSuccess }));

		await act(async () => {
			result.current.toggleStatus("sku-123", true);
		});

		expect(onSuccess).toHaveBeenCalledWith("SKU activé");
	});

	it("calls onError when action fails", async () => {
		mockUpdateProductSkuStatus.mockResolvedValue(ERROR);
		const onError = vi.fn();
		const { result } = renderHook(() => useUpdateProductSkuStatus({ onError }));

		await act(async () => {
			result.current.toggleStatus("sku-123", true);
		});

		expect(onError).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockUpdateProductSkuStatus.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateProductSkuStatus({ onSuccess }));

		await act(async () => {
			result.current.toggleStatus("sku-123", true);
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useAdjustStockForm (TanStack Form — shape only)
// ============================================================================

describe("useAdjustStockForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockAdjustSkuStock.mockResolvedValue(SUCCESS);
	});

	it("returns form, state, action, isPending, formErrors, adjustment, newStock, and isValid", () => {
		const { result } = renderHook(() => useAdjustStockForm({ skuId: "sku-1", currentStock: 10 }));
		expect(result.current.form).toBeDefined();
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(result.current.formErrors).toBeDefined();
		expect(typeof result.current.adjustment).toBe("number");
		expect(typeof result.current.newStock).toBe("number");
		expect(typeof result.current.isValid).toBe("boolean");
	});

	it("newStock equals currentStock + adjustment", () => {
		const { result } = renderHook(() => useAdjustStockForm({ skuId: "sku-1", currentStock: 10 }));
		// adjustment mocked to 0 → newStock === 10
		expect(result.current.newStock).toBe(10);
	});

	it("isValid is false when adjustment is 0", () => {
		const { result } = renderHook(() => useAdjustStockForm({ skuId: "sku-1", currentStock: 10 }));
		// adjustment mocked to 0 → isValid === false
		expect(result.current.isValid).toBe(false);
	});
});

// ============================================================================
// useBulkActivateSkus
// ============================================================================

describe("useBulkActivateSkus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBulkActivateSkus.mockResolvedValue({ ...SUCCESS, message: "3 SKUs activés" });
	});

	it("returns state, action, isPending, and activateSkus", () => {
		const { result } = renderHook(() => useBulkActivateSkus());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.activateSkus).toBe("function");
	});

	it("activateSkus sends ids as JSON in FormData", async () => {
		const { result } = renderHook(() => useBulkActivateSkus());

		await act(async () => {
			result.current.activateSkus(["id-1", "id-2"]);
		});

		const formData = mockBulkActivateSkus.mock.calls[0]?.[1] as FormData;
		expect(formData.get("ids")).toBe(JSON.stringify(["id-1", "id-2"]));
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkActivateSkus({ onSuccess }));

		await act(async () => {
			result.current.activateSkus(["id-1"]);
		});

		expect(onSuccess).toHaveBeenCalledWith("3 SKUs activés");
	});

	it("does not call onSuccess when action fails", async () => {
		mockBulkActivateSkus.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkActivateSkus({ onSuccess }));

		await act(async () => {
			result.current.activateSkus(["id-1"]);
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useBulkAdjustStock
// ============================================================================

describe("useBulkAdjustStock", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBulkAdjustStock.mockResolvedValue({ ...SUCCESS, message: "Stock ajusté" });
	});

	it("returns state, action, isPending, and adjustStock", () => {
		const { result } = renderHook(() => useBulkAdjustStock());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.adjustStock).toBe("function");
	});

	it("adjustStock sends ids, mode, and value in FormData", async () => {
		const { result } = renderHook(() => useBulkAdjustStock());

		await act(async () => {
			result.current.adjustStock(["id-1", "id-2"], "relative", 5);
		});

		const formData = mockBulkAdjustStock.mock.calls[0]?.[1] as FormData;
		expect(formData.get("ids")).toBe(JSON.stringify(["id-1", "id-2"]));
		expect(formData.get("mode")).toBe("relative");
		expect(formData.get("value")).toBe("5");
	});

	it("adjustStock supports absolute mode", async () => {
		const { result } = renderHook(() => useBulkAdjustStock());

		await act(async () => {
			result.current.adjustStock(["id-1"], "absolute", 20);
		});

		const formData = mockBulkAdjustStock.mock.calls[0]?.[1] as FormData;
		expect(formData.get("mode")).toBe("absolute");
		expect(formData.get("value")).toBe("20");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkAdjustStock({ onSuccess }));

		await act(async () => {
			result.current.adjustStock(["id-1"], "relative", 1);
		});

		expect(onSuccess).toHaveBeenCalledWith("Stock ajusté");
	});

	it("does not call onSuccess when action fails", async () => {
		mockBulkAdjustStock.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkAdjustStock({ onSuccess }));

		await act(async () => {
			result.current.adjustStock(["id-1"], "relative", 1);
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useBulkDeactivateSkus
// ============================================================================

describe("useBulkDeactivateSkus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBulkDeactivateSkus.mockResolvedValue({ ...SUCCESS, message: "2 SKUs désactivés" });
	});

	it("returns state, action, isPending, and deactivateSkus", () => {
		const { result } = renderHook(() => useBulkDeactivateSkus());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.deactivateSkus).toBe("function");
	});

	it("deactivateSkus sends ids as JSON in FormData", async () => {
		const { result } = renderHook(() => useBulkDeactivateSkus());

		await act(async () => {
			result.current.deactivateSkus(["id-1", "id-2"]);
		});

		const formData = mockBulkDeactivateSkus.mock.calls[0]?.[1] as FormData;
		expect(formData.get("ids")).toBe(JSON.stringify(["id-1", "id-2"]));
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkDeactivateSkus({ onSuccess }));

		await act(async () => {
			result.current.deactivateSkus(["id-1"]);
		});

		expect(onSuccess).toHaveBeenCalledWith("2 SKUs désactivés");
	});

	it("does not call onSuccess when action fails", async () => {
		mockBulkDeactivateSkus.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkDeactivateSkus({ onSuccess }));

		await act(async () => {
			result.current.deactivateSkus(["id-1"]);
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useBulkDeleteSkus
// ============================================================================

describe("useBulkDeleteSkus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBulkDeleteSkus.mockResolvedValue({ ...SUCCESS, message: "2 SKUs supprimés" });
	});

	it("returns state, action, isPending, and deleteSkus", () => {
		const { result } = renderHook(() => useBulkDeleteSkus());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.deleteSkus).toBe("function");
	});

	it("deleteSkus sends ids as JSON in FormData", async () => {
		const { result } = renderHook(() => useBulkDeleteSkus());

		await act(async () => {
			result.current.deleteSkus(["id-1", "id-2"]);
		});

		const formData = mockBulkDeleteSkus.mock.calls[0]?.[1] as FormData;
		expect(formData.get("ids")).toBe(JSON.stringify(["id-1", "id-2"]));
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkDeleteSkus({ onSuccess }));

		await act(async () => {
			result.current.deleteSkus(["id-1"]);
		});

		expect(onSuccess).toHaveBeenCalledWith("2 SKUs supprimés");
	});

	it("does not call onSuccess when action fails", async () => {
		mockBulkDeleteSkus.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkDeleteSkus({ onSuccess }));

		await act(async () => {
			result.current.deleteSkus(["id-1"]);
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useBulkUpdatePrice
// ============================================================================

describe("useBulkUpdatePrice", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBulkUpdatePrice.mockResolvedValue({ ...SUCCESS, message: "Prix mis à jour" });
	});

	it("returns state, action, isPending, and updatePrice", () => {
		const { result } = renderHook(() => useBulkUpdatePrice());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.updatePrice).toBe("function");
	});

	it("updatePrice sends ids, mode, value, and updateCompareAtPrice in FormData", async () => {
		const { result } = renderHook(() => useBulkUpdatePrice());

		await act(async () => {
			result.current.updatePrice(["id-1", "id-2"], "percentage", 10, true);
		});

		const formData = mockBulkUpdatePrice.mock.calls[0]?.[1] as FormData;
		expect(formData.get("ids")).toBe(JSON.stringify(["id-1", "id-2"]));
		expect(formData.get("mode")).toBe("percentage");
		expect(formData.get("value")).toBe("10");
		expect(formData.get("updateCompareAtPrice")).toBe("true");
	});

	it("updateCompareAtPrice defaults to false", async () => {
		const { result } = renderHook(() => useBulkUpdatePrice());

		await act(async () => {
			result.current.updatePrice(["id-1"], "absolute", 30);
		});

		const formData = mockBulkUpdatePrice.mock.calls[0]?.[1] as FormData;
		expect(formData.get("updateCompareAtPrice")).toBe("false");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkUpdatePrice({ onSuccess }));

		await act(async () => {
			result.current.updatePrice(["id-1"], "absolute", 25);
		});

		expect(onSuccess).toHaveBeenCalledWith("Prix mis à jour");
	});

	it("does not call onSuccess when action fails", async () => {
		mockBulkUpdatePrice.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useBulkUpdatePrice({ onSuccess }));

		await act(async () => {
			result.current.updatePrice(["id-1"], "absolute", 25);
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useDeleteProductSku
// ============================================================================

describe("useDeleteProductSku", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteProductSku.mockResolvedValue({ ...SUCCESS, message: "SKU supprimé" });
	});

	it("returns state, action, isPending, and deleteSku", () => {
		const { result } = renderHook(() => useDeleteProductSku());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.deleteSku).toBe("function");
	});

	it("deleteSku appends skuId to FormData", async () => {
		const { result } = renderHook(() => useDeleteProductSku());

		await act(async () => {
			result.current.deleteSku("sku-123");
		});

		const formData = mockDeleteProductSku.mock.calls[0]?.[1] as FormData;
		expect(formData.get("skuId")).toBe("sku-123");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteProductSku({ onSuccess }));

		await act(async () => {
			result.current.deleteSku("sku-123");
		});

		expect(onSuccess).toHaveBeenCalledWith("SKU supprimé");
	});

	it("does not call onSuccess when action fails", async () => {
		mockDeleteProductSku.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteProductSku({ onSuccess }));

		await act(async () => {
			result.current.deleteSku("sku-123");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useDuplicateSku
// ============================================================================

describe("useDuplicateSku", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDuplicateSku.mockResolvedValue({
			status: "success" as const,
			message: "SKU dupliqué",
			data: { id: "new-sku-id", sku: "REF-001-COPIE" },
		});
	});

	it("returns duplicate and isPending", () => {
		const { result } = renderHook(() => useDuplicateSku());
		expect(typeof result.current.duplicate).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("duplicate appends skuId to FormData", async () => {
		const { result } = renderHook(() => useDuplicateSku());

		await act(async () => {
			result.current.duplicate("sku-123", "Bague Or");
		});

		const formData = mockDuplicateSku.mock.calls[0]?.[1] as FormData;
		expect(formData.get("skuId")).toBe("sku-123");
	});

	it("calls onSuccess with { id, sku } when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDuplicateSku({ onSuccess }));

		await act(async () => {
			result.current.duplicate("sku-123", "Bague Or");
		});

		expect(onSuccess).toHaveBeenCalledWith({ id: "new-sku-id", sku: "REF-001-COPIE" });
	});

	it("calls onError with message when action fails", async () => {
		mockDuplicateSku.mockResolvedValue(ERROR);
		const onError = vi.fn();
		const { result } = renderHook(() => useDuplicateSku({ onError }));

		await act(async () => {
			result.current.duplicate("sku-123", "Bague Or");
		});

		expect(onError).toHaveBeenCalledWith("Erreur");
	});

	it("does not call onSuccess when action fails", async () => {
		mockDuplicateSku.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDuplicateSku({ onSuccess }));

		await act(async () => {
			result.current.duplicate("sku-123", "Bague Or");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useSetDefaultSku
// ============================================================================

describe("useSetDefaultSku", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSetDefaultSku.mockResolvedValue({ ...SUCCESS, message: "SKU par défaut défini" });
	});

	it("returns state, action, isPending, and setAsDefault", () => {
		const { result } = renderHook(() => useSetDefaultSku());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.setAsDefault).toBe("function");
	});

	it("setAsDefault appends skuId to FormData", async () => {
		const { result } = renderHook(() => useSetDefaultSku());

		await act(async () => {
			result.current.setAsDefault("sku-123");
		});

		const formData = mockSetDefaultSku.mock.calls[0]?.[1] as FormData;
		expect(formData.get("skuId")).toBe("sku-123");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSetDefaultSku({ onSuccess }));

		await act(async () => {
			result.current.setAsDefault("sku-123");
		});

		expect(onSuccess).toHaveBeenCalledWith("SKU par défaut défini");
	});

	it("does not call onSuccess when action fails", async () => {
		mockSetDefaultSku.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSetDefaultSku({ onSuccess }));

		await act(async () => {
			result.current.setAsDefault("sku-123");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useUpdateProductSkuForm (TanStack Form — shape only)
// ============================================================================

describe("useUpdateProductSkuForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateProductSku.mockResolvedValue(SUCCESS);
	});

	it("returns form, state, action, isPending, and formErrors", () => {
		const { result } = renderHook(() => useUpdateProductSkuForm({ sku: MOCK_SKU }));
		expect(result.current.form).toBeDefined();
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(result.current.formErrors).toBeDefined();
	});
});

// ============================================================================
// useUpdateSkuPrice
// ============================================================================

describe("useUpdateSkuPrice", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateSkuPrice.mockResolvedValue(SUCCESS);
	});

	it("returns updatePrice and isPending", () => {
		const { result } = renderHook(() => useUpdateSkuPrice());
		expect(typeof result.current.updatePrice).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("updatePrice appends skuId and priceInclTaxEuros to FormData", async () => {
		const { result } = renderHook(() => useUpdateSkuPrice());

		await act(async () => {
			result.current.updatePrice("sku-123", "Bague Or", 30.0);
		});

		const formData = mockUpdateSkuPrice.mock.calls[0]?.[1] as FormData;
		expect(formData.get("skuId")).toBe("sku-123");
		expect(formData.get("priceInclTaxEuros")).toBe("30");
	});

	it("updatePrice appends compareAtPriceEuros when provided", async () => {
		const { result } = renderHook(() => useUpdateSkuPrice());

		await act(async () => {
			result.current.updatePrice("sku-123", "Bague Or", 30.0, 45.0);
		});

		const formData = mockUpdateSkuPrice.mock.calls[0]?.[1] as FormData;
		expect(formData.get("compareAtPriceEuros")).toBe("45");
	});

	it("does not append compareAtPriceEuros when null", async () => {
		const { result } = renderHook(() => useUpdateSkuPrice());

		await act(async () => {
			result.current.updatePrice("sku-123", "Bague Or", 30.0, null);
		});

		const formData = mockUpdateSkuPrice.mock.calls[0]?.[1] as FormData;
		expect(formData.get("compareAtPriceEuros")).toBeNull();
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateSkuPrice({ onSuccess }));

		await act(async () => {
			result.current.updatePrice("sku-123", "Bague Or", 30.0);
		});

		expect(onSuccess).toHaveBeenCalledTimes(1);
	});

	it("calls onError with message when action fails", async () => {
		mockUpdateSkuPrice.mockResolvedValue(ERROR);
		const onError = vi.fn();
		const { result } = renderHook(() => useUpdateSkuPrice({ onError }));

		await act(async () => {
			result.current.updatePrice("sku-123", "Bague Or", 30.0);
		});

		expect(onError).toHaveBeenCalledWith("Erreur");
	});

	it("does not call onSuccess when action fails", async () => {
		mockUpdateSkuPrice.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateSkuPrice({ onSuccess }));

		await act(async () => {
			result.current.updatePrice("sku-123", "Bague Or", 30.0);
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});
