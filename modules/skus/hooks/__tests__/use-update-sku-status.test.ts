import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpdateProductSkuStatus } = vi.hoisted(() => ({
	mockUpdateProductSkuStatus: vi.fn(),
}));

vi.mock("@/modules/skus/actions/update-sku-status", () => ({
	updateProductSkuStatus: mockUpdateProductSkuStatus,
}));
vi.mock("sonner", () => ({
	toast: { loading: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { useUpdateProductSkuStatus } from "../use-update-sku-status";

const SUCCESS = { status: "success" as const, message: "SKU activé" };
const ERROR = { status: "error" as const, message: "Erreur" };

describe("useUpdateProductSkuStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateProductSkuStatus.mockResolvedValue(SUCCESS);
	});

	it("returns state, isPending, and toggleStatus", () => {
		const { result } = renderHook(() => useUpdateProductSkuStatus());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.toggleStatus).toBe("function");
	});

	it("toggleStatus appends skuId and isActive=true to FormData", async () => {
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
