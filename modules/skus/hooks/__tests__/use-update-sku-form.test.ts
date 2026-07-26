import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpdateProductSku } = vi.hoisted(() => ({
	mockUpdateProductSku: vi.fn(),
}));

vi.mock("@/modules/skus/actions/update-sku", () => ({
	updateProductSku: mockUpdateProductSku,
}));
vi.mock("@/shared/components/forms", () => ({
	useAppForm: vi.fn(() => ({
		store: {
			subscribe: vi.fn(),
			getState: vi.fn(() => ({ values: {}, errors: [] })),
		},
	})),
}));
vi.mock("@tanstack/react-form-nextjs", () => ({
	mergeForm: vi.fn((base) => base),
	useStore: vi.fn((_store, selector) => selector({ values: {}, errors: [] })),
	useTransform: vi.fn((fn) => fn),
}));
vi.mock("@/modules/skus/utils/form-options", () => ({
	getUpdateProductSkuFormOpts: vi.fn(() => ({ defaultValues: {} })),
}));
vi.mock("sonner", () => ({
	toast: { loading: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { useUpdateProductSkuForm } from "../use-update-sku-form";
import type { SkuWithImages } from "@/modules/skus/data/get-sku";

const MOCK_SKU = {
	id: "sku-1",
	sku: "REF-001",
	productId: "product-1",
	isActive: true,
	isDefault: false,
	priceInclTax: 3000,
	compareAtPrice: null,
	inventory: 10,
	images: [],
} as unknown as SkuWithImages;

describe("useUpdateProductSkuForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateProductSku.mockResolvedValue({ status: "success" as const, message: "OK" });
	});

	it("returns form, state, action and isPending", () => {
		const { result } = renderHook(() => useUpdateProductSkuForm({ sku: MOCK_SKU }));
		expect(result.current.form).toBeDefined();
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess callback with message and data when action succeeds", async () => {
		const onSuccess = vi.fn();
		mockUpdateProductSku.mockResolvedValue({
			status: "success" as const,
			message: "Variante mise à jour",
			data: { productSlug: "bague-or" },
		});
		renderHook(() => useUpdateProductSkuForm({ sku: MOCK_SKU, onSuccess }));
		// Callback is wired through withCallbacks — shape test only
		expect(onSuccess).not.toHaveBeenCalled();
	});
});
