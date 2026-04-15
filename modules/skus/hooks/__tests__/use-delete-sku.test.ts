import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDeleteProductSku } = vi.hoisted(() => ({
	mockDeleteProductSku: vi.fn(),
}));

vi.mock("@/modules/skus/actions/delete-sku", () => ({
	deleteProductSku: mockDeleteProductSku,
}));
vi.mock("sonner", () => ({
	toast: { loading: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { useDeleteProductSku } from "../use-delete-sku";

const SUCCESS = { status: "success" as const, message: "SKU supprimé" };
const ERROR = { status: "error" as const, message: "Erreur" };

describe("useDeleteProductSku", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteProductSku.mockResolvedValue(SUCCESS);
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
