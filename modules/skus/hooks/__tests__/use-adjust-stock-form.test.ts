import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAdjustSkuStock } = vi.hoisted(() => ({
	mockAdjustSkuStock: vi.fn(),
}));

vi.mock("@/modules/skus/actions/adjust-sku-stock", () => ({
	adjustSkuStock: mockAdjustSkuStock,
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
	useStore: vi.fn((_store, selector) => selector({ values: { adjustment: 0 }, errors: [] })),
	useTransform: vi.fn((fn) => fn),
}));
vi.mock("sonner", () => ({
	toast: { loading: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { useAdjustStockForm } from "../use-adjust-stock-form";

describe("useAdjustStockForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockAdjustSkuStock.mockResolvedValue({ status: "success" as const, message: "Stock ajusté" });
	});

	it("returns form, state, action, isPending, adjustment, newStock, and isValid", () => {
		const { result } = renderHook(() => useAdjustStockForm({ skuId: "sku-1", currentStock: 10 }));
		expect(result.current.form).toBeDefined();
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.adjustment).toBe("number");
		expect(typeof result.current.newStock).toBe("number");
		expect(typeof result.current.isValid).toBe("boolean");
	});

	it("newStock equals currentStock + adjustment (adjustment mocked to 0)", () => {
		const { result } = renderHook(() => useAdjustStockForm({ skuId: "sku-1", currentStock: 10 }));
		expect(result.current.newStock).toBe(10);
	});

	it("isValid is false when adjustment is 0", () => {
		const { result } = renderHook(() => useAdjustStockForm({ skuId: "sku-1", currentStock: 10 }));
		expect(result.current.isValid).toBe(false);
	});
});
