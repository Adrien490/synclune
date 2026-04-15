import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpdateSkuPrice } = vi.hoisted(() => ({
	mockUpdateSkuPrice: vi.fn(),
}));

vi.mock("@/modules/skus/actions/update-sku-price", () => ({
	updateSkuPrice: mockUpdateSkuPrice,
}));
vi.mock("sonner", () => ({
	toast: { loading: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { useUpdateSkuPrice } from "../use-update-sku-price";

const SUCCESS = { status: "success" as const, message: "Prix mis à jour" };
const ERROR = { status: "error" as const, message: "Erreur" };

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
