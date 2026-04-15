import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockBulkAdjustStock } = vi.hoisted(() => ({
	mockBulkAdjustStock: vi.fn(),
}));

vi.mock("@/modules/skus/actions/bulk-adjust-stock", () => ({
	bulkAdjustStock: mockBulkAdjustStock,
}));
vi.mock("sonner", () => ({
	toast: { loading: vi.fn(), dismiss: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { useBulkAdjustStock } from "../use-bulk-adjust-stock";

const SUCCESS = { status: "success" as const, message: "Stock ajusté" };
const ERROR = { status: "error" as const, message: "Erreur" };

describe("useBulkAdjustStock", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBulkAdjustStock.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, isPending, and adjustStock", () => {
		const { result } = renderHook(() => useBulkAdjustStock());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.adjustStock).toBe("function");
	});

	it("adjustStock sends ids, mode=relative, and value in FormData", async () => {
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
