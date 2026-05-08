import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDuplicateSku } = vi.hoisted(() => ({
	mockDuplicateSku: vi.fn(),
}));

vi.mock("@/modules/skus/actions/duplicate-sku", () => ({
	duplicateSku: mockDuplicateSku,
}));
vi.mock("sonner", () => ({
	toast: { loading: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { useDuplicateSku } from "../use-duplicate-sku";

const SUCCESS = {
	status: "success" as const,
	message: "SKU dupliqué",
	data: {
		id: "new-sku-id",
		sku: "REF-001-COPIE",
		productId: "prod-1",
		productSlug: "bracelet-lune",
	},
};
const ERROR = { status: "error" as const, message: "Erreur" };

describe("useDuplicateSku", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDuplicateSku.mockResolvedValue(SUCCESS);
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

	it("calls onSuccess with (message, { id, sku, productId, productSlug }) when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDuplicateSku({ onSuccess }));
		await act(async () => {
			result.current.duplicate("sku-123", "Bague Or");
		});
		expect(onSuccess).toHaveBeenCalledWith("SKU dupliqué", {
			id: "new-sku-id",
			sku: "REF-001-COPIE",
			productId: "prod-1",
			productSlug: "bracelet-lune",
		});
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
