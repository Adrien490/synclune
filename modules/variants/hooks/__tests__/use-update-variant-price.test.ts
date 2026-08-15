import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpdateVariantPrice } = vi.hoisted(() => ({
	mockUpdateVariantPrice: vi.fn(),
}));

vi.mock("@/modules/variants/actions/update-variant-price", () => ({
	updateVariantPrice: mockUpdateVariantPrice,
}));
vi.mock("sonner", () => ({
	toast: { loading: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { useUpdateVariantPrice } from "../use-update-variant-price";

const SUCCESS = { status: "success" as const, message: "Prix mis à jour" };
const ERROR = { status: "error" as const, message: "Erreur" };

describe("useUpdateVariantPrice", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateVariantPrice.mockResolvedValue(SUCCESS);
	});

	it("returns updatePrice and isPending", () => {
		const { result } = renderHook(() => useUpdateVariantPrice());
		expect(typeof result.current.updatePrice).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("updatePrice appends variantId and priceEuros to FormData", async () => {
		const { result } = renderHook(() => useUpdateVariantPrice());
		await act(async () => {
			result.current.updatePrice("variant-123", "Bague Or", 30.0);
		});
		const formData = mockUpdateVariantPrice.mock.calls[0]?.[1] as FormData;
		expect(formData.get("variantId")).toBe("variant-123");
		expect(formData.get("priceEuros")).toBe("30");
	});

	it("updatePrice appends compareAtPriceEuros when provided", async () => {
		const { result } = renderHook(() => useUpdateVariantPrice());
		await act(async () => {
			result.current.updatePrice("variant-123", "Bague Or", 30.0, 45.0);
		});
		const formData = mockUpdateVariantPrice.mock.calls[0]?.[1] as FormData;
		expect(formData.get("compareAtPriceEuros")).toBe("45");
	});

	it("does not append compareAtPriceEuros when null", async () => {
		const { result } = renderHook(() => useUpdateVariantPrice());
		await act(async () => {
			result.current.updatePrice("variant-123", "Bague Or", 30.0, null);
		});
		const formData = mockUpdateVariantPrice.mock.calls[0]?.[1] as FormData;
		expect(formData.get("compareAtPriceEuros")).toBeNull();
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateVariantPrice({ onSuccess }));
		await act(async () => {
			result.current.updatePrice("variant-123", "Bague Or", 30.0);
		});
		expect(onSuccess).toHaveBeenCalledTimes(1);
	});

	it("calls onError with message when action fails", async () => {
		mockUpdateVariantPrice.mockResolvedValue(ERROR);
		const onError = vi.fn();
		const { result } = renderHook(() => useUpdateVariantPrice({ onError }));
		await act(async () => {
			result.current.updatePrice("variant-123", "Bague Or", 30.0);
		});
		expect(onError).toHaveBeenCalledWith("Erreur");
	});

	it("does not call onSuccess when action fails", async () => {
		mockUpdateVariantPrice.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateVariantPrice({ onSuccess }));
		await act(async () => {
			result.current.updatePrice("variant-123", "Bague Or", 30.0);
		});
		expect(onSuccess).not.toHaveBeenCalled();
	});
});
